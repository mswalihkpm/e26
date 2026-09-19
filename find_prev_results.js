const fs = require('fs');

const p1 = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\d7a4c387-e038-40ef-8445-1fd6c982fd64\\.system_generated\\logs\\transcript_full.jsonl';
const p2 = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\d7a4c387-e038-40ef-8445-1fd6c982fd64\\.system_generated\\logs\\transcript.jsonl';

const path = fs.existsSync(p1) ? p1 : p2;
console.log('Reading from:', path);

if (fs.existsSync(path)) {
  const lines = fs.readFileSync(path, 'utf8').split('\n');
  console.log('Total lines:', lines.length);

  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Elocution English') && lines[i].includes('"results"')) {
      try {
        const step = JSON.parse(lines[i]);
        fs.writeFileSync('extracted_prev_step.json', JSON.stringify(step, null, 2));
        console.log('Saved step to extracted_prev_step.json from step index:', step.step_index);
        break;
      } catch (e) {
        console.error(e);
      }
    }
  }
} else {
  console.log('Path not found');
}
