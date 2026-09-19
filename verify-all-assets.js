const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

function checkFileExists(relPath) {
  const cleanPath = relPath.split('?')[0].split('#')[0];
  const fullPath = path.join(publicDir, cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath);
  return { exists: fs.existsSync(fullPath), path: fullPath };
}

console.log('--- Checking CSS files for url(...) references ---');
const cssDir = path.join(publicDir, 'css');
let missingCount = 0;

fs.readdirSync(cssDir).forEach(file => {
  const content = fs.readFileSync(path.join(cssDir, file), 'utf8');
  const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    const raw = match[1];
    if (!raw.startsWith('http') && !raw.startsWith('data:') && !raw.startsWith('blob:')) {
      const res = checkFileExists(raw);
      if (res.exists) {
        console.log(`  ✅ CSS [${file}] -> ${raw}`);
      } else {
        console.error(`  ❌ MISSING in CSS [${file}]: ${raw}`);
        missingCount++;
      }
    }
  }
});

console.log('\n--- Checking JS files for asset path references ---');
const jsDir = path.join(publicDir, 'js');
fs.readdirSync(jsDir).forEach(file => {
  const content = fs.readFileSync(path.join(jsDir, file), 'utf8');
  const assetRegex = /['"](\/(?:assets|css|js|videos|uploads)\/[^'"]+)['"]/g;
  let match;
  while ((match = assetRegex.exec(content)) !== null) {
    const raw = match[1];
    const res = checkFileExists(raw);
    if (res.exists) {
      console.log(`  ✅ JS [${file}] -> ${raw}`);
    } else {
      console.error(`  ❌ MISSING in JS [${file}]: ${raw}`);
      missingCount++;
    }
  }
});

console.log('\n--- Checking index.html asset references ---');
const htmlContent = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
const htmlRegex = /(?:src|href)=["'](\/[^"'#?]+)["']/g;
let hMatch;
while ((hMatch = htmlRegex.exec(htmlContent)) !== null) {
  const raw = hMatch[1];
  if (raw.startsWith('/assets') || raw.startsWith('/css') || raw.startsWith('/js') || raw.startsWith('/favicon') || raw.startsWith('/apple') || raw.startsWith('/manifest')) {
    const res = checkFileExists(raw);
    if (res.exists) {
      console.log(`  ✅ HTML -> ${raw}`);
    } else {
      console.error(`  ❌ MISSING in HTML: ${raw}`);
      missingCount++;
    }
  }
}

console.log(`\nTOTAL MISSING ASSETS: ${missingCount}`);
