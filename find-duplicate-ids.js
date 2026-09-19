const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

const idRegex = /id="([^"]+)"/g;
const idCounts = {};
let match;
while ((match = idRegex.exec(indexHtml)) !== null) {
  const id = match[1];
  idCounts[id] = (idCounts[id] || 0) + 1;
}

const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);
console.log('--- DUPLICATE ELEMENT IDs IN index.html ---');
console.log('Total duplicates:', duplicates.length);
duplicates.forEach(([id, count]) => {
  console.log(`  ❌ ID "${id}" appears ${count} times`);
});
