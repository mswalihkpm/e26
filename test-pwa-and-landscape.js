const http = require('http');
const fs = require('fs');
const path = require('path');

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('TESTING PWA INSTALLATION & MOBILE LANDSCAPE SLIDESHOW THEATER');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Manifest.json
  console.log('[1/5] Testing PWA Web App Manifest...');
  const manifestRes = await get('/manifest.json');
  assert(manifestRes.status === 200, 'manifest.json served with HTTP 200');
  try {
    const manifest = JSON.parse(manifestRes.body);
    assert(manifest.name === 'Excellentia Arts Fiesta 2026', 'Manifest name matches');
    assert(manifest.short_name === 'Excellentia 2026', 'Manifest short_name matches');
    assert(manifest.display === 'standalone', 'Manifest display is standalone');
    assert(manifest.icons && manifest.icons.length >= 2, 'Manifest contains 192px and 512px icons');
  } catch (e) {
    assert(false, 'Manifest JSON parse failed');
  }

  // 2. Service Worker
  console.log('\n[2/5] Testing Service Worker (sw.js)...');
  const swRes = await get('/sw.js');
  assert(swRes.status === 200, 'sw.js served with HTTP 200');
  assert(swRes.body.includes('excellentia-arts-fiesta-2026-v'), 'sw.js contains versioned cache name');
  assert(swRes.body.includes('self.addEventListener(\'install\''), 'sw.js contains install handler');
  assert(swRes.body.includes('self.addEventListener(\'fetch\''), 'sw.js contains fetch handler');

  // 3. Icons
  console.log('\n[3/5] Testing PWA App Icons...');
  const icon192 = await get('/assets/images/icons/icon-192.png');
  assert(icon192.status === 200, 'icon-192.png served with HTTP 200');
  const icon512 = await get('/assets/images/icons/icon-512.png');
  assert(icon512.status === 200, 'icon-512.png served with HTTP 200');
  const iconMaskable192 = await get('/assets/images/icons/icon-maskable-192.png');
  assert(iconMaskable192.status === 200, 'icon-maskable-192.png served with HTTP 200');
  const iconMaskable512 = await get('/assets/images/icons/icon-maskable-512.png');
  assert(iconMaskable512.status === 200, 'icon-maskable-512.png served with HTTP 200');
  const faviconIco = await get('/favicon.ico');
  assert(faviconIco.status === 200, 'favicon.ico served with HTTP 200');
  const appleTouchIcon = await get('/apple-touch-icon.png');
  assert(appleTouchIcon.status === 200, 'apple-touch-icon.png served with HTTP 200');

  // 4. HTML & JS PWA Triggers
  console.log('\n[4/5] Testing HTML & JS PWA Components...');
  const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
  assert(indexHtml.includes('rel="manifest" href="/manifest.json"'), 'index.html links manifest.json');
  assert(!indexHtml.includes('id="btn-pwa-install"'), 'index.html has removed #btn-pwa-install from header');
  assert(indexHtml.includes('id="btn-footer-pwa-install"'), 'index.html has #btn-footer-pwa-install in footer');
  assert(indexHtml.includes('id="btn-drawer-pwa-install"'), 'index.html has #btn-drawer-pwa-install in drawer');
  assert(indexHtml.includes('id="pwa-install-banner"'), 'index.html has #pwa-install-banner floating bar');
  assert(indexHtml.includes('id="modal-ios-install-guide"'), 'index.html has #modal-ios-install-guide modal');
  assert(indexHtml.includes('id="ss-btn-rotate-landscape"'), 'index.html has #ss-btn-rotate-landscape theater button');
  assert(indexHtml.includes('src="/js/pwa.js"'), 'index.html includes pwa.js script');

  const pwaJs = fs.readFileSync(path.join(__dirname, 'public', 'js', 'pwa.js'), 'utf-8');
  assert(pwaJs.includes('beforeinstallprompt'), 'pwa.js intercepts beforeinstallprompt event');
  assert(pwaJs.includes('triggerPWAInstall'), 'pwa.js exposes window.triggerPWAInstall()');
  assert(pwaJs.includes('isStandalone'), 'pwa.js checks standalone display mode');
  assert(pwaJs.includes('btn-footer-pwa-install'), 'pwa.js targets btn-footer-pwa-install');

  const slideshowJs = fs.readFileSync(path.join(__dirname, 'public', 'js', 'slideshow.js'), 'utf-8');
  assert(slideshowJs.includes('toggleLandscapeMode'), 'slideshow.js contains toggleLandscapeMode()');
  assert(slideshowJs.includes('KeyL'), 'slideshow.js supports KeyL shortcut');
  assert(slideshowJs.includes('orientation.lock(\'landscape\')'), 'slideshow.js locks landscape orientation');

  // 5. CSS Landscape & PWA Styles
  console.log('\n[5/5] Testing CSS Landscape & PWA Styling...');
  const compCss = fs.readFileSync(path.join(__dirname, 'public', 'css', 'components.css'), 'utf-8');
  assert(compCss.includes('.pwa-install-banner'), 'components.css has .pwa-install-banner styles');
  assert(compCss.includes('.btn-footer-install'), 'components.css has .btn-footer-install pulse animation');
  assert(compCss.includes('#modal-ios-install-guide.active'), 'components.css has #modal-ios-install-guide.active');
  assert(compCss.includes('@media (max-width: 950px) and (orientation: landscape)'), 'components.css has mobile landscape media query');
  assert(compCss.includes('grid-template-columns: 1.12fr 1fr 1fr !important;'), 'components.css sets 3-column victory arena in landscape');
  assert(compCss.includes('grid-template-columns: repeat(4, 1fr) !important;'), 'components.css sets 4-team horizontal row in landscape');

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
