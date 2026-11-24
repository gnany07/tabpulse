// TabPulse - Chrome Web Store Zip Packager
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
const version = manifest.version || '1.0.0';
const zipName = `tabpulse-v${version}.zip`;
const zipPath = path.join(distDir, zipName);

const filesToInclude = [
  'manifest.json',
  'background.js',
  'privacy_policy.html',
  'engine',
  'ui',
  'icons'
];

for (const f of filesToInclude) {
  if (!fs.existsSync(path.join(__dirname, f))) {
    console.error(`Missing required extension file/folder: ${f}`);
    process.exit(1);
  }
}

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

const includeArgs = filesToInclude.map(f => `"${f}"`).join(' ');
execSync(`zip -r "${zipPath}" ${includeArgs}`, { cwd: __dirname, stdio: 'inherit' });
const stat = fs.statSync(zipPath);
console.log(`\nSUCCESS! TabPulse Chrome Extension packaged:`);
console.log(`  Path: ${zipPath}`);
console.log(`  Size: ${(stat.size / 1024).toFixed(1)} KB`);
