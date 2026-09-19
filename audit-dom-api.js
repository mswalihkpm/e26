const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
const jsFiles = ['app.js', 'admin.js', 'api.js', 'results.js', 'slideshow.js', 'poster-canvas.js', 'pwa.js', 'particles.js'];

// Find all getElementById in JS
const missingIds = [];
const checkedIds = new Set();

jsFiles.forEach(file => {
  const code = fs.readFileSync(path.join(__dirname, 'public', 'js', file), 'utf8');
  const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const id = match[1];
    if (!checkedIds.has(id)) {
      checkedIds.add(id);
      if (!indexHtml.includes(`id="${id}"`) && !indexHtml.includes(`id='${id}'`)) {
        missingIds.push({ file, id });
      }
    }
  }
});

console.log('Checked', checkedIds.size, 'unique element IDs.');
console.log('Missing IDs count:', missingIds.length);
missingIds.forEach(m => console.log(`  ❌ [${m.file}] ID not found in index.html: "${m.id}"`));

// Check all fetch / API calls against server.js
const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const apiCalls = [];
jsFiles.forEach(file => {
  const code = fs.readFileSync(path.join(__dirname, 'public', 'js', file), 'utf8');
  const fetchRegex = /fetch\(\s*`?\${?API_BASE}?(\/[^`'"]*)`?/g;
  let match;
  while ((match = fetchRegex.exec(code)) !== null) {
    apiCalls.push({ file, endpoint: match[1] });
  }
  const fetchRegex2 = /fetch\(\s*['"](\/api\/[^'"]+)['"]/g;
  while ((match = fetchRegex2.exec(code)) !== null) {
    apiCalls.push({ file, endpoint: match[1] });
  }
});

console.log('\n--- API Endpoint Check ---');
apiCalls.forEach(call => {
  // Convert endpoint to route regex or pattern
  let cleanRoute = call.endpoint.replace(/\${[^}]+}/g, ':param').replace(/\/api/, '');
  console.log(`  API Call in ${call.file}: ${call.endpoint}`);
});
