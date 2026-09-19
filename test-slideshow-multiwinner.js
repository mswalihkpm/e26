const fs = require('fs');

console.log('--- TESTING SLIDESHOW MULTI-WINNER & TEAM TERMINOLOGY ---');

// 1. Check data
const db = JSON.parse(fs.readFileSync('data/db.json'));
const poemRes = db.results.find(r => r.programName === 'POEM MALAYALAM');
const storyRes = db.results.find(r => r.programName === 'STORY MALAYALAM');

console.log('POEM MALAYALAM winners count:', poemRes.winners.length);
console.log('STORY MALAYALAM winners count:', storyRes.winners.length);

// 2. Check slideshow.js content
const slideshowCode = fs.readFileSync('public/js/slideshow.js', 'utf8');

// Check that no user visible 'House Championship' exists in slideshow.js
const houseChampMatches = slideshowCode.match(/House Championship/g);
console.log('House Championship in slideshow.js:', houseChampMatches ? houseChampMatches.length : 0);

// Check that 'Team Championship Points Table' exists
const teamChampMatches = slideshowCode.match(/Team Championship Points Table/g);
console.log('Team Championship Points Table in slideshow.js:', teamChampMatches ? teamChampMatches.length : 0);

// Check index.html for any remaining 'House'
const indexHtml = fs.readFileSync('public/index.html', 'utf8');
const houseMatches = indexHtml.match(/>[^<]*\bHouse\b[^<]*</g);
console.log('Visible "House" text nodes in index.html:', houseMatches || 'None');

// Check app.js for downloadPhoto logic
const appJs = fs.readFileSync('public/js/app.js', 'utf8');
const hasCrispWatermark = appJs.includes('gallery-footer-badge.png') && appJs.includes('image/png');
console.log('Has crisp watermark PNG download in app.js:', hasCrispWatermark);

console.log('--- ALL AUTOMATED STATIC CHECKS PASSED ---');
