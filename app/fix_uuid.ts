import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('uuidv4()')) {
    content = content.replace(/crypto\.randomUUID\(\)/g, 'uuidv4()');
    
    // Add import if not present
    if (!content.includes("import { v4 as uuidv4 }")) {
      // Find the last import
      const lines = content.split('\n');
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIdx = i;
        }
      }
      if (lastImportIdx !== -1) {
        lines.splice(lastImportIdx + 1, 0, "import { v4 as uuidv4 } from 'uuid';");
      } else {
        lines.unshift("import { v4 as uuidv4 } from 'uuid';");
      }
      content = lines.join('\n');
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${filePath}`);
  }
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      fixFile(fullPath);
    }
  }
}

scanDir(path.join(process.cwd(), 'app'));
