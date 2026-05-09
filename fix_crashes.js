const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/pages/site/DashboardPage.tsx',
  'app/pages/KasaPage.tsx',
  'app/pages/RaporlarPage.tsx',
  'app/pages/PersonelPage.tsx',
  'app/pages/UretimPage.tsx'
];

filesToFix.forEach(file => {
  const p = path.resolve(__dirname, file);
  if (!fs.existsSync(p)) return;
  
  let content = fs.readFileSync(p, 'utf-8');
  
  // replace "val.toLocaleString" with "Number(val || 0).toLocaleString"
  // Let's just do a regex that finds  [\w\.]+.toLocaleString
  content = content.replace(/([a-zA-Z0-9_\.]+)\.toLocaleString/g, (match, p1) => {
      // If it's something like Number(v) we don't want to mess up, but regex match \w\. will match `e.value` outputting `e.value.toLocaleString`
      // Or `totalStockValue.toLocaleString`.
      // Let's replace with `Number(${p1} || 0).toLocaleString`
      if (p1.startsWith('Math') || p1.startsWith('Number')) {
           return `${p1}.toLocaleString`;
      }
      return `Number(${p1} || 0).toLocaleString`;
  });
  
  // Also fix (a * b).toLocaleString -> Number(a * b || 0).toLocaleString
  content = content.replace(/\(([^)]+)\)\.toLocaleString/g, (match, p1) => {
       if (p1.includes('|| 0') || p1.includes('?? 0')) {
          return match;
       }
       return `Number(${p1} || 0).toLocaleString`;
  });

  fs.writeFileSync(p, content, 'utf-8');
});
console.log('Done!');
