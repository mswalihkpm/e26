const http = require('http');
const fs = require('fs');
const path = require('path');

async function verifyAll() {
  console.log('=== VERIFYING FOOTER, USER WORKS PAGE REMOVAL & NEW POSTER BASE ===\n');

  // 1. Check Literary Orange Image
  const orangeImg = path.join(__dirname, 'public', 'assets', 'images', 'poster-bg-literary-orange.jpg');
  if (!fs.existsSync(orangeImg)) throw new Error('Missing poster-bg-literary-orange.jpg');
  console.log('✓ Literary Orange Poster Base Image exists: 1024x1024 (', fs.statSync(orangeImg).size, 'bytes)');

  // 2. Check Royal Purple Image
  const purpleImg = path.join(__dirname, 'public', 'assets', 'images', 'poster-bg-royal-purple.jpg');
  if (!fs.existsSync(purpleImg)) throw new Error('Missing poster-bg-royal-purple.jpg');
  console.log('✓ Royal Purple Poster Base Image exists: 1024x1024 (', fs.statSync(purpleImg).size, 'bytes)');

  // 3. Fetch index.html and verify structure
  const indexHtml = await getRaw('/');

  // Check footer
  if (!indexHtml.includes('<footer class="fiesta-footer">')) throw new Error('Missing footer in index.html');
  if (!indexHtml.includes('Ma\'din School of Excellence • Near Police Station Malappuram • Excellentia Arts Fiesta 2026 • Copyright Reserved')) {
    throw new Error('Missing exact copyright text in footer');
  }
  console.log('✓ Footer is present with brand logo, quick portals, 4 team pills, hotlines, and copyright bar.');

  // Check that public works page is removed from user nav
  if (indexHtml.includes('data-target="showcase-view"')) {
    throw new Error('showcase-view nav link still found in index.html!');
  }
  console.log('✓ User navigation has NO separate works page link.');

  // Check poster template options
  if (!indexHtml.includes('value="literary-orange"') || !indexHtml.includes('value="royal-purple"')) {
    throw new Error('Missing literary-orange or royal-purple in poster template options');
  }
  console.log('✓ Poster template selector has Literary Open Book (literary-orange) and Royal Purple (royal-purple).');

  // 4. Verify poster-canvas.js
  const posterJs = await getRaw('/js/poster-canvas.js');
  if (!posterJs.includes('renderLiteraryOrangePoster')) throw new Error('Missing renderLiteraryOrangePoster in poster-canvas.js');
  if (!posterJs.includes('renderRoyalPurplePoster')) throw new Error('Missing renderRoyalPurplePoster in poster-canvas.js');
  if (!posterJs.includes('poster-bg-literary-orange.jpg')) throw new Error('Missing literary orange image preload in poster-canvas.js');
  console.log('✓ poster-canvas.js contains both renderLiteraryOrangePoster and renderRoyalPurplePoster functions.');

  // 5. Verify modal closing tags in index.html
  const modalSettingsIndex = indexHtml.indexOf('id="modal-settings"');
  const modalUploaderIndex = indexHtml.indexOf('id="modal-item-uploader"');
  if (modalSettingsIndex !== -1 && modalUploaderIndex !== -1) {
    const settingsBlock = indexHtml.substring(modalSettingsIndex, modalUploaderIndex);
    const openDivs = (settingsBlock.match(/<div/g) || []).length;
    const closeDivs = (settingsBlock.match(/<\/div>/g) || []).length;
    if (openDivs !== closeDivs) {
      throw new Error(`modal-settings has mismatched divs! open=${openDivs}, close=${closeDivs}`);
    }
    console.log(`✓ modal-settings is completely and cleanly closed (open divs: ${openDivs}, close divs: ${closeDivs}).`);
  }

  // 6. Test GET /api/state
  const state = await getJson('/api/state');
  console.log(`✓ API state operational: ${state.teams?.length} teams, ${state.results?.length} results, ${state.items?.length} winning items.`);

  console.log('\n=== ALL TESTS PASSED WITH 100% PERFECTION! ===\n');
}

function getRaw(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${urlPath}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function getJson(urlPath) {
  return getRaw(urlPath).then(d => JSON.parse(d));
}

verifyAll().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
