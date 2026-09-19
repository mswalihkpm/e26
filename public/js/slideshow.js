/**
 * Live Results Broadcast Slideshow Engine
 * Excellentia Arts Fiesta 2026 - Discover the Unseen
 * 
 * Interleaves animated result slides with transition intro video:
 * [Result Slide 1] -> [INTRO SPEED Video] -> [Result Slide 2] -> [INTRO SPEED Video] -> ...
 * AND automatically presents the Live Team Points Overview Slide after every X results!
 */

window.FiestaSlideshow = (function() {
  let allResults = [];
  let filteredResults = [];
  let currentIndex = 0;
  let isPlaying = true;
  let isTransitioning = false;
  let isMuted = true;
  let isShowingStandingsSlide = false;
  let resultsShownSinceLastStandings = 0;
  let activeZone = 'ALL';
  const SLIDE_DURATION = 7500; // 7.5 seconds per result slide
  const STANDINGS_DURATION = 8500; // 8.5 seconds for team overview slide
  const BREAKING_DURATION = 10000; // 10 seconds spotlight for brand new breaking results
  let slideTimer = null;
  let knownPublicResultIds = new Set();
  let justAnnouncedResultId = null;
  let announcementClearTimer = null;

  let isInitialized = false;
  function init() {
    if (isInitialized) return;
    isInitialized = true;

    setupEventListeners();
    setupKeyboardShortcuts();
    
    // Subscribe to state changes from API
    if (window.FiestaAPI) {
      window.FiestaAPI.subscribe(onDataUpdate);
      const state = window.FiestaAPI.getState();
      if (state && Array.isArray(state.results)) {
        onDataUpdate(state);
      }
    }
  }

  function playBreakingResultChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Celebratory ascending fanfare chime: C5 -> E5 -> G5 -> C6
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.20 },
        { freq: 659.25, time: 0.18, dur: 0.20 },
        { freq: 783.99, time: 0.36, dur: 0.24 },
        { freq: 1046.50, time: 0.58, dur: 0.75 }
      ];

      notes.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + n.time);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + n.time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.time + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + n.time);
        osc.stop(ctx.currentTime + n.time + n.dur + 0.05);
      });
    } catch (e) {
      console.log('Audio notification chime fallback: waiting for user gesture.');
    }
  }

  function onDataUpdate(state) {
    if (!state || !Array.isArray(state.results)) return;
    const isFirstLoad = knownPublicResultIds.size === 0;
    allResults = state.results;

    const currentPublicResults = allResults.filter(r => r.isPublic !== false);

    // Detect if brand-new public result(s) arrived during active slideshow
    const newlyAddedResults = [];
    if (!isFirstLoad) {
      currentPublicResults.forEach(r => {
        if (!knownPublicResultIds.has(r.id)) {
          newlyAddedResults.push(r);
        }
      });
    }

    // Update tracked public result IDs
    knownPublicResultIds = new Set(currentPublicResults.map(r => r.id));

    applyFilter();

    // LIVE RESULT SUDDEN ARRIVAL: If new result(s) arrived while slideshow is running, immediately interrupt and show it!
    if (newlyAddedResults.length > 0) {
      // Sort newly added by result number descending to prioritize the newest
      newlyAddedResults.sort((a, b) => (Number(b.resultNumber) || 0) - (Number(a.resultNumber) || 0));
      const latestNewResult = newlyAddedResults[0];

      // Find index in filtered results
      const targetIdx = filteredResults.findIndex(r => r.id === latestNewResult.id);

      if (targetIdx !== -1) {
        justAnnouncedResultId = latestNewResult.id;
        if (announcementClearTimer) clearTimeout(announcementClearTimer);
        announcementClearTimer = setTimeout(() => {
          justAnnouncedResultId = null;
        }, 40000); // Keep breaking badge for 40s

        // Play celebratory audio chime
        playBreakingResultChime();

        // Halt any video transition immediately
        clearTimers();
        const videoEl = document.getElementById('theater-transition-video');
        if (videoEl && typeof videoEl.pause === 'function') videoEl.pause();
        const videoStage = document.getElementById('theater-video-stage');
        if (videoStage) videoStage.classList.remove('active');

        isTransitioning = false;
        isShowingStandingsSlide = false;
        currentIndex = targetIdx;
        showResultSlide(currentIndex, true);

        if (window.showToast) {
          window.showToast(`🚨 BREAKING RESULT #${latestNewResult.resultNumber || 'NEW'}: ${latestNewResult.programName} Just Announced!`, 'success', 7000);
        }
      }
    }
  }

  function applyFilter() {
    // Only cycle publicly shown results
    const publicResults = allResults.filter(r => r.isPublic !== false);

    // Sort in DESCENDING order of Result Number (latest results first, e.g. #15, #14... down to #01)
    publicResults.sort((a, b) => (Number(b.resultNumber) || 0) - (Number(a.resultNumber) || 0));

    if (activeZone === 'ALL') {
      filteredResults = [...publicResults];
    } else {
      filteredResults = publicResults.filter(r => (r.category || '').toLowerCase() === activeZone.toLowerCase());
    }

    const totalEl = document.getElementById('ss-total-num');
    if (totalEl) totalEl.textContent = filteredResults.length;

    if (filteredResults.length === 0) {
      renderEmptyState();
      stopLoop();
      return;
    }

    if (currentIndex >= filteredResults.length) {
      currentIndex = 0;
    }

    if (!isTransitioning && isPlaying && !isShowingStandingsSlide && !justAnnouncedResultId) {
      showResultSlide(currentIndex);
    }
  }

  function setupEventListeners() {
    // Zone filter pills
    const pills = document.querySelectorAll('#slideshow-zone-pills .ss-pill-btn');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeZone = pill.dataset.zone || 'ALL';
        currentIndex = 0;
        isShowingStandingsSlide = false;
        applyFilter();
      });
    });

    // Action buttons
    const btnPlayPause = document.getElementById('ss-btn-play-pause');
    const btnPrev = document.getElementById('ss-btn-prev');
    const btnNext = document.getElementById('ss-btn-next');
    const btnSound = document.getElementById('ss-btn-sound');
    const btnFullscreen = document.getElementById('ss-btn-fullscreen');
    const btnLandscape = document.getElementById('ss-btn-rotate-landscape');
    const btnExitFullscreen = document.getElementById('btn-close-theater-fullscreen');
    const btnStandings = document.getElementById('ss-btn-show-standings');
    const videoEl = document.getElementById('theater-transition-video');

    if (btnPlayPause) btnPlayPause.addEventListener('click', togglePlayPause);
    if (btnPrev) btnPrev.addEventListener('click', () => navigateSlide(-1));
    if (btnNext) btnNext.addEventListener('click', () => navigateSlide(1));
    if (btnSound) btnSound.addEventListener('click', toggleSound);
    if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);
    if (btnLandscape) btnLandscape.addEventListener('click', toggleLandscapeMode);
    if (btnExitFullscreen) btnExitFullscreen.addEventListener('click', exitFullscreen);
    if (btnStandings) btnStandings.addEventListener('click', () => showTeamStandingsSlide(true));

    // Video events
    if (videoEl) {
      videoEl.addEventListener('ended', onVideoEnded);
      videoEl.addEventListener('error', () => {
        console.warn('Transition video encountered error, advancing safely.');
        setTimeout(onVideoEnded, 800);
      });
    }

    // Fullscreen event listener
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // Auto-pause slideshow when browser tab is hidden to save CPU/battery
    let wasPlayingBeforeHidden = false;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        wasPlayingBeforeHidden = isPlaying;
        clearTimers();
        if (videoEl && !videoEl.paused) {
          try { videoEl.pause(); } catch (e) {}
        }
      } else {
        if (wasPlayingBeforeHidden && isPlaying) {
          if (!isTransitioning) {
            startSlideProgress(isShowingStandingsSlide ? STANDINGS_DURATION : SLIDE_DURATION);
          } else if (videoEl && videoEl.paused) {
            try { videoEl.play().catch(() => {}); } catch (e) {}
          }
        }
      }
    });
  }

  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const videosView = document.getElementById('videos-view');
      const isVideosActive = videosView && videosView.classList.contains('active-view');
      const theaterFrame = document.getElementById('arena-theater-frame');
      const isTheaterFs = theaterFrame && (theaterFrame.classList.contains('is-fullscreen') || document.fullscreenElement === theaterFrame);

      if (!isVideosActive && !isTheaterFs) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        navigateSlide(1);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        navigateSlide(-1);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyL') {
        e.preventDefault();
        toggleLandscapeMode();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleSound();
      } else if (e.code === 'KeyS' || e.code === 'KeyT') {
        e.preventDefault();
        showTeamStandingsSlide(true);
      }
    });
  }

  const preloadedImages = new Map();
  function preloadSlideAssets(result) {
    if (!result) return;
    const winners = getNormalizedWinners(result);
    winners.forEach(w => {
      const team = getTeamInfo(w.team);
      if (team && team.emblem && !preloadedImages.has(team.emblem)) {
        const img = new Image();
        img.src = team.emblem;
        preloadedImages.set(team.emblem, img);
      }
    });
  }

  function preloadNextSlide() {
    if (filteredResults.length === 0) return;
    const nextIdx = (currentIndex + 1) % filteredResults.length;
    preloadSlideAssets(filteredResults[nextIdx]);
  }

  function showResultSlide(index, isBreaking = false) {
    if (filteredResults.length === 0) return;
    clearTimers();
    isTransitioning = false;
    isShowingStandingsSlide = false;

    // Ensure index is in range
    currentIndex = (index + filteredResults.length) % filteredResults.length;
    const result = filteredResults[currentIndex];

    const currentNumEl = document.getElementById('ss-current-num');
    if (currentNumEl) currentNumEl.textContent = currentIndex + 1;

    const totalNumEl = document.getElementById('ss-total-num');
    if (totalNumEl) totalNumEl.textContent = filteredResults.length;

    const slideStage = document.getElementById('theater-slide-stage');
    const videoStage = document.getElementById('theater-video-stage');

    if (videoStage) videoStage.classList.remove('active');
    if (slideStage) {
      slideStage.classList.remove('slide-fade-out');
      slideStage.innerHTML = buildResultSlideHTML(result);
      void slideStage.offsetWidth; // Trigger reflow for instantaneous hardware GPU transition
      slideStage.classList.add('slide-fade-in');
    }

    // Pre-cache next slide assets in memory for zero lag
    preloadNextSlide();

    if (isPlaying) {
      startSlideProgress(isBreaking ? BREAKING_DURATION : SLIDE_DURATION);
    }
  }

  // =========================================================================
  // TEAM OVERVIEW / POINTS STATUS SLIDE (CALLED AFTER X RESULTS)
  // =========================================================================
  function showTeamStandingsSlide(manual = false) {
    clearTimers();
    isTransitioning = false;
    isShowingStandingsSlide = true;

    const state = window.FiestaAPI ? window.FiestaAPI.getState() : null;
    const teams = state?.teams || [];
    const settings = state?.settings || {};

    const currentNumEl = document.getElementById('ss-current-num');
    if (currentNumEl) currentNumEl.innerHTML = '<span class="text-gold"><i class="fa-solid fa-trophy"></i></span>';

    const slideStage = document.getElementById('theater-slide-stage');
    const videoStage = document.getElementById('theater-video-stage');

    if (videoStage) videoStage.classList.remove('active');
    if (slideStage) {
      slideStage.classList.remove('slide-fade-out');
      slideStage.classList.add('slide-fade-in');
      slideStage.innerHTML = buildTeamStandingsSlideHTML(teams, settings);
    }

    if (isPlaying) {
      startSlideProgress(STANDINGS_DURATION);
    }
  }

  function startSlideProgress(duration = SLIDE_DURATION) {
    clearTimers();
    const bar = document.getElementById('theater-progress-bar');
    if (bar) {
      bar.style.transition = 'none';
      bar.style.width = '0%';
      void bar.offsetWidth; // force reflow
      bar.style.transition = `width ${duration}ms linear`;
      bar.style.width = '100%';
    }

    slideTimer = setTimeout(() => {
      triggerVideoTransition();
    }, duration);
  }

  function triggerVideoTransition() {
    if (!isPlaying) return;
    clearTimers();
    isTransitioning = true;

    const slideStage = document.getElementById('theater-slide-stage');
    const videoStage = document.getElementById('theater-video-stage');
    const videoEl = document.getElementById('theater-transition-video');

    if (slideStage) {
      slideStage.classList.remove('slide-fade-in');
      slideStage.classList.add('slide-fade-out');
    }

    setTimeout(() => {
      if (videoStage) {
        videoStage.classList.add('active');
      }

      if (videoEl && typeof videoEl.play === 'function') {
        videoEl.muted = isMuted;
        videoEl.currentTime = 0;
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn('Transition video playback fallback:', err);
            setTimeout(onVideoEnded, 1500);
          });
        }
      } else {
        setTimeout(onVideoEnded, 1500);
      }
    }, 300);
  }

  function onVideoEnded() {
    if (!isTransitioning) return;
    const state = window.FiestaAPI ? window.FiestaAPI.getState() : null;
    const interval = (state?.settings?.standingsSlideInterval !== undefined && state.settings.standingsSlideInterval !== null)
      ? Number(state.settings.standingsSlideInterval)
      : 3;

    // If currently displaying standings slide, finish it and move to next result
    if (isShowingStandingsSlide) {
      isShowingStandingsSlide = false;
      resultsShownSinceLastStandings = 0;
      currentIndex = (currentIndex + 1) % filteredResults.length;
      showResultSlide(currentIndex);
      return;
    }

    // We just finished a result slide
    resultsShownSinceLastStandings++;

    // Check if we hit the X number of results threshold to show Team Overview Points Status!
    if (interval > 0 && resultsShownSinceLastStandings >= interval) {
      showTeamStandingsSlide();
    } else {
      currentIndex = (currentIndex + 1) % filteredResults.length;
      showResultSlide(currentIndex);
    }
  }

  function navigateSlide(direction) {
    clearTimers();
    const videoEl = document.getElementById('theater-transition-video');
    if (videoEl && typeof videoEl.pause === 'function') videoEl.pause();
    const videoStage = document.getElementById('theater-video-stage');
    if (videoStage) videoStage.classList.remove('active');

    isShowingStandingsSlide = false;
    currentIndex = (currentIndex + direction + filteredResults.length) % filteredResults.length;
    showResultSlide(currentIndex);
  }

  function togglePlayPause() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('ss-btn-play-pause');
    const bar = document.getElementById('theater-progress-bar');
    const videoEl = document.getElementById('theater-transition-video');

    if (btn) {
      if (isPlaying) {
        btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        btn.title = 'Pause (Spacebar)';
        btn.classList.remove('paused');
      } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i>';
        btn.title = 'Play (Spacebar)';
        btn.classList.add('paused');
      }
    }

    if (isPlaying) {
      if (isTransitioning) {
        if (videoEl && typeof videoEl.play === 'function') videoEl.play().catch(() => {});
      } else {
        startSlideProgress(isShowingStandingsSlide ? STANDINGS_DURATION : SLIDE_DURATION);
      }
      if (window.showToast) window.showToast('Slideshow Resumed', 'info');
    } else {
      clearTimers();
      if (bar) {
        const computed = window.getComputedStyle(bar);
        const curWidth = computed.width;
        bar.style.transition = 'none';
        bar.style.width = curWidth;
      }
      if (isTransitioning && videoEl && typeof videoEl.pause === 'function') {
        videoEl.pause();
      }
      if (window.showToast) window.showToast('Slideshow Paused', 'info');
    }
  }

  function toggleSound() {
    isMuted = !isMuted;
    const btn = document.getElementById('ss-btn-sound');
    const videoEl = document.getElementById('theater-transition-video');

    if (videoEl) videoEl.muted = isMuted;

    if (btn) {
      if (isMuted) {
        btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        btn.title = 'Enable Transition Audio';
        btn.classList.remove('active');
        if (window.showToast) window.showToast('Transition Video Muted', 'info');
      } else {
        btn.innerHTML = '<i class="fa-solid fa-volume-high text-cyan"></i>';
        btn.title = 'Mute Transition Audio';
        btn.classList.add('active');
        if (window.showToast) window.showToast('Transition Audio Enabled', 'success');
      }
    }
  }

  function toggleLandscapeMode() {
    const theaterFrame = document.getElementById('arena-theater-frame');
    if (!theaterFrame) return;

    if (!document.fullscreenElement && !theaterFrame.classList.contains('is-fullscreen')) {
      if (theaterFrame.requestFullscreen) {
        theaterFrame.requestFullscreen().then(() => {
          if (window.screen?.orientation?.lock) {
            window.screen.orientation.lock('landscape').catch(() => {});
          }
        }).catch(() => {
          theaterFrame.classList.add('is-fullscreen');
        });
      } else if (theaterFrame.webkitRequestFullscreen) {
        theaterFrame.webkitRequestFullscreen();
        if (window.screen?.orientation?.lock) {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        theaterFrame.classList.add('is-fullscreen');
      }

      if (window.showToast) {
        window.showToast('📱 Landscape Theater Active (Rotate phone for stadium view)', 'info', 4000);
      }
    } else {
      exitFullscreen();
    }
  }

  function toggleFullscreen() {
    const theaterFrame = document.getElementById('arena-theater-frame');
    if (!theaterFrame) return;

    if (!document.fullscreenElement && !theaterFrame.classList.contains('is-fullscreen')) {
      if (theaterFrame.requestFullscreen) {
        theaterFrame.requestFullscreen().then(() => {
          if (window.screen?.orientation?.lock) {
            window.screen.orientation.lock('landscape').catch(() => {});
          }
        }).catch(() => {
          theaterFrame.classList.add('is-fullscreen');
        });
      } else if (theaterFrame.webkitRequestFullscreen) {
        theaterFrame.webkitRequestFullscreen();
        if (window.screen?.orientation?.lock) {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        theaterFrame.classList.add('is-fullscreen');
      }
    } else {
      exitFullscreen();
    }
  }

  function exitFullscreen() {
    const theaterFrame = document.getElementById('arena-theater-frame');
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
    }
    if (window.screen?.orientation?.unlock) {
      try { window.screen.orientation.unlock(); } catch (e) {}
    }
    if (theaterFrame) theaterFrame.classList.remove('is-fullscreen');
  }

  function handleFullscreenChange() {
    const theaterFrame = document.getElementById('arena-theater-frame');
    const isFs = document.fullscreenElement === theaterFrame;
    if (theaterFrame) {
      if (isFs) theaterFrame.classList.add('is-fullscreen');
      else {
        theaterFrame.classList.remove('is-fullscreen');
        if (window.screen?.orientation?.unlock) {
          try { window.screen.orientation.unlock(); } catch (e) {}
        }
      }
    }
  }

  function clearTimers() {
    if (slideTimer) {
      clearTimeout(slideTimer);
      slideTimer = null;
    }
  }

  function stopLoop() {
    clearTimers();
    const videoEl = document.getElementById('theater-transition-video');
    if (videoEl && typeof videoEl.pause === 'function') videoEl.pause();
  }

  function renderEmptyState() {
    const slideStage = document.getElementById('theater-slide-stage');
    if (slideStage) {
      slideStage.innerHTML = `
        <div class="theater-empty-state">
          <i class="fa-solid fa-trophy-slash text-cyan mb-3" style="font-size: 3rem;"></i>
          <h3>No Championship Results in this Zone</h3>
          <p class="text-muted">Results published by the committee will appear here automatically.</p>
        </div>
      `;
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Team visual definitions
  const TEAM_CONFIG = {
    bukhara: { name: 'Bukhara', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', emblem: '/assets/images/houses/bukhara-arch.png', icon: 'fa-crown', glow: 'rgba(245, 158, 11, 0.6)' },
    undulus: { name: 'Undulus', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', emblem: '/assets/images/houses/undulus-arch.png', icon: 'fa-water', glow: 'rgba(16, 185, 129, 0.6)' },
    samarkhand: { name: 'Samarkhand', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.4)', emblem: '/assets/images/houses/samarkhand-arch.png', icon: 'fa-moon', glow: 'rgba(139, 92, 246, 0.6)' },
    qurthuba: { name: 'Qurthuba', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', emblem: '/assets/images/houses/qurthuba-arch.png', icon: 'fa-fire-flame-curved', glow: 'rgba(239, 68, 68, 0.6)' }
  };

  function getTeamInfo(teamName) {
    if (!teamName) return { name: 'Independent', color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.15)', border: 'rgba(0, 240, 255, 0.3)', emblem: '/assets/images/houses/bukhara-arch.png', icon: 'fa-user-astronaut', glow: 'rgba(0, 240, 255, 0.5)' };
    const key = String(teamName).toLowerCase().trim();
    for (const k in TEAM_CONFIG) {
      if (key.includes(k)) return TEAM_CONFIG[k];
    }
    return { name: teamName, color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.15)', border: 'rgba(0, 240, 255, 0.3)', emblem: '/assets/images/houses/bukhara-arch.png', icon: 'fa-shield-halved', glow: 'rgba(0, 240, 255, 0.5)' };
  }

  function getNormalizedWinners(res) {
    if (!res) return [];
    if (Array.isArray(res.winners) && res.winners.length > 0) return res.winners;

    const list = [];
    if (res.first?.participantName) list.push({ position: '1st', ...res.first });
    if (res.second?.participantName) list.push({ position: '2nd', ...res.second });
    if (res.third?.participantName) list.push({ position: '3rd', ...res.third });
    if (Array.isArray(res.additionalGrades)) {
      res.additionalGrades.forEach(g => list.push({ position: 'Grade', ...g }));
    }
    return list;
  }

  // =========================================================================
  // BUILD RESULT SLIDE HTML (Modern Festival Championship Tiers)
  // =========================================================================
  function buildResultSlideHTML(result) {
    if (!result) return '';
    const winners = getNormalizedWinners(result);

    const firstPlaces = winners.filter(w => {
      const p = String(w.position || '').toLowerCase();
      return p.includes('1') || p.includes('first');
    });
    const secondPlaces = winners.filter(w => {
      const p = String(w.position || '').toLowerCase();
      return p.includes('2') || p.includes('second');
    });
    const thirdPlaces = winners.filter(w => {
      const p = String(w.position || '').toLowerCase();
      return p.includes('3') || p.includes('third');
    });

    const additionalGrades = winners.filter(w => {
      const p = String(w.position || '').toLowerCase();
      return !p.includes('1') && !p.includes('first') &&
             !p.includes('2') && !p.includes('second') &&
             !p.includes('3') && !p.includes('third');
    });

    const progName = escapeHTML(result.programName || 'Championship Event');
    const category = escapeHTML(result.category || 'A-Zone');
    const resNumStr = String(result.resultNumber || 1).padStart(2, '0');
    const progCode = result.programCode ? `<span class="ss-prog-code">${escapeHTML(result.programCode)}</span>` : '';
    const isJustAnnounced = result.id === justAnnouncedResultId;
    const breakingTag = isJustAnnounced
      ? `<span class="ss-breaking-banner"><i class="fa-solid fa-bullhorn fa-bounce"></i> JUST ANNOUNCED</span>`
      : `<span class="ss-live-tag"><i class="fa-solid fa-bolt-lightning text-gold"></i> OFFICIAL RESULT</span>`;

    return `
      <div class="ss-slide-content ss-result-slide-stage ${isJustAnnounced ? 'is-breaking-highlight' : ''}">
        <div class="ss-header-banner">
          <div class="ss-event-meta-left">
            <span class="ss-result-num-pill"><i class="fa-solid fa-hashtag"></i> RESULT #${resNumStr}</span>
            <span class="ss-category-tag badge-zone">${category}</span>
            ${progCode}
            ${breakingTag}
          </div>
          <div class="ss-program-title-wrap">
            <h1 class="ss-program-title">${progName}</h1>
          </div>
          <div class="ss-fiesta-emblem-wrap">
            <img src="/assets/images/theme-iceberg-logo.png" alt="Discover The Unseen" class="ss-fiesta-emblem floating-emblem">
          </div>
        </div>

        <div class="ss-victory-arena">
          <div class="ss-tier-section ss-tier-gold ${firstPlaces.length > 1 ? 'is-multi-winner' : ''}">
            <div class="ss-tier-header">
              <div class="ss-tier-badge gold-crown">
                <i class="fa-solid fa-crown"></i>
                <span>${firstPlaces.length > 1 ? '1ST POSITION • JOINT CHAMPIONS' : '1ST POSITION • CHAMPION WINNER'}</span>
              </div>
            </div>
            <div class="ss-tier-cards-grid grid-gold count-${firstPlaces.length}">
              ${buildPodiumWinnersStack(firstPlaces, 'gold', 1)}
            </div>
          </div>

          <div class="ss-tier-dual-row">
            <div class="ss-tier-section ss-tier-silver ${secondPlaces.length > 1 ? 'is-multi-winner' : ''}">
              <div class="ss-tier-header">
                <div class="ss-tier-badge silver-crown">
                  <i class="fa-solid fa-medal"></i>
                  <span>${secondPlaces.length > 1 ? '2ND POSITION • TIE' : '2ND POSITION • FIRST RUNNER-UP'}</span>
                </div>
              </div>
              <div class="ss-tier-cards-grid grid-silver count-${secondPlaces.length}">
                ${buildPodiumWinnersStack(secondPlaces, 'silver', 2)}
              </div>
            </div>

            <div class="ss-tier-section ss-tier-bronze ${thirdPlaces.length > 1 ? 'is-multi-winner' : ''}">
              <div class="ss-tier-header">
                <div class="ss-tier-badge bronze-crown">
                  <i class="fa-solid fa-award"></i>
                  <span>${thirdPlaces.length > 1 ? '3RD POSITION • TIE' : '3RD POSITION • SECOND RUNNER-UP'}</span>
                </div>
              </div>
              <div class="ss-tier-cards-grid grid-bronze count-${thirdPlaces.length}">
                ${buildPodiumWinnersStack(thirdPlaces, 'bronze', 3)}
              </div>
            </div>
          </div>
        </div>

        ${additionalGrades.length > 0 ? buildGradesStrip(additionalGrades) : buildAuditFooter()}
      </div>
    `;
  }

  function buildPodiumWinnersStack(places, rankTier, posNum) {
    if (!places || places.length === 0) {
      const posLabel = posNum === 1 ? '1st' : (posNum === 2 ? '2nd' : '3rd');
      return `<div class="ss-unannounced-card"><i class="fa-solid fa-hourglass-half"></i> Awaiting ${posLabel} Position Announcement</div>`;
    }
    return places.map(w => buildVictoryWinnerCard(w, rankTier, posNum)).join('');
  }

  function buildVictoryWinnerCard(winner, rankTier, posNum) {
    const pName = escapeHTML(winner.participantName || 'Participant');
    const team = getTeamInfo(winner.team);
    const grade = winner.grade && winner.grade !== 'No Grade' && winner.grade !== 'None'
      ? `<span class="ss-victory-grade"><i class="fa-solid fa-star text-gold"></i> Grade ${escapeHTML(winner.grade)}</span>`
      : '';
    const points = winner.points 
      ? `<span class="ss-victory-pts">+${Number(winner.points)} PTS</span>` 
      : (posNum === 1 ? '<span class="ss-victory-pts">+10 PTS</span>' : (posNum === 2 ? '<span class="ss-victory-pts">+7 PTS</span>' : '<span class="ss-victory-pts">+5 PTS</span>'));

    const rankIcon = posNum === 1 ? 'fa-crown' : (posNum === 2 ? 'fa-medal' : 'fa-award');

    return `
      <div class="ss-victory-card card-tier-${rankTier} team-glow-${String(winner.team).toLowerCase().trim()}" style="--team-glow: ${team.glow}; --team-color: ${team.color};">
        <img src="${team.emblem}" alt="${team.name}" class="ss-card-bg-crest" style="filter: drop-shadow(0 0 15px ${team.glow});">
        <div class="ss-victory-card-left">
          <div class="ss-victory-avatar tier-${rankTier}" style="border-color: ${team.color}; box-shadow: 0 0 20px ${team.glow};">
            <img src="${team.emblem}" alt="${team.name}" class="ss-victory-emblem-img">
            <div class="ss-pos-corner-badge pos-badge-${posNum}">
              <i class="fa-solid ${rankIcon}"></i>
            </div>
          </div>
        </div>
        <div class="ss-victory-card-body">
          <div class="ss-victory-name-row">
            <h2 class="ss-victory-name">${pName}</h2>
          </div>
          <div class="ss-victory-meta-row">
            <div class="ss-team-pill" style="background: ${team.bg}; border-color: ${team.border}; color: ${team.color};">
              <img src="${team.emblem}" alt="${team.name}" class="ss-team-mini-emblem">
              <strong>${team.name}</strong>
            </div>
            ${grade}
            ${points}
          </div>
        </div>
      </div>
    `;
  }

  function buildGradesStrip(grades) {
    const gradeItems = grades.map(g => {
      const team = getTeamInfo(g.team);
      const pName = escapeHTML(g.participantName || 'Participant');
      const gradeLetter = escapeHTML(g.grade || 'A');
      return `
        <div class="ss-grade-chip" style="border-left-color: ${team.color};">
          <span class="chip-name">${pName}</span>
          <span class="chip-house" style="color: ${team.color};"><img src="${team.emblem}" class="ss-chip-emblem" alt="${team.name}"> ${team.name}</span>
          <span class="chip-grade">Grade ${gradeLetter}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="ss-additional-grades-bar">
        <div class="ss-grades-label">
          <i class="fa-solid fa-certificate text-cyan"></i>
          <span>With Grade:</span>
        </div>
        <div class="ss-grades-scroller">
          ${gradeItems}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // BUILD TEAM OVERVIEW POINTS STATUS SLIDE HTML
  // =========================================================================
  function buildTeamStandingsSlideHTML(teams = [], settings = {}) {
    const sorted = [...teams].sort((a, b) => (b.points || 0) - (a.points || 0));
    const isScoresVisible = settings.showTeamScores !== false;
    const leaderPoints = sorted[0]?.points || 0;
    const cutoffNum = settings.maxVisibleResultNumber;

    const publicResults = (allResults || []).filter(r => r.isPublic !== false);
    const activeResultCount = cutoffNum || (publicResults.length > 0 ? publicResults.length : 0);
    const cutoffNotice = cutoffNum ? `• AFTER RESULT #${activeResultCount} • Points Calculated up to Result #${cutoffNum}` : `• AFTER RESULT #${activeResultCount} • Calculated across ${activeResultCount} published results`;

    const teamCardsHTML = sorted.map((t, idx) => {
      const rank = idx + 1;
      const team = getTeamInfo(t.name);
      const pts = Number(t.points) || 0;
      const rankBadgeClass = rank === 1 ? 'rank-badge-1' : (rank === 2 ? 'rank-badge-2' : (rank === 3 ? 'rank-badge-3' : 'rank-badge-4'));
      const rankBadgeIcon = rank === 1 ? 'fa-crown' : (rank === 2 ? 'fa-medal' : (rank === 3 ? 'fa-award' : 'fa-shield'));
      const rankLabel = rank === 1 ? 'CHAMPION LEADER' : (rank === 2 ? '2ND POSITION' : (rank === 3 ? '3RD POSITION' : '4TH POSITION'));

      const diffFromLeader = rank === 1
        ? `<div class="ss-standing-lead-margin lead-margin-positive"><i class="fa-solid fa-crown text-gold"></i> LEADER</div>`
        : `<div class="ss-standing-lead-margin lead-margin-diff">-${leaderPoints - pts} pts from #1</div>`;

      const scoreDisplay = isScoresVisible
        ? `<div class="ss-standing-points-val" style="color: ${team.color};">${pts}</div><div class="ss-standing-points-unit">TOTAL POINTS</div>`
        : `<div class="ss-standing-points-val ss-points-concealed"><i class="fa-solid fa-lock text-cyan"></i> CONCEALED</div><div class="ss-standing-points-unit">BY COMMITTEE</div>`;

      const catPoints = t.categoryPoints || {};
      const zoneChips = `
        <div class="ss-standing-breakdown-chips">
          <span class="ss-zone-chip" title="A-Zone Points">A: <strong>${catPoints['A-Zone'] || 0}</strong></span>
          <span class="ss-zone-chip" title="B-Zone Points">B: <strong>${catPoints['B-Zone'] || 0}</strong></span>
          <span class="ss-zone-chip" title="C-Zone Points">C: <strong>${catPoints['C-Zone'] || 0}</strong></span>
          <span class="ss-zone-chip" title="General Points">Gen: <strong>${catPoints['General'] || 0}</strong></span>
        </div>
      `;

      return `
        <div class="ss-standing-card rank-${rank} team-card-${String(t.name).toLowerCase().trim()}" style="--team-glow: ${team.glow}; --team-color: ${team.color};">
          <img src="${team.emblem}" alt="${team.name}" class="ss-standing-card-bg-emblem">
          <div class="ss-standing-card-top">
            <span class="ss-standing-rank-badge ${rankBadgeClass}">
              <i class="fa-solid ${rankBadgeIcon}"></i> #${rank} ${rankLabel}
            </span>
            <div class="ss-standing-mini-crest">
              <img src="${team.emblem}" alt="${team.name}" class="ss-standing-emblem-img">
            </div>
          </div>
          <div class="ss-standing-card-body">
            <div class="ss-standing-team-title" style="color: ${team.color};">
              <img src="${team.emblem}" class="ss-team-avatar-icon" alt="${team.name}">
              <span>${escapeHTML(t.name || 'Team')}</span>
            </div>
            <div class="ss-standing-score-box">
              ${scoreDisplay}
            </div>
            ${isScoresVisible ? zoneChips : ''}
          </div>
          <div class="ss-standing-card-bottom">
            ${isScoresVisible ? diffFromLeader : '<div class="ss-standing-lead-margin lead-margin-concealed"><i class="fa-solid fa-eye-slash"></i> Scores Secret</div>'}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="ss-slide-content ss-standings-slide">
        <div class="ss-standings-banner">
          <!-- Prominent Stacked "AFTER X RESULTS" Widget -->
          <div class="ss-after-cutoff-card">
            <span class="ss-after-lbl">AFTER</span>
            <span class="ss-after-num">${activeResultCount}</span>
            <span class="ss-after-unit">RESULTS</span>
          </div>

          <div class="ss-standings-header-text">
            <div class="ss-standings-tags-row">
              <span class="ss-live-tag"><i class="fa-solid fa-crown text-gold"></i> OFFICIAL TEAM STANDINGS</span>
              <span class="ss-category-tag badge-zone">OVERALL POINTS</span>
            </div>
            <h1 class="ss-standings-main-title">Team Championship Points Table</h1>
            <p class="ss-standings-subtitle">${cutoffNotice}</p>
          </div>

          <div class="ss-fiesta-emblem-wrap">
            <img src="/assets/images/theme-iceberg-logo.png" alt="Discover The Unseen" class="ss-fiesta-emblem floating-emblem">
          </div>
        </div>

        <div class="ss-standings-grid">
          ${teamCardsHTML}
        </div>

        <div class="ss-championship-audit-strip">
          <div class="audit-strip-inner">
            <span class="audit-live-dot"></span>
            <span class="audit-text">OFFICIAL CHAMPIONSHIP STANDINGS • EXCELLENTIA ARTS FIESTA 2026 • MA'DIN SCHOOL OF EXCELLENCE</span>
          </div>
        </div>
      </div>
    `;
  }

  function buildAuditFooter() {
    return `
      <div class="ss-championship-audit-strip">
        <div class="audit-strip-inner">
          <span class="audit-live-dot"></span>
          <span class="audit-text">OFFICIAL PUBLISHED RESULT • VERIFIED BY EXCELLENTIA AUDIT COMMITTEE • MA'DIN SCHOOL OF EXCELLENCE</span>
        </div>
      </div>
    `;
  }

  return {
    init,
    showResultSlide,
    showTeamStandingsSlide,
    togglePlayPause,
    toggleSound,
    toggleFullscreen,
    navigateSlide
  };
})();

// Auto-init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.FiestaSlideshow && typeof window.FiestaSlideshow.init === 'function') {
    window.FiestaSlideshow.init();
  }
});
