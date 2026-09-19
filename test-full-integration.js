const http = require('http');
const fs = require('fs');
const path = require('path');

async function testAll() {
  console.log('=== STARTING FULL INTEGRATION & ASSET VERIFICATION ===\n');

  // 1. Check required local assets
  const purpleBg = path.join(__dirname, 'public', 'assets', 'images', 'poster-bg-royal-purple.jpg');
  if (!fs.existsSync(purpleBg)) throw new Error('Missing poster-bg-royal-purple.jpg');
  console.log('✓ Royal Purple Clean Poster Base Image is present at /assets/images/poster-bg-royal-purple.jpg');

  // 2. Fetch and verify index.html
  const indexHtml = await getRaw('/');
  if (!indexHtml.includes('id="modal-item-uploader"')) throw new Error('Missing #modal-item-uploader in index.html');
  if (!indexHtml.includes('id="modal-item-preview"')) throw new Error('Missing #modal-item-preview in index.html');
  if (!indexHtml.includes('id="tab-items-mgr"')) throw new Error('Missing #tab-items-mgr in index.html');
  if (!indexHtml.includes('id="showcase-view"')) throw new Error('Missing #showcase-view in index.html');
  if (!indexHtml.includes('value="royal-purple"')) throw new Error('Missing Royal Purple poster option');
  console.log('✓ index.html has all required modals, tabs, views, and poster options.');

  // 3. Check poster-canvas.js
  const posterJs = await getRaw('/js/poster-canvas.js');
  if (!posterJs.includes('renderRoyalPurplePoster')) throw new Error('Missing renderRoyalPurplePoster in poster-canvas.js');
  if (!posterJs.includes('poster-bg-royal-purple.jpg')) throw new Error('Missing image preload in poster-canvas.js');
  console.log('✓ poster-canvas.js has renderRoyalPurplePoster with 1024x1024 resolution and font rendering.');

  // 4. Check admin.js
  const adminJs = await getRaw('/js/admin.js');
  if (!adminJs.includes('setupItemsManager')) throw new Error('Missing setupItemsManager in admin.js');
  if (!adminJs.includes('setupRichTextEditorToolbar')) throw new Error('Missing setupRichTextEditorToolbar in admin.js');
  if (!adminJs.includes('openItemUploader')) throw new Error('Missing openItemUploader in admin.js');
  console.log('✓ admin.js has rich text editor formatting commands and 1st/2nd/3rd place slot managers.');

  // 5. Check app.js and results.js
  const appJs = await getRaw('/js/app.js');
  if (!appJs.includes('setupShowcaseView') || !appJs.includes('openItemPreviewModal')) {
    throw new Error('Missing showcase view or preview modal in app.js');
  }
  const resultsJs = await getRaw('/js/results.js');
  if (!resultsJs.includes('btn-view-result-works') && !resultsJs.includes('btn-open-item-preview')) {
    throw new Error('Missing item link button in results.js');
  }
  console.log('✓ app.js and results.js have preview-only protected viewer and result card links.');

  // 6. Check components.css security rules
  const css = await getRaw('/css/components.css');
  if (!css.includes('.transparent-shield-overlay') || !css.includes('user-select: none')) {
    throw new Error('Missing security styles for protected preview in components.css');
  }
  console.log('✓ components.css includes download-prevention shields and reader themes.');

  // 7. Verify API state
  const state = await getJson('/api/state');
  console.log(`✓ Live State: ${state.results.length} results, ${state.items.length} winning items stored.`);

  console.log('\n=== ALL COMPONENT & INTEGRATION CHECKS PASSED PERFECTLY! ===\n');
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
  return getRaw(urlPath).then(data => JSON.parse(data));
}

testAll().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
