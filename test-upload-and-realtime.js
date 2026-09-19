const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

async function runUploadAndRealtimeTests() {
  console.log('========================================================================');
  console.log('TESTING FILE UPLOADS, REAL-TIME WEBSOCKETS & PUBLIC DATABASE SYNC');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, detail = '') {
    if (condition) {
      console.log('  ✅ ' + name);
      passed++;
    } else {
      console.error('  ❌ ' + name + (detail ? ' -> ' + detail : ''));
      failed++;
    }
  }

  // Helper for multipart/form-data POST request
  function uploadMultipart(urlPath, fieldName, filename, fileBuffer, mimeType, extraFields = {}) {
    return new Promise((resolve, reject) => {
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      let payload = '';

      for (const key in extraFields) {
        payload += `--${boundary}\r\n`;
        payload += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
        payload += `${extraFields[key]}\r\n`;
      }

      payload += `--${boundary}\r\n`;
      payload += `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n`;
      payload += `Content-Type: ${mimeType}\r\n\r\n`;

      const headerBuf = Buffer.from(payload, 'utf8');
      const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
      const bodyBuf = Buffer.concat([headerBuf, fileBuffer, footerBuf]);

      const req = http.request({
        hostname: 'localhost',
        port: 3000,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuf.length
        }
      }, (res) => {
        let resBody = '';
        res.on('data', chunk => resBody += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: resBody });
          }
        });
      });

      req.on('error', err => reject(err));
      req.write(bodyBuf);
      req.end();
    });
  }

  try {
    // 1. Test WebSocket Connection and INITIAL_STATE
    console.log('[1/5] Testing Real-Time WebSocket Connection...');
    const ws = new WebSocket('ws://localhost:3000');
    
    const wsConnected = await new Promise((resolve) => {
      let gotInitial = false;
      ws.on('open', () => {
        assert('WebSocket connected successfully to server', true);
      });
      ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        if (data.type === 'INITIAL_STATE' && data.state) {
          gotInitial = true;
          assert('Received INITIAL_STATE with full central database', true);
          resolve(true);
        }
      });
      setTimeout(() => {
        if (!gotInitial) resolve(false);
      }, 3000);
    });
    assert('WebSocket handshake completed', wsConnected);

    // 2. Test Direct PC Gallery Photo Upload
    console.log('\n[2/5] Testing Direct PC Gallery Photo Upload (/api/gallery/upload)...');
    const dummyImage = Buffer.from('fake-jpeg-image-binary-data-for-testing');
    const galRes = await uploadMultipart(
      '/api/gallery/upload',
      'images',
      'test_fiesta_capture.jpg',
      dummyImage,
      'image/jpeg',
      { category: 'A-Zone' }
    );
    assert('Gallery upload returns HTTP 201 Created', galRes.status === 201, `Status: ${galRes.status}`);
    assert('Gallery upload returns items array', galRes.data && galRes.data.success && galRes.data.items?.length > 0);
    if (galRes.data?.items?.[0]?.image) {
      const imgPath = path.join(__dirname, 'public', galRes.data.items[0].image.replace(/^\//, ''));
      assert('Uploaded image file exists on disk', fs.existsSync(imgPath), `Path: ${imgPath}`);
    }

    // 3. Test Direct PC Video Upload
    console.log('\n[3/5] Testing Direct PC Video Upload (/api/videos/upload)...');
    const dummyVideo = Buffer.from('fake-mp4-video-stream-data-for-testing');
    const vidRes = await uploadMultipart(
      '/api/videos/upload',
      'videoFile',
      'test_cultural_recital.mp4',
      dummyVideo,
      'video/mp4'
    );
    assert('Video upload returns HTTP 201 Created', vidRes.status === 201, `Status: ${vidRes.status}`);
    assert('Video upload returns valid video URL', vidRes.data && vidRes.data.success && vidRes.data.url);
    if (vidRes.data?.url) {
      const vidPath = path.join(__dirname, 'public', vidRes.data.url.replace(/^\//, ''));
      assert('Uploaded video file exists on disk', fs.existsSync(vidPath), `Path: ${vidPath}`);
    }

    // 4. Test Generic Image Upload (/api/upload/image)
    console.log('\n[4/5] Testing Generic Image Upload (/api/upload/image)...');
    const imgRes = await uploadMultipart(
      '/api/upload/image',
      'image',
      'news_banner_photo.png',
      dummyImage,
      'image/png'
    );
    assert('Image upload returns HTTP 201 Created', imgRes.status === 201, `Status: ${imgRes.status}`);
    assert('Image upload returns static URL', imgRes.data && imgRes.data.success && imgRes.data.url?.startsWith('/uploads/images/'));

    // 5. Test Real-Time WebSocket Broadcast on Result Creation
    console.log('\n[5/5] Testing Real-Time State Broadcast on Database Change...');
    let broadcastReceived = false;

    const broadcastPromise = new Promise((resolve) => {
      ws.on('message', (msg) => {
        try {
          const data = JSON.parse(msg);
          if (data.type === 'STATE_UPDATE' && data.state) {
            broadcastReceived = true;
            assert('Received real-time STATE_UPDATE broadcast without polling', true);
            resolve(true);
          }
        } catch (e) {}
      });
      setTimeout(() => resolve(false), 4000);
    });

    // Add a test result to trigger database save & broadcast
    const newResPayload = {
      programName: 'Test Live Broadcast Elocution',
      category: 'A-Zone',
      winners: [
        { position: '1st', participantName: 'Live Test Winner', team: 'Bukhara', points: 10 }
      ]
    };

    const postReq = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/results',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    postReq.write(JSON.stringify(newResPayload));
    postReq.end();

    await broadcastPromise;
    assert('Real-time synchronization successfully broadcast to all connected clients', broadcastReceived);

    // Clean up created test result
    if (broadcastReceived) {
      const stateRes = await new Promise(resolve => {
        http.get('http://localhost:3000/api/state', res => {
          let b = '';
          res.on('data', c => b += c);
          res.on('end', () => resolve(JSON.parse(b)));
        });
      });
      const testRes = (stateRes.results || []).find(r => r.programName === 'Test Live Broadcast Elocution');
      if (testRes) {
        await new Promise(resolve => {
          const dReq = http.request({
            hostname: 'localhost',
            port: 3000,
            path: `/api/results/${testRes.id}`,
            method: 'DELETE'
          }, resolve);
          dReq.end();
        });
      }
    }

    // Clean up disk files
    if (galRes.data?.items?.[0]?.image) {
      const imgPath = path.join(__dirname, 'public', galRes.data.items[0].image.replace(/^\//, ''));
      if (fs.existsSync(imgPath)) try { fs.unlinkSync(imgPath); } catch (e) {}
    }
    if (vidRes.data?.url) {
      const vidPath = path.join(__dirname, 'public', vidRes.data.url.replace(/^\//, ''));
      if (fs.existsSync(vidPath)) try { fs.unlinkSync(vidPath); } catch (e) {}
    }
    if (imgRes.data?.url) {
      const imgPath = path.join(__dirname, 'public', imgRes.data.url.replace(/^\//, ''));
      if (fs.existsSync(imgPath)) try { fs.unlinkSync(imgPath); } catch (e) {}
    }

    ws.close();

    console.log('\n========================================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runUploadAndRealtimeTests();
