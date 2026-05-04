// [AJAN-2 | claude/serene-gagarin | 2026-03-25]
// CouchDB yapılandırması — PouchDB ↔ CouchDB sync için

// LOCAL ONLY — intentionally not synced (CouchDB server URL may differ per device/location)
const CONFIG_KEY = 'mert4_couchdb_config';

export interface CouchDbConfig {
  url: string;
  user: string;
  password: string;
  peerUrl: string; // diğer bilgisayarın CouchDB adresi
}

/**
 * Varsayılan CouchDB bağlantı noktasını belirle.
 *
 * Öncelik sırası:
 *   1. Tarayıcı origin + '/couchdb' — proxy yolu (CORS sorunlarını kökten çözer)
 *   2. VITE_COUCHDB_URL env değişkeni (build-time veya .env.local) (Eğer ki doğrudan URL isteniyorsa)
 *   3. Fallback: http://127.0.0.1:5984 (doğrudan ortam)
 */
function _defaultCouchUrl(): string {
  // ÖNCELİK: Eğer ki tarayıcı içinde çalışıyorsa, daima kendi reverse proxy (/couchdb) rotasını kullan.
  // Bu daima CORS hatalarını engeller! Node (Electron) vb ise VITE_... ortamını alır
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    if ((import.meta as any).env?.VITE_DO_NOT_PROXY_COUCH !== 'true') {
      return window.location.origin + '/couchdb';
    }
  }

  const envUrl = (import.meta as any).env?.VITE_COUCHDB_URL;
  if (envUrl) return envUrl;
  
  return 'http://127.0.0.1:5984';
}

const DEFAULT_CONFIG: CouchDbConfig = {
  url: _defaultCouchUrl(),
  user: (import.meta as any).env?.VITE_COUCHDB_USER || 'adm1n',
  password: (import.meta as any).env?.VITE_COUCHDB_PASSWORD || '135790',
  peerUrl: (import.meta as any).env?.VITE_COUCHDB_PEER_URL || '',
};

export function getCouchDbConfig(): CouchDbConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

export function setCouchDbConfig(config: Partial<CouchDbConfig>): void {
  const current = getCouchDbConfig();
  const merged = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
}

export function getCouchDbAuthUrl(): string {
  const { url, user, password } = getCouchDbConfig();
  if (!user) return url;
  try {
    const u = new URL(url);
    u.username = user;
    u.password = password;
    return u.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

export function getPeerCouchDbUrl(): string {
  const { peerUrl, user, password } = getCouchDbConfig();
  if (!peerUrl) return '';
  try {
    const u = new URL(peerUrl);
    if (user) {
      u.username = user;
      u.password = password;
    }
    return u.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

// Tüm tablo isimleri (PouchDB database adları)
export const DB_PREFIX = 'mert_';

export const TABLE_NAMES = [
  'fisler',
  'urunler',
  'cari_hesaplar',
  'kasa_islemleri',
  'personeller',
  'bankalar',
  'cekler',
  'araclar',
  'arac_shifts',
  'arac_km_logs',
  'uretim_profilleri',
  'uretim_kayitlari',
  'faturalar',
  'fatura_stok',
  'tahsilatlar',
  'guncelleme_notlari',
  'stok_giris',
  // --- YENİ EKLENEN TABLOLAR (Sistem ve Denetim) ---
  'activity_logs',       // Tüm kullanıcı işlemleri (Audit Trail)
  'notifications',       // Sistem bildirimleri
  'chat_messages',       // Personel arası yazışmalar
  'user_sessions',       // Giriş/Çıkış ve cihaz bilgileri
  'audit_trail',         // Kritik veri değişiklik logları (önceki değer/sonraki değer)
  'system_config',       // Dinamik uygulama ayarları
  'price_history',       // Ürün fiyat değişim geçmişi
  'inventory_logs',      // Stok hareketlerinin detaylı günlüğü
  'employee_attendance', // Personel devam takip
  'expense_categories',  // Gider türleri ve tanımları
  'task_board',          // İş emirleri ve görev takibi
  'trash_bin',           // Silinen kayıtların geri dönüşüm kutusu
  'reports_cache',       // Ön Belleğe alınmış rapor verileri
  'api_logs',            // Dış servis entegrasyon logları
  'client_devices',      // Uygulamaya bağlanan yetkili cihazlar
  'search_history',      // Kullanıcıların arama trendleri
  'favorite_items',      // Hızlı erişim için işaretlenen kayıtlar
  'performance_metrics', // Uygulama çalışma/hız istatistikleri
  'iletisim_talepleri',  // Siteden gelen müşteri talepleri
] as const;

export type TableName = typeof TABLE_NAMES[number];

export const KV_DB_NAME = 'mert_kv_store';
