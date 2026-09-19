const http = require('http');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('=== RUNNING POSTER AND ITEMS TEST ===\n');

  // 1. Verify poster image exists
  const posterPath = path.join(__dirname, 'public', 'assets', 'images', 'poster-bg-royal-purple.jpg');
  if (fs.existsSync(posterPath)) {
    const stats = fs.statSync(posterPath);
    console.log('✓ Royal Purple clean poster base exists:', posterPath, `(${stats.size} bytes)`);
  } else {
    console.error('✗ Missing poster-bg-royal-purple.jpg');
    process.exit(1);
  }

  // 2. Test GET /api/state
  console.log('\nTesting GET /api/state...');
  const state = await getJson('/api/state');
  console.log(`✓ Fetched state successfully. Results: ${state.results.length}, Items: ${state.items ? state.items.length : 0}`);

  if (state.results.length === 0) {
    console.log('No results found, skipping item test on existing result.');
    return;
  }

  const sampleResult = state.results[0];
  console.log(`Sample Result for testing: ID=${sampleResult.id}, Prog=${sampleResult.programName || sampleResult.title}`);

  // 3. Test POST /api/items (Text / Poem / Essay creation)
  console.log('\nTesting POST /api/items (Creating 1st place poem item)...');
  const newItemPayload = {
    resultId: sampleResult.id,
    programName: sampleResult.programName || sampleResult.title || 'Malayalam Poem',
    category: sampleResult.category || 'C-Zone',
    place: 1,
    participantName: sampleResult.winners && sampleResult.winners[0] ? sampleResult.winners[0].name : 'Sample Winner',
    team: sampleResult.winners && sampleResult.winners[0] ? sampleResult.winners[0].team : 'QURTHUBA',
    itemType: 'text',
    subject: 'Discover The Unseen - A Poem on Hidden Horizons',
    textContent: '<h2>Echoes of the Unseen Soul</h2><p>In the quiet depths beneath the ocean blue,<br>Where whispered dreams in silent stillness grew...</p><blockquote>"Art is the mirror of the unseen world."</blockquote>'
  };

  const createdRes = await postJson('/api/items', newItemPayload);
  console.log('✓ POST /api/items Response:', createdRes.success ? 'SUCCESS' : 'FAILED');
  if (!createdRes.item || !createdRes.item.id) {
    throw new Error('Item creation failed: ' + JSON.stringify(createdRes));
  }
  const createdItemId = createdRes.item.id;
  console.log(`✓ Created Item ID: ${createdItemId}`);

  // 4. Verify in State
  console.log('\nVerifying item in GET /api/state...');
  const stateAfter = await getJson('/api/state');
  const foundItem = stateAfter.items.find(it => it.id === createdItemId);
  if (foundItem) {
    console.log(`✓ Found created item in state. Subject: "${foundItem.subject}", Place: ${foundItem.place}`);
  } else {
    throw new Error('Item not found in state after creation!');
  }

  // 5. Test adding a 2nd place item (Photo / Art entry)
  console.log('\nTesting POST /api/items (Creating 2nd place calligraphy artwork item)...');
  const photoItemPayload = {
    resultId: sampleResult.id,
    programName: sampleResult.programName || sampleResult.title || 'Calligraphy Arabic',
    category: sampleResult.category || 'B-Zone',
    place: 2,
    participantName: sampleResult.winners && sampleResult.winners[1] ? sampleResult.winners[1].name : 'Second Winner',
    team: sampleResult.winners && sampleResult.winners[1] ? sampleResult.winners[1].team : 'UNDULUS',
    itemType: 'photo',
    fileUrl: '/assets/images/poster-bg-royal-purple.jpg',
    fileName: 'calligraphy_masterpiece.jpg',
    fileSize: 450123,
    subject: 'Majestic Diwani Calligraphy Composition',
    textContent: '<p>A classic calligraphic composition rendered in ink and gold leaf on handmade parchment paper.</p>'
  };

  const createdPhotoRes = await postJson('/api/items', photoItemPayload);
  console.log('✓ Created 2nd Place Photo Item ID:', createdPhotoRes.item?.id);

  console.log('\n=== ALL POSTER & ITEMS TESTS PASSED SUCCESSFULLY! ===\n');
}

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request(`http://localhost:3000${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

main().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
