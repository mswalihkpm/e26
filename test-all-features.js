const fs = require('fs');
const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', err => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('EXCELLENTIA ARTS FIESTA 2026 - COMPLETE FEATURE VERIFICATION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, detail = '') {
    if (condition) {
      console.log('  ✅ ' + title);
      passed++;
    } else {
      console.error('  ❌ ' + title + (detail ? ' -> ' + detail : ''));
      failed++;
    }
  }

  try {
    // 1. Theme Assets & Font
    console.log('[1/7] Testing Theme Assets & 3D Typography...');
    const logoExists = fs.existsSync('public/assets/images/theme-iceberg-logo.png');
    assert('Theme logo image exists on disk', logoExists);
    if (logoExists) {
      const size = fs.statSync('public/assets/images/theme-iceberg-logo.png').size;
      assert('Theme logo size is > 100KB (HD)', size > 100000, `Size: ${size}`);
    }

    const fontExists = fs.existsSync('public/assets/images/theme-text-discover.png');
    assert('Theme 3D polygon font exists on disk', fontExists);
    if (fontExists) {
      const size = fs.statSync('public/assets/images/theme-text-discover.png').size;
      assert('Theme font size is > 100KB (HD)', size > 100000, `Size: ${size}`);
    }

    // 2. Video Serving
    console.log('\n[2/7] Testing Video Serving & Slideshow Assets...');
    const videoRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/videos/INTRO%20SPEED.mp4',
      method: 'GET'
    });
    assert('INTRO SPEED.mp4 served with HTTP 200', videoRes.status === 200);
    assert('Video header is video/mp4', (videoRes.headers['content-type'] || '').includes('video/mp4'));

    // 3. API State & Initial Settings
    console.log('\n[3/7] Testing State API & Settings Endpoint...');
    const stateRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/state',
      method: 'GET'
    });
    assert('State API returns HTTP 200', stateRes.status === 200);
    assert('State includes settings object', typeof stateRes.data.settings === 'object');
    assert('Results count is >= 1', stateRes.data.results.length >= 1);

    // Verify all results have resultNumber assigned
    const unnumbered = stateRes.data.results.filter(r => !r.resultNumber || isNaN(r.resultNumber));
    assert('All published results have sequential resultNumber', unnumbered.length === 0, `Unnumbered: ${unnumbered.length}`);

    // 4. Admin Team Score Visibility Toggle
    console.log('\n[4/7] Testing Admin Team Score Visibility Controls...');
    // Toggle showTeamScores = false
    const hideScoresRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/settings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { showTeamScores: false });
    assert('Settings update (showTeamScores: false) returns HTTP 200', hideScoresRes.status === 200);
    assert('State now has showTeamScores === false', hideScoresRes.data.state.settings.showTeamScores === false);

    // Toggle showTeamScores = true
    const showScoresRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/settings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { showTeamScores: true });
    assert('Settings update (showTeamScores: true) returns HTTP 200', showScoresRes.status === 200);
    assert('State now has showTeamScores === true', showScoresRes.data.state.settings.showTeamScores === true);

    // 5. Team Overview Score Cutoff (Calculate team points up to result number)
    console.log('\n[5/7] Testing Team Overview Cutoff Score Calculation...');
    // Set maxVisibleResultNumber = 1
    const cutoffRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/settings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { maxVisibleResultNumber: 1 });
    assert('Settings update (maxVisibleResultNumber: 1) returns HTTP 200', cutoffRes.status === 200);
    assert('State now has maxVisibleResultNumber === 1', cutoffRes.data.state.settings.maxVisibleResultNumber === 1);
    
    // Check that team points are calculated only up to Result #1
    const cutoffTeams = cutoffRes.data.state.teams;
    const totalCutoffPts = cutoffTeams.reduce((sum, t) => sum + (t.points || 0), 0);
    const expectedCutoffPts = (cutoffRes.data.state.results || [])
      .filter(r => (Number(r.resultNumber) || 1) <= 1)
      .reduce((sum, r) => sum + (r.winners || []).reduce((wSum, w) => wSum + (Number(w.points) || 0), 0), 0);
    assert('Team points calculated only from results <= 1', totalCutoffPts === expectedCutoffPts, `Cutoff team points: ${totalCutoffPts}, expected: ${expectedCutoffPts}`);

    // Clear cutoff (calculate from all results)
    const clearCutoffRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/settings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { maxVisibleResultNumber: null });
    assert('Clear cutoff returns HTTP 200', clearCutoffRes.status === 200);
    assert('State now has maxVisibleResultNumber === null', clearCutoffRes.data.state.settings.maxVisibleResultNumber === null);
    const restoredTeams = clearCutoffRes.data.state.teams;
    const totalRestoredPts = restoredTeams.reduce((sum, t) => sum + (t.points || 0), 0);
    assert('Full team overview points restored when cutoff cleared', totalRestoredPts >= totalCutoffPts, `Restored points: ${totalRestoredPts}`);

    // 6. Standings Slide Interval Setting Endpoint
    console.log('\n[6/9] Testing Team Standings Slide Interval Setting Endpoint...');
    const intervalRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/settings',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { standingsSlideInterval: 5 });
    assert('Settings update (standingsSlideInterval: 5) returns HTTP 200', intervalRes.status === 200);
    assert('State now has standingsSlideInterval === 5', intervalRes.data.state.settings.standingsSlideInterval === 5);

    // 7. Per-Result Visibility Toggle Endpoint
    console.log('\n[7/9] Testing Per-Result Visibility Toggle Endpoint...');
    const firstResultId = stateRes.data.results[0].id;
    const hideResToggle = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/results/${firstResultId}/toggle-visibility`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { isPublic: false });
    assert('Toggle result visibility (hide) returns HTTP 200', hideResToggle.status === 200);
    assert('Result isPublic is now false', hideResToggle.data.isPublic === false);

    // Restore back to public
    const showResToggle = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/results/${firstResultId}/toggle-visibility`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { isPublic: true });
    assert('Toggle result visibility (show) returns HTTP 200', showResToggle.status === 200);
    assert('Result isPublic is now true', showResToggle.data.isPublic === true);

    // 8. Sequential Renumbering Endpoint
    console.log('\n[8/9] Testing Auto Sequential Renumbering Endpoint...');
    const renumberRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/results/renumber',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert('Renumber endpoint returns HTTP 200', renumberRes.status === 200);
    assert('Renumber response reports success', renumberRes.data.success === true);
    const renumberedList = renumberRes.data.state.results;
    let isSequential = true;
    for (let i = 0; i < renumberedList.length; i++) {
      if (renumberedList[i].resultNumber !== i + 1) {
        isSequential = false;
        break;
      }
    }
    assert('All results are strictly numbered from 1..N', isSequential);

    // 9. Layout & CSS Validation
    console.log('\n[9/9] Testing UI Layout & Controls CSS...');
    const html = fs.readFileSync('public/index.html', 'utf8');
    assert('index.html contains Admin Control Center card', html.includes('admin-control-center-card'));
    assert('index.html contains team scores toggle input', html.includes('toggle-show-team-scores'));
    assert('index.html contains max result number cutoff input', html.includes('input-max-result-number'));
    assert('index.html contains standings interval input', html.includes('input-standings-interval'));
    assert('index.html contains standings toolbar button', html.includes('ss-btn-show-standings'));
    assert('index.html contains renumber button', html.includes('btn-renumber-results-seq'));
    assert('index.html modal contains Result # input', html.includes('id="res-result-number"'));
    assert('index.html modal contains Show Result to Public switch', html.includes('id="res-is-public"'));

    const cssComp = fs.readFileSync('public/css/components.css', 'utf8');
    assert('components.css has full height theater frame (min-height 660px)', cssComp.includes('min-height: 660px'));
    assert('components.css contains victory gold card styles', cssComp.includes('.card-tier-gold'));
    assert('components.css contains victory silver card styles', cssComp.includes('.card-tier-silver'));
    assert('components.css contains victory bronze card styles', cssComp.includes('.card-tier-bronze'));
    assert('components.css contains result number pill in header', cssComp.includes('.ss-result-num-pill'));
    assert('components.css contains bottom audit verification strip', cssComp.includes('.ss-championship-audit-strip'));
    assert('components.css contains standings slide styles', cssComp.includes('.ss-standings-slide'));
    assert('components.css contains standings 4-team grid', cssComp.includes('.ss-standings-grid'));
    assert('components.css contains fullscreen responsive height 100vh', cssComp.includes('height: 100vh !important'));

    const cssAdmin = fs.readFileSync('public/css/admin.css', 'utf8');
    assert('admin.css contains switch-toggle styles', cssAdmin.includes('.switch-toggle-label'));
    assert('admin.css contains badge-result-num styles', cssAdmin.includes('.badge-result-num'));
    assert('admin.css contains btn-status-toggle styles', cssAdmin.includes('.btn-status-toggle'));

    const jsAdmin = fs.readFileSync('public/js/admin.js', 'utf8');
    assert('admin.js contains setupVisibilityControl', jsAdmin.includes('setupVisibilityControl'));
    assert('admin.js contains toggleResultVisibility', jsAdmin.includes('toggleResultVisibility'));
    assert('admin.js handles resultNumber on add and edit', jsAdmin.includes('resultNumber'));

    const jsResults = fs.readFileSync('public/js/results.js', 'utf8');
    assert('results.js displays Result # badge on cards', jsResults.includes('result-number-pill'));
    assert('results.js filters by isPublic', jsResults.includes('isPublic'));

    const jsApp = fs.readFileSync('public/js/app.js', 'utf8');
    assert('app.js checks settings.showTeamScores', jsApp.includes('showScores'));
    assert('app.js conceals score with lock badge when disabled', jsApp.includes('score-locked-display') || jsApp.includes('Points Concealed'));

    const jsSlideshow = fs.readFileSync('public/js/slideshow.js', 'utf8');
    assert('slideshow.js renders Championship Victory Arena cards', jsSlideshow.includes('buildVictoryWinnerCard'));
    assert('slideshow.js filters by isPublic', jsSlideshow.includes('isPublic'));
    assert('slideshow.js contains showTeamStandingsSlide', jsSlideshow.includes('showTeamStandingsSlide'));
    assert('slideshow.js contains buildTeamStandingsSlideHTML', jsSlideshow.includes('buildTeamStandingsSlideHTML'));

    console.log('\n========================================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================================');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
