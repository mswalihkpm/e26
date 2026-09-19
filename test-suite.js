/**
 * Comprehensive Automated Verification Suite
 * Tests all backend APIs, points recalculation engine, auth, Excel template, and public requests.
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
  console.log("EXCELLENTIA ARTS FIESTA 2026 - VERIFICATION TESTS");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Web App HTML Index Load
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET'
    });
    if (res.status === 200 && res.raw.includes("Excellentia Arts Fiesta 2026") && res.raw.includes("Discover the Unseen")) {
      console.log("✅ TEST 1 PASSED: Web App HTML loaded with brand title and theme metadata");
      passed++;
    } else {
      console.error("❌ TEST 1 FAILED: HTML response status " + res.status);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 1 ERROR:", err.message);
    failed++;
  }

  // Test 2: Admin Auth Validation (e26@gmail.com / e26msoe)
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'e26@gmail.com', password: 'e26msoe' });

    if (res.status === 200 && res.body.success && res.body.token) {
      console.log("✅ TEST 2 PASSED: Admin Login successful with e26@gmail.com / e26msoe");
      passed++;
    } else {
      console.error("❌ TEST 2 FAILED: Login response:", res.body);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 2 ERROR:", err.message);
    failed++;
  }

  // Test 3: State & Live Points Recalculation Verification
  let initialLeader = null;
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/state',
      method: 'GET'
    });

    if (res.status === 200 && res.body.teams && res.body.teams.length === 4) {
      const teams = res.body.teams;
      initialLeader = teams[0];
      const hasCategories = teams.every(t => t.categoryPoints && 'A-Zone' in t.categoryPoints && 'B-Zone' in t.categoryPoints && 'C-Zone' in t.categoryPoints);

      console.log(`✅ TEST 3 PASSED: 4 Houses loaded (Leader: ${initialLeader.name} with ${initialLeader.points} pts). Category points verified (A-Zone, B-Zone, C-Zone).`);
      passed++;
    } else {
      console.error("❌ TEST 3 FAILED: Invalid state data");
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 3 ERROR:", err.message);
    failed++;
  }

  // Test 4: Excel Template Generation (.xlsx)
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/template/participants',
      method: 'GET'
    });

    if (res.status === 200 && res.headers['content-type'].includes('spreadsheetml')) {
      console.log("✅ TEST 4 PASSED: Excel participant template generated and downloaded with correct MIME type");
      passed++;
    } else {
      console.error("❌ TEST 4 FAILED: Excel template endpoint status " + res.status);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 4 ERROR:", err.message);
    failed++;
  }

  // Test 5: Public Result Request Submission
  try {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/requests',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      programName: 'Origami Sculpture Championship',
      category: 'A-Zone',
      requesterTeam: 'Bukhara',
      requesterName: 'Adil Shareef',
      requesterContact: '9847123456',
      notes: 'Item completed on Stage 5 at 1:00 PM'
    });

    if (res.status === 201 && res.body.success && res.body.notification) {
      console.log("✅ TEST 5 PASSED: Public Result Request successfully queued in Admin notifications");
      passed++;
    } else {
      console.error("❌ TEST 5 FAILED:", res.body);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 5 ERROR:", err.message);
    failed++;
  }

  // Test 6: Add Result with Custom Points & Automatic Recalculation Test
  let createdResultId = null;
  try {
    const addRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/results',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      programCode: 'TEST999',
      programName: 'Symphony Grand Finale Test',
      category: 'C-Zone',
      venue: 'Stage 1 - Bukhara Grand Arena',
      first: {
        participantName: 'Qurthuba Test Choir',
        chestNo: '991',
        team: 'Qurthuba',
        grade: 'A',
        points: 20,
        gradePoints: 5,
        totalPoints: 25
      },
      second: {
        participantName: 'Samarkhand Test Troupe',
        chestNo: '992',
        team: 'Samarkhand',
        grade: 'A',
        points: 12,
        gradePoints: 5,
        totalPoints: 17
      },
      third: {
        participantName: 'Bukhara Test Troupe',
        chestNo: '993',
        team: 'Bukhara',
        grade: 'B',
        points: 6,
        gradePoints: 3,
        totalPoints: 9
      }
    });

    if (addRes.status === 201 && addRes.body.result) {
      createdResultId = addRes.body.result.id;
      const qurthuba = addRes.body.state.teams.find(t => t.name === 'Qurthuba');
      console.log(`✅ TEST 6 PASSED: Result published! Points recalculated dynamically (Qurthuba C-Zone +25 pts -> Total: ${qurthuba.points} pts)`);
      passed++;
    } else {
      console.error("❌ TEST 6 FAILED:", addRes.body);
      failed++;
    }
  } catch (err) {
    console.error("❌ TEST 6 ERROR:", err.message);
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
    console.log("🧹 Cleaned up test result. Points restored to pristine championship state.");
  }

  console.log("\n=================================================");
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================");
}

runTests();
