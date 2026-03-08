const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.mdx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = [...walk('src'), ...walk('content/docs')];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Modernize border radii
    content = content.replace(/rounded-2xl/g, 'rounded-lg');
    content = content.replace(/rounded-3xl/g, 'rounded-lg');
    content = content.replace(/rounded-\[26px\]/g, 'rounded-lg');
    content = content.replace(/rounded-full/g, 'rounded-full');

    // Modernize shadows
    content = content.replace(/shadow-\[.*?\]/g, 'shadow-sm');
    content = content.replace(/shadow-xl/g, 'shadow-sm');
    content = content.replace(/shadow-2xl/g, 'shadow-sm');

    // Remove complex inline gradients
    content = content.replace(/bg-\[linear-gradient\(.*?\)\]/g, 'bg-neutral-900');
    content = content.replace(/bg-gradient-to-[a-z]+\s+from-[a-z0-9-]+\s+to-[a-z0-9-]+/g, 'bg-neutral-900');

    // Simplify backgrounds and borders
    content = content.replace(/bg-white\/[0-9]+/g, 'bg-neutral-900');
    content = content.replace(/border-[a-z]+-[0-9]+\/[0-9]+/g, 'border-neutral-800');
    content = content.replace(/border-slate-[0-9]+/g, 'border-neutral-800');
    content = content.replace(/bg-slate-[0-9]+/g, 'bg-neutral-900');
    
    // Convert bright texts to neutral
    content = content.replace(/text-slate-900/g, 'text-white');
    content = content.replace(/text-slate-800/g, 'text-white');
    content = content.replace(/text-slate-700/g, 'text-neutral-400');
    content = content.replace(/text-slate-600/g, 'text-neutral-400');
    content = content.replace(/text-slate-500/g, 'text-neutral-500');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
