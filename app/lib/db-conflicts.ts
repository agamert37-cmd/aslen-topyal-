import { getDb } from './pouchdb';
import { TABLE_NAMES } from './db-config';

export type ConflictStrategy = 'lww' | 'merge' | 'manual';

export interface ConflictInfo {
  tableName: string;
  docId: string;
  revs: string[];
}

/**
 * Belirli bir tablodaki tüm çelişkili (conflict) belgeleri tara.
 */
export async function findConflictsInTable(tableName: string): Promise<ConflictInfo[]> {
  const db = getDb(tableName);
  const conflicts: ConflictInfo[] = [];
  
  try {
    const result = await db.allDocs({
      include_docs: false,
      conflicts: true
    });
    
    for (const row of result.rows) {
      if (row.value && (row.value as any).conflicts) {
        conflicts.push({
          tableName,
          docId: row.id,
          revs: (row.value as any).conflicts
        });
      }
    }
  } catch (e) {
    console.error(`Conflict scan error in ${tableName}:`, e);
  }
  
  return conflicts;
}

/**
 * Tüm tablolardaki çelişkileri tara.
 */
export async function findAllConflicts(): Promise<ConflictInfo[]> {
  const all: ConflictInfo[] = [];
  const results = await Promise.all(TABLE_NAMES.map(t => findConflictsInTable(t)));
  for (const r of results) {
    all.push(...r);
  }
  return all;
}

/**
 * Bir belgedeki çelişkiyi çöz (kazanan rev dışındakileri siler).
 */
export async function resolveConflict(tableName: string, docId: string, revsToDelete: string[]): Promise<void> {
  const db = getDb(tableName);
  const deleteDocs = revsToDelete.map(rev => ({
    _id: docId,
    _rev: rev,
    _deleted: true
  }));
  
  await db.bulkDocs(deleteDocs);
}

/**
 * Çakışmaları belirtilen kurala göre otomatik olarak çözer.
 * strategy: 'lww' (En son düzenleyen kazanır) veya 'merge' (Veri alanlarını birleştir) 
 */
export async function autoResolveConflict(
  tableName: string, 
  docId: string, 
  strategy: ConflictStrategy = 'lww'
): Promise<void> {
  if (strategy === 'manual') return; // UI'a bırak

  const db = getDb(tableName);
  try {
    // Ana belge ve conflict rev'lerini getir
    const docWithConflicts = await db.get(docId, { conflicts: true });
    if (!docWithConflicts._conflicts || docWithConflicts._conflicts.length === 0) return;

    const allRevs = [docWithConflicts._rev, ...docWithConflicts._conflicts];
    
    // Tüm versiyonların detaylarını çek
    const docs = await Promise.all(allRevs.map(async rev => {
      try { return await db.get(docId, { rev }); } catch (e) { return null; }
    }));
    const validDocs = docs.filter(d => d !== null) as any[];

    if (validDocs.length <= 1) return;

    let winnerDoc = validDocs[0];
    let loserRevs: string[] = [];

    if (strategy === 'lww') {
      // En son güncelleme tarihini (updated_at veya created_at) bul
      winnerDoc = validDocs.sort((a, b) => {
        const timeA = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0).getTime();
        const timeB = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0).getTime();
        return timeB - timeA; // büyükten küçüğe
      })[0];

      loserRevs = validDocs.filter(d => d._rev !== winnerDoc._rev).map(d => d._rev);

      // Sadece kaybedenleri sil (Tombstone)
      await resolveConflict(tableName, docId, loserRevs);

    } else if (strategy === 'merge') {
      // Ana belgeyi al (Genelde PouchDB'nin kendi kazanan varsaydığı docWithConflicts'dir)
      const baseDoc = { ...docWithConflicts };
      delete baseDoc._conflicts;
      
      loserRevs = docWithConflicts._conflicts;

      validDocs.forEach(d => {
        if (d._rev === baseDoc._rev) return;
        // Basit shallow merge - boş veya null olmayan alanları üzerine yaz
        Object.keys(d).forEach(k => {
          if (k.startsWith('_')) return; // Dahili alanları geç
          if (d[k] !== undefined && d[k] !== null && d[k] !== '') {
            baseDoc[k] = d[k];
          }
        });
      });

      // Kaybedenleri sil ve merged belgeyi _rev ile kaydet
      await resolveConflict(tableName, docId, loserRevs);
      await db.put(baseDoc);
    }
    
    console.log(`[AutoResolve] Çakışma çözüldü (${tableName}/${docId}), Strateji: ${strategy}`);
  } catch (e: any) {
    console.error(`[AutoResolve] Hata - ${tableName}/${docId}:`, e.message);
  }
}
