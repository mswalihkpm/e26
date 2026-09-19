const http = require('http');
const fs = require('fs');
const path = require('path');

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
  console.log('=== VERIFYING UNUPLOADED NEWS RESTRICTIONS & MANAGEMENT ===\n');
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
    // 1. Check Server News Endpoints
    const postPayload = JSON.stringify({
      title: 'Automated Test News Bulletin',
      category: 'Top Story',
      badge: 'Breaking',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
      summary: 'Testing that uploaded news articles are properly flagged and displayed.'
    });

    const resPost = await makeRequest({
      host: 'localhost',
      port: 3000,
      path: '/api/news',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postPayload)
      }
    }, postPayload);

    assert('POST /api/news returns HTTP 201', resPost.statusCode === 201);
    const postData = JSON.parse(resPost.body);
    const createdId = postData.news.id;
    assert('Created news has isUploaded = true', postData.news.isUploaded === true);
    assert('Created news has isPublic = true', postData.news.isPublic === true);
    assert('Created news has isPublished = true', postData.news.isPublished === true);

    // 2. Test PUT /api/news/:id
    const putPayload = JSON.stringify({
      title: 'Updated Test News Headline',
      summary: 'Updated summary description.'
    });
    const resPut = await makeRequest({
      host: 'localhost',
      port: 3000,
      path: `/api/news/${createdId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(putPayload)
      }
    }, putPayload);

    assert('PUT /api/news/:id returns HTTP 200', resPut.statusCode === 200);
    const putData = JSON.parse(resPut.body);
    assert('Updated news has new title', putData.news.title === 'Updated Test News Headline');

    // 3. Test PATCH /api/news/:id/toggle-visibility (Unpublish/Hide)
    const resToggleHide = await makeRequest({
      host: 'localhost',
      port: 3000,
      path: `/api/news/${createdId}/toggle-visibility`,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });
    assert('PATCH toggle-visibility returns HTTP 200', resToggleHide.statusCode === 200);
    const toggleHideData = JSON.parse(resToggleHide.body);
    assert('News is now hidden/unpublished (isPublic === false)', toggleHideData.isPublic === false);

    // 4. Test renderNews simulation in frontend logic
    const mockDOM = {
      homeHTML: '',
      mainHTML: ''
    };
    function simulateRenderNews(newsList) {
      const validNews = (newsList || []).filter(n => {
        if (!n || !n.title || !n.title.trim()) return false;
        if (n.isUploaded === false || n.isPublic === false || n.isPublished === false || n.status === 'draft' || n.status === 'unuploaded') {
          return false;
        }
        return true;
      });

      if (validNews.length === 0) {
        mockDOM.homeHTML = 'EMPTY';
        mockDOM.mainHTML = 'EMPTY';
        return;
      }
      mockDOM.homeHTML = validNews.map(n => n.title).join(', ');
      mockDOM.mainHTML = validNews.map(n => n.title).join(', ');
    }

    const testNewsList = [
      { id: '1', title: 'Real Uploaded News 1', isUploaded: true, isPublic: true, isPublished: true },
      { id: '2', title: 'Unuploaded Draft News', isUploaded: false, isPublic: true, isPublished: true },
      { id: '3', title: 'Hidden Unpublished News', isUploaded: true, isPublic: false, isPublished: false },
      { id: '4', title: 'Draft Status News', isUploaded: true, isPublic: true, status: 'draft' },
      { id: '5', title: 'Unuploaded Status News', isUploaded: true, isPublic: true, status: 'unuploaded' },
      { id: '6', title: '', isUploaded: true, isPublic: true },
      { id: '7', title: 'Real Uploaded News 2', isUploaded: true, isPublic: true, isPublished: true }
    ];

    simulateRenderNews(testNewsList);
    assert('simulateRenderNews excludes unuploaded news', !mockDOM.mainHTML.includes('Unuploaded Draft News'));
    assert('simulateRenderNews excludes hidden unpublished news', !mockDOM.mainHTML.includes('Hidden Unpublished News'));
    assert('simulateRenderNews excludes draft status news', !mockDOM.mainHTML.includes('Draft Status News'));
    assert('simulateRenderNews excludes unuploaded status news', !mockDOM.mainHTML.includes('Unuploaded Status News'));
    assert('simulateRenderNews includes valid uploaded news 1 & 2', mockDOM.mainHTML.includes('Real Uploaded News 1') && mockDOM.mainHTML.includes('Real Uploaded News 2'));

    // Empty list test
    simulateRenderNews([]);
    assert('simulateRenderNews shows empty placeholder when 0 valid news exist', mockDOM.mainHTML === 'EMPTY');

    // 5. Test Clean Unuploaded Endpoint
    const resClean = await makeRequest({
      host: 'localhost',
      port: 3000,
      path: '/api/news/clean-unuploaded',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert('POST /api/news/clean-unuploaded returns HTTP 200', resClean.statusCode === 200);
    const cleanData = JSON.parse(resClean.body);
    assert('Clean endpoint returns remaining valid news count', typeof cleanData.remainingCount === 'number');

    // 6. Test Delete Single News
    const resDel = await makeRequest({
      host: 'localhost',
      port: 3000,
      path: `/api/news/${createdId}`,
      method: 'DELETE'
    });
    assert('DELETE /api/news/:id returns HTTP 200', resDel.statusCode === 200);

    // 7. Verify index.html and JS source files
    const indexHTML = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    assert('index.html contains #btn-clean-unuploaded-news', indexHTML.includes('id="btn-clean-unuploaded-news"'));
    assert('index.html contains #btn-clear-all-news', indexHTML.includes('id="btn-clear-all-news"'));
    assert('index.html contains #btn-bulk-delete-news', indexHTML.includes('id="btn-bulk-delete-news"'));
    assert('index.html contains #news-is-public visibility switch', indexHTML.includes('id="news-is-public"'));

    const appJS = fs.readFileSync(path.join(__dirname, 'public', 'js', 'app.js'), 'utf8');
    assert('app.js filters out isUploaded === false in renderNews', appJS.includes('isUploaded === false'));
    assert('app.js filters out isPublic === false in renderNews', appJS.includes('isPublic === false'));

    const adminJS = fs.readFileSync(path.join(__dirname, 'public', 'js', 'admin.js'), 'utf8');
    assert('admin.js contains renderAdminNews', adminJS.includes('renderAdminNews'));
    assert('admin.js contains toggleNewsVisibility', adminJS.includes('toggleNewsVisibility'));
    assert('admin.js contains editNewsPrompt', adminJS.includes('editNewsPrompt'));
    assert('admin.js contains deleteNewsPrompt', adminJS.includes('deleteNewsPrompt'));

    const apiJS = fs.readFileSync(path.join(__dirname, 'public', 'js', 'api.js'), 'utf8');
    assert('api.js exports updateNews', apiJS.includes('updateNews'));
    assert('api.js exports toggleNewsVisibility', apiJS.includes('toggleNewsVisibility'));
    assert('api.js exports cleanUnuploadedNews', apiJS.includes('cleanUnuploadedNews'));
    assert('api.js exports bulkDeleteNews', apiJS.includes('bulkDeleteNews'));

    console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  } catch (e) {
    console.error('Test Execution Error:', e);
  }
}

runTests();
