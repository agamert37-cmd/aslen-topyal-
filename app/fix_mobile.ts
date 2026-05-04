import * as fs from 'fs';

function updatePaddings(file: string) {
    let text = fs.readFileSync(file, 'utf8');
    
    // Improve main page wrappers
    text = text.replace(/p-2 sm:p-6 lg:p-8/g, 'px-4 py-6 sm:p-6 lg:p-8');
    text = text.replace(/p-3 sm:p-6/g, 'p-4 sm:p-6');
    text = text.replace(/p-2 sm:p-5/g, 'p-4 sm:p-6');
    
    // Improve item cards
    // CeklerPage Mobile cards
    text = text.replace(/p-5 sm:p-6 pl-6 sm:pl-8/g, 'p-6 sm:p-8');
    
    // Adjust rounded for ultra-modern look on mobile
    text = text.replace(/rounded-\[32px\]/g, 'rounded-3xl sm:rounded-[32px]');
    
    fs.writeFileSync(file, text, 'utf8');
}

updatePaddings('app/pages/CeklerPage.tsx');
updatePaddings('app/pages/StokPage.tsx');
updatePaddings('app/pages/KasaPage.tsx');
updatePaddings('app/pages/SalesPage.tsx');

console.log('Mobile padding and layout updated');
