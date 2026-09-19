const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== TESTING DESCENDING RESULTS SORT & LIVE SLIDESHOW INTERRUPT ===\n');

// Mock browser DOM and environment
const mockDOM = () => {
  const elements = {};
  const getOrCreate = (id) => {
    if (!elements[id]) {
      elements[id] = {
        id,
        tagName: 'DIV',
        innerHTML: '',
        textContent: '',
        value: '',
        style: {},
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); },
          toggle(c) { if (this.classes.has(c)) this.classes.delete(c); else this.classes.add(c); }
        },
        dataset: {},
        addEventListener: () => {},
        querySelectorAll: () => [],
        querySelector: () => null,
        appendChild: () => {},
        offsetWidth: 100
      };
    }
    return elements[id];
  };

  const doc = {
    getElementById: (id) => getOrCreate(id),
    querySelectorAll: (sel) => [],
    querySelector: (sel) => null,
    addEventListener: () => {},
    activeElement: { tagName: 'BODY' },
    fullscreenElement: null
  };

  return { doc, elements };
};

// Test 1: Results Engine default descending sort
console.log('[TEST 1] Checking results.js default sort order:');
const resultsCode = fs.readFileSync(path.join(__dirname, 'public/js/results.js'), 'utf8');

const testState = {
  results: [
    { id: 'r1', resultNumber: 1, programName: 'Elocution', category: 'A-Zone', isPublic: true },
    { id: 'r2', resultNumber: 5, programName: 'Qawwali', category: 'A-Zone', isPublic: true },
    { id: 'r3', resultNumber: 12, programName: 'Social Text', category: 'B-Zone', isPublic: true },
    { id: 'r4', resultNumber: 8, programName: 'Duff', category: 'C-Zone', isPublic: true }
  ]
};

let apiSubscribers = [];
const mockAPI = {
  subscribe: (fn) => apiSubscribers.push(fn),
  getState: () => testState
};

const sandbox1 = {
  window: { FiestaAPI: mockAPI, showToast: () => {} },
  document: mockDOM().doc,
  console: console
};
vm.createContext(sandbox1);
vm.runInContext(resultsCode, sandbox1);

// Initialize results engine
sandbox1.window.FiestaResults.init();
const sortedResults = sandbox1.window.FiestaResults.filterResults(testState.results);

console.log('Result numbers after default sorting:');
console.log(sortedResults.map(r => `#${r.resultNumber} (${r.programName})`));

const isDescending = sortedResults[0].resultNumber === 12 &&
                     sortedResults[1].resultNumber === 8 &&
                     sortedResults[2].resultNumber === 5 &&
                     sortedResults[3].resultNumber === 1;

if (isDescending) {
  console.log('✅ TEST 1 PASSED: Results are strictly in DESCENDING order (#12 -> #8 -> #5 -> #1).\n');
} else {
  console.error('❌ TEST 1 FAILED: Results are not descending.');
  process.exit(1);
}

// Test 2: Slideshow Engine Descending Order
console.log('[TEST 2] Checking slideshow.js descending order of cycling:');
const slideshowCode = fs.readFileSync(path.join(__dirname, 'public/js/slideshow.js'), 'utf8');

let chimePlayed = false;
let toastMessage = '';

const sandbox2 = {
  window: {
    FiestaAPI: {
      subscribe: (fn) => apiSubscribers.push(fn),
      getState: () => ({ ...testState, settings: { standingsSlideInterval: 5 } })
    },
    FiestaResults: sandbox1.window.FiestaResults,
    showToast: (msg) => { toastMessage = msg; },
    AudioContext: class {
      constructor() { this.currentTime = 0; this.state = 'running'; }
      createOscillator() { return { connect: () => {}, start: () => { chimePlayed = true; }, stop: () => {}, frequency: { setValueAtTime: () => {} }, type: '' }; }
      createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }; }
      get destination() { return {}; }
    }
  },
  document: mockDOM().doc,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout
};
vm.createContext(sandbox2);
vm.runInContext(slideshowCode, sandbox2);

sandbox2.window.FiestaSlideshow.init();

// Check if first slide is the highest result number (#12)
const slideStage = sandbox2.document.getElementById('theater-slide-stage');
const has12InStage = slideStage.innerHTML.includes('RESULT #12');
console.log('Initial slide stage contains highest result (#12):', has12InStage);

if (has12InStage) {
  console.log('✅ TEST 2 PASSED: Slideshow starts with highest result in descending order (#12).\n');
} else {
  console.error('❌ TEST 2 FAILED: Slideshow did not start with highest result.');
  process.exit(1);
}

// Test 3: Sudden Arrival of New Result Interrupts Slideshow Live
console.log('[TEST 3] Testing sudden arrival of brand new result while slideshow is running:');

// Simulate a brand new result being published: Result #15 "Calligraphy"
const newResult = {
  id: 'r5_new',
  resultNumber: 15,
  programName: 'Arabic Calligraphy Masterclass',
  category: 'A-Zone',
  isPublic: true,
  winners: [
    { position: '1st', participantName: 'Ahmad Bilal', team: 'Bukhara', points: 10, grade: 'A' }
  ]
};

const updatedState = {
  ...testState,
  results: [
    ...testState.results,
    newResult
  ]
};

// Trigger state update notification to all subscribers
apiSubscribers.forEach(fn => fn(updatedState));

// Verify that the slide stage immediately jumped to show the brand new result #15
const stageAfterNewResult = sandbox2.document.getElementById('theater-slide-stage');
const hasNewResultInStage = stageAfterNewResult.innerHTML.includes('RESULT #15') && 
                            stageAfterNewResult.innerHTML.includes('Arabic Calligraphy Masterclass');
const hasBreakingBanner = stageAfterNewResult.innerHTML.includes('JUST ANNOUNCED');

console.log('Slide stage jumped to Result #15 immediately:', hasNewResultInStage);
console.log('Slide stage shows "JUST ANNOUNCED" breaking banner:', hasBreakingBanner);
console.log('Celebratory audio chime played:', chimePlayed);
console.log('Toast notification shown:', toastMessage);

if (hasNewResultInStage && hasBreakingBanner && chimePlayed) {
  console.log('\n✅ TEST 3 PASSED: Sudden new result immediately interrupted the slideshow, played chime, and displayed breaking announcement slide!\n');
} else {
  console.error('\n❌ TEST 3 FAILED: New result interruption did not work as expected.');
  process.exit(1);
}

console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');
process.exit(0);
