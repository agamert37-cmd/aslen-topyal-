import * as fs from 'fs';

const pagesToUpdate = [
    'app/pages/StokPage.tsx',
    'app/pages/CariPage.tsx',
    'app/pages/CariDetailPage.tsx',
    'app/pages/FaturaPage.tsx',
    'app/pages/GunSonuPage.tsx',
    'app/pages/KasaPage.tsx',
];

for (const pg of pagesToUpdate) {
    if (!fs.existsSync(pg)) continue;
    let content = fs.readFileSync(pg, 'utf8');

    // we already replaced classNames. Now we want to look for </Dialog.Content> and replace it back to the end tag, finding the start tag to insert grabber
    // But it's easier to find `<Dialog.Content[^>]*>` and append the grabber if it's not already there.
    
    let regex = /(<Dialog\.Content[^>]*className="[^"]*bottom-0[^>]*>)/g;
    content = content.replace(regex, (match) => {
        if (!match.includes('grabber')) { // prevent double insert
            return `${match}\n          {/* Grabber for Mobile */}\n          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-secondary rounded-full sm:hidden" />`;
        }
        return match;
    });

    fs.writeFileSync(pg, content, 'utf8');
}

console.log("Updated dialog grabbers.");
