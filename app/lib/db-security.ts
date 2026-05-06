import { getDb } from './pouchdb';
import { TABLE_NAMES } from './db-config';

const VALIDATE_DOC_UPDATE_FUNC = `
function(newDoc, oldDoc, userCtx, secObj) {
  // Sistem yöneticisi veya _admin rolüne sahipse herşeye izin ver
  if (userCtx.roles.indexOf('_admin') !== -1 || userCtx.roles.indexOf('admin') !== -1) {
    return;
  }

  // Özel yetkileri secObj üzerinden veya dokümanın \`createdBy\` alanlarından kontrol edebiliriz
  // Şimdilik en temeli: eğer document \`type\` ı audit_trail vs. silmeye çalışıyorsa engelle
  if (newDoc._deleted && oldDoc) {
     if (oldDoc.type === 'audit_trail' || oldDoc.type === 'system_log') {
        throw({forbidden: 'Sistem kayıtları silinemez.'});
     }
  }

  // Zod muadili tip kontrolü (En basit seviyede CouchDB Javascript engine'i ile)
  // Burada Fişler veya belirli koleksiyonlar için zorunlu alan kontrolü yapılmalı.
  if (newDoc.tableName === 'fisler') {
     if (typeof newDoc.total !== 'number' && typeof newDoc.total !== 'undefined') {
        throw({forbidden: 'Fatura total değeri sayı olmalıdır.'});
     }
  }
}
`;

export async function deploySecurityDesignDoc() {
  for (const tableName of TABLE_NAMES) {
    try {
      const db = getDb(tableName);
      const ddocId = '_design/security_rules';
      
      let existingDdoc: any;
      try {
        existingDdoc = await db.get(ddocId);
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!existingDdoc || existingDdoc.validate_doc_update !== VALIDATE_DOC_UPDATE_FUNC.trim()) {
        const newDdoc = {
          _id: ddocId,
          ...(existingDdoc ? { _rev: existingDdoc._rev } : {}),
          validate_doc_update: VALIDATE_DOC_UPDATE_FUNC.trim()
        };
        await db.put(newDdoc);
        console.log(`[Security] Design document deployed to ${tableName}`);
      }
    } catch (err) {
      console.error(`[Security] Failed to deploy to ${tableName}:`, err);
    }
  }
}
