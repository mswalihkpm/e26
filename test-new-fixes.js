const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${urlPath}`, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(data)
      }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('TESTING HEADER/FOOTER SETTINGS, WINNING WORKS SUPPRESSION & NEW PWA LOGO');
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

  // 1. Header & Footer Settings
  console.log('[1/4] Testing Header and Footer Settings Icon Placement...');
  const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
  assert(!indexHtml.includes('id="btn-open-settings"'), 'Header no longer contains #btn-open-settings button');
  assert(indexHtml.includes('id="btn-footer-settings-btn"'), 'Footer contains #btn-footer-settings-btn button');
  
  const compCss = fs.readFileSync(path.join(__dirname, 'public', 'css', 'components.css'), 'utf-8');
  assert(compCss.includes('.btn-footer-settings'), 'components.css contains .btn-footer-settings styles');

  const appJs = fs.readFileSync(path.join(__dirname, 'public', 'js', 'app.js'), 'utf-8');
  assert(appJs.includes('btn-footer-settings-btn'), 'app.js wires up btn-footer-settings-btn to open settings modal');

  // 2. Winning Works Empty Message Suppression
  console.log('\n[2/4] Testing Winning Works Message Suppression for Users...');
  assert(indexHtml.includes('id="poster-works-section" style="display: none;"'), 'index.html has poster-works-section hidden by default');
  
  const posterCanvasJs = fs.readFileSync(path.join(__dirname, 'public', 'js', 'poster-canvas.js'), 'utf-8');
  assert(posterCanvasJs.includes('worksSection.style.display = \'none\''), 'poster-canvas.js hides section when eventItems is empty');
  assert(!posterCanvasJs.includes('No uploaded literary works, calligraphy, or recitals for this result yet'), 'poster-canvas.js does NOT display empty state message when no works exist');

  // 3. PWA Icons Generated from New Official Logo
  console.log('\n[3/4] Testing PWA Icons Generated from New Official Logo...');
  const iconFiles = [
    { file: 'icon-16.png', size: 16 },
    { file: 'icon-32.png', size: 32 },
    { file: 'icon-48.png', size: 48 },
    { file: 'icon-72.png', size: 72 },
    { file: 'icon-96.png', size: 96 },
    { file: 'icon-128.png', size: 128 },
    { file: 'icon-144.png', size: 144 },
    { file: 'icon-152.png', size: 152 },
    { file: 'icon-180.png', size: 180 },
    { file: 'icon-192.png', size: 192 },
    { file: 'icon-384.png', size: 384 },
    { file: 'icon-512.png', size: 512 },
    { file: 'icon-1024.png', size: 1024 },
    { file: 'icon-maskable-192.png', size: 192 },
    { file: 'icon-maskable-512.png', size: 512 }
  ];

  for (const item of iconFiles) {
    const filePath = path.join(__dirname, 'public', 'assets', 'images', 'icons', item.file);
    assert(fs.existsSync(filePath), `Icon file ${item.file} exists on disk`);
    const meta = await sharp(filePath).metadata();
    assert(meta.width === item.size && meta.height === item.size, `${item.file} has exact ${item.size}x${item.size} 1:1 dimensions`);
  }

  // 4. HTTP Serving of Favicon and PWA Assets
  console.log('\n[4/4] Testing HTTP Serving of PWA and Favicon Assets...');
  const icoRes = await get('/favicon.ico');
  assert(icoRes.status === 200, 'favicon.ico served with HTTP 200');
  const appleRes = await get('/apple-touch-icon.png');
  assert(appleRes.status === 200, 'apple-touch-icon.png served with HTTP 200');
  const icon192Res = await get('/assets/images/icons/icon-192.png');
  assert(icon192Res.status === 200, 'icon-192.png served with HTTP 200');
  const icon512Res = await get('/assets/images/icons/icon-512.png');
  assert(icon512Res.status === 200, 'icon-512.png served with HTTP 200');

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
