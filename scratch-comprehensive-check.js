const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

// 1. Find all view sections
const viewRegex = /<section[^>]*class="[^"]*view-section[^"]*"[^>]*id="([^"]+)"/g;
const views = [];
let vMatch;
while ((vMatch = viewRegex.exec(indexHtml)) !== null) {
  views.push(vMatch[1]);
}
console.log('--- VIEW SECTIONS IN index.html ---');
console.log(views);

// 2. Check showcase view
console.log('Has showcase view:', indexHtml.includes('id="showcase-view"'));
console.log('Has showcase-items-grid:', indexHtml.includes('id="showcase-items-grid"'));
console.log('Has showcase-category-tabs:', indexHtml.includes('id="showcase-category-tabs"'));
console.log('Has showcase-place-tabs:', indexHtml.includes('id="showcase-place-tabs"'));

// 3. Check admin view tabs
const tabPanesRegex = /id="(tab-[^"]+)"/g;
const tabPanes = [];
let tMatch;
while ((tMatch = tabPanesRegex.exec(indexHtml)) !== null) {
  tabPanes.push(tMatch[1]);
}
console.log('\n--- ADMIN TAB PANES ---');
console.log(tabPanes);

// 4. Check all forms
const formRegex = /id="(form-[^"]+)"/g;
const forms = [];
let fMatch;
while ((fMatch = formRegex.exec(indexHtml)) !== null) {
  forms.push(fMatch[1]);
}
console.log('\n--- FORMS IN index.html ---');
console.log(forms);
