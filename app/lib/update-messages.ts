import { kvGet, kvSet } from './pouchdb-kv';

const DEFAULT_MESSAGES = [
  "Veritabanı tozları alınıyor...",
  "Sunucuya bir kahve ikram ediliyor...",
  "Docker konteynerleri hizaya diziliyor...",
  "Eski veriler yeni evlerine taşınıyor...",
  "Sistem parlatılıyor, az kaldı!",
  "GitHub bulutlarından taze kodlar indiriliyor...",
  "PouchDB ve CouchDB el sıkışıyor...",
  "Mert ERP motoru vakumla temizleniyor...",
  "Bitler ve baytlar cilalanıyor..."
];

const KV_KEY = 'custom_update_messages';

export async function getUpdateMessages(): Promise<string[]> {
  try {
    const saved = await kvGet<string[]>(KV_KEY);
    return (saved && Array.isArray(saved)) ? saved : DEFAULT_MESSAGES;
  } catch {
    return DEFAULT_MESSAGES;
  }
}

export async function saveUpdateMessages(messages: string[]): Promise<void> {
  await kvSet(KV_KEY, messages);
}
