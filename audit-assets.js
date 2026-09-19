/**
 * Comprehensive DOM & Asset Integrity Audit
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

async function runAudit() {
  console.log("=================================================");
  console.log("EXCELLENTIA ARTS FIESTA 2026 - DOM & ASSET AUDIT");
  console.log("=================================================\n");

  const publicDir = path.join(__dirname, 'public');
  const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

  let passed = 0;
  let warnings = 0;

  // 1. Check all local images referenced in index.html
  const imgMatches = [...indexHtml.matchAll(/src="(\/assets\/[^"]+)"/g)];
  console.log(`Found ${imgMatches.length} local asset image references in index.html:`);
  imgMatches.forEach(m => {
    const relPath = m[1].replace(/^\//, '');
    const fullPath = path.join(publicDir, relPath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`  ✅ Image exists: ${relPath} (${stats.size} bytes)`);
      passed++;
    } else {
      console.error(`  ❌ Image missing: ${relPath}`);
      warnings++;
    }
  });

  // 2. Check all CSS files
  const cssFiles = ['main.css', 'components.css', 'admin.css', 'poster.css'];
  cssFiles.forEach(cssFile => {
    const fullPath = path.join(publicDir, 'css', cssFile);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`  ✅ CSS exists: ${cssFile} (${stats.size} bytes)`);
      passed++;
    } else {
      console.error(`  ❌ CSS missing: ${cssFile}`);
      warnings++;
    }
  });

  // 3. Check all JS files
  const jsFiles = ['particles.js', 'api.js', 'poster-canvas.js', 'results.js', 'admin.js', 'app.js'];
  jsFiles.forEach(jsFile => {
    const fullPath = path.join(publicDir, 'js', jsFile);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`  ✅ JS exists: ${jsFile} (${stats.size} bytes)`);
      passed++;
    } else {
      console.error(`  ❌ JS missing: ${jsFile}`);
      warnings++;
    }
  });

  // 4. Test live server response for index.html
  const serverRes = await new Promise((resolve) => {
    http.get('http://localhost:3000', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', err => resolve({ status: 500, error: err.message }));
  });

  if (serverRes.status === 200) {
    console.log(`  ✅ Server HTTP GET / responded with 200 OK (${serverRes.data.length} bytes)`);
    passed++;
  } else {
    console.error(`  ❌ Server HTTP GET / failed:`, serverRes);
    warnings++;
  }

  // 5. Test state API
  const apiRes = await new Promise((resolve) => {
    http.get('http://localhost:3000/api/state', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, json: JSON.parse(data) }));
    }).on('error', err => resolve({ status: 500, error: err.message }));
  });

  if (apiRes.status === 200 && apiRes.json.teams && apiRes.json.teams.length === 4) {
    console.log(`  ✅ /api/state returns all 4 Houses: ${apiRes.json.teams.map(t => t.name).join(', ')}`);
    passed++;
  } else {
    console.error(`  ❌ /api/state invalid:`, apiRes);
    warnings++;
  }

  console.log("\n=================================================");
  console.log(`AUDIT RESULTS: ${passed} PASSED | ${warnings} WARNINGS`);
  console.log("=================================================");
}

runAudit();
