import * as fs from 'fs';

let content = fs.readFileSync('app/pages/CeklerPage.tsx', 'utf8');
content = content.replace(/\[\.\.\.activeCekler\]/g, '[...(activeCekler || [])]');
fs.writeFileSync('app/pages/CeklerPage.tsx', content, 'utf8');

console.log('Fixed activeCekler iterable issue');
