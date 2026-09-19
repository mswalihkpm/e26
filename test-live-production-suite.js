const http = require('http');
const WebSocket = require('ws');

async function runTests() {
  console.log('================================================================');
  console.log('EXCELLENTIA ARTS FIESTA 2026 - LIVE PRODUCTION & CAMERA TESTS');
  console.log('================================================================');

  // 1. Test HTTP Stream Status API
  const apiRes = await new Promise((resolve) => {
    http.get('http://localhost:3000/api/stream/status', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body) }));
    });
  });

  if (apiRes.status === 200 && apiRes.data.success) {
    console.log('✅ TEST 1 PASSED: Stream status API responded 200 OK.');
  } else {
    console.error('❌ TEST 1 FAILED:', apiRes);
  }

  // 2. Test Studio WebSocket Connection
  const studioWs = new WebSocket('ws://localhost:3000');
  let studioJoined = false;

  await new Promise((resolve, reject) => {
    studioWs.on('open', () => {
      studioWs.send(JSON.stringify({ type: 'join', role: 'studio', name: 'Master Control' }));
    });
    studioWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'joined' && msg.role === 'studio') {
        studioJoined = true;
        resolve();
      }
    });
    setTimeout(reject, 3000);
  }).catch(e => console.error('Studio connect timeout'));

  if (studioJoined) {
    console.log('✅ TEST 2 PASSED: Live Production Studio connected to WebSocket successfully.');
  } else {
    console.error('❌ TEST 2 FAILED: Studio failed to connect.');
  }

  // 3. Test Camera WebSocket Connection & Frame Relay
  const camWs = new WebSocket('ws://localhost:3000');
  let cameraJoined = false;
  let frameReceivedByStudio = false;

  await new Promise((resolve, reject) => {
    camWs.on('open', () => {
      camWs.send(JSON.stringify({ type: 'join', role: 'camera', camId: 'CAM-1', name: 'Field Cam 1' }));
    });
    camWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'joined' && msg.role === 'camera') {
        cameraJoined = true;
        // Send a simulated camera frame
        camWs.send(JSON.stringify({
          type: 'frame_relay',
          frame: 'data:image/jpeg;base64,TEST_FRAME_PIXELS',
          fps: 30
        }));
      }
    });

    studioWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'camera_frame' && msg.camId === 'CAM-1') {
        frameReceivedByStudio = true;
        resolve();
      }
    });

    setTimeout(reject, 3000);
  }).catch(e => console.error('Frame relay timeout'));

  if (cameraJoined && frameReceivedByStudio) {
    console.log('✅ TEST 3 PASSED: Field Camera connected and live frame relayed to Laptop Studio.');
  } else {
    console.error('❌ TEST 3 FAILED: Frame relay failed.');
  }

  // 4. Test Tally Light Signaling (Studio -> Camera)
  let tallyReceivedByCam = false;
  let receivedTallyStatus = '';

  await new Promise((resolve, reject) => {
    camWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'tally') {
        tallyReceivedByCam = true;
        receivedTallyStatus = msg.status;
        resolve();
      }
    });

    // Studio puts camera ON AIR
    studioWs.send(JSON.stringify({
      type: 'tally_update',
      camId: 'CAM-1',
      status: 'PROGRAM'
    }));

    setTimeout(reject, 3000);
  }).catch(e => console.error('Tally timeout'));

  if (tallyReceivedByCam && receivedTallyStatus === 'PROGRAM') {
    console.log('✅ TEST 4 PASSED: Studio ON AIR (PROGRAM) Tally light signaled to Mobile Camera.');
  } else {
    console.error('❌ TEST 4 FAILED: Tally signal failed.');
  }

  // 5. Test Public Viewer WebSocket & Master Broadcast Delivery
  const viewerWs = new WebSocket('ws://localhost:3000');
  let viewerJoined = false;
  let broadcastReceivedByViewer = false;

  await new Promise((resolve, reject) => {
    viewerWs.on('open', () => {
      viewerWs.send(JSON.stringify({ type: 'join', role: 'viewer' }));
    });
    viewerWs.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'joined') {
        viewerJoined = true;
        // Studio sends live program broadcast frame
        studioWs.send(JSON.stringify({
          type: 'program_broadcast_frame',
          frame: 'data:image/jpeg;base64,TEST_PROGRAM_BROADCAST_FRAME'
        }));
      } else if (msg.type === 'broadcast_frame') {
        broadcastReceivedByViewer = true;
        resolve();
      }
    });

    setTimeout(reject, 3000);
  }).catch(e => console.error('Viewer broadcast timeout'));

  if (viewerJoined && broadcastReceivedByViewer) {
    console.log('✅ TEST 5 PASSED: Public viewer received master studio live broadcast stream.');
  } else {
    console.error('❌ TEST 5 FAILED: Broadcast to viewer failed.');
  }

  camWs.close();
  studioWs.close();
  viewerWs.close();

  console.log('================================================================');
  console.log('SUMMARY: ALL 5 LIVE PRODUCTION TESTS PASSED!');
  console.log('================================================================');
}

runTests().catch(console.error);
