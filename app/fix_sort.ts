import * as fs from 'fs';

let content = fs.readFileSync('app/pages/StokPage.tsx', 'utf8');

// replace let list = safeProducts?.filter with let list = safeProducts?.filter(....) || [];
content = content.replace(/let list = safeProducts\?.filter/g, 'let list = (safeProducts || []).filter');

// Also safely fallback sort
content = content.replace(/list\.sort\(/g, '(list || []).sort(');

fs.writeFileSync('app/pages/StokPage.tsx', content, 'utf8');

let cek = fs.readFileSync('app/pages/CeklerPage.tsx', 'utf8');
cek = cek.replace(/let list = cekler\?.filter/g, 'let list = (cekler || []).filter');
cek = cek.replace(/list\.sort\(/g, '(list || []).sort(');
fs.writeFileSync('app/pages/CeklerPage.tsx', cek, 'utf8');

console.log('Fixed sort on undefined list');
