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

    // Replace basic centered modal with bottom sheet on mobile
    content = content.replace(
        /className="fixed inset-2 sm:inset-auto([^"]+)"/g,
        (match, p1) => {
            // Keep common things but fix responsive shape
            let newClasses = p1.replace(/rounded-2xl sm:rounded-3xl|rounded-2xl/g, 'rounded-t-[2rem] sm:rounded-3xl')
                               .replace(/shadow-2xl/g, 'shadow-[0_-5px_40px_rgba(0,0,0,0.3)] sm:shadow-2xl');
            
            // Add pb safe area if not there
            if (!newClasses.includes("safe-area-inset-bottom")) {
                newClasses += ' pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6';
            }

            return `className="fixed inset-x-0 bottom-0 sm:inset-auto ${newClasses}"`;
        }
    );

    // Some dialogs might use inset-4 or similar, let's fix the ones with inset-[number]
    content = content.replace(
        /<Dialog\.Content([^>]*?)className="fixed inset-[0-9] sm:inset-auto([^"]+)"([^>]*?)>/g,
        (match, before, afterClass, after) => {
             let cl = afterClass.replace(/rounded-[a-zA-Z0-9]+ sm:rounded-[a-zA-Z0-9]+|rounded-[a-zA-Z0-9]+/g, 'rounded-t-[2rem] sm:rounded-3xl');
             cl += ' pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 border-b-0 sm:border-b shadow-[0_-10px_40px_rgba(0,0,0,0.5)] sm:shadow-2xl';
             return `<Dialog.Content${before}className="fixed inset-x-0 bottom-0 sm:inset-auto${cl}"${after}>\n          {/* Grabber for Mobile */}\n          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-secondary rounded-full sm:hidden" />`;
        }
    );

    // Specifically inject the grabber just under <Dialog.Content ...> 
    // Wait, the regex above already injected it if it matched! Let's check.
    
    fs.writeFileSync(pg, content, 'utf8');
}

console.log("Updated dialog styles for mobile.");
