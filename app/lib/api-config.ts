/**
 * API Configuration Manager
 * Supabase bilgileri gomulu (supabase-config), sadece OpenAI key localStorage'da saklanir
 */

// supabase-config removed — hardcoded placeholders for legacy compatibility
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

// LOCAL ONLY — intentionally not synced to CouchDB (API key is sensitive, per-device)
const OPENAI_KEY_STORAGE = 'isleyen_et_openai_key';
const SYSTEM_REPAIR_KEY_STORAGE = 'isleyen_et_system_repair_key';

export function getSystemRepairKey(): string {
  try {
    const override = localStorage.getItem('ops_center_gpt_override'); // we might allow ops center to override both, but maybe not. Let's keep it separate
    const key = localStorage.getItem(SYSTEM_REPAIR_KEY_STORAGE);
    if (key && key.trim() !== '') return key.trim();
  } catch (e) {
    console.error('System repair key read error:', e);
  }
  return '';
}

export function saveSystemRepairKey(key: string): void {
  try {
    localStorage.setItem(SYSTEM_REPAIR_KEY_STORAGE, key.trim());
  } catch (error) {
    console.error('System repair key save error:', error);
  }
}

export function clearSystemRepairKey(): void {
  try {
    localStorage.removeItem(SYSTEM_REPAIR_KEY_STORAGE);
  } catch (error) {
    console.error('System repair key clear error:', error);
  }
}

export function isSystemRepairConfigured(): boolean {
  const key = getSystemRepairKey();
  // We allow either gemini starting with AIza or openai starting with sk-, but for now just check length
  return !!(key && key.length > 5);
}
const LEGACY_STORAGE_KEY = 'isleyen_et_api_config';

/**
 * Gomulu Supabase bilgileri
 */
export function getEmbeddedSupabaseConfig() {
  return {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
  };
}

/**
 * OpenAI API key'i localStorage'dan al
 */
export function getOpenAIKey(): string {
  try {
    // 1. Ops Center override (Veri Kulesi Kontrolü)
    const override = localStorage.getItem('ops_center_gpt_override');
    if (override && override.trim() !== '') {
      return override.trim();
    }

    const key = localStorage.getItem(OPENAI_KEY_STORAGE);
    if (key && key.trim() !== '') {
      return key.trim();
    }
    // Legacy formatindan migration
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (parsed.openaiApiKey && parsed.openaiApiKey.trim() !== '' && parsed.openaiApiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
          localStorage.setItem(OPENAI_KEY_STORAGE, parsed.openaiApiKey.trim());
          return parsed.openaiApiKey.trim();
        }
      } catch {}
    }
  } catch (error) {
    console.error('OpenAI key read error:', error);
  }
  return '';
}

/**
 * OpenAI API key'i localStorage'a kaydet
 */
export function saveOpenAIKey(key: string): void {
  try {
    localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
  } catch (error) {
    console.error('OpenAI key save error:', error);
  }
}

/**
 * OpenAI API key'i sil
 */
export function clearOpenAIKey(): void {
  try {
    localStorage.removeItem(OPENAI_KEY_STORAGE);
  } catch (error) {
    console.error('OpenAI key clear error:', error);
  }
}

/**
 * OpenAI key ayarlanmis mi?
 */
export function isOpenAIConfigured(): boolean {
  const key = getOpenAIKey();
  return !!(key && key.startsWith('sk-'));
}
