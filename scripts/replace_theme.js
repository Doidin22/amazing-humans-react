import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

const colorMap = {
    '#3B82F6': '#52525b', // blue-500 to zinc-600
    '#2563EB': '#3f3f46', // blue-600 to zinc-700
};

walk(srcDir, (filePath) => {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx') || filePath.endsWith('.js')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        // Replace Tailwind blue classes with zinc
        content = content.replace(/\bblue-(\d{2,3}(?:\/\d{2,3})?)\b/g, 'zinc-$1');

        // Replace explicit hex colors
        for (const [oldColor, newColor] of Object.entries(colorMap)) {
            content = content.split(oldColor).join(newColor);
            content = content.split(oldColor.toLowerCase()).join(newColor);
        }

        if (content !== originalContent) {
            console.log(`Updated ${filePath}`);
            fs.writeFileSync(filePath, content, 'utf8');
        }
    }
});

console.log('Done!');
