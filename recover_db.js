const fs = require('fs');

const transcriptPath = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\2df8ba5e-a198-4bbc-b4e9-ff0ea9b7a8f4\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i];
  if (line.includes('"results"') && line.includes('"programName"') && line.includes('"Bukhara"')) {
    try {
      const step = JSON.parse(line);
      const str = JSON.stringify(step);
      // Search for "results": [...]
      const match = str.match(/"results":\s*(\[[^\]]*(\{[^}]*\}[^\]]*)*\])/);
      if (match) {
        console.log('Found match in step:', step.step_index);
      }
    } catch (e) {}
  }
}
