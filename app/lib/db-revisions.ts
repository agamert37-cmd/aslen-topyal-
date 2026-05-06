import { getDb } from './pouchdb';
import { toast } from 'sonner';

export interface RevisionInfo {
  rev: string;
  status: string; // "available" | "missing" | "deleted"
}

export async function getDocumentRevisions(tableName: string, docId: string): Promise<RevisionInfo[]> {
  try {
    const db = getDb(tableName);
    const doc = await db.get(docId, { revs_info: true }) as any;
    return doc._revs_info || [];
  } catch (e) {
    console.error(`[getDocumentRevisions] Hata:`, e);
    return [];
  }
}

export async function getRevisionData(tableName: string, docId: string, rev: string): Promise<any> {
  try {
    const db = getDb(tableName);
    return await db.get(docId, { rev });
  } catch (e) {
    console.error(`[getRevisionData] Hata:`, e);
    return null;
  }
}

export async function restoreRevision(tableName: string, docId: string, targetRev: string): Promise<boolean> {
  try {
    const db = getDb(tableName);
    
    // Eski veriyi al
    const oldVersion = await db.get(docId, { rev: targetRev });
    
    // Mevcut (en son) veriyi al ki _rev i güncelleyebilelim
    let currentVersion: any;
    try {
      currentVersion = await db.get(docId);
    } catch {
      // eğer silinmişse, tüm revlere bak
      const allInfo = await db.get(docId, { revs: true, open_revs: 'all' });
      currentVersion = (allInfo[0] as any).ok; 
    }

    // Restore edilecek dökümanı oluştur
    const newDoc = { ...oldVersion };
    if (currentVersion) {
      newDoc._rev = currentVersion._rev; // üzerine yaz
    }
    // Eger restored ise _deleted bayragini da kaldiriyoruz ki document hayata donmus olsun.
    delete (newDoc as any)._deleted;

    await db.put(newDoc);
    toast.success('Kayıt başarıyla eski sürümüne döndürüldü.');
    return true;
  } catch (e: any) {
    console.error(`[restoreRevision] Hata:`, e);
    toast.error('Geri yükleme başarısız: ' + e.message);
    return false;
  }
}
