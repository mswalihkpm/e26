/**
 * Mobile Luxury Layout & Bottom App Dock Verification Test
 * Excellentia Arts Fiesta 2026
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTest() {
  console.log('========================================================================');
  console.log('TESTING MOBILE LUXURY REDESIGN & BOTTOM APP DOCK');
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
  const css = fs.readFileSync(path.join(__dirname, 'public', 'css', 'components.css'), 'utf8');
  const mainCss = fs.readFileSync(path.join(__dirname, 'public', 'css', 'main.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, 'public', 'js', 'app.js'), 'utf8');

  // 1. HTML Mobile Navigation Dock Structure
  console.log('[1/4] Testing HTML Mobile Dock & Drawer Elements...');
  test('index.html contains #mobile-bottom-nav', html.includes('id="mobile-bottom-nav"'));
  test('index.html contains #mob-nav-home', html.includes('id="mob-nav-home"'));
  test('index.html contains #mob-nav-leaderboard', html.includes('id="mob-nav-leaderboard"'));
  test('index.html contains #mob-nav-results with live dot', html.includes('id="mob-nav-results"') && html.includes('mob-nav-live-dot'));
  test('index.html contains #mob-nav-showcase', html.includes('id="mob-nav-showcase"'));
  test('index.html contains #mob-nav-videos', html.includes('id="mob-nav-videos"'));
  test('index.html contains #mob-nav-more button', html.includes('id="mob-nav-more"'));
  test('index.html contains #drawer-backdrop', html.includes('id="drawer-backdrop"'));
  test('index.html contains .drawer-brand-wrap', html.includes('drawer-brand-wrap'));
  test('index.html contains Winning Works in drawer links', html.includes('data-target="showcase-view"'));

  // 2. CSS Mobile Dock, Drawer & Glassmorphism
  console.log('\n[2/4] Testing Mobile Dock & Glassmorphism CSS...');
  test('components.css defines .mobile-bottom-nav display at max-width 768px', css.includes('.mobile-bottom-nav') && css.includes('backdrop-filter: blur(28px) saturate(190%)'));
  test('components.css defines safe-area-inset-bottom padding', css.includes('env(safe-area-inset-bottom)'));
  test('components.css defines .mob-nav-center-pill elevated results button', css.includes('.mob-nav-center-pill'));
  test('components.css defines .mob-nav-indicator active glowing bar', css.includes('.mob-nav-indicator'));
  test('components.css defines light mode overrides for bottom nav', css.includes('[data-theme="light"] .mobile-bottom-nav'));
  test('components.css defines PWA banner mobile clearance (bottom offset)', css.includes('.pwa-install-banner') && css.includes('bottom: calc(75px + env(safe-area-inset-bottom))'));
  test('main.css defines .drawer-backdrop with blur and z-index', mainCss.includes('.drawer-backdrop') && mainCss.includes('.drawer-backdrop.open'));
  test('main.css defines dark theme .btn-glow-outline and .btn-admin-glow', mainCss.includes('.btn-glow-outline {') && mainCss.includes('.btn-admin-glow {'));

  // 3. Mobile Hero & Standings Layouts
  console.log('\n[3/4] Testing Mobile Hero Bento & Standings Styling...');
  test('components.css defines 2x2 Bento stats grid at max-width 768px', css.includes('.fiesta-stats-grid') && css.includes('grid-template-columns: repeat(2, 1fr)'));
  test('components.css defines mobile Top 3 Duel cards', css.includes('.home-top3-card') && css.includes('flex-direction: row'));
  test('components.css defines 3-pillar Olympic podium on mobile', css.includes('.podium-step-1 { order: 2') && css.includes('.podium-step-2 { order: 1'));
  test('components.css defines horizontal swipeable results filter bar', css.includes('.results-streamline-filterbar') && css.includes('overflow-x: auto'));

  // 4. JS Navigation Binding
  console.log('\n[4/4] Testing JS Dynamic Navigation Controller...');
  test('app.js selects .mobile-bottom-nav-item in setupNavigation', js.includes('.mobile-bottom-nav-item'));
  test('app.js manages active class on .mobile-bottom-nav-item', js.includes("link.dataset.target === targetViewId"));
  test('app.js wires up #mob-nav-more toggle event', js.includes('btnMobNavMore'));
  test('app.js defines window.openMobileDrawer and window.closeMobileDrawer', js.includes('window.openMobileDrawer') && js.includes('window.closeMobileDrawer'));
  test('app.js binds drawerBackdrop click to closeDrawer', js.includes('drawerBackdrop.addEventListener(\'click\', closeDrawer)'));

  console.log('\n========================================================================');
  console.log(`MOBILE AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) process.exit(1);
}

runTest();
