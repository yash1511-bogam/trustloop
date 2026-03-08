/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

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

// 2026 UI/UX Rule: Strict 8-pt grid system.
// We replace non-8-pt tailwind sizing utilities (e.g. 5=20px, 7=28px) 
// with strict 8-pt equivalents (e.g. 6=24px, 8=32px).
const shiftMap = {
    '3': '4', // 12px -> 16px (Optional, but 16px is safer for 8pt grid, although 12px is used in Bento, we will bump up for airiness)
    '5': '6', // 20px -> 24px
    '7': '8', // 28px -> 32px
    '9': '10', // 36px -> 40px
    '11': '12', // 44px -> 48px
    '14': '16', // 56px -> 64px
    '15': '16', // 60px -> 64px
};

const prefixes = [
    'p', 'px', 'py', 'pt', 'pb', 'pl', 'pr',
    'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr',
    'gap', 'space-x', 'space-y', 'top', 'bottom', 'left', 'right', 'inset'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    prefixes.forEach(prefix => {
        // Look for exact matches in classes like " p-5 " or "p-5" or '"p-5"'
        Object.keys(shiftMap).forEach(key => {
            const regex = new RegExp(`(?<=[\\s"'\`:])${prefix}-${key}(?=[\\s"'\`])`, 'g');
            content = content.replace(regex, `${prefix}-${shiftMap[key]}`);
        });
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Enforced 8pt spacing grid in ${file}`);
    }
});
