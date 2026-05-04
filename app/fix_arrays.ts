import * as fs from 'fs';

let content = fs.readFileSync('app/pages/CeklerPage.tsx', 'utf8');
content = content.replace(/cekler\.filter/g, 'cekler?.filter');
content = content.replace(/cekler\.reduce/g, 'cekler?.reduce');
content = content.replace(/cekler\.length/g, '(cekler?.length || 0)');
fs.writeFileSync('app/pages/CeklerPage.tsx', content, 'utf8');

let stok = fs.readFileSync('app/pages/StokPage.tsx', 'utf8');
stok = stok.replace(/safeProducts\.filter/g, 'safeProducts?.filter');
stok = stok.replace(/safeProducts\.reduce/g, 'safeProducts?.reduce');
stok = stok.replace(/safeProducts\.length/g, '(safeProducts?.length || 0)');
fs.writeFileSync('app/pages/StokPage.tsx', stok, 'utf8');
console.log('Fixed arrays');
