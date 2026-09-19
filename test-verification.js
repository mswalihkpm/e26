const http = require('http');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING AUTOMATED SYSTEM VERIFICATION ===\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = '') {
    if (condition) {
      console.log(`✅ PASS: ${name} ${extra}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name} ${extra}`);
      failed++;
    }
  }

  try {
    // 1. Check index.html serving
    const resHome = await makeRequest({ host: 'localhost', port: 3000, path: '/', method: 'GET' });
    assert('Home Page (index.html) Loads', resHome.statusCode === 200);
    assert('Index contains Results View container', resHome.body.includes('id="results-view"'));
    assert('Index contains Videos View container', resHome.body.includes('id="videos-view"'));
    assert('Index contains Gallery View container', resHome.body.includes('id="gallery-view"'));
    assert('Index contains News View container', resHome.body.includes('id="news-view"'));
    assert('Index contains Admin View container', resHome.body.includes('id="admin-view"'));
    assert('Index contains Admin Login Modal', resHome.body.includes('id="modal-admin-login"'));
    assert('Index contains Poster Generator Modal', resHome.body.includes('id="modal-poster-generator"'));
    assert('Index contains Header Report Button in Poster Modal', resHome.body.includes('id="btn-poster-header-report"'));
    assert('Index contains Winning Works Section in Poster Modal', resHome.body.includes('id="poster-works-section"'));
    assert('Index contains Winning Works List in Poster Modal', resHome.body.includes('id="poster-works-list"'));
    assert('Index contains Video Player Modal', resHome.body.includes('id="modal-video-player"'));
    assert('Index contains Lightbox Modal', resHome.body.includes('id="modal-lightbox"'));
    assert('Index contains Protected Item Preview Modal', resHome.body.includes('id="modal-item-preview"'));
    assert('Index contains Anti-Screenshot Privacy Shield', resHome.body.includes('id="preview-privacy-shield"'));

    // 2. Check /api/state
    const resState = await makeRequest({ host: 'localhost', port: 3000, path: '/api/state', method: 'GET' });
    assert('API /api/state returns HTTP 200', resState.statusCode === 200);
    const state = JSON.parse(resState.body);

    assert('State has Results', Array.isArray(state.results) && state.results.length >= 18, `(Count: ${state.results?.length})`);
    assert('State has Videos', Array.isArray(state.videos) && state.videos.length >= 15, `(Count: ${state.videos?.length})`);
    assert('State has Gallery Photos', Array.isArray(state.gallery) && state.gallery.length >= 12, `(Count: ${state.gallery?.length})`);
    assert('State has News Items', Array.isArray(state.news) && state.news.length >= 6, `(Count: ${state.news?.length})`);
    assert('State has Programs', Array.isArray(state.programs) && state.programs.length >= 20, `(Count: ${state.programs?.length})`);
    assert('State has Participants', Array.isArray(state.participants) && state.participants.length >= 24, `(Count: ${state.participants?.length})`);
    assert('State has House Teams', Array.isArray(state.teams) && state.teams.length === 4, `(Count: ${state.teams?.length})`);

    // Verify standings
    const bukhara = state.teams.find(t => t.name === 'Bukhara');
    const undulus = state.teams.find(t => t.name === 'Undulus');
    assert('Leaderboard Bukhara points calculated', bukhara && bukhara.points > 0, `(Points: ${bukhara?.points})`);
    assert('Leaderboard Undulus points calculated', undulus && undulus.points > 0, `(Points: ${undulus?.points})`);

    // 3. Check Admin Login Authentication
    const loginPayload = JSON.stringify({ username: 'e26@gmail.com', password: 'e26msoe' });
    const resLogin = await makeRequest({
      host: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload)
      }
    }, loginPayload);

    assert('Admin Login Authenticates with e26@gmail.com / e26msoe', resLogin.statusCode === 200);
    const loginData = JSON.parse(resLogin.body);
    assert('Login response returns success true and token', loginData.success === true && !!loginData.token);

    // 4. Test Invalid Login
    const badLoginPayload = JSON.stringify({ username: 'fake@gmail.com', password: 'bad' });
    const resBadLogin = await makeRequest({
      host: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(badLoginPayload)
      }
    }, badLoginPayload);

    assert('Invalid login returns 401 Unauthorized', resBadLogin.statusCode === 401);

    // 5. Check CSS Styles & Layout Rules
    const resCSS = await makeRequest({ host: 'localhost', port: 3000, path: '/css/components.css', method: 'GET' });
    assert('components.css served', resCSS.statusCode === 200);
    assert('Gallery grid set to 5 columns on PC', resCSS.body.includes('repeat(5, 1fr)'));
    assert('Gallery grid set to 2 columns on Mobile', resCSS.body.includes('.gallery-masonry-grid') && resCSS.body.includes('repeat(2, 1fr) !important'));
    assert('Video highlights grid set to 2 columns on Mobile', resCSS.body.includes('.video-highlights-grid') && resCSS.body.includes('repeat(2, 1fr) !important'));
    assert('Anti-screenshot shield CSS defined', resCSS.body.includes('.anti-screenshot-shield'));
    assert('Print protection media query defined', resCSS.body.includes('@media print'));

    // 6. Check JS Files & Anti-Screenshot Logic
    const resAppJS = await makeRequest({ host: 'localhost', port: 3000, path: '/js/app.js', method: 'GET' });
    assert('app.js served', resAppJS.statusCode === 200);
    assert('app.js contains setupAntiScreenshotProtection', resAppJS.body.includes('setupAntiScreenshotProtection'));
    assert('app.js contains PrintScreen key listener', resAppJS.body.includes('PrintScreen'));

    const resPosterJS = await makeRequest({ host: 'localhost', port: 3000, path: '/js/poster-canvas.js', method: 'GET' });
    assert('poster-canvas.js served', resPosterJS.statusCode === 200);
    assert('poster-canvas.js contains populatePosterWorksList', resPosterJS.body.includes('populatePosterWorksList'));
    assert('poster-canvas.js wires btn-poster-header-report', resPosterJS.body.includes('btn-poster-header-report'));

    const resResultsJS = await makeRequest({ host: 'localhost', port: 3000, path: '/js/results.js', method: 'GET' });
    assert('results.js served', resResultsJS.statusCode === 200);
    assert('results.js opens openPosterModal on View Result click', resResultsJS.body.includes('openPosterModal'));

    console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  } catch (e) {
    console.error('Test Execution Error:', e);
  }
}

runTests();
