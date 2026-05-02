import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getFromStorage, setInStorage } from '../utils/storage';
import { detectActivityAnomalies } from '../utils/activityLogger';
import { useAuth } from '../contexts/AuthContext';
import { compactAllDbs, getDb } from '../lib/pouchdb';
import { runIntegrityCheck } from '../lib/db-integrity';

const TELEGRAM_KEY = "telbot_config";
export const OPS_ENGINE_KEY = "ops_engine_config";

export interface OpsEngineConfig {
  enabled: boolean;
  checkIntervalMinutes: number;
  anomalyAlertsEnabled: boolean;
  nightlyMaintenance: boolean;
}

export const defaultOpsConfig: OpsEngineConfig = {
  enabled: true,
  checkIntervalMinutes: 5,
  anomalyAlertsEnabled: true,
  nightlyMaintenance: true
};

async function sendTelegramAlert(message: string) {
  const telCfg = getFromStorage<{ token: string; chatId: string }>(TELEGRAM_KEY);
  if (!telCfg?.token || !telCfg?.chatId) return;
  
  const msg = encodeURIComponent(`🚨 [ISLEYEN ET - CORTEX OTO. SISTEM]\n\nYeni Uyarı: ⚠️\n${message}\n\nZaman: ${new Date().toLocaleString('tr-TR')}`);
  try {
    await fetch(`https://api.telegram.org/bot${telCfg.token}/sendMessage?chat_id=${telCfg.chatId}&text=${msg}`);
  } catch (e) {
    console.error("OpsBackgroundService: Telegram delivery failed.", e);
  }
}

export function useOpsBackgroundService() {
  const { user } = useAuth();
  
  // Keep track of notified anomaly signatures to prevent spam
  const notifiedAnomalies = useRef<Set<string>>(new Set());

  // Heartbeat state tracking
  const lastHeartbeatTime = useRef<number>(0);

  useEffect(() => {
    // Sadece yöneticilerde bu servis çalışır
    if (user?.role !== 'Yönetici') return;

    let config = getFromStorage<OpsEngineConfig>(OPS_ENGINE_KEY) || defaultOpsConfig;
    let intervalId: any;

    const runChecks = async () => {
      // Reload config
      config = getFromStorage<OpsEngineConfig>(OPS_ENGINE_KEY) || defaultOpsConfig;
      
      if (!config.enabled) return;

      try {
        // --- 1. Heartbeat ---
        // Sadece sunucu / admin aktif olduğunu ağa bildir.
        const sessionsDb = getDb('user_sessions');
        // Find current user's active session and update lastActive
        const result = await sessionsDb.allDocs({ include_docs: true });
        const docs = result.rows.map((r: any) => r.doc).filter((d: any) => d?.userId === user.id && d?.isBanned !== true);
        if (docs.length > 0) {
          const doc = docs[0];
          try {
            await sessionsDb.put({ ...doc, lastActive: new Date().toISOString() });
            lastHeartbeatTime.current = Date.now();
          } catch (e: any) {
             if (e.status !== 409) {
               console.warn("Heartbeat update failed:", e);
             }
          }
        }


        // --- 2. Anomaly Detection ---
        if (config.anomalyAlertsEnabled) {
          const anomalies = detectActivityAnomalies(30); 
          for (const anomaly of anomalies) {
            const sig = `${anomaly.type}_${new Date().getHours()}`;
            if (!notifiedAnomalies.current.has(sig)) {
              notifiedAnomalies.current.add(sig);
              
              if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
                toast.error(`Sistem Uyarı: ${anomaly.title}`, {
                  description: anomaly.description,
                  duration: 10000,
                  id: sig
                });
                
                await sendTelegramAlert(`❌ KRİTİK ANOMALİ: ${anomaly.title}\n\nDetay: ${anomaly.description}`);
              }
            }
          }
        }

        // --- 3. Nightly Maintenance ---
        if (config.nightlyMaintenance) {
          const hour = new Date().getHours();
          const minute = new Date().getMinutes();
          
          // Gece 04:00 ila 04:0X arası DB sıkıştırma ve integrity check
          const isMaintenanceWindow = hour === 4 && minute < config.checkIntervalMinutes;
          
          if (isMaintenanceWindow) {
            const report = await runIntegrityCheck();
            if (report.score < 80) {
              await sendTelegramAlert(`⚠️ Otomatik Veri Bütünlüğü düşük skor verdi!\nSkor: ${report.score}/100\nAcil inceleme gereklidir!`);
            } else {
              if (minute === 0) {
                // Sadece pencerenin başında bir kez raporla
                await sendTelegramAlert(`✅ Gece Bakımı Tamamlandı. Veri bütünlük skoru: ${report.score}/100`);
              }
            }
            await compactAllDbs(true); 
          }
        }

      } catch (err: any) {
        if (err.status !== 409 && err.name !== 'conflict') {
          console.error("OpsEngine Error:", err);
        }
      }
    };

    // İlk çalışma (Heartbeat vs)
    runChecks();
    
    const intervalMs = config.checkIntervalMinutes * 60 * 1000;
    intervalId = setInterval(runChecks, intervalMs);
    
    return () => clearInterval(intervalId);
  }, [user]);

  return null;
}
