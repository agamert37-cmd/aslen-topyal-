import { ActivityLogEntry } from './activityLogger';
import { getFromStorage, setInStorage } from './storage';

export interface SecurityThreat {
  id: string;
  userId: string;
  userEmail: string;
  type: 'ANOMALOUS_HOURS' | 'BRUTE_FORCE_PATTERN' | 'SENSITIVE_DATA_EXPOSURE' | 'RAPID_VOID_OPERATIONS';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  timestamp: string;
  status: 'active' | 'mitigated' | 'ignored';
}

export interface UserRiskProfile {
  userId: string;
  riskScore: number; // 0-100
  lastAnalyzed: string;
  threats: SecurityThreat[];
  isBanned: boolean;
  banUntil?: string;
}

const STORAGE_KEY = 'security_risk_profiles';

/**
 * Kullanıcı davranışlarını analiz eder ve anomali tespiti yapar.
 */
export function analyzeUserBehavior(logs: ActivityLogEntry[], userId: string, userEmail: string): UserRiskProfile {
  const userLogs = logs.filter(l => l.employeeId === userId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const threats: SecurityThreat[] = [];
  let score = 0;

  if (userLogs.length === 0) return { userId, riskScore: 0, lastAnalyzed: new Date().toISOString(), threats: [], isBanned: false };

  // 1. Şüpheli Saat Kontrolü (01:00 - 05:00 arası yoğun işlem)
  const nightLogs = userLogs.filter(l => {
    const hour = new Date(l.timestamp).getHours();
    return hour >= 1 && hour <= 5;
  });
  if (nightLogs.length > 5) {
    threats.push({
      id: crypto.randomUUID(),
      userId,
      userEmail,
      type: 'ANOMALOUS_HOURS',
      severity: 'medium',
      details: `${nightLogs.length} adet işlem gece yarısı (01:00-05:00) gerçekleştirildi.`,
      timestamp: new Date().toISOString(),
      status: 'active'
    });
    score += 30;
  }

  // 2. Hızlı Silme/İptal İşlemleri (Örn: 10 dakikada 5+ silme)
  const voidActions = ['delete', 'remove', 'void', 'cancel'];
  const recentVoidLogs = userLogs.filter(l => 
    voidActions.some(a => (l.type || '').toLowerCase().includes(a) || (l.title || '').toLowerCase().includes(a)) && 
    (new Date().getTime() - new Date(l.timestamp).getTime()) < 10 * 60 * 1000
  );
  if (recentVoidLogs.length >= 5) {
    threats.push({
      id: crypto.randomUUID(),
      userId,
      userEmail,
      type: 'RAPID_VOID_OPERATIONS',
      severity: 'high',
      details: `Kısa süre içinde çok sayıda silme/iptal işlemi tespit edildi (${recentVoidLogs.length} işlem/10dk).`,
      timestamp: new Date().toISOString(),
      status: 'active'
    });
    score += 50;
  }

  // 3. Mevcut profil ile birleştir
  const profiles = getFromStorage<Record<string, UserRiskProfile>>(STORAGE_KEY) || {};
  const existing = profiles[userId] || { isBanned: false };
  
  const finalProfile: UserRiskProfile = {
    userId,
    riskScore: Math.min(score, 100),
    lastAnalyzed: new Date().toISOString(),
    threats: [...(existing.threats || []), ...threats].slice(-10), // Son 10 tehdidi tut
    isBanned: existing.isBanned,
    banUntil: existing.banUntil
  };

  profiles[userId] = finalProfile;
  setInStorage(STORAGE_KEY, profiles);

  return finalProfile;
}

export function getUserRiskProfiles(): Record<string, UserRiskProfile> {
  return getFromStorage<Record<string, UserRiskProfile>>(STORAGE_KEY) || {};
}

export function updateUserRestrictions(userId: string, isBanned: boolean, durationMinutes?: number) {
  const profiles = getFromStorage<Record<string, UserRiskProfile>>(STORAGE_KEY) || {};
  if (profiles[userId]) {
    profiles[userId].isBanned = isBanned;
    if (isBanned && durationMinutes) {
      profiles[userId].banUntil = new Date(Date.now() + durationMinutes * 60000).toISOString();
    } else {
      delete profiles[userId].banUntil;
    }
    setInStorage(STORAGE_KEY, profiles);
  }
}

export function checkAccess(userId: string): { allowed: boolean; reason?: string } {
  const profiles = getFromStorage<Record<string, UserRiskProfile>>(STORAGE_KEY) || {};
  const p = profiles[userId];
  if (!p) return { allowed: true };
  
  if (p.isBanned) {
    if (p.banUntil && new Date(p.banUntil) < new Date()) {
       // Ban süresi dolmuş
       updateUserRestrictions(userId, false);
       return { allowed: true };
    }
    return { allowed: false, reason: p.banUntil ? `Hesabınız geçici olarak askıya alınmıştır. Açılış: ${new Date(p.banUntil).toLocaleTimeString()}` : 'Hesabınız güvenlik gerekçesiyle banlanmıştır.' };
  }
  return { allowed: true };
}
