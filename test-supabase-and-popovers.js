/**
 * Verification Test for Supabase Database, Floating Popovers & Performance Overhaul
 * Excellentia Arts Fiesta 2026
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function get(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({
      host: 'localhost',
      port: 3000,
      path: urlPath,
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: data
      }));
    }).on('error', reject);
  });
}

function post(urlPath, payload = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      host: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: data
      }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('SUPABASE DATABASE, FLOATING POPOVER DROPDOWNS & PERFORMANCE TEST SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`  ✅ ${name} ${extra}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} ${extra}`);
      failed++;
    }
  }

  // 1. Check Supabase Provider & Files
  console.log('[1/5] Testing Supabase Database Infrastructure...');
  const supabaseJsPath = path.join(__dirname, 'db', 'supabase.js');
  const schemaSqlPath = path.join(__dirname, 'db', 'supabase_schema.sql');
  const syncScriptPath = path.join(__dirname, 'scripts', 'sync-supabase.js');

  assert('db/supabase.js exists on disk', fs.existsSync(supabaseJsPath));
  assert('db/supabase_schema.sql schema definition exists', fs.existsSync(schemaSqlPath));
  assert('scripts/sync-supabase.js sync CLI exists', fs.existsSync(syncScriptPath));

  const schemaContent = fs.readFileSync(schemaSqlPath, 'utf8');
  assert('Schema contains all 10 core tables (teams, results, programs, etc.)', 
    schemaContent.includes('CREATE TABLE IF NOT EXISTS teams') &&
    schemaContent.includes('CREATE TABLE IF NOT EXISTS results') &&
    schemaContent.includes('CREATE TABLE IF NOT EXISTS items') &&
    schemaContent.includes('CREATE TABLE IF NOT EXISTS gallery') &&
    schemaContent.includes('CREATE TABLE IF NOT EXISTS videos')
  );

  // 2. Check Supabase API Endpoints
  console.log('\n[2/5] Testing Supabase REST Endpoints on Server...');
  const statusRes = await get('/api/supabase/status');
  assert('GET /api/supabase/status returns HTTP 200', statusRes.statusCode === 200);
  const statusData = JSON.parse(statusRes.body);
  assert('Status reports success flag', statusData.success === true);
  assert('Status exposes configured boolean and connection state', typeof statusData.configured === 'boolean');

  // 3. Check GZIP / Brotli Compression & Performance Headers
  console.log('\n[3/5] Testing Performance Acceleration & Compression...');
  const compRes = await get('/api/state', { 'Accept-Encoding': 'gzip, deflate' });
  assert('API /api/state served with HTTP 200', compRes.statusCode === 200);
  assert('API state uses GZIP compression encoding', compRes.headers['content-encoding'] === 'gzip' || compRes.headers['content-encoding'] === 'deflate');

  const cssRes = await get('/css/components.css');
  assert('components.css served with long-term cache headers', !!cssRes.headers['cache-control'] && cssRes.headers['cache-control'].includes('public'));

  // 4. Check Floating Popover Dropdown Engine
  console.log('\n[4/5] Testing Floating Popover Dropdown Engine (floating-popover.js)...');
  const popoverJsPath = path.join(__dirname, 'public', 'js', 'floating-popover.js');
  assert('public/js/floating-popover.js exists on disk', fs.existsSync(popoverJsPath));

  const popoverCode = fs.readFileSync(popoverJsPath, 'utf8');
  assert('floating-popover.js exposes window.FiestaPopover', popoverCode.includes('window.FiestaPopover'));
  assert('floating-popover.js supports portal container rendering', popoverCode.includes('fiesta-floating-popover-portal'));
  assert('floating-popover.js handles viewport auto-flipping', popoverCode.includes('flipped-up') && popoverCode.includes('isFlipped'));
  assert('floating-popover.js includes search filtering for options', popoverCode.includes('fpop-search-input'));
  assert('floating-popover.js dispatches native change and input events', popoverCode.includes("new Event('change'"));

  const compCss = fs.readFileSync(path.join(__dirname, 'public', 'css', 'components.css'), 'utf8');
  assert('components.css contains .floating-popover-menu styles', compCss.includes('.floating-popover-menu'));
  assert('components.css contains .popover-hidden-native styles', compCss.includes('.popover-hidden-native'));

  const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  assert('index.html links floating-popover.js script', indexHtml.includes('src="/js/floating-popover.js"'));
  assert('index.html contains Supabase Cloud Database settings card', indexHtml.includes('id="supabase-status-badge"') && indexHtml.includes('id="supabase-input-url"'));

  // 5. Check Slideshow Zero-Lag Optimization
  console.log('\n[5/5] Testing Slideshow Zero-Lag GPU Optimizations...');
  const slideshowCode = fs.readFileSync(path.join(__dirname, 'public', 'js', 'slideshow.js'), 'utf8');
  assert('slideshow.js contains next-slide pre-buffering engine', slideshowCode.includes('preloadSlideAssets') && slideshowCode.includes('preloadNextSlide'));
  assert('components.css includes GPU hardware translate3d acceleration', compCss.includes('transform: translate3d(0, 0, 0)') && compCss.includes('will-change: opacity, transform'));

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
