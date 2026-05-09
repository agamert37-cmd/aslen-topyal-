const fs = require('fs');
const path = require('path');

const filesToFix = [
  'app/components/ChartComponents.tsx'
];

filesToFix.forEach(file => {
  const p = path.resolve(__dirname, file);
  if (!fs.existsSync(p)) return;
  
  let content = fs.readFileSync(p, 'utf-8');
  
  content = content.replace(/([a-zA-Z0-9_\.]+)\.toLocaleString/g, (match, p1) => {
      if (p1.startsWith('Math') || p1.startsWith('Number')) {
           return `${p1}.toLocaleString`;
      }
      return `Number(${p1} || 0).toLocaleString`;
  });
  
  content = content.replace(/\(([^)]+)\)\.toLocaleString/g, (match, p1) => {
       if (p1.includes('|| 0') || p1.includes('?? 0')) {
          return match;
       }
       return `Number(${p1} || 0).toLocaleString`;
  });

  fs.writeFileSync(p, content, 'utf-8');
});
console.log('Done!');
