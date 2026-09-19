/**
 * Main Fiesta Application Controller & UI Orchestration
 * Excellentia Arts Fiesta 2026 - Discover the Unseen
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Global Toast Helper
  window.showToast = function(msg, type = 'info') {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'circle-check' : (type === 'error' ? 'circle-xmark' : (type === 'warning' ? 'triangle-exclamation' : 'circle-info'));
    toast.innerHTML = `<i class="fa-solid fa-${icon} text-cyan"></i> <span>${msg}</span>`;

    stack.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.35s ease';
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  };

  setupThemeMode();
  setupNavigation();
  setupSettingsModal();
  setupPublicReportModal();
  setupShowcaseView();
  setupItemPreviewModal();
  setupGallery();
  setupVideosView();

  if (window.FiestaResults && typeof window.FiestaResults.init === 'function') {
    window.FiestaResults.init();
  }
  if (window.FiestaAdmin && typeof window.FiestaAdmin.init === 'function') {
    window.FiestaAdmin.init();
  }

  window.FiestaAPI.subscribe(renderAllViews);
  await window.FiestaAPI.fetchState();
});

/* ==========================================================================
   THEME MODE (DARK / LIGHT)
   ========================================================================== */
function setupThemeMode() {
  const toggle = document.getElementById('settings-theme-toggle');
  const label = document.getElementById('theme-mode-label');
  const savedTheme = localStorage.getItem('fiesta_theme') || 'dark';

  function applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (toggle) toggle.checked = true;
      if (label) label.textContent = 'Light';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (toggle) toggle.checked = false;
      if (label) label.textContent = 'Dark';
    }
    localStorage.setItem('fiesta_theme', theme);
  }

  applyTheme(savedTheme);

  if (toggle) {
    toggle.addEventListener('change', () => {
      applyTheme(toggle.checked ? 'light' : 'dark');
    });
  }
}

/* ==========================================================================
   SETTINGS MODAL & FIESTA GUIDE
   ========================================================================== */
function setupSettingsModal() {
  const btnOpen = document.getElementById('btn-open-settings');
  const btnDrawerOpen = document.getElementById('btn-drawer-settings');
  const btnFooterOpen = document.getElementById('btn-footer-settings-btn');
  const modal = document.getElementById('modal-settings');
  const btnClose = document.getElementById('btn-close-settings-modal');
  const btnOpenReport = document.getElementById('btn-settings-open-report');
  const modalReport = document.getElementById('modal-public-report');

  function openSettings() {
    if (modal) modal.classList.add('open');
  }

  function closeSettings() {
    if (modal) modal.classList.remove('open');
  }

  if (btnOpen) btnOpen.addEventListener('click', openSettings);
  if (btnFooterOpen) btnFooterOpen.addEventListener('click', openSettings);
  if (btnDrawerOpen) {
    btnDrawerOpen.addEventListener('click', () => {
      const drawer = document.getElementById('mobile-nav-drawer');
      if (drawer) drawer.classList.remove('open');
      openSettings();
    });
  }
  if (btnClose && modal) btnClose.addEventListener('click', closeSettings);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSettings();
    });
  }

  if (btnOpenReport) {
    btnOpenReport.addEventListener('click', () => {
      closeSettings();
      if (modalReport) modalReport.classList.add('open');
    });
  }

  // Supabase Status & Config Manager
  const supabaseBadge = document.getElementById('supabase-status-badge');
  const supabaseInputUrl = document.getElementById('supabase-input-url');
  const supabaseInputKey = document.getElementById('supabase-input-key');
  const btnSupabaseConnect = document.getElementById('btn-supabase-save-connect');
  const btnSupabaseSync = document.getElementById('btn-supabase-manual-sync');

  async function checkSupabaseStatus() {
    try {
      const res = await fetch('/api/supabase/status');
      if (res.ok) {
        const data = await res.json();
        if (supabaseBadge) {
          if (data.configured) {
            supabaseBadge.className = 'badge-status-completed';
            supabaseBadge.innerHTML = '<i class="fa-solid fa-cloud text-emerald"></i> Supabase Cloud Connected';
          } else {
            supabaseBadge.className = 'badge-status-pending';
            supabaseBadge.innerHTML = '<i class="fa-solid fa-database text-gold"></i> Local In-Memory DB (Ready for Supabase)';
          }
        }
        if (supabaseInputUrl && data.url) supabaseInputUrl.value = data.url;
      }
    } catch (e) {}
  }

  checkSupabaseStatus();

  if (btnSupabaseConnect) {
    btnSupabaseConnect.addEventListener('click', async () => {
      const url = supabaseInputUrl?.value.trim();
      const key = supabaseInputKey?.value.trim();
      if (!url || !key) {
        if (window.showToast) window.showToast('Please enter both Supabase URL and Key', 'error');
        return;
      }
      if (window.showToast) window.showToast('Connecting to Supabase PostgreSQL...', 'info');
      try {
        const res = await fetch('/api/supabase/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, key })
        });
        const d = await res.json();
        if (d.success) {
          if (window.showToast) window.showToast('✅ Supabase connected and synced!', 'success');
          checkSupabaseStatus();
        } else {
          if (window.showToast) window.showToast(`❌ Connection failed: ${d.error || 'Invalid credentials'}`, 'error');
        }
      } catch (err) {
        if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
      }
    });
  }

  if (btnSupabaseSync) {
    btnSupabaseSync.addEventListener('click', async () => {
      if (window.showToast) window.showToast('Syncing all local tables to Supabase...', 'info');
      try {
        const res = await fetch('/api/supabase/sync', { method: 'POST' });
        const d = await res.json();
        if (d.success) {
          if (window.showToast) window.showToast('✅ All tables successfully pushed to Supabase!', 'success');
        } else {
          if (window.showToast) window.showToast(`❌ Sync error: ${d.error}`, 'error');
        }
      } catch (err) {
        if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
      }
    });
  }
}

/* ==========================================================================
   SPA NAVIGATION
   ========================================================================== */
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-item, .drawer-link, .link-view-all, [data-target]');
  const drawer = document.getElementById('mobile-nav-drawer');
  const btnMenuToggle = document.getElementById('mobile-menu-btn');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');

  function switchView(targetViewId) {
    const allViews = document.querySelectorAll('.view-section');
    allViews.forEach(v => v.classList.remove('active-view'));

    const target = document.getElementById(targetViewId);
    if (target) {
      target.classList.add('active-view');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.querySelectorAll('.nav-item, .drawer-link').forEach(link => {
      if (link.dataset.target === targetViewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    if (drawer) drawer.classList.remove('open');
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const target = link.dataset.target;
      if (target) {
        e.preventDefault();
        switchView(target);
      }
    });
  });

  if (btnMenuToggle && drawer) {
    btnMenuToggle.addEventListener('click', () => drawer.classList.add('open'));
  }
  if (btnCloseDrawer && drawer) {
    btnCloseDrawer.addEventListener('click', () => drawer.classList.remove('open'));
  }

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const viewMap = {
        'home': 'home-view',
        'leaderboard': 'leaderboard-view',
        'results': 'results-view',
        'showcase': 'showcase-view',
        'videos': 'videos-view',
        'gallery': 'gallery-view',
        'news': 'news-view',
        'about': 'about-view',
        'admin': 'admin-view'
      };
      if (viewMap[hash]) switchView(viewMap[hash]);
    }
  });
}

/* ==========================================================================
   VIDEO HIGHLIGHTS & MODAL PLAYER
   ========================================================================== */
let activeVideoCategory = 'ALL';

function setupVideosView() {
  const tabs = document.querySelectorAll('#videos-category-tabs .gal-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeVideoCategory = tab.dataset.category || 'ALL';
      const state = window.FiestaAPI.getState();
      renderVideos(state ? state.videos || [] : []);
    });
  });

  const modalPlayer = document.getElementById('modal-video-player');
  const btnClose = document.getElementById('btn-close-video-player');

  function closeVideoPlayer() {
    if (modalPlayer) {
      modalPlayer.classList.remove('open');
      const iframe = document.getElementById('modal-video-iframe');
      const videoHtml5 = document.getElementById('modal-video-html5');
      if (iframe) iframe.src = '';
      if (videoHtml5) {
        videoHtml5.pause();
        videoHtml5.src = '';
      }
    }
  }

  if (btnClose) btnClose.addEventListener('click', closeVideoPlayer);
  if (modalPlayer) {
    modalPlayer.addEventListener('click', (e) => {
      if (e.target === modalPlayer) closeVideoPlayer();
    });
  }
}

function openVideoPlayerModal(vidId) {
  const state = window.FiestaAPI.getState();
  const vids = state?.videos || [];
  const v = vids.find(item => item.id === vidId) || vids.find(item => item.url === vidId) || vids[0];
  if (!v) return;

  const modal = document.getElementById('modal-video-player');
  const titleEl = document.getElementById('modal-video-title');
  const catEl = document.getElementById('modal-video-category');
  const descEl = document.getElementById('modal-video-desc');
  const iframe = document.getElementById('modal-video-iframe');
  const videoHtml5 = document.getElementById('modal-video-html5');

  if (titleEl) titleEl.textContent = v.title;
  if (catEl) catEl.textContent = v.category || 'A-Zone';
  if (descEl) descEl.textContent = v.description || 'Cultural performance recording from Excellentia Arts Fiesta 2026.';

  const url = v.url || '';
  const isDirectVideo = /\.(mp4|webm|ogg|mov|mkv|avi|m4v|3gp|wmv|quicktime|flv)($|\?)/i.test(url) || url.startsWith('/videos/uploads/') || url.startsWith('/uploads/') || url.startsWith('data:video');

  if (isDirectVideo) {
    if (iframe) iframe.style.display = 'none';
    if (videoHtml5) {
      videoHtml5.style.display = 'block';
      videoHtml5.src = url;
      videoHtml5.play().catch(() => {});
    }
  } else {
    if (videoHtml5) {
      videoHtml5.pause();
      videoHtml5.style.display = 'none';
    }
    if (iframe) {
      iframe.style.display = 'block';
      let embedSrc = url;
      if (embedSrc.includes('youtube.com/watch?v=')) {
        embedSrc = embedSrc.replace('watch?v=', 'embed/');
      } else if (embedSrc.includes('youtu.be/')) {
        embedSrc = embedSrc.replace('youtu.be/', 'www.youtube-nocookie.com/embed/');
      }
      if (!embedSrc.includes('autoplay=')) {
        embedSrc += (embedSrc.includes('?') ? '&' : '?') + 'autoplay=1';
      }
      iframe.src = embedSrc;
    }
  }

  if (modal) modal.classList.add('open');
}

window.openFiestaVideo = openVideoPlayerModal;

/* ==========================================================================
   PUBLIC REPORT MODAL (NO PHONE NUMBER)
   ========================================================================== */
function openReportForProgram(result) {
  const modalReport = document.getElementById('modal-public-report');
  if (!modalReport) return;

  const progInput = document.getElementById('report-program-name') || document.getElementById('rep-prog-name');
  const resIdInput = document.getElementById('report-result-id') || document.getElementById('rep-result-id');
  const descInput = document.getElementById('report-description') || document.getElementById('rep-notes');

  if (result) {
    const progName = result.programName || '';
    if (progInput) progInput.value = progName;
    if (resIdInput) resIdInput.value = result.id || '';
  } else {
    if (progInput) progInput.value = '';
    if (resIdInput) resIdInput.value = '';
  }

  if (descInput) descInput.value = '';

  modalReport.classList.add('open');
}

window.openReportForProgram = openReportForProgram;

function setupPublicReportModal() {
  const modalReport = document.getElementById('modal-public-report');
  const btnOpenReport = document.getElementById('btn-open-report-modal');
  const btnDrawerReport = document.getElementById('btn-drawer-report');
  const btnResultsReport = document.getElementById('btn-trigger-report-from-results');
  const btnCloseReport = document.getElementById('btn-close-public-report');
  const formReport = document.getElementById('form-public-report');

  function openReportModal() {
    openReportForProgram(null);
  }
  function closeReportModal() {
    if (modalReport) modalReport.classList.remove('open');
  }

  [btnOpenReport, btnDrawerReport, btnResultsReport].forEach(btn => {
    if (btn) btn.addEventListener('click', openReportModal);
  });
  if (btnCloseReport) btnCloseReport.addEventListener('click', closeReportModal);

  if (modalReport) {
    modalReport.addEventListener('click', (e) => {
      if (e.target === modalReport) closeReportModal();
    });
  }

  if (formReport) {
    formReport.addEventListener('submit', async (e) => {
      e.preventDefault();
      const progInput = document.getElementById('report-program-name') || document.getElementById('rep-prog-name');
      const nameInput = document.getElementById('report-reporter-name') || document.getElementById('rep-user-name');
      const teamInput = document.getElementById('report-team-select') || document.getElementById('rep-team');
      const descInput = document.getElementById('report-description') || document.getElementById('rep-notes');
      const resIdInput = document.getElementById('report-result-id') || document.getElementById('rep-result-id');

      const progName = progInput ? progInput.value.trim() : '';
      const resId = resIdInput ? resIdInput.value : '';

      const payload = {
        resultId: resId,
        programName: progName,
        requesterName: nameInput ? nameInput.value.trim() : 'Anonymous',
        requesterTeam: teamInput ? teamInput.value : 'General',
        notes: descInput ? descInput.value.trim() : ''
      };

      try {
        await window.FiestaAPI.submitDiscrepancyReport(payload);
        closeReportModal();
        formReport.reset();
        window.showToast(`Correction report for "${progName || 'Result'}" submitted to the audit committee!`, 'success');
      } catch (err) {
        window.showToast('Failed to submit report', 'error');
      }
    });
  }
}

/* ==========================================================================
   RENDER ALL VIEWS ON STATE SYNC (OPTIMIZED WITH SUB-STATE MEMOIZATION)
   ========================================================================== */
const lastRenderedFingerprints = {
  metrics: '',
  teams: '',
  results: '',
  videos: '',
  items: '',
  gallery: '',
  news: ''
};

function renderAllViews(state) {
  if (!state) return;

  // 1. Metrics (Ultra-fast direct element updates)
  const statProg = document.getElementById('stat-total-programs');
  const statPart = document.getElementById('stat-total-participants');
  const statRes = document.getElementById('stat-results-published');

  const progCount = state.programs?.length || 20;
  const partCount = `${state.participants?.length || 24}+`;
  const resCount = state.results?.length || 0;

  if (statProg && statProg.textContent != progCount) statProg.textContent = progCount;
  if (statPart && statPart.textContent != partCount) statPart.textContent = partCount;
  if (statRes && statRes.textContent != resCount) statRes.textContent = resCount;

  // 2. Leaderboard & Teams Standings (Memoized)
  const teamsFingerprint = `${JSON.stringify(state.teams || [])}_${JSON.stringify(state.settings || {})}`;
  if (teamsFingerprint !== lastRenderedFingerprints.teams) {
    lastRenderedFingerprints.teams = teamsFingerprint;
    renderLeaderboard(state.teams || []);
  }

  // 3. Main Results Page & Recent Results (Memoized)
  const resultsFingerprint = `${(state.results || []).map(r => `${r.id}:${r.resultNumber}:${r.isPublic}`).join('|')}`;
  if (resultsFingerprint !== lastRenderedFingerprints.results) {
    lastRenderedFingerprints.results = resultsFingerprint;
    renderHomeRecentResults(state.results || []);
    if (window.FiestaResults && typeof window.FiestaResults.renderFilteredResults === 'function') {
      window.FiestaResults.renderFilteredResults();
    }
  }

  // 4. Video Gallery (Memoized)
  const videosFingerprint = `${(state.videos || []).length}_${activeVideoCategory}`;
  if (videosFingerprint !== lastRenderedFingerprints.videos) {
    lastRenderedFingerprints.videos = videosFingerprint;
    renderVideos(state.videos || []);
  }

  // 5. Winning Works & Creations Showcase (Memoized)
  const itemsFingerprint = `${(state.items || []).length}`;
  if (itemsFingerprint !== lastRenderedFingerprints.items) {
    lastRenderedFingerprints.items = itemsFingerprint;
    renderShowcaseWorks(state.items || []);
  }

  // 6. Gallery (Memoized)
  const galleryFingerprint = `${(state.gallery || []).length}`;
  if (galleryFingerprint !== lastRenderedFingerprints.gallery) {
    lastRenderedFingerprints.gallery = galleryFingerprint;
    renderGalleryItems(state.gallery || []);
  }

  // 7. News & Bulletins (Memoized)
  const newsFingerprint = `${(state.news || []).map(n => `${n.id}:${n.isPublic}`).join('|')}`;
  if (newsFingerprint !== lastRenderedFingerprints.news) {
    lastRenderedFingerprints.news = newsFingerprint;
    renderNews(state.news || []);
  }
}

/* ==========================================================================
   VIDEOS RENDERER
   ========================================================================== */
function renderVideos(videos) {
  const grid = document.getElementById('main-videos-grid');
  if (!grid) return;

  let filtered = videos || [];
  if (activeVideoCategory !== 'ALL') {
    filtered = filtered.filter(v => (v.category || '').toLowerCase() === activeVideoCategory.toLowerCase());
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="glass-panel p-6 text-center text-muted" style="grid-column: 1 / -1;"><i class="fa-solid fa-video-slash text-cyan mb-2" style="font-size: 2rem;"></i><br>No video recordings published in this category yet.</div>';
    return;
  }

  grid.innerHTML = filtered.map(v => `
    <div class="video-highlight-card glass-panel">
      <div class="video-thumb-wrap" onclick="window.openFiestaVideo('${v.id}')">
        <img src="${escapeHTML(v.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800')}" alt="${escapeHTML(v.title)}" class="video-thumb-img" loading="lazy" decoding="async">
        <div class="play-button-overlay">
          <div class="play-btn-circle"><i class="fa-solid fa-play"></i></div>
        </div>
      </div>
      <div class="video-card-body">
        <div class="flex-between-row mb-2">
          <span class="badge-zone">${escapeHTML(v.category || 'A-Zone')}</span>
          <span class="text-muted" style="font-size: 0.78rem;">${escapeHTML(v.date || 'Fiesta 2026')}</span>
        </div>
        <h3 class="video-card-title">${escapeHTML(v.title)}</h3>
        <p class="text-muted" style="font-size: 0.85rem; line-height: 1.5;">${escapeHTML(v.description || '')}</p>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   LEADERBOARD & TEAMS RENDERER (ARCHITECTURE EMBLEMS & TOP 3 HOMEPAGE)
   ========================================================================== */
const TEAM_METAS = {
  bukhara: {
    name: 'Bukhara',
    motto: 'The Golden Vanguard',
    color: '#f59e0b',
    emblem: '/assets/images/houses/bukhara-arch.png',
    icon: 'fa-crown',
    rankClass: 'rank-1'
  },
  undulus: {
    name: 'Undulus',
    motto: 'The Emerald Tide',
    color: '#10b981',
    emblem: '/assets/images/houses/undulus-arch.png',
    icon: 'fa-water',
    rankClass: 'rank-2'
  },
  samarkhand: {
    name: 'Samarkhand',
    motto: 'The Mystic Luminary',
    color: '#8b5cf6',
    emblem: '/assets/images/houses/samarkhand-arch.png',
    icon: 'fa-moon',
    rankClass: 'rank-3'
  },
  qurthuba: {
    name: 'Qurthuba',
    motto: 'The Crimson Horizon',
    color: '#ef4444',
    emblem: '/assets/images/houses/qurthuba-arch.png',
    icon: 'fa-fire-flame-curved',
    rankClass: 'rank-4'
  }
};
const HOUSE_METAS = TEAM_METAS;

function getTeamMeta(teamName) {
  const key = String(teamName || '').toLowerCase();
  for (const k in TEAM_METAS) {
    if (key.includes(k)) return TEAM_METAS[k];
  }
  return {
    name: teamName || 'Team',
    motto: 'Championship Contender',
    color: '#00f0ff',
    emblem: '/assets/images/houses/bukhara-arch.png',
    icon: 'fa-shield-halved',
    rankClass: 'rank-1'
  };
}
const getHouseMeta = getTeamMeta;

function renderLeaderboard(teams) {
  if (!Array.isArray(teams) || teams.length === 0) return;
  const state = window.FiestaAPI.getState();
  const showScores = state.settings?.showTeamScores !== false;

  // Sorted teams by rank
  const sorted = [...teams].sort((a, b) => (b.points || 0) - (a.points || 0));

  // Update "AFTER X RESULTS" header widget (matching user's Image 4 specification)
  const cutoffSetting = state.settings?.maxVisibleResultNumber;
  const publishedResults = (state.results || []).filter(r => r.isPublic !== false);
  const activeCount = (cutoffSetting !== null && typeof cutoffSetting !== 'undefined' && !isNaN(cutoffSetting))
    ? Number(cutoffSetting)
    : (publishedResults.length > 0 ? publishedResults.length : 0);

  const numEl = document.getElementById('leaderboard-cutoff-number');
  const unitEl = document.getElementById('leaderboard-cutoff-unit');
  if (numEl) numEl.textContent = activeCount;
  if (unitEl) unitEl.textContent = activeCount === 1 ? 'RESULT' : 'RESULTS';

  // 1. Home Page: First 3 teams only in one row
  const homeGrid = document.getElementById('home-teams-grid');
  if (homeGrid) {
    const top3 = sorted.slice(0, 3);
    homeGrid.innerHTML = top3.map((t, idx) => createHomeTop3CardHTML(t, showScores, idx + 1)).join('');
  }

  // 2. Top 3 Podium Showcase: Rank 2 on Left, Rank 1 in Center Elevated, Rank 3 on Right
  const podium = document.getElementById('leaderboard-podium');
  if (podium && sorted.length >= 3) {
    const t1 = sorted[0];
    const t2 = sorted[1];
    const t3 = sorted[2];

    const meta1 = getHouseMeta(t1.name);
    const meta2 = getHouseMeta(t2.name);
    const meta3 = getHouseMeta(t3.name);

    const t1Pts = showScores ? t1.points : '<span class="score-locked-display"><i class="fa-solid fa-lock text-gold"></i> Points Concealed</span>';
    const t2Pts = showScores ? t2.points : '<span class="score-locked-display"><i class="fa-solid fa-lock text-cyan"></i> Points Concealed</span>';
    const t3Pts = showScores ? t3.points : '<span class="score-locked-display"><i class="fa-solid fa-lock text-purple"></i> Points Concealed</span>';

    podium.innerHTML = `
      <!-- Rank 2 (Undulus, Left) -->
      <div class="podium-glass-card podium-card-2">
        <div class="podium-top-circle badge-circle-2">2</div>
        <div class="podium-card-content">
          <div class="podium-shield-avatar shield-avatar-undulus">
            <img src="${meta2.emblem}" alt="${escapeHTML(t2.name)}" class="podium-emblem-img">
          </div>
          <h2 class="podium-team-title">${escapeHTML(t2.name)}</h2>
          <span class="podium-team-motto">${escapeHTML(meta2.motto)}</span>
          <div class="podium-points-display text-emerald">${t2Pts}</div>
          <span class="podium-points-unit">TOTAL POINTS</span>
          <div class="podium-medals-pill-row">
            <span class="pod-medal-item">1st: <strong>${t2.firstCount || 0}</strong></span>
            <span class="pod-medal-item">2nd: <strong>${t2.secondCount || 0}</strong></span>
            <span class="pod-medal-item">3rd: <strong>${t2.thirdCount || 0}</strong></span>
          </div>
        </div>
      </div>

      <!-- Rank 1 (Bukhara, Center Elevated) -->
      <div class="podium-glass-card podium-card-1">
        <div class="podium-top-circle badge-circle-1"><i class="fa-solid fa-crown"></i></div>
        <div class="podium-card-content">
          <div class="podium-shield-avatar shield-avatar-bukhara">
            <img src="${meta1.emblem}" alt="${escapeHTML(t1.name)}" class="podium-emblem-img">
          </div>
          <h2 class="podium-team-title">${escapeHTML(t1.name)}</h2>
          <span class="podium-team-motto">${escapeHTML(meta1.motto)}</span>
          <div class="podium-points-display text-gold">${t1Pts}</div>
          <span class="podium-points-unit">TOTAL POINTS</span>
          <div class="podium-medals-pill-row">
            <span class="pod-medal-item">1st: <strong>${t1.firstCount || 0}</strong></span>
            <span class="pod-medal-item">2nd: <strong>${t1.secondCount || 0}</strong></span>
            <span class="pod-medal-item">3rd: <strong>${t1.thirdCount || 0}</strong></span>
          </div>
        </div>
      </div>

      <!-- Rank 3 (Samarkhand, Right) -->
      <div class="podium-glass-card podium-card-3">
        <div class="podium-top-circle badge-circle-3">3</div>
        <div class="podium-card-content">
          <div class="podium-shield-avatar shield-avatar-samarkhand">
            <img src="${meta3.emblem}" alt="${escapeHTML(t3.name)}" class="podium-emblem-img">
          </div>
          <h2 class="podium-team-title">${escapeHTML(t3.name)}</h2>
          <span class="podium-team-motto">${escapeHTML(meta3.motto)}</span>
          <div class="podium-points-display text-purple">${t3Pts}</div>
          <span class="podium-points-unit">TOTAL POINTS</span>
          <div class="podium-medals-pill-row">
            <span class="pod-medal-item">1st: <strong>${t3.firstCount || 0}</strong></span>
            <span class="pod-medal-item">2nd: <strong>${t3.secondCount || 0}</strong></span>
            <span class="pod-medal-item">3rd: <strong>${t3.thirdCount || 0}</strong></span>
          </div>
        </div>
      </div>
    `;
  }

  // 3. 4 Detailed House Cards (4 Columns)
  const detailedGrid = document.getElementById('teams-detailed-grid');
  if (detailedGrid) detailedGrid.innerHTML = sorted.map((t, idx) => createTeamCardHTML(t, showScores, idx + 1)).join('');

  // 4. Category-Wise Points Matrix Table
  const matrixBody = document.getElementById('leaderboard-matrix-body');
  if (matrixBody) {
    matrixBody.innerHTML = sorted.map((t, idx) => {
      const meta = getHouseMeta(t.name);
      const aVal = showScores ? `${t.categoryPoints?.['A-Zone'] || 0} pts` : '<i class="fa-solid fa-lock text-muted"></i>';
      const bVal = showScores ? `${t.categoryPoints?.['B-Zone'] || 0} pts` : '<i class="fa-solid fa-lock text-muted"></i>';
      const cVal = showScores ? `${t.categoryPoints?.['C-Zone'] || 0} pts` : '<i class="fa-solid fa-lock text-muted"></i>';
      const genVal = showScores ? `${t.categoryPoints?.['General'] || 0} pts` : '<i class="fa-solid fa-lock text-muted"></i>';
      const totVal = showScores ? `${t.points || 0} pts` : '<span class="score-locked-display"><i class="fa-solid fa-lock text-gold"></i> Points Concealed</span>';
      const houseKey = t.name.toLowerCase();

      return `
        <tr>
          <td>
            <div class="matrix-house-cell">
              <img src="${meta.emblem}" alt="${escapeHTML(t.name)}" class="matrix-house-emblem-mini">
              <div>
                <strong>#${idx + 1} ${escapeHTML(t.name)}</strong>
                <span class="matrix-motto-tag motto-${houseKey}">${escapeHTML(meta.motto)}</span>
              </div>
            </div>
          </td>
          <td><strong>${aVal}</strong></td>
          <td><strong>${bVal}</strong></td>
          <td><strong>${cVal}</strong></td>
          <td><strong>${genVal}</strong></td>
          <td><span class="text-gold"><i class="fa-solid fa-crown"></i> ${t.firstCount || 0}</span></td>
          <td><span>${t.secondCount || 0}</span></td>
          <td><span>${t.thirdCount || 0}</span></td>
          <td><strong class="matrix-total-points text-${houseKey}">${totVal}</strong></td>
        </tr>
      `;
    }).join('');
  }
}

function createHomeTop3CardHTML(t, showScores = true, rankNum = 1) {
  const meta = getHouseMeta(t.name);
  const houseKey = t.name.toLowerCase();

  const pointsBoxHTML = showScores
    ? `<div class="home-top3-pts text-${houseKey}">${t.points || 0} <span class="pts-unit">PTS</span></div>`
    : `<div class="home-top3-pts text-muted" style="font-size: 0.9rem;"><i class="fa-solid fa-lock"></i> Concealed</div>`;

  return `
    <div class="home-top3-card glass-panel card-house-${houseKey}">
      <div class="home-top3-rank-tag rank-tag-${rankNum}">#${rankNum}</div>
      <div class="home-top3-emblem-wrap">
        <img src="${meta.emblem}" alt="${escapeHTML(t.name)}" class="home-top3-emblem-img">
      </div>
      <div class="home-top3-info">
        <h3 class="home-top3-name">${escapeHTML(t.name)}</h3>
        <span class="home-top3-motto">${escapeHTML(meta.motto)}</span>
        ${pointsBoxHTML}
      </div>
      <div class="home-top3-medals-row">
        <span class="home-medal-badge text-gold">🥇 ${t.firstCount || 0}</span>
        <span class="home-medal-badge text-silver">🥈 ${t.secondCount || 0}</span>
        <span class="home-medal-badge text-bronze">🥉 ${t.thirdCount || 0}</span>
      </div>
    </div>
  `;
}

function createTeamCardHTML(t, showScores = true, rankNum = 1) {
  const meta = getHouseMeta(t.name);
  const houseKey = t.name.toLowerCase();
  const maxPts = Math.max(1, t.points || 1);
  const aPts = t.categoryPoints?.['A-Zone'] || 0;
  const bPts = t.categoryPoints?.['B-Zone'] || 0;
  const cPts = t.categoryPoints?.['C-Zone'] || 0;
  const genPts = t.categoryPoints?.['General'] || 0;

  const aPct = Math.min(100, Math.max(15, Math.round((aPts / (maxPts || 1)) * 100)));
  const bPct = Math.min(100, Math.max(15, Math.round((bPts / (maxPts || 1)) * 100)));
  const cPct = Math.min(100, Math.max(15, Math.round((cPts / (maxPts || 1)) * 100)));
  const genPct = Math.min(100, Math.max(15, Math.round((genPts / (maxPts || 1)) * 100)));

  const pointsBoxHTML = showScores
    ? `
      <div class="team-points-center">
        <span class="team-points-number text-${houseKey}">${t.points || 0}</span>
        <span class="team-points-subcaption">TOTAL CALCULATED POINTS</span>
      </div>
    `
    : `
      <div class="team-points-center">
        <span class="team-points-number text-muted score-locked-display"><i class="fa-solid fa-lock"></i> Points Concealed</span>
        <span class="team-points-subcaption">CONCEALED BY COMMITTEE</span>
      </div>
    `;

  return `
    <div class="team-championship-card team-card-${houseKey}">
      <div class="team-card-top-row">
        <div class="team-title-group">
          <div class="team-shield-mini shield-${houseKey}">
            <img src="${meta.emblem}" alt="${escapeHTML(t.name)}" class="team-card-emblem-img">
          </div>
          <div>
            <h3 class="team-card-house-name">${escapeHTML(t.name)}</h3>
            <span class="team-card-motto-sub">${escapeHTML(meta.motto)}</span>
          </div>
        </div>
        <div class="team-rank-pill-box">
          <span class="rank-prefix">RANK</span>
          <span class="rank-digit">#${rankNum}</span>
        </div>
      </div>

      ${pointsBoxHTML}

      <div class="team-medals-inline-row">
        <div class="medal-inline-item text-gold">
          <i class="fa-solid fa-crown"></i> <strong>${t.firstCount || 0}</strong> <span class="lbl-dim">1st</span>
        </div>
        <div class="medal-inline-item text-silver">
          <i class="fa-solid fa-medal"></i> <strong>${t.secondCount || 0}</strong> <span class="lbl-dim">2nd</span>
        </div>
        <div class="medal-inline-item text-bronze">
          <i class="fa-solid fa-award"></i> <strong>${t.thirdCount || 0}</strong> <span class="lbl-dim">3rd</span>
        </div>
      </div>

      <div class="team-zone-progress-list">
        <div class="zone-progress-item">
          <span class="zone-lbl">A-Zone</span>
          <div class="zone-track"><div class="zone-fill fill-cyan" style="width: ${showScores ? aPct : 50}%;"></div></div>
          <span class="zone-pts-val">${showScores ? `${aPts} pts` : '***'}</span>
        </div>
        <div class="zone-progress-item">
          <span class="zone-lbl">B-Zone</span>
          <div class="zone-track"><div class="zone-fill fill-teal" style="width: ${showScores ? bPct : 50}%;"></div></div>
          <span class="zone-pts-val">${showScores ? `${bPts} pts` : '***'}</span>
        </div>
        <div class="zone-progress-item">
          <span class="zone-lbl">C-Zone</span>
          <div class="zone-track"><div class="zone-fill fill-purple" style="width: ${showScores ? cPct : 50}%;"></div></div>
          <span class="zone-pts-val">${showScores ? `${cPts} pts` : '***'}</span>
        </div>
        <div class="zone-progress-item">
          <span class="zone-lbl">General</span>
          <div class="zone-track"><div class="zone-fill fill-gold" style="width: ${showScores ? genPct : 50}%;"></div></div>
          <span class="zone-pts-val">${showScores ? `${genPts} pts` : '***'}</span>
        </div>
      </div>
    </div>
  `;
}

function renderHomeRecentResults(results) {
  // Individual student results are removed from Home as per user directive
  const homeResGrid = document.getElementById('home-recent-results-grid');
  if (homeResGrid) homeResGrid.innerHTML = '';
}

function renderNews(newsList) {
  const homeNewsGrid = document.getElementById('home-news-grid');
  const mainNewsGrid = document.getElementById('main-news-grid');

  // Filter out any unuploaded, draft, unpublished, or invalid news
  const validNews = (newsList || []).filter(n => {
    if (!n || !n.title || !n.title.trim()) return false;
    // Discard any news marked as unuploaded, draft, or hidden from public
    if (n.isUploaded === false || n.isPublic === false || n.isPublished === false || n.status === 'draft' || n.status === 'unuploaded') {
      return false;
    }
    return true;
  });

  if (validNews.length === 0) {
    const emptyHTML = '<div class="glass-panel p-6 text-center text-muted" style="grid-column: 1 / -1;"><i class="fa-solid fa-newspaper text-cyan mb-2" style="font-size: 2.2rem; display: block; opacity: 0.85;"></i><h4 style="color: #ffffff; margin: 0.5rem 0 0.25rem 0;">No Announcements Posted Yet</h4><p style="margin: 0; font-size: 0.88rem; color: #94a3b8;">Official festival circulars and bulletins will appear here once published by the committee.</p></div>';
    if (homeNewsGrid) homeNewsGrid.innerHTML = emptyHTML;
    if (mainNewsGrid) mainNewsGrid.innerHTML = emptyHTML;
    return;
  }

  const html = validNews.map(n => `
    <div class="news-card">
      <div class="news-card-img-wrap">
        <img src="${escapeHTML(n.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800')}" alt="${escapeHTML(n.title)}" class="news-card-img" loading="lazy">
        <span class="news-badge-overlay">${escapeHTML(n.badge || n.category || 'News')}</span>
      </div>
      <div class="news-card-body">
        <span class="news-date"><i class="fa-solid fa-calendar-day text-cyan"></i> ${escapeHTML(n.date || 'Sept 2026')}</span>
        <h3 class="news-title">${escapeHTML(n.title)}</h3>
        <p class="news-summary">${escapeHTML(n.summary || '')}</p>
      </div>
    </div>
  `).join('');

  if (homeNewsGrid) homeNewsGrid.innerHTML = validNews.slice(0, 3).map(n => `
    <div class="news-card">
      <div class="news-card-img-wrap">
        <img src="${escapeHTML(n.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800')}" alt="${escapeHTML(n.title)}" class="news-card-img" loading="lazy">
        <span class="news-badge-overlay">${escapeHTML(n.badge || n.category || 'News')}</span>
      </div>
      <div class="news-card-body">
        <span class="news-date"><i class="fa-solid fa-calendar-day text-cyan"></i> ${escapeHTML(n.date || 'Sept 2026')}</span>
        <h3 class="news-title">${escapeHTML(n.title)}</h3>
        <p class="news-summary">${escapeHTML(n.summary || '')}</p>
      </div>
    </div>
  `).join('');

  if (mainNewsGrid) mainNewsGrid.innerHTML = html;
}

/* ==========================================================================
   GALLERY & LIGHTBOX (WITH OFFICIAL FOOTER BADGES)
   ========================================================================== */
function setupGallery() {
  const tabs = document.querySelectorAll('#gallery-tabs .gal-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.category;
      const state = window.FiestaAPI.getState();
      renderGalleryItems(state.gallery || [], cat);
    });
  });

  const btnClose = document.getElementById('btn-close-lightbox');
  const modal = document.getElementById('modal-lightbox');
  if (btnClose && modal) {
    btnClose.addEventListener('click', () => modal.classList.remove('open'));
  }

  const btnDownloadLightbox = document.getElementById('btn-download-lightbox');
  if (btnDownloadLightbox) {
    btnDownloadLightbox.addEventListener('click', () => {
      const imgElem = document.getElementById('lightbox-img');
      const titleElem = document.getElementById('lightbox-title');
      if (imgElem && imgElem.src) {
        window.downloadPhoto(imgElem.src, titleElem?.textContent || 'Excellentia_Fiesta_Photo');
      }
    });
  }
}

function renderGalleryItems(galleryList, filterCat = 'ALL') {
  const grid = document.getElementById('main-gallery-grid');
  if (!grid) return;

  const filtered = filterCat === 'ALL' ? galleryList : galleryList.filter(g => g.category === filterCat);

  grid.innerHTML = filtered.map(g => `
    <div class="gallery-card" onclick="openLightbox('${escapeHTML(g.image)}', '${escapeHTML(g.title || 'Capture')}', '${escapeHTML(g.caption || '')}', '${escapeHTML(g.category || 'A-Zone')}')">
      <div class="gallery-card-img-wrap">
        <img src="${escapeHTML(g.image)}" alt="${escapeHTML(g.title)}" class="gallery-img" loading="lazy">
        <button class="btn-card-download" title="Download Photo" onclick="event.stopPropagation(); window.downloadPhoto('${escapeHTML(g.image)}', '${escapeHTML(g.title || 'Fiesta-Photo')}')">
          <i class="fa-solid fa-cloud-arrow-down"></i>
        </button>
        <!-- Transparent Footer Design Badge Strip directly overlaid on photo bottom -->
      <div class="gallery-card-footer-strip">
          <img src="/assets/images/gallery-footer-badge.png" alt="Excellentia Fiesta Badge">
        </div>
      </div>
    </div>
  `).join('');
}

window.downloadPhoto = function(imageUrl, filename = 'Excellentia-Fiesta-Photo') {
  if (!imageUrl) return;
  if (window.showToast) window.showToast('Preparing Ultra-HD crystal photo with official watermark...', 'info');

  // Upgrade CDN / Unsplash URLs to master high-resolution if downscaling params exist
  let highResUrl = imageUrl;
  if (typeof highResUrl === 'string' && highResUrl.includes('unsplash.com')) {
    highResUrl = highResUrl.replace(/w=\d+/, 'w=2560').replace(/q=\d+/, 'q=100');
    if (!highResUrl.includes('w=2560')) {
      highResUrl += (highResUrl.includes('?') ? '&' : '?') + 'w=2560&q=100&auto=format';
    }
  }

  const mainImg = new Image();
  mainImg.crossOrigin = 'anonymous';
  mainImg.src = highResUrl;

  const badgeImg = new Image();
  badgeImg.crossOrigin = 'anonymous';
  badgeImg.src = '/assets/images/gallery-footer-badge.png';

  let loadedCount = 0;
  const onAssetLoad = () => {
    loadedCount++;
    if (loadedCount >= 2) {
      try {
        const canvas = document.createElement('canvas');
        const imgW = mainImg.naturalWidth || mainImg.width || 1920;
        const imgH = mainImg.naturalHeight || mainImg.height || 1080;
        canvas.width = imgW;
        canvas.height = imgH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Draw original photo at 100% full master resolution
        ctx.drawImage(mainImg, 0, 0, imgW, imgH);

        // 2. Calculate crisp proportional badge sizing directly from native dimensions (1024 x 204)
        const bNatW = badgeImg.naturalWidth || 1024;
        const bNatH = badgeImg.naturalHeight || 204;
        const bAspect = bNatW / bNatH;

        // Proportional sizing: 44% width on landscape, 65% on portrait / mobile photos
        let drawW = Math.round(imgW * (imgW < 600 ? 0.65 : 0.44));
        let drawH = Math.round(drawW / bAspect);

        // Cap height at 18% of photo height to preserve composition
        const maxH = Math.round(imgH * 0.18);
        if (drawH > maxH) {
          drawH = maxH;
          drawW = Math.round(drawH * bAspect);
        }

        const drawX = Math.round((imgW - drawW) / 2);
        const marginB = Math.max(14, Math.round(imgH * 0.022));
        const drawY = Math.round(imgH - drawH - marginB);

        // 3. Clean contrast gradient backdrop (prevents washed-out text on bright photos without muddy blur)
        const gradH = Math.round(drawH * 1.45 + marginB);
        const gradStartY = imgH - gradH;
        const grad = ctx.createLinearGradient(0, gradStartY, 0, imgH);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.22)');
        grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.55)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.78)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, gradStartY, imgW, gradH);

        // 4. Render badge directly at integer coordinates with razor-sharp clarity
        ctx.drawImage(badgeImg, drawX, drawY, drawW, drawH);

        // 5. Trigger crystal-clear lossless PNG download
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${String(filename).replace(/[^a-zA-Z0-9_-]/g, '_')}_watermarked.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (window.showToast) window.showToast('Master High-Definition photo downloaded with official footer!', 'success');
      } catch (err) {
        console.warn('Canvas watermarking export error, falling back to direct master download:', err);
        const fallbackLink = document.createElement('a');
        fallbackLink.href = highResUrl;
        fallbackLink.download = `${String(filename).replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
        document.body.appendChild(fallbackLink);
        fallbackLink.click();
        document.body.removeChild(fallbackLink);
      }
    }
  };

  mainImg.onload = onAssetLoad;
  mainImg.onerror = () => {
    const link = document.createElement('a');
    link.href = highResUrl;
    link.download = `${String(filename).replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  badgeImg.onload = onAssetLoad;
  badgeImg.onerror = onAssetLoad;
};

window.openLightbox = function(src, title, caption, category) {
  const modal = document.getElementById('modal-lightbox');
  if (!modal) return;

  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-title').textContent = title || 'Fiesta Moment';
  document.getElementById('lightbox-desc').textContent = caption || '';
  document.getElementById('lightbox-category').textContent = category || 'A-Zone';

  modal.classList.add('open');
};

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ==========================================================================
   WINNING WORKS & CREATIONS SHOWCASE (1ST, 2ND, 3RD PLACES)
   ========================================================================== */
let activeShowcaseCategory = 'ALL';
let activeShowcasePlace = 'ALL';

function setupShowcaseView() {
  const catTabs = document.querySelectorAll('#showcase-category-tabs .filter-pill-btn');
  const placeTabs = document.querySelectorAll('#showcase-place-tabs .filter-pill-btn');
  const searchInput = document.getElementById('showcase-search-input');

  catTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      catTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeShowcaseCategory = tab.dataset.cat || 'ALL';
      const state = window.FiestaAPI?.getState() || {};
      renderShowcaseWorks(state.items || []);
    });
  });

  placeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      placeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeShowcasePlace = tab.dataset.place || 'ALL';
      const state = window.FiestaAPI?.getState() || {};
      renderShowcaseWorks(state.items || []);
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const state = window.FiestaAPI?.getState() || {};
      renderShowcaseWorks(state.items || []);
    });
  }
}

function renderShowcaseWorks(items) {
  const grid = document.getElementById('showcase-items-grid');
  const emptyState = document.getElementById('showcase-empty-state');
  if (!grid) return;

  const searchVal = (document.getElementById('showcase-search-input')?.value || '').toLowerCase().trim();

  const filtered = (items || []).filter(item => {
    if (activeShowcaseCategory !== 'ALL' && item.category !== activeShowcaseCategory) return false;
    if (activeShowcasePlace !== 'ALL' && !String(item.place || '').toLowerCase().includes(activeShowcasePlace.toLowerCase())) return false;
    if (searchVal) {
      const subj = (item.subject || '').toLowerCase();
      const prog = (item.programName || '').toLowerCase();
      const part = (item.participantName || '').toLowerCase();
      const team = (item.team || '').toLowerCase();
      if (!subj.includes(searchVal) && !prog.includes(searchVal) && !part.includes(searchVal) && !team.includes(searchVal)) {
        return false;
      }
    }
    return true;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  grid.innerHTML = filtered.map(item => {
    const place = escapeHTML(item.place || '1st');
    const placeKey = place.toLowerCase().replace(/[^a-z0-9]/g, '');
    const subject = escapeHTML(item.subject || 'Winning Creation');
    const progName = escapeHTML(item.programName || 'Fiesta Programme');
    const category = escapeHTML(item.category || 'A-Zone');
    const participantName = escapeHTML(item.participantName || 'Champion');
    const teamName = escapeHTML(item.team || '');
    const teamKey = teamName.toLowerCase();
    const mediaType = item.mediaType || 'text';

    let typeBadgeHTML = '';
    let thumbHTML = '';

    if (mediaType === 'image' && item.mediaUrl) {
      typeBadgeHTML = '<span class="item-type-badge badge-image"><i class="fa-solid fa-image"></i> Artwork</span>';
      thumbHTML = `
        <div class="showcase-card-thumb protected-thumb-wrap">
          <img src="${escapeHTML(item.mediaUrl)}" alt="${subject}" class="showcase-thumb-img" draggable="false" oncontextmenu="return false;">
          <div class="thumb-hover-overlay"><i class="fa-solid fa-eye"></i> Preview Artwork</div>
        </div>
      `;
    } else if (mediaType === 'video' && item.mediaUrl) {
      typeBadgeHTML = '<span class="item-type-badge badge-video"><i class="fa-solid fa-video"></i> Video</span>';
      thumbHTML = `
        <div class="showcase-card-thumb thumb-video-placeholder">
          <div class="play-btn-circle-mini"><i class="fa-solid fa-play"></i></div>
          <div class="thumb-hover-overlay"><i class="fa-solid fa-play"></i> Watch Recital</div>
        </div>
      `;
    } else if (mediaType === 'pdf' && item.mediaUrl) {
      typeBadgeHTML = '<span class="item-type-badge badge-pdf"><i class="fa-solid fa-file-pdf"></i> Document</span>';
      thumbHTML = `
        <div class="showcase-card-thumb thumb-pdf-placeholder">
          <i class="fa-solid fa-file-pdf text-gold fa-3x"></i>
          <span class="pdf-pill-label">PDF Manuscript</span>
          <div class="thumb-hover-overlay"><i class="fa-solid fa-book-open"></i> Read Document</div>
        </div>
      `;
    } else {
      typeBadgeHTML = '<span class="item-type-badge badge-text"><i class="fa-solid fa-pen-nib"></i> Poem/Text</span>';
      thumbHTML = `
        <div class="showcase-card-thumb thumb-text-placeholder">
          <i class="fa-solid fa-feather-pointed text-purple fa-3x"></i>
          <span class="text-pill-label">Literary Creation</span>
          <div class="thumb-hover-overlay"><i class="fa-solid fa-book-open"></i> Read Poem/Text</div>
        </div>
      `;
    }

    return `
      <div class="showcase-work-card glass-panel card-accent-${teamKey}" data-item-id="${item.id}">
        <div class="showcase-card-top" onclick="window.FiestaApp.openItemPreviewModal(window.FiestaAPI.getState().items.find(x => x.id === '${item.id}'))">
          ${thumbHTML}
        </div>
        <div class="showcase-card-body">
          <div class="showcase-badges-row mb-2">
            <span class="showcase-place-pill place-pill-${placeKey}">${place} Place</span>
            <span class="badge-zone">${category}</span>
            ${typeBadgeHTML}
          </div>
          <h3 class="showcase-work-title" onclick="window.FiestaApp.openItemPreviewModal(window.FiestaAPI.getState().items.find(x => x.id === '${item.id}'))">${subject}</h3>
          <div class="showcase-prog-name"><i class="fa-solid fa-tag text-cyan"></i> ${progName}</div>
          
          <div class="showcase-author-strip mt-3 pt-3">
            <div class="author-details">
              <strong class="author-name">${participantName}</strong>
              <span class="author-team team-badge-${teamKey}">${teamName}</span>
            </div>
            <button type="button" class="btn-ocean-primary btn-sm btn-preview-work" onclick="window.FiestaApp.openItemPreviewModal(window.FiestaAPI.getState().items.find(x => x.id === '${item.id}'))">
              <i class="fa-solid fa-eye"></i> Preview
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   PUBLIC PROTECTED PREVIEW-ONLY MODAL (NO DOWNLOADS ALLOWED)
   ========================================================================== */
function setupItemPreviewModal() {
  const modal = document.getElementById('modal-item-preview');
  const btnClose = document.getElementById('btn-close-item-preview');
  const btnFontDec = document.getElementById('btn-reader-font-decrease');
  const btnFontInc = document.getElementById('btn-reader-font-increase');
  const themeBtns = document.querySelectorAll('.reader-theme-btn');
  const textContainer = document.getElementById('public-preview-text-box');

  let currentFontSize = 18;

  function closePreview() {
    if (modal) modal.classList.remove('open');
    const player = document.getElementById('public-preview-video-player');
    if (player) {
      player.pause();
      player.src = '';
    }
    const frame = document.getElementById('public-preview-pdf-frame');
    if (frame) frame.src = '';
  }

  if (btnClose) btnClose.addEventListener('click', closePreview);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePreview();
    });
  }

  // Reader Font Controls
  if (btnFontDec) {
    btnFontDec.addEventListener('click', () => {
      currentFontSize = Math.max(13, currentFontSize - 2);
      const textRender = document.getElementById('public-preview-text-render');
      if (textRender) textRender.style.fontSize = `${currentFontSize}px`;
    });
  }
  if (btnFontInc) {
    btnFontInc.addEventListener('click', () => {
      currentFontSize = Math.min(32, currentFontSize + 2);
      const textRender = document.getElementById('public-preview-text-render');
      if (textRender) textRender.style.fontSize = `${currentFontSize}px`;
    });
  }

  // Reader Themes
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.dataset.theme || 'dark';
      if (textContainer) {
        textContainer.className = `preview-text-container reader-theme-${theme}`;
      }
    });
  });

  // Initialize Comprehensive Anti-Screenshot & Screen Recording Protection
  setupAntiScreenshotProtection(modal);
}

function setupAntiScreenshotProtection(modal) {
  if (!modal) return;
  const shield = document.getElementById('preview-privacy-shield');

  let blurTimeout = null;

  function showShield(reason = 'Capture Protected') {
    if (!modal.classList.contains('open')) return;
    if (shield) {
      shield.classList.remove('hidden');
      shield.classList.add('privacy-shield-active');
    }
  }

  function hideShield() {
    if (shield) {
      shield.classList.remove('privacy-shield-active');
      setTimeout(() => {
        if (!shield.classList.contains('privacy-shield-active')) {
          shield.classList.add('hidden');
        }
      }, 200);
    }
  }

  // 1. Window Blur & Visibility Change (Triggers on Snipping Tool, Screen Recorders, Window Swapping)
  window.addEventListener('blur', () => {
    if (modal.classList.contains('open')) {
      showShield('Focus lost / Capture tool active');
    }
  });

  window.addEventListener('focus', () => {
    if (modal.classList.contains('open')) {
      clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        hideShield();
      }, 300);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (modal.classList.contains('open')) {
        showShield('Window hidden');
      }
    } else {
      if (modal.classList.contains('open')) {
        clearTimeout(blurTimeout);
        blurTimeout = setTimeout(() => {
          hideShield();
        }, 300);
      }
    }
  });

  // 2. Intercept Screen Capture, Developer Tools, Print & Save Shortcuts
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;

    const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen';
    const isWinSnipping = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4' || e.key === '5');
    const isDevTools = e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c'));
    const isSaveOrPrint = (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U' || e.key === 'c' || e.key === 'C');

    if (isPrintScreen || isWinSnipping || isDevTools || isSaveOrPrint) {
      e.preventDefault();
      e.stopPropagation();

      showShield('Capture Shortcut Blocked');
      
      // Clear clipboard if possible
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('Protected Content - Excellentia Arts Fiesta 2026');
        }
      } catch (err) {}

      if (window.showToast) {
        window.showToast('Screenshots & screen recordings are restricted for winning works.', 'warning');
      }

      setTimeout(() => {
        hideShield();
      }, 2000);
    }
  }, true);

  // 3. Disable Context Menu & Right Click
  modal.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (window.showToast) {
      window.showToast('Right-click copying is disabled on protected works.', 'warning');
    }
    return false;
  });

  // 4. Disable Dragging & Copying
  modal.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });

  modal.addEventListener('copy', (e) => {
    e.preventDefault();
    if (e.clipboardData) {
      e.clipboardData.setData('text/plain', 'Protected Content - Ma\'din School of Excellence Fiesta 2026');
    }
    return false;
  });

  // 5. Mobile Multi-Touch Screenshot Gesture Interception
  modal.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length >= 3) {
      showShield('Multi-touch capture gesture detected');
      setTimeout(hideShield, 1500);
    }
  }, { passive: true });
}

function openItemPreviewModal(item) {
  if (!item) return;
  const modal = document.getElementById('modal-item-preview');
  if (!modal) return;

  const place = escapeHTML(item.place || '1st');
  const placeKey = place.toLowerCase().replace(/[^a-z0-9]/g, '');
  const subject = escapeHTML(item.subject || 'Winning Creation');
  const progName = escapeHTML(item.programName || 'Fiesta Event');
  const category = escapeHTML(item.category || 'A-Zone');
  const participantName = escapeHTML(item.participantName || 'Champion');
  const teamName = escapeHTML(item.team || '');
  const teamKey = teamName.toLowerCase();
  const mediaType = item.mediaType || 'text';

  // Fill Header Meta
  const placeBadge = document.getElementById('public-preview-place');
  const subjectEl = document.getElementById('public-preview-subject');
  const progEl = document.getElementById('public-preview-prog');
  const winnerEl = document.getElementById('public-preview-winner');
  const teamEl = document.getElementById('public-preview-team');

  if (placeBadge) {
    placeBadge.textContent = `${place} Place Winner`;
    placeBadge.className = `preview-place-badge place-badge-${placeKey}`;
  }
  if (subjectEl) subjectEl.textContent = subject;
  if (progEl) progEl.textContent = `${progName} • ${category}`;
  if (winnerEl) winnerEl.textContent = participantName;
  if (teamEl) {
    teamEl.textContent = teamName;
    teamEl.className = `preview-team-tag team-badge-${teamKey}`;
  }

  // Hide all viewer containers
  const textBox = document.getElementById('public-preview-text-box');
  const imageBox = document.getElementById('public-preview-image-box');
  const videoBox = document.getElementById('public-preview-video-box');
  const pdfBox = document.getElementById('public-preview-pdf-box');

  if (textBox) textBox.classList.add('hidden');
  if (imageBox) imageBox.classList.add('hidden');
  if (videoBox) videoBox.classList.add('hidden');
  if (pdfBox) pdfBox.classList.add('hidden');

  // Display based on media type
  if (mediaType === 'image' && item.mediaUrl) {
    if (imageBox) {
      imageBox.classList.remove('hidden');
      const img = document.getElementById('public-preview-img');
      if (img) img.src = item.mediaUrl;
    }
  } else if (mediaType === 'video' && item.mediaUrl) {
    if (videoBox) {
      videoBox.classList.remove('hidden');
      const player = document.getElementById('public-preview-video-player');
      if (player) {
        player.src = item.mediaUrl;
        player.play().catch(() => {});
      }
    }
  } else if (mediaType === 'pdf' && item.mediaUrl) {
    if (pdfBox) {
      pdfBox.classList.remove('hidden');
      const frame = document.getElementById('public-preview-pdf-frame');
      if (frame) frame.src = `${item.mediaUrl}#toolbar=0&navpanes=0`;
    }
  } else {
    // Rich Text / Poem
    if (textBox) {
      textBox.classList.remove('hidden');
      const textRender = document.getElementById('public-preview-text-render');
      if (textRender) {
        textRender.innerHTML = item.textContent || '<p class="text-muted">No text content available.</p>';
      }
    }
  }

  modal.classList.add('open');
}

window.FiestaApp = {
  openItemPreviewModal,
  renderShowcaseWorks,
  openReportForProgram
};

