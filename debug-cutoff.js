const fs = require('fs');
const path = require('path');
const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'db.json'), 'utf8'));

console.log('Results in db.json:');
db.results.forEach((r, idx) => {
  const pts = (r.winners || []).reduce((s, w) => s + (Number(w.points) || 0), 0);
  console.log(`[${idx}] id: ${r.id}, resultNumber: ${r.resultNumber}, name: ${r.programName}, total pts: ${pts}`);
});
