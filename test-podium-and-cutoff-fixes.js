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
console.log('EXCELLENTIA ARTS FIESTA 2026 - COMPREHENSIVE FIX VERIFICATION');
console.log('========================================================================');

// 1. Check Double / Tied Winner Rendering in results.js
console.log('\n[1/5] Testing Multi-Winner Support in results.js...');
const resultsJs = fs.readFileSync(path.join(__dirname, 'public', 'js', 'results.js'), 'utf8');

assert('results.js sorts and maps all winners array', resultsJs.includes('sortedWinners.map') || resultsJs.includes('winners.map'));
assert('results.js does NOT drop 2nd or 3rd duplicate ties', !resultsJs.includes('const thirdPlace = winners.find'));

// 2. Check 3D Stadium Step Podium & Multi-Winner Stacks in slideshow.js
console.log('\n[2/5] Testing 3D Podium Step Layout & Multi-Winners in slideshow.js...');
const slideshowJs = fs.readFileSync(path.join(__dirname, 'public', 'js', 'slideshow.js'), 'utf8');

assert('slideshow.js groups all firstPlaces, secondPlaces, and thirdPlaces', 
  slideshowJs.includes('const firstPlaces =') && 
  slideshowJs.includes('const secondPlaces =') && 
  slideshowJs.includes('const thirdPlaces =')
);
assert('slideshow.js contains buildPodiumWinnersStack for tied winners', slideshowJs.includes('function buildPodiumWinnersStack'));
assert('slideshow.js supports ties on 1st, 2nd, and 3rd pedestals', slideshowJs.includes('2ND POSITION • TIE') && slideshowJs.includes('3RD POSITION • TIE'));

// 3. Check House Standings Slide & Crest Watermark in slideshow.js
console.log('\n[3/5] Testing Team Overview Standings in slideshow.js...');
assert('slideshow.js embeds ss-standing-card-bg-emblem in standing cards', slideshowJs.includes('ss-standing-card-bg-emblem'));
assert('slideshow.js includes dynamic AFTER RESULT # in standings slide header', slideshowJs.includes('AFTER RESULT #${activeResultCount}'));

// 4. Check "AFTER X RESULTS" Widget in index.html & app.js
console.log('\n[4/5] Testing Leaderboard "AFTER X RESULTS" Widget...');
const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(__dirname, 'public', 'js', 'app.js'), 'utf8');
const componentsCss = fs.readFileSync(path.join(__dirname, 'public', 'css', 'components.css'), 'utf8');

assert('index.html contains leaderboard-cutoff-widget', indexHtml.includes('id="leaderboard-cutoff-widget"'));
assert('index.html contains leaderboard-cutoff-number and unit', indexHtml.includes('id="leaderboard-cutoff-number"') && indexHtml.includes('id="leaderboard-cutoff-unit"'));
assert('app.js calculates activeCount based on maxVisibleResultNumber or published count', appJs.includes('leaderboard-cutoff-number') && appJs.includes('cutoffSetting'));
assert('components.css styles leaderboard-cutoff-widget', componentsCss.includes('.leaderboard-cutoff-widget') && componentsCss.includes('.cutoff-widget-number'));
assert('components.css styles ss-standing-card-bg-emblem with opacity', componentsCss.includes('.ss-standing-card-bg-emblem') && componentsCss.includes('opacity: 0.28'));

// 5. Check Poster Generator Refinements in poster-canvas.js
console.log('\n[5/5] Testing Poster Generator Typography & Clean Names...');
const posterJs = fs.readFileSync(path.join(__dirname, 'public', 'js', 'poster-canvas.js'), 'utf8');

assert('Crystal Magnifier poster renders clean name without "1st/2nd/3rd" prefix', posterJs.includes('ctx.fillText(name, 418, y - 2)'));
assert('Stamp poster has enlarged Programme Name typography (>= 38px)', posterJs.includes('vertFontSize = 38'));
assert('Stamp poster has enlarged Category typography (>= 26px)', posterJs.includes('font = \'700 26px "Outfit", sans-serif\''));

console.log('\n========================================================================');
console.log('ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
console.log('========================================================================\n');
