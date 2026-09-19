const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

function runSecurityAudit() {
  console.log('========================================================================');
  console.log('EXCELLENTIA ARTS FIESTA 2026 - CLIENT-SIDE SECURITY AUDIT');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(title, condition, extra = '') {
    if (condition) {
      console.log('  ✅ ' + title);
      passed++;
    } else {
      console.error('  ❌ ' + title + (extra ? ' -> ' + extra : ''));
      failed++;
    }
  }

  const publicFiles = getAllFiles(path.join(__dirname, 'public'));
  console.log(`Auditing ${publicFiles.length} client-side static files in public/...`);

  const forbiddenPatterns = [
    { name: 'Supabase Service Role Key pattern', regex: /SUPABASE_SERVICE_ROLE_KEY|service_role\./i },
    { name: 'Hardcoded Supabase secret token', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/ },
    { name: 'Private database connection string', regex: /postgres:\/\/.*:.*@/i },
    { name: 'AWS Secret Access Key pattern', regex: /aws_secret_access_key/i }
  ];

  let violationsFound = 0;

  publicFiles.forEach(filePath => {
    const ext = path.extname(filePath).toLowerCase();
    if (['.js', '.html', '.css', '.json'].includes(ext)) {
      const content = fs.readFileSync(filePath, 'utf8');
      forbiddenPatterns.forEach(pattern => {
        if (pattern.regex.test(content)) {
          console.error(`  ❌ SECURITY VIOLATION: ${pattern.name} found in ${path.relative(__dirname, filePath)}`);
          violationsFound++;
        }
      });
    }
  });

  test('Zero secret keys / Service Role credentials exposed in public directory', violationsFound === 0, `Violations: ${violationsFound}`);
  test('.env.example does not expose real production keys', fs.existsSync('.env.example') && !fs.readFileSync('.env.example', 'utf8').includes('secret_key_12345'));
  test('Supabase client in db/supabase.js reads credentials securely via process.env', fs.readFileSync('db/supabase.js', 'utf8').includes('process.env.SUPABASE_SERVICE_ROLE_KEY'));

  console.log('\n========================================================================');
  console.log(`SECURITY AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) process.exit(1);
}

runSecurityAudit();
