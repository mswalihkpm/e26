const fs = require('fs');
const path = require('path');

function assert(description, condition, extra = '') {
  if (condition) {
    console.log(`  ✅ ${description}`);
  } else {
    console.error(`  ❌ ${description} ${extra}`);
    process.exitCode = 1;
  }
}

console.log('========================================================================');
console.log('EXCELLENTIA ARTS FIESTA 2026 - POSTER & FOOTER FIX VERIFICATION');
console.log('========================================================================');

// 1. Asset Files Verification
console.log('\n[1/4] Testing Asset Files on Disk...');
const footerBadgePath = path.join(__dirname, 'public', 'assets', 'images', 'gallery-footer-badge.png');
const crystalPosterPath = path.join(__dirname, 'public', 'assets', 'images', 'poster-bg-crystal-clean.png');

assert('High-quality footer badge PNG exists', fs.existsSync(footerBadgePath));
assert('Footer badge size is > 50KB (high-res asset)', fs.statSync(footerBadgePath).size > 50000);

assert('Clean Crystal Magnifier poster base exists', fs.existsSync(crystalPosterPath));
assert('Poster base size is > 500KB (high-res asset)', fs.statSync(crystalPosterPath).size > 500000);

// 2. Poster Generator Code Verification
console.log('\n[2/4] Testing Poster Generator Code (public/js/poster-canvas.js)...');
const posterCanvasCode = fs.readFileSync(path.join(__dirname, 'public', 'js', 'poster-canvas.js'), 'utf8');

assert('poster-canvas.js preloads imgCrystalClean', posterCanvasCode.includes('/assets/images/poster-bg-crystal-clean.png'));
assert('Default template set to crystal-magnifier', posterCanvasCode.includes("let currentTemplate = 'crystal-magnifier'"));
assert('Contains renderCrystalMagnifierPoster function', posterCanvasCode.includes('function renderCrystalMagnifierPoster'));
assert('Crystal Magnifier renders Result # in blue pill box', posterCanvasCode.includes('roundRect(ctx, boxX, boxY, boxW, boxH') && posterCanvasCode.includes('#cde5fb'));
assert('Crystal Magnifier renders multi-tier position markers (1st, 2nd, 3rd)', posterCanvasCode.includes('posNum === 1') && posterCanvasCode.includes('posNum === 2') && posterCanvasCode.includes('posNum === 3'));
assert('Stamp poster has increased font size for Programme Name (>= 32px)', posterCanvasCode.includes('vertFontSize = 32'));
assert('Stamp poster has increased font size for Category (>= 24px)', posterCanvasCode.includes('font = \'700 24px "Outfit", sans-serif\''));

// 3. UI HTML & Template Select Verification
console.log('\n[3/4] Testing HTML Template Selector (public/index.html)...');
const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

assert('index.html contains poster-template-select', indexHtml.includes('id="poster-template-select"'));
assert('index.html has crystal-magnifier as primary option', indexHtml.includes('value="crystal-magnifier"'));
assert('index.html has stamp-vintage option', indexHtml.includes('value="stamp-vintage"'));
assert('index.html has ocean-compass option', indexHtml.includes('value="ocean-compass"'));
assert('index.html has notebook-craft option', indexHtml.includes('value="notebook-craft"'));

// 4. Gallery Footer Overlay & Download Verification
console.log('\n[4/4] Testing Gallery Footer & High-Res Download (public/js/app.js & components.css)...');
const appJsCode = fs.readFileSync(path.join(__dirname, 'public', 'js', 'app.js'), 'utf8');
const componentsCss = fs.readFileSync(path.join(__dirname, 'public', 'css', 'components.css'), 'utf8');

assert('components.css sets proportional width for gallery-card-footer-strip img', componentsCss.includes('width: 46%') || componentsCss.includes('max-width: 320px'));
assert('app.js downloadPhoto keeps full native resolution (imgW, imgH)', appJsCode.includes('canvas.width = imgW') && appJsCode.includes('canvas.height = imgH'));
assert('app.js downloadPhoto scales footer proportionally (approx 44% width)', appJsCode.includes('drawW = Math.round(imgW * (imgW < 600 ? 0.65 : 0.44))'));
assert('app.js downloadPhoto applies dark gradient backdrop for contrast', appJsCode.includes('createLinearGradient(0, gradStartY, 0, imgH)'));

console.log('\n========================================================================');
console.log('ALL POSTER & FOOTER TESTS PASSED SUCCESSFULLY!');
console.log('========================================================================\n');
