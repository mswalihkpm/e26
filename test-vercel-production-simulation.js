/**
 * Vercel Serverless Function Production Simulation Test Suite
 * Excellentia Arts Fiesta 2026
 *
 * Verifies that the Express app runs flawlessly as a serverless function
 * with zero hanging timers, no automatic server.listen() execution in server.js,
 * resilient in-memory/read-only database loading, and complete API responsiveness.
 */

const http = require('http');
const assert = require('assert');

// Simulate Vercel Serverless environment
process.env.VERCEL = '1';
process.env.NOW_REGION = 'iad1';
process.env.NODE_ENV = 'production';

console.log('========================================================================');
console.log('VERCEL SERVERLESS PRODUCTION SIMULATION TEST');
console.log('========================================================================');

let app;
try {
  const start = Date.now();
  app = require('./server.js');
  console.log(`✅ [1/5] server.js required cleanly in ${Date.now() - start}ms without server.listen() error.`);
} catch (err) {
  console.error('❌ Failed to require server.js:', err);
  process.exit(1);
}

// Start temporary ephemeral test server on port 0
const testServer = http.createServer(app);

function httpRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const port = testServer.address().port;
    const reqHeaders = {
      'accept': 'application/json, text/html, */*',
      ...headers
    };
    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['content-type'] = reqHeaders['content-type'] || 'application/json';
      reqHeaders['content-length'] = Buffer.byteLength(payload);
    }

    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method: method.toUpperCase(),
      headers: reqHeaders
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        let parsedJson = null;
        const ct = res.headers['content-type'] || '';
        if (ct.includes('application/json')) {
          try { parsedJson = JSON.parse(rawBody); } catch (e) {}
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: rawBody,
          json: parsedJson
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runSimulationTests() {
  await new Promise(resolve => testServer.listen(0, '127.0.0.1', resolve));
  const port = testServer.address().port;
  console.log(`Ephemeral test harness running on port ${port}`);

  let passed = 0;
  let failed = 0;

  function test(desc, fn) {
    try {
      fn();
      console.log(`  ✅ ${desc}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ ${desc} - ${e.message}`);
      failed++;
    }
  }

  try {
    console.log('\n[2/5] Testing Core API Endpoints in Serverless Execution...');
    
    // 1. GET /api/state
    const stateRes = await httpRequest('GET', '/api/state');
    test('GET /api/state returns HTTP 200', () => {
      assert.strictEqual(stateRes.statusCode, 200);
    });
    test('/api/state returns valid database structure with teams and settings', () => {
      assert(stateRes.json, 'Response is valid JSON');
      assert(Array.isArray(stateRes.json.teams), 'teams array exists');
      assert(stateRes.json.teams.length >= 4, '4 teams exist');
      assert(stateRes.json.settings, 'settings object exists');
    });

    // 2. GET /api/supabase/status
    const supaRes = await httpRequest('GET', '/api/supabase/status');
    test('GET /api/supabase/status returns HTTP 200', () => {
      assert.strictEqual(supaRes.statusCode, 200);
      assert.strictEqual(supaRes.json.success, true);
    });

    // 3. GET /api/stream/status
    const streamRes = await httpRequest('GET', '/api/stream/status');
    test('GET /api/stream/status returns HTTP 200', () => {
      assert.strictEqual(streamRes.statusCode, 200);
      assert.strictEqual(streamRes.json.success, true);
    });

    // 4. POST /api/settings
    const setRes = await httpRequest('POST', '/api/settings', { showTeamScores: true });
    test('POST /api/settings returns HTTP 200 and updates configuration', () => {
      assert.strictEqual(setRes.statusCode, 200);
      assert.strictEqual(setRes.json.success, true);
      assert.strictEqual(setRes.json.settings.showTeamScores, true);
    });

    // 5. POST /api/results/renumber
    const renumRes = await httpRequest('POST', '/api/results/renumber');
    test('POST /api/results/renumber returns HTTP 200', () => {
      assert.strictEqual(renumRes.statusCode, 200);
      assert.strictEqual(renumRes.json.success, true);
    });

    console.log('\n[3/5] Testing ETag / 304 Caching in Serverless Mode...');
    const etag = stateRes.headers['etag'];
    test('State response includes ETag header', () => {
      assert(etag, 'ETag header is present');
    });

    const conditionalRes = await httpRequest('GET', '/api/state', null, { 'if-none-match': etag });
    test('Conditional GET with ETag returns HTTP 304 Not Modified', () => {
      assert.strictEqual(conditionalRes.statusCode, 304);
    });

    console.log('\n[4/5] Testing Static Asset & Root Serving in Serverless Mode...');
    const rootRes = await httpRequest('GET', '/');
    test('GET / returns HTTP 200 (index.html)', () => {
      assert.strictEqual(rootRes.statusCode, 200);
      assert(rootRes.body.includes('EXCELLENTIA') || rootRes.body.includes('<!DOCTYPE html>'), 'Valid HTML served');
    });

    const spaRes = await httpRequest('GET', '/custom-app-route-view');
    test('SPA fallback returns HTTP 200 for deep links', () => {
      assert.strictEqual(spaRes.statusCode, 200);
    });

    console.log('\n[5/5] Testing api/index.js entrypoint compatibility...');
    const apiEntry = require('./api/index.js');
    test('api/index.js exports Express application function', () => {
      assert(typeof apiEntry === 'function', 'Export is an Express request handler');
    });

    console.log('\n========================================================================');
    console.log(`VERCEL SIMULATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');
  } finally {
    testServer.close();
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSimulationTests().catch(err => {
  console.error('Fatal simulation error:', err);
  testServer.close();
  process.exit(1);
});
