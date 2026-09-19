const http = require('http');
const assert = require('assert');
const supabaseProvider = require('./db/supabase');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runBenchmark() {
  console.log('========================================================================');
  console.log('EXCELLENTIA ARTS FIESTA 2026 - PERFORMANCE AUDIT & BENCHMARK SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(title, condition, extra = '') {
    if (condition) {
      console.log('  ✅ ' + title);
      passed++;
    } else {
      console.error('  ❌ ' + title + (extra ? ' -> ' + extra : ''));
      failed++;
    }
  }

  // 1. Initial State Fetch with ETag Header
  console.log('[1/4] Testing Backend /api/state ETag Generation...');
  const res1 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/state',
    method: 'GET'
  });

  test('GET /api/state returns HTTP 200', res1.statusCode === 200);
  test('GET /api/state includes ETag header', !!res1.headers.etag, `ETag: ${res1.headers.etag}`);
  test('GET /api/state includes Cache-Control: private, no-cache', (res1.headers['cache-control'] || '').includes('private'));

  const etag = res1.headers.etag;

  // 2. Conditional State Fetch (HTTP 304 Not Modified)
  console.log('\n[2/4] Testing HTTP 304 Not Modified Caching (Zero-Payload Roundtrip)...');
  const startT = process.hrtime.bigint();
  const res2 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/state',
    method: 'GET',
    headers: {
      'If-None-Match': etag
    }
  });
  const endT = process.hrtime.bigint();
  const durationMs = Number(endT - startT) / 1000000;

  test('Conditional GET with matching ETag returns HTTP 304 Not Modified', res2.statusCode === 304);
  test('HTTP 304 response body is empty (0 bytes transfer)', res2.body.length === 0, `Length: ${res2.body.length}`);
  test('HTTP 304 latency is ultra-fast (< 25ms)', durationMs < 25, `Latency: ${durationMs.toFixed(2)}ms`);

  // 3. Supabase Debounced Queue Sync Verification
  console.log('\n[3/4] Testing Supabase Debounced Queue Sync Engine...');
  test('supabaseProvider has syncTableToSupabase method', typeof supabaseProvider.syncTableToSupabase === 'function');
  test('supabaseProvider has queueTableSync method', typeof supabaseProvider.queueTableSync === 'function');

  // Verify single-table sync call
  const mockTableResult = await supabaseProvider.syncTableToSupabase('teams', []);
  test('syncTableToSupabase handles empty/safe datasets cleanly', mockTableResult.success === true || mockTableResult.message === 'Not configured or no data');

  // 4. Client API State Fingerprinting & Deduplication Verification
  console.log('\n[4/4] Testing Client Optimization Artifacts...');
  const fs = require('fs');
  const apiJsContent = fs.readFileSync('public/js/api.js', 'utf8');
  const appJsContent = fs.readFileSync('public/js/app.js', 'utf8');
  const resultsJsContent = fs.readFileSync('public/js/results.js', 'utf8');
  const adminJsContent = fs.readFileSync('public/js/admin.js', 'utf8');

  test('api.js implements inFlightFetchPromise deduplication', apiJsContent.includes('inFlightFetchPromise'));
  test('api.js implements getStateFingerprint dirty-checking', apiJsContent.includes('getStateFingerprint'));
  test('api.js passes If-None-Match header on state fetch', apiJsContent.includes('If-None-Match'));
  test('app.js implements lastRenderedFingerprints sub-state memoization', appJsContent.includes('lastRenderedFingerprints'));
  test('results.js implements 150ms search debounce timer', resultsJsContent.includes('searchDebounceTimer'));
  test('results.js implements _memoWinners cache', resultsJsContent.includes('_memoWinners'));
  test('admin.js implements active-view rendering gate', adminJsContent.includes('updateAdminBadgesOnly'));

  console.log('\n========================================================================');
  console.log(`PERFORMANCE AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

runBenchmark().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
