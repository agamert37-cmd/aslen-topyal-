import fs from 'fs';
import path from 'path';

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('uuidv4()')) {
        content = content.replace(/crypto\.randomUUID\(\)/g, 'generateId()');
        if (!content.includes("export function generateId() {") && !content.includes("const generateId = () => {")) {
           // We need to add the import or function. Actually, better to just inject a small helper or use v4 from uuid.
           // replacing `uuidv4()` with `uuidv4()` and adding `import { v4 as uuidv4 } from 'uuid';`
        }
      }
    }
  }
}
