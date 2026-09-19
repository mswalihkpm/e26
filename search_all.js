const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain';
const convDirs = fs.readdirSync(brainDir);

for (const conv of convDirs) {
  const fullP = path.join(brainDir, conv, '.system_generated', 'logs', 'transcript_full.jsonl');
  if (fs.existsSync(fullP)) {
    console.log('Searching in:', conv);
    const content = fs.readFileSync(fullP, 'utf8');
    const idx = content.indexOf('\"programName\"');
    if (idx !== -1) {
      console.log('FOUND "programName" in conv:', conv);
      // Find the JSON block around it
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('"programName"') && line.includes('"winners"')) {
          console.log('Found line with programName and winners!');
          fs.writeFileSync('found_winners_line.json', line);
          break;
        }
      }
    }
  }
}
