import { getDb } from './pouchdb';
import { TABLE_NAMES } from './db-config';

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
