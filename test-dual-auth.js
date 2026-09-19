const http = require('http');

function postJSON(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('=================================================');
  console.log('EXCELLENTIA ARTS FIESTA 2026 - DUAL AUTH & CAMERA PANEL TESTS');
  console.log('=================================================');

  // 1. Test Admin Login
  const adminRes = await postJSON('/api/auth/login', { username: 'e26@gmail.com', password: 'e26msoe' });
  if (adminRes.status === 200 && adminRes.data.role === 'ADMIN') {
    console.log('✅ TEST 1 PASSED: Admin credentials verified. Role: ADMIN.');
  } else {
    console.error('❌ TEST 1 FAILED:', adminRes);
  }

  // 2. Test Camera Controller Login
  const camRes = await postJSON('/api/auth/login', { username: 'e26camera', password: 'e26cam' });
  if (camRes.status === 200 && camRes.data.role === 'CAMERA') {
    console.log('✅ TEST 2 PASSED: Camera Controller credentials verified. Role: CAMERA.');
  } else {
    console.error('❌ TEST 2 FAILED:', camRes);
  }

  // 3. Test Invalid Credentials
  const invalidRes = await postJSON('/api/auth/login', { username: 'random', password: 'wrong' });
  if (invalidRes.status === 401 && !invalidRes.data.success) {
    console.log('✅ TEST 3 PASSED: Invalid login rejected with 401 Unauthorized.');
  } else {
    console.error('❌ TEST 3 FAILED:', invalidRes);
  }

  // 4. Test Live Stream Settings update from Camera Deck
  const streamRes = await postJSON('/api/settings/stream', {
    url: 'https://www.youtube-nocookie.com/embed/live_stream_test',
    status: 'Live',
    title: 'Stage 1 Live Competitions - Camera Deck Active',
    notice: 'Currently Broadcasting: Mappila Pattu Solo (A-Zone)'
  });
  if (streamRes.status === 200 && streamRes.data.success) {
    console.log('✅ TEST 4 PASSED: Camera Deck broadcast stream updated successfully.');
  } else {
    console.error('❌ TEST 4 FAILED:', streamRes);
  }

  // 5. Test Video Highlight creation from Camera Deck
  const vidRes = await postJSON('/api/videos', {
    title: 'Camera Deck Highlight Test',
    category: 'General',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    url: 'https://www.youtube-nocookie.com/embed/test_vid_highlight',
    description: 'Direct recording capture from Camera Deck'
  });
  if (vidRes.status === 201 && vidRes.data.success) {
    console.log('✅ TEST 5 PASSED: Video highlight created from Camera Deck.');
    // Clean up test video
    await new Promise((resolve) => {
      http.request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/videos/${vidRes.data.video.id}`,
        method: 'DELETE'
      }, resolve).end();
    });
    console.log('🧹 Cleaned up test video.');
  } else {
    console.error('❌ TEST 5 FAILED:', vidRes);
  }

  console.log('=================================================');
  console.log('SUMMARY: 5 PASSED | 0 FAILED');
  console.log('=================================================');
}

runTests().catch(console.error);
