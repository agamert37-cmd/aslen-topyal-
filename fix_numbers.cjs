const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/NumberNumber/g, 'Number');
    content = content.replace(/safeNumNumber\(([^)]+)\)/g, 'Number($1)');
    fs.writeFileSync(fullPath, content, 'utf8');
}

fixFile('app/pages/site/DashboardPage.tsx');
fixFile('app/pages/RaporlarPage.tsx');
fixFile('app/components/DashboardAIChat.tsx');
console.log('Fixed');
