const WebSocket = require('ws');

async function testLatency() {
  console.log('Testing Ultra-Low Latency Binary Streaming...');
  const studioWs = new WebSocket('ws://localhost:3000');
  const viewerWs = new WebSocket('ws://localhost:3000');

  await Promise.all([
    new Promise(res => studioWs.on('open', res)),
    new Promise(res => viewerWs.on('open', res))
  ]);

  studioWs.send(JSON.stringify({ type: 'join', role: 'studio' }));
  viewerWs.send(JSON.stringify({ type: 'join', role: 'viewer' }));

  await new Promise(r => setTimeout(r, 200));

  const latencies = [];
  const fakeBlob = Buffer.alloc(15000, 255); // 15KB JPEG frame simulation

  for (let i = 0; i < 20; i++) {
    const sendTime = Date.now();
    studioWs.send(fakeBlob, { binary: true });

    await new Promise((resolve) => {
      viewerWs.once('message', (data, isBinary) => {
        if (isBinary) {
          const rtt = Date.now() - sendTime;
          latencies.push(rtt);
          resolve();
        }
      });
    });
  }

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  console.log(`✅ 20 Binary Frames Relayed. Average Frame Transit Latency: ${avgLatency.toFixed(2)} ms (Max: ${Math.max(...latencies)} ms, Min: ${Math.min(...latencies)} ms)`);

  studioWs.close();
  viewerWs.close();
}

testLatency().catch(console.error);
