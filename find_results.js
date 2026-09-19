const fs = require('fs');

const p1 = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\2df8ba5e-a198-4bbc-b4e9-ff0ea9b7a8f4\\.system_generated\\logs\\transcript_full.jsonl';
const p2 = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\2df8ba5e-a198-4bbc-b4e9-ff0ea9b7a8f4\\.system_generated\\logs\\transcript.jsonl';

const path = fs.existsSync(p1) ? p1 : p2;
console.log('Reading from:', path);

const lines = fs.readFileSync(path, 'utf8').split('\n');
console.log('Total lines:', lines.length);

for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('Elocution English') && lines[i].includes('Zayan Rayan') && lines[i].includes('"results"')) {
    try {
      const step = JSON.parse(lines[i]);
      fs.writeFileSync('extracted_step.json', JSON.stringify(step, null, 2));
      console.log('Saved step to extracted_step.json from step index:', step.step_index);
      break;
    } catch (e) {
      console.error(e);
    }
  }
}
