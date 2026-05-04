import * as fs from 'fs';

let content = fs.readFileSync('app/pages/ops/OpsCenterPage.tsx', 'utf8');

// Replace all instances of bg-[#0d1322] with bg-zinc-900/50 backdrop-blur-xl
content = content.replace(/bg-\[#0d1322\]/g, 'bg-zinc-900/50 backdrop-blur-xl');

// Replace border-border with border-white/5 for cards
content = content.replace(/border-border/g, 'border-white/5');

// Change card padding & border radius
content = content.replace(/p-5 rounded-2xl/g, 'p-8 rounded-3xl');
content = content.replace(/p-6 rounded-2xl/g, 'p-8 rounded-3xl');
content = content.replace(/p-4 rounded-2xl/g, 'p-6 rounded-3xl');

// Generic text color replacements
content = content.replace(/text-muted-foreground/g, 'text-zinc-400');
content = content.replace(/text-foreground/g, 'text-zinc-100');
content = content.replace(/bg-card/g, 'bg-zinc-900/50 backdrop-blur-xl');
content = content.replace(/bg-secondary/g, 'bg-white/5');

// Make text sizing slightly bigger and better tracking
content = content.replace(/text-\[10px\]/g, 'text-xs');
content = content.replace(/text-\[11px\]/g, 'text-sm');

// Replace standard widths
content = content.replace(/max-w-6xl mx-auto/g, 'max-w-7xl mx-auto');

fs.writeFileSync('app/pages/ops/OpsCenterPage.tsx', content, 'utf8');
console.log('Successfully updated OpsCenterPage.tsx design classes.');
