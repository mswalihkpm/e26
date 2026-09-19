const fs = require('fs');
const http = require('http');

async function testAll() {
  console.log('================================================================');
  console.log('EXCELLENTIA ARTS FIESTA 2026 - THEME ASSETS & SLIDESHOW TEST');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, detail = '') {
    if (condition) {
      console.log('✅ ' + title);
      passed++;
    } else {
      console.error('❌ ' + title + (detail ? ' -> ' + detail : ''));
      failed++;
    }
  }

  // 1. Check Theme Logo File
  const logoPath = 'public/assets/images/theme-iceberg-logo.png';
  const logoExists = fs.existsSync(logoPath);
  assert('Theme logo image exists on disk', logoExists);
  if (logoExists) {
    const stat = fs.statSync(logoPath);
    assert('Theme logo size is > 100KB (HD)', stat.size > 100000, 'Size: ' + stat.size);
  }

  // 2. Check Theme Font File
  const fontPath = 'public/assets/images/theme-text-discover.png';
  const fontExists = fs.existsSync(fontPath);
  assert('Theme font image exists on disk', fontExists);
  if (fontExists) {
    const stat = fs.statSync(fontPath);
    assert('Theme font size is > 100KB (HD)', stat.size > 100000, 'Size: ' + stat.size);
  }

  // 3. Check Intro Video File
  const videoPath = 'public/videos/INTRO SPEED.mp4';
  const videoExists = fs.existsSync(videoPath);
  assert('Transition intro video exists on disk', videoExists);

  // 4. HTTP Fetch Video
  const videoHttp = await new Promise(resolve => {
    http.get('http://localhost:3000/videos/INTRO%20SPEED.mp4', res => {
      resolve({ statusCode: res.statusCode, contentType: res.headers['content-type'], length: res.headers['content-length'] });
    }).on('error', err => resolve({ error: err.message }));
  });
  assert('Intro video served with HTTP 200 & video/mp4', videoHttp.statusCode === 200 && videoHttp.contentType.includes('video/mp4'), JSON.stringify(videoHttp));

  // 5. Check index.html DOM elements
  const html = fs.readFileSync('public/index.html', 'utf8');
  assert('index.html contains Hero theme logo', html.includes('src="/assets/images/theme-iceberg-logo.png"'));
  assert('index.html contains Hero theme text font', html.includes('src="/assets/images/theme-text-discover.png"'));
  assert('index.html contains Results Slideshow container', html.includes('id="results-slideshow-wrapper"'));
  assert('index.html contains Arena Theater Frame', html.includes('id="arena-theater-frame"'));
  assert('index.html contains Slide Stage', html.includes('id="theater-slide-stage"'));
  assert('index.html contains Video Stage', html.includes('id="theater-video-stage"'));
  assert('index.html contains Transition Video Element', html.includes('id="theater-transition-video"'));
  assert('index.html contains Video Player Modal', html.includes('id="modal-video-player"'));
  assert('index.html loads slideshow.js script', html.includes('src="/js/slideshow.js"'));

  // 6. Check CSS Rules
  const css = fs.readFileSync('public/css/components.css', 'utf8');
  assert('CSS contains .theme-icon-container styles', css.includes('.theme-icon-container'));
  assert('CSS contains .arena-theater-frame styles', css.includes('.arena-theater-frame'));
  assert('CSS contains .theater-video-stage styles', css.includes('.theater-video-stage'));
  assert('CSS contains .ss-podium-showcase styles', css.includes('.ss-podium-showcase'));
  assert('CSS contains .ss-card-first gold podium styles', css.includes('.ss-card-first'));
  assert('CSS contains theater fullscreen mode styles', css.includes('.arena-theater-frame.is-fullscreen'));

  // 7. Check slideshow.js Engine Code
  const js = fs.readFileSync('public/js/slideshow.js', 'utf8');
  assert('slideshow.js contains FiestaSlideshow module', js.includes('window.FiestaSlideshow'));
  assert('slideshow.js contains video transition logic', js.includes('triggerVideoTransition') && js.includes('onVideoEnded'));
  assert('slideshow.js contains slide progress bar logic', js.includes('startSlideProgress'));
  assert('slideshow.js contains keyboard shortcuts', js.includes('setupKeyboardShortcuts'));
  assert('slideshow.js contains house config for 4 houses', js.includes('bukhara') && js.includes('undulus') && js.includes('samarkhand') && js.includes('qurthuba'));

  console.log('================================================================');
  console.log(`SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

testAll();
