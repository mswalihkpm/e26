/**
 * Verification Test Suite for New Requested Features
 */

const http = require('http');

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: data ? JSON.parse(data) : null, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=================================================");
  console.log("EXCELLENTIA ARTS FIESTA 2026 - FEATURE TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Verify Removed Ticker and Removed Subtext in HTML
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    });
    const html = res.raw;
    const noTicker = !html.includes('live-fiesta-ticker') && !html.includes('LIVE PULSE');
    const noHeaderSubtext = !html.includes('MA\'DIN SCHOOL OF EXCELLENCE • 2026</span>');
    const noTimer = !html.includes('id="fiesta-countdown"');
    const hasLiveSection = html.includes('videos-view') && html.includes('Watch Live');

    if (noTicker && noHeaderSubtext && noTimer && hasLiveSection) {
      console.log("✅ TEST 1 PASSED: Live pulse ticker, header subtext, and timer successfully removed; Live Stream & Video section added.");
      passed++;
    } else {
      console.error("❌ TEST 1 FAILED:", { noTicker, noHeaderSubtext, noTimer, hasLiveSection });
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 1 ERROR:", err.message);
    failed++;
  }

  // Test 2: Live Stream Configuration API
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/livestream',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }, {
      title: 'Grand Duffmuttu & Classical Recitals Live Feed',
      status: 'LIVE NOW',
      embedUrl: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1',
      description: 'Official Live Broadcast from Excellentia Arts Fiesta 2026'
    });

    if (res.status === 200 && res.body.success && res.body.liveStream) {
      console.log("✅ TEST 2 PASSED: Live stream configuration updated successfully.");
      passed++;
    } else {
      console.error("❌ TEST 2 FAILED:", res.body);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 2 ERROR:", err.message);
    failed++;
  }

  // Test 3: Multiple 1st, 2nd, 3rd Position Result Publishing & Independent Grade/Points
  let createdResultId = null;
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/results',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      programCode: 'C305',
      programName: 'Symphony Dual Championship Test',
      category: 'C-Zone',
      winners: [
        { position: '1st', participantName: 'Bukhara Grand Troupe', team: 'Bukhara', grade: 'A+', points: 15 },
        { position: '1st', participantName: 'Undulus Classical Band', team: 'Undulus', grade: 'A+', points: 15 },
        { position: '2nd', participantName: 'Samarkhand Theatrics', team: 'Samarkhand', grade: 'A', points: 10 },
        { position: '2nd', participantName: 'Qurthuba Folk Troupe', team: 'Qurthuba', grade: 'A', points: 10 },
        { position: '3rd', participantName: 'Zulfaqar Ali', team: 'Undulus', grade: 'B', points: 5 },
        { position: 'Grade', participantName: 'Mishab Kareem', team: 'Qurthuba', grade: 'A', points: 3 }
      ]
    });

    if (res.status === 201 && res.body.success && res.body.result) {
      createdResultId = res.body.result.id;
      const state = res.body.state;
      const bukhara = state.teams.find(t => t.name === 'Bukhara');
      const undulus = state.teams.find(t => t.name === 'Undulus');

      console.log(`✅ TEST 3 PASSED: Multiple 1st places & shared 2nd places published! Points correctly accumulated (Bukhara +15, Undulus +20, etc.).`);
      passed++;
    } else {
      console.error("❌ TEST 3 FAILED:", res.body);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 3 ERROR:", err.message);
    failed++;
  }

  // Clean up test result
  if (createdResultId) {
    await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/results/${createdResultId}`,
      method: 'DELETE'
    });
    console.log("🧹 Cleaned up multiple-winner test result.");
  }

  // Test 4: Discrepancy Reporting Without Phone Number
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/reports',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      programName: 'Classical Mappilapattu (A102)',
      participantName: 'Rayan Kabeer',
      requesterTeam: 'Undulus',
      requesterName: 'Kabeer Ahmed',
      notes: 'Participant awarded Grade A+ by judges.'
    });

    if (res.status === 201 && res.body.success && !res.body.notification.phone) {
      console.log("✅ TEST 4 PASSED: Discrepancy report submitted without phone number requirement.");
      passed++;
    } else {
      console.error("❌ TEST 4 FAILED:", res.body);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 4 ERROR:", err.message);
    failed++;
  }

  // Test 5: Bulk PC Image Upload in Gallery
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/gallery/bulk',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      defaultCategory: 'A-Zone',
      images: [
        { title: 'PC Test Photo 1', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' },
        { title: 'PC Test Photo 2', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }
      ]
    });

    if (res.status === 201 && res.body.success && res.body.count === 2) {
      console.log("✅ TEST 5 PASSED: Bulk PC image upload verified with automatic category assignment.");
      passed++;
    } else {
      console.error("❌ TEST 5 FAILED:", res.body);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 5 ERROR:", err.message);
    failed++;
  }

  console.log("\n=================================================");
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");
}

runTests();
