/**
 * Verification Test for Decreasing Result Number Ordering and Fest Dates (19, 20 September 2026)
 * Excellentia Arts Fiesta 2026
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
  console.log('========================================================================');
  console.log('TESTING RESULTS DECREASING ORDER SORTING & UPDATED FEST DATES');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, condition) {
    if (condition) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  const resultsJs = fs.readFileSync(path.join(__dirname, 'public', 'js', 'results.js'), 'utf8');
  const dbJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'db.json'), 'utf8'));
  const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

  // 1. Fest Dates Verification
  console.log('[1/2] Testing Fest Dates (19, 20 September 2026)...');
  test('index.html hero badge contains 19, 20 SEPTEMBER 2026', html.includes('19, 20 SEPTEMBER 2026'));
  test('data/db.json settings contains dates: "19, 20 September 2026"', dbJson.settings && dbJson.settings.dates === '19, 20 September 2026');
  test('server.js DEFAULT_DATABASE contains dates: "19, 20 September 2026"', serverJs.includes('19, 20 September 2026'));

  // 2. Results Decreasing Order Verification
  console.log('\n[2/2] Testing Results Default Decreasing Order (N..1)...');
  test('results.js activeFilters default sort is "num-desc"', resultsJs.includes("sort: 'num-desc'"));
  test('results.js filterResults sorts by (Number(b.resultNumber) || 0) - (Number(a.resultNumber) || 0) as default', resultsJs.includes("(Number(b.resultNumber) || 0) - (Number(a.resultNumber) || 0)"));
  test('index.html res-sort-select defaults to num-desc (Decreasing N..1)', html.includes('<option value="num-desc" selected>Sort by: Result # (Decreasing N..1 ▾)</option>'));

  // Simulate Sorting Behavior
  const sampleResults = [
    { id: 'res-3', resultNumber: 15, programName: 'C Drama' },
    { id: 'res-1', resultNumber: 2, programName: 'A Elocution' },
    { id: 'res-4', resultNumber: 1, programName: 'Arabic Song' },
    { id: 'res-2', resultNumber: 8, programName: 'B Calligraphy' }
  ];

  sampleResults.sort((a, b) => (Number(b.resultNumber) || 0) - (Number(a.resultNumber) || 0));
  const sortedNumbers = sampleResults.map(r => r.resultNumber);
  test('Sorted results are strictly decreasing: [15, 8, 2, 1]', JSON.stringify(sortedNumbers) === JSON.stringify([15, 8, 2, 1]));

  console.log('\n========================================================================');
  console.log(`SORT & DATES AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

runTest();
