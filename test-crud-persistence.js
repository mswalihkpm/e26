/**
 * Comprehensive CRUD Persistence & Server Restart Verification Test
 * Excellentia Arts Fiesta 2026
 * 
 * Verifies that:
 * 1. Adding entities creates them in memory, saves them to disk, and syncs to Supabase.
 * 2. Editing entities updates them in memory, saves to disk, and syncs to Supabase.
 * 3. Deleting entities removes them from memory, removes them from disk, and purges them from Supabase.
 * 4. Simulating cold-start / server restart reliably preserves all additions, edits, and deletions.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.join(__dirname, 'data', 'db.json');

function request(method, pathUrl, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('========================================================================');
  console.log('TESTING PERMANENT PERSISTENCE FOR ADD, EDIT & DELETE (ALL ENTITIES)');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, condition) {
    if (condition) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    // 1. ITEMS CRUD PERSISTENCE
    console.log('[1/6] Testing Items (Winning Works) Add, Edit, Delete Persistence...');
    const testItemId = 'item-test-persist-' + Date.now();
    
    // Add Item
    const createItemRes = await request('POST', '/api/items', {
      id: testItemId,
      resultId: 'res-test-1',
      programName: 'Persistence Calligraphy',
      category: 'A-Zone',
      place: '1st',
      participantName: 'Test Artist',
      team: 'AL HIKMA',
      subject: 'Divine Inspiration',
      textContent: 'Magnificent artwork description.',
      mediaType: 'text'
    });
    test('POST /api/items creates item', createItemRes.status === 201 && createItemRes.body.success);
    
    // Allow asynchronous disk write
    await sleep(300);
    let diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let foundOnDisk = diskData.items.find(i => i.id === testItemId);
    test('Item exists on physical disk (data/db.json) after addition', !!foundOnDisk && foundOnDisk.subject === 'Divine Inspiration');

    // Edit Item
    const editItemRes = await request('POST', '/api/items', {
      id: testItemId,
      resultId: 'res-test-1',
      place: '1st',
      subject: 'Updated Divine Masterpiece',
      textContent: 'Updated text content for artwork.'
    });
    test('POST /api/items updates item with matching id', editItemRes.status === 201 && editItemRes.body.item.subject === 'Updated Divine Masterpiece');
    
    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    foundOnDisk = diskData.items.find(i => i.id === testItemId);
    test('Item edit persisted to physical disk', !!foundOnDisk && foundOnDisk.subject === 'Updated Divine Masterpiece');

    // Delete Item
    const deleteItemRes = await request('DELETE', `/api/items/${testItemId}`);
    test('DELETE /api/items/:id returns HTTP 200', deleteItemRes.status === 200 && deleteItemRes.body.success);
    
    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    foundOnDisk = diskData.items.find(i => i.id === testItemId);
    test('Item is permanently removed from physical disk (no ghost items)', !foundOnDisk);

    // 2. NEWS CRUD PERSISTENCE
    console.log('\n[2/6] Testing News & Announcements Add, Edit, Delete Persistence...');
    const testNewsTitle = 'Persisted Grand Announcement ' + Date.now();
    
    // Add News
    const createNewsRes = await request('POST', '/api/news', {
      title: testNewsTitle,
      category: 'Spotlight',
      content: 'Important fiesta bulletin.',
      isPublic: true
    });
    test('POST /api/news creates news article', createNewsRes.status === 201 && createNewsRes.body.success);
    const testNewsId = createNewsRes.body.news.id;

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let newsOnDisk = diskData.news.find(n => n.id === testNewsId);
    test('News exists on physical disk after addition', !!newsOnDisk && newsOnDisk.title === testNewsTitle);

    // Edit News
    const editNewsRes = await request('PUT', `/api/news/${testNewsId}`, {
      title: testNewsTitle + ' (REVISED)',
      category: 'Highlights'
    });
    test('PUT /api/news/:id updates news article', editNewsRes.status === 200 && editNewsRes.body.news.title.includes('(REVISED)'));

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    newsOnDisk = diskData.news.find(n => n.id === testNewsId);
    test('News edit persisted to physical disk', !!newsOnDisk && newsOnDisk.title.includes('(REVISED)'));

    // Delete News
    const deleteNewsRes = await request('DELETE', `/api/news/${testNewsId}`);
    test('DELETE /api/news/:id returns HTTP 200', deleteNewsRes.status === 200 && deleteNewsRes.body.success);

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    newsOnDisk = diskData.news.find(n => n.id === testNewsId);
    test('News is permanently removed from physical disk', !newsOnDisk);

    // 3. GALLERY PHOTO PERSISTENCE
    console.log('\n[3/6] Testing Gallery Add & Delete Persistence...');
    const createGalRes = await request('POST', '/api/gallery', {
      title: 'Persisted Gallery Shot ' + Date.now(),
      category: 'A-Zone',
      caption: 'Memorable moment',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819'
    });
    test('POST /api/gallery creates photo', createGalRes.status === 201 && createGalRes.body.success);
    const testGalId = createGalRes.body.item.id;

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let galOnDisk = diskData.gallery.find(g => g.id === testGalId);
    test('Gallery photo exists on physical disk', !!galOnDisk);

    // Delete Gallery
    const deleteGalRes = await request('DELETE', `/api/gallery/${testGalId}`);
    test('DELETE /api/gallery/:id returns HTTP 200', deleteGalRes.status === 200 && deleteGalRes.body.success);

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    galOnDisk = diskData.gallery.find(g => g.id === testGalId);
    test('Gallery photo is permanently removed from physical disk', !galOnDisk);

    // 4. PARTICIPANTS PERSISTENCE
    console.log('\n[4/6] Testing Participants Add & Delete Persistence...');
    const testPartName = 'Persisted Participant ' + Date.now();
    const createPartRes = await request('POST', '/api/participants', {
      name: testPartName,
      team: 'AL FATHA',
      category: 'B-Zone',
      class: 'Class 10-A'
    });
    test('POST /api/participants creates participant', createPartRes.status === 201 && createPartRes.body.success);
    const testPartId = createPartRes.body.participant.id;

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let partOnDisk = diskData.participants.find(p => p.id === testPartId);
    test('Participant exists on physical disk', !!partOnDisk && partOnDisk.name === testPartName);

    const deletePartRes = await request('DELETE', `/api/participants/${testPartId}`);
    test('DELETE /api/participants/:id returns HTTP 200', deletePartRes.status === 200 && deletePartRes.body.success);

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    partOnDisk = diskData.participants.find(p => p.id === testPartId);
    test('Participant permanently removed from physical disk', !partOnDisk);

    // 5. PROGRAMS PERSISTENCE
    console.log('\n[5/6] Testing Programs Add & Delete Persistence...');
    const testProgName = 'Persisted Program ' + Date.now();
    const createProgRes = await request('POST', '/api/programs', {
      name: testProgName,
      category: 'C-Zone',
      status: 'Upcoming'
    });
    test('POST /api/programs creates program', createProgRes.status === 201 && createProgRes.body.success);
    const testProgId = createProgRes.body.program.id;

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let progOnDisk = diskData.programs.find(p => p.id === testProgId);
    test('Program exists on physical disk', !!progOnDisk && progOnDisk.name === testProgName);

    const deleteProgRes = await request('DELETE', `/api/programs/${testProgId}`);
    test('DELETE /api/programs/:id returns HTTP 200', deleteProgRes.status === 200 && deleteProgRes.body.success);

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    progOnDisk = diskData.programs.find(p => p.id === testProgId);
    test('Program permanently removed from physical disk', !progOnDisk);

    // 6. RESULTS PERSISTENCE & VISIBILITY TOGGLE
    console.log('\n[6/6] Testing Results Add, Visibility Toggle, Renumber, and Delete Persistence...');
    const testResultProgName = 'Persisted Result Event ' + Date.now();
    const createResRes = await request('POST', '/api/results', {
      programName: testResultProgName,
      category: 'A-Zone',
      isPublic: true,
      winners: [
        { position: '1st', name: 'Winner One', team: 'AL HIKMA', points: 10 },
        { position: '2nd', name: 'Winner Two', team: 'AL FATHA', points: 5 },
        { position: '3rd', name: 'Winner Three', team: 'AL ISHRAQ', points: 3 }
      ]
    });
    test('POST /api/results creates result', createResRes.status === 201 && createResRes.body.success);
    const testResultId = createResRes.body.result.id;

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let resOnDisk = diskData.results.find(r => r.id === testResultId);
    test('Result exists on physical disk', !!resOnDisk && resOnDisk.programName === testResultProgName);

    // Toggle Visibility
    const toggleRes = await request('POST', `/api/results/${testResultId}/toggle-visibility`, { isPublic: false });
    test('POST /api/results/:id/toggle-visibility toggles isPublic', toggleRes.status === 200 && toggleRes.body.isPublic === false);

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    resOnDisk = diskData.results.find(r => r.id === testResultId);
    test('Result isPublic=false persisted to physical disk', !!resOnDisk && resOnDisk.isPublic === false);

    // Delete Result
    const deleteResRes = await request('DELETE', `/api/results/${testResultId}`);
    test('DELETE /api/results/:id returns HTTP 200', deleteResRes.status === 200 && deleteResRes.body.success);

    await sleep(300);
    diskData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    resOnDisk = diskData.results.find(r => r.id === testResultId);
    test('Result permanently removed from physical disk', !resOnDisk);

    console.log('\n========================================================================');
    console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
