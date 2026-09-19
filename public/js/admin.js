/**
 * Fiesta Admin Dashboard Module
 * Features:
 * - Searchable Program Combobox & Searchable Participant Selection
 * - Multiple 1st, 2nd, 3rd & Grade Winners with Independent Grade & Points
 * - Video Highlights & Recitals Manager
 * - Bulk Image Upload from PC
 * - Auto-Recalculation across all 4 Houses
 */

window.FiestaAdmin = (function() {
  let isInitialized = false;
  let stagedExcelParticipants = [];
  let stagedExcelPrograms = [];
  const selectedParticipantIds = new Set();
  const selectedGalleryIds = new Set();
  const selectedProgramIds = new Set();
  const selectedResultIds = new Set();
  const selectedNewsIds = new Set();
  let globalOpenResultModal = null;
  let lastKnownPendingCount = 0;
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playNotificationChime() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // High-grade crystal 3-tone notification chime:
      // F#5 (739.99 Hz) -> A#5 (932.33 Hz) -> C#6 (1108.73 Hz)
      const tones = [
        { freq: 739.99, start: 0.00, dur: 0.18 },
        { freq: 932.33, start: 0.12, dur: 0.22 },
        { freq: 1108.73, start: 0.24, dur: 0.40 }
      ];

      tones.forEach(t => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(t.freq, now + t.start);

        gain.gain.setValueAtTime(0.001, now + t.start);
        gain.gain.exponentialRampToValueAtTime(0.28, now + t.start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + t.start);
        osc.stop(now + t.start + t.dur + 0.05);
      });
    } catch (e) {
      console.warn('Audio chime warning:', e);
    }
  }

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    setupAuth();
    setupAdminTabs();
    setupVisibilityControl();
    setupExcelImporter();
    setupProgramsExcelImporter();
    setupResultEditor();
    setupItemsManager();
    setupVideosManager();
    setupGalleryPCUpload();
    setupProgramsManager();
    setupNewsManager();
    setupNotificationsInbox();
    setupBulkActions();

    window.FiestaAPI.subscribe(renderAdminData);
  }

  // --- AUTHENTICATION & SINGLE ADMIN CLEARANCE ---
  function openLoginModal() {
    const modalLogin = document.getElementById('modal-admin-login');
    if (window.FiestaAPI.isAdminLoggedIn()) {
      showAdminView();
    } else {
      if (modalLogin) modalLogin.classList.add('open');
    }
  }

  function setupAuth() {
    const btnNavAdmin = document.getElementById('btn-nav-admin');
    const btnDrawerAdmin = document.getElementById('btn-drawer-admin');
    const btnFooterAdmin = document.getElementById('btn-footer-admin-btn');
    const modalLogin = document.getElementById('modal-admin-login');
    const btnCloseLogin = document.getElementById('btn-close-admin-login');
    const formLogin = document.getElementById('form-admin-login');
    const btnLogout = document.getElementById('btn-admin-logout');
    const btnTogglePass = document.getElementById('btn-toggle-login-pass');

    if (btnNavAdmin) btnNavAdmin.addEventListener('click', openLoginModal);
    if (btnDrawerAdmin) btnDrawerAdmin.addEventListener('click', openLoginModal);
    if (btnFooterAdmin) btnFooterAdmin.addEventListener('click', openLoginModal);

    if (btnCloseLogin && modalLogin) {
      btnCloseLogin.addEventListener('click', () => modalLogin.classList.remove('open'));
    }

    if (btnTogglePass) {
      btnTogglePass.addEventListener('click', () => {
        const passInput = document.getElementById('login-password');
        if (passInput) passInput.type = passInput.type === 'password' ? 'text' : 'password';
      });
    }

    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();

        try {
          const res = await window.FiestaAPI.login(username, password);
          if (res.success) {
            if (modalLogin) modalLogin.classList.remove('open');
            formLogin.reset();
            window.showToast('Administrator clearance granted. Welcome to Fiesta Control Room!', 'success');
            showAdminView();
          } else {
            window.showToast(res.message || 'Invalid credentials', 'error');
          }
        } catch (err) {
          window.showToast('Login connection failed', 'error');
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        window.FiestaAPI.logout();
        window.showToast('Logged out of Admin Control Room', 'info');
        const homeLink = document.querySelector('.nav-item[data-target="home-view"]');
        if (homeLink) homeLink.click();
      });
    }

    const btnRefresh = document.getElementById('btn-admin-refresh-data');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        await window.FiestaAPI.fetchState();
        window.showToast('Fiesta database synced and points recalculated.', 'success');
      });
    }
  }

  function showAdminView() {
    const allViews = document.querySelectorAll('.view-section');
    allViews.forEach(v => v.classList.remove('active-view'));

    const adminView = document.getElementById('admin-view');
    if (adminView) adminView.classList.add('active-view');

    const navItems = document.querySelectorAll('.nav-item, .drawer-link');
    navItems.forEach(n => n.classList.remove('active'));

    const adminNavText = document.getElementById('admin-nav-text');
    if (adminNavText) adminNavText.textContent = 'Control Room';

    // Play notification sound chime when opening admin panel if pending reports exist
    const state = window.FiestaAPI.getState();
    const notifs = state.notifications || [];
    const hasPending = notifs.some(n => n.status === 'pending');
    if (hasPending) {
      playNotificationChime();
    }

    renderAdminData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetPaneId = tab.dataset.tab;
        const allPanes = document.querySelectorAll('.admin-tab-pane');
        allPanes.forEach(p => p.classList.remove('active-pane'));

        const targetPane = document.getElementById(targetPaneId);
        if (targetPane) targetPane.classList.add('active-pane');
      });
    });
  }

  // --- VISIBILITY & SCORE BROADCAST CONTROL ---
  function setupVisibilityControl() {
    const toggleScore = document.getElementById('toggle-show-team-scores');
    const scorePill = document.getElementById('team-scores-status-pill');
    const inputCutoff = document.getElementById('input-max-result-number');
    const btnApplyCutoff = document.getElementById('btn-apply-result-cutoff');
    const btnClearCutoff = document.getElementById('btn-clear-result-cutoff');
    const btnRenumber = document.getElementById('btn-renumber-results-seq');
    const cutoffText = document.getElementById('current-cutoff-text');

    if (toggleScore) {
      toggleScore.addEventListener('change', async (e) => {
        const isShow = e.target.checked;
        await window.FiestaAPI.updateSettings({ showTeamScores: isShow });
        if (scorePill) {
          if (isShow) {
            scorePill.className = 'visibility-status-pill pill-active';
            scorePill.innerHTML = '<i class="fa-solid fa-eye"></i> Scores Visible';
          } else {
            scorePill.className = 'visibility-status-pill pill-hidden';
            scorePill.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Scores Concealed';
          }
        }
        window.showToast(isShow ? 'Team scores are now VISIBLE to public' : 'Team scores are now CONCEALED from public', isShow ? 'success' : 'warning');
      });
    }

    if (btnApplyCutoff) {
      btnApplyCutoff.addEventListener('click', async () => {
        const val = inputCutoff ? inputCutoff.value.trim() : '';
        if (!val || isNaN(val) || Number(val) < 1) {
          window.showToast('Please enter a valid result number (e.g. 10)', 'warning');
          return;
        }
        const maxNum = Number(val);
        await window.FiestaAPI.updateSettings({ maxVisibleResultNumber: maxNum });
        window.showToast(`Team overview points now calculated up to Result #${maxNum}. (All individual results remain visible).`, 'success');
      });
    }

    const inputInterval = document.getElementById('input-standings-interval');
    const btnApplyInterval = document.getElementById('btn-apply-standings-interval');
    const btnDisableInterval = document.getElementById('btn-disable-standings-interval');

    if (btnApplyInterval) {
      btnApplyInterval.addEventListener('click', async () => {
        const val = inputInterval ? inputInterval.value.trim() : '3';
        const num = Number(val);
        if (isNaN(num) || num < 1) {
          window.showToast('Please enter a valid interval (e.g. 3 or 5 results)', 'warning');
          return;
        }
        await window.FiestaAPI.updateSettings({ standingsSlideInterval: num });
        window.showToast(`Team Points Overview slide will now display after every ${num} results in the slideshow!`, 'success');
      });
    }

    if (btnDisableInterval) {
      btnDisableInterval.addEventListener('click', async () => {
        if (inputInterval) inputInterval.value = '0';
        await window.FiestaAPI.updateSettings({ standingsSlideInterval: 0 });
        window.showToast('Automatic Team Points Overview slide disabled in slideshow.', 'info');
      });
    }

    if (btnRenumber) {
      btnRenumber.addEventListener('click', async () => {
        if (confirm("Re-sequence all results sequentially (1, 2, 3...) based on publish order?")) {
          await window.FiestaAPI.renumberResults();
          window.showToast('Results re-sequenced sequentially 1..N!', 'success');
        }
      });
    }
  }

  // --- RESULT EDITOR: SEARCHABLE PROGRAM & PARTICIPANTS, DYNAMIC MULTIPLE WINNERS ---
  function setupResultEditor() {
    const modal = document.getElementById('modal-result-editor');
    const btnOpenAdd = document.getElementById('btn-open-add-result-modal');
    const btnClose = document.getElementById('btn-close-result-modal');
    const btnCancel = document.getElementById('btn-cancel-result-form');
    const form = document.getElementById('form-result-editor');
    const btnAddWinner = document.getElementById('btn-add-winner-row');
    const winnersContainer = document.getElementById('winners-rows-container');

    // Program Search Combobox
    const progSearchInput = document.getElementById('res-program-search');
    const progDropdown = document.getElementById('res-program-dropdown');
    const progIdHidden = document.getElementById('res-selected-program-id');
    const selectedBadge = document.getElementById('selected-program-badge');
    const selectedBadgeText = document.getElementById('selected-program-text');
    const btnClearSelectedProg = document.getElementById('btn-clear-selected-prog');

    function filterProgramsDropdown(query = '') {
      const state = window.FiestaAPI.getState();
      const progs = state.programs || [];
      const q = query.toLowerCase().trim();

      // Search across name, category, or status - NEVER filter out completed programs!
      const matched = progs.filter(p => {
        if (!q) return true;
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const catMatch = (p.category || '').toLowerCase().includes(q);
        const statusMatch = (p.status || '').toLowerCase().includes(q);
        return nameMatch || catMatch || statusMatch;
      });

      if (matched.length === 0) {
        progDropdown.innerHTML = '<div class="combobox-item text-muted" style="padding: 0.75rem; text-align: center;">No programs matching "' + escapeHTML(query) + '"</div>';
      } else {
        progDropdown.innerHTML = matched.map(p => {
          const isCompleted = p.status === 'Completed' || (state.results || []).some(r => r.programId === p.id || r.programName?.toLowerCase() === p.name?.toLowerCase());
          const statusBadge = isCompleted
            ? '<span style="font-size:0.75rem; font-weight:700; color:#34d399; background:rgba(52, 211, 153, 0.15); border:1px solid rgba(52, 211, 153, 0.4); border-radius:12px; padding:0.15rem 0.5rem; margin-left:auto;"><i class="fa-solid fa-circle-check"></i> Published</span>'
            : '<span style="font-size:0.75rem; font-weight:700; color:#00f0ff; background:rgba(0, 240, 255, 0.12); border:1px solid rgba(0, 240, 255, 0.35); border-radius:12px; padding:0.15rem 0.5rem; margin-left:auto;"><i class="fa-regular fa-clock"></i> Upcoming</span>';

          return `
            <div class="combobox-item" data-id="${p.id}" data-name="${escapeHTML(p.name)}" data-cat="${escapeHTML(p.category || 'A-Zone')}" style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; cursor: pointer;">
              <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
                <span style="font-weight: 700; color: #fff;">${escapeHTML(p.name)}</span>
                <span class="badge-zone">${escapeHTML(p.category || 'A-Zone')}</span>
              </div>
              ${statusBadge}
            </div>
          `;
        }).join('');

        progDropdown.querySelectorAll('.combobox-item').forEach(item => {
          item.addEventListener('click', (e) => {
            e.stopPropagation();
            selectProgram(item.dataset.id, item.dataset.name, item.dataset.cat);
          });
        });
      }
      progDropdown.classList.remove('hidden');
    }

    function selectProgram(id, name, category) {
      if (!id && !name) return;
      if (progIdHidden) progIdHidden.value = id || '';
      if (progSearchInput) {
        progSearchInput.value = name || '';
        progSearchInput.dataset.name = name || '';
      }
      if (progDropdown) progDropdown.classList.add('hidden');

      if (selectedBadge && selectedBadgeText) {
        selectedBadgeText.textContent = `${name} (${category || 'A-Zone'})`;
        selectedBadge.classList.remove('hidden');
      }

      const catSelect = document.getElementById('res-category');
      if (catSelect && category) catSelect.value = category;
    }

    if (progSearchInput) {
      progSearchInput.addEventListener('input', (e) => filterProgramsDropdown(e.target.value));
      progSearchInput.addEventListener('focus', (e) => filterProgramsDropdown(e.target.value));
      progSearchInput.addEventListener('click', (e) => {
        e.stopPropagation();
        filterProgramsDropdown(progSearchInput.value);
      });
    }

    document.addEventListener('click', (e) => {
      if (progDropdown && !e.target.closest('.searchable-combobox-wrap')) {
        progDropdown.classList.add('hidden');
      }
    });

    if (btnClearSelectedProg) {
      btnClearSelectedProg.addEventListener('click', (e) => {
        e.stopPropagation();
        if (progIdHidden) progIdHidden.value = '';
        if (selectedBadge) selectedBadge.classList.add('hidden');
        if (selectedBadgeText) selectedBadgeText.textContent = '';
        if (progSearchInput) {
          progSearchInput.value = '';
          progSearchInput.dataset.name = '';
          progSearchInput.dataset.code = '';
          progSearchInput.focus();
          filterProgramsDropdown('');
        }
      });
    }

    // Dynamic Winner Row Addition
    function addWinnerRow(data = {}) {
      if (!winnersContainer) return;
      const rowIndex = Date.now() + Math.floor(Math.random() * 1000);

      const pos = data.position || '1st';
      const name = data.participantName || '';
      const team = data.team || 'Bukhara';
      const grade = data.grade || (pos.includes('1') ? 'A+' : (pos.includes('2') ? 'A' : (pos.includes('3') ? 'B' : 'A')));
      const points = data.points !== undefined ? data.points : (pos.includes('1') ? 10 : (pos.includes('2') ? 6 : (pos.includes('3') ? 3 : 5)));

      const row = document.createElement('div');
      row.className = 'winner-input-row';
      row.id = `win-row-${rowIndex}`;

      row.innerHTML = `
        <!-- Position Select -->
        <select class="form-input win-pos-select">
          <option value="1st" ${pos === '1st' ? 'selected' : ''}>🥇 1st Place</option>
          <option value="2nd" ${pos === '2nd' ? 'selected' : ''}>🥈 2nd Place</option>
          <option value="3rd" ${pos === '3rd' ? 'selected' : ''}>🥉 3rd Place</option>
          <option value="Grade" ${pos === 'Grade' ? 'selected' : ''}>⭐ Grade Winner</option>
        </select>

        <!-- Searchable Participant Name Input -->
        <div class="participant-select-wrap">
          <input type="text" class="form-input win-name-input" placeholder="Search / Enter Participant Name..." value="${escapeHTML(name)}" autocomplete="off" required>
          <div class="combobox-dropdown hidden win-part-dropdown"></div>
        </div>

        <!-- Team / House -->
        <select class="form-input win-team-select">
          <option value="Bukhara" ${team === 'Bukhara' ? 'selected' : ''}>Bukhara</option>
          <option value="Undulus" ${team === 'Undulus' ? 'selected' : ''}>Undulus</option>
          <option value="Samarkhand" ${team === 'Samarkhand' ? 'selected' : ''}>Samarkhand</option>
          <option value="Qurthuba" ${team === 'Qurthuba' ? 'selected' : ''}>Qurthuba</option>
        </select>

        <!-- Independent Grade Select -->
        <select class="form-input win-grade-select">
          <option value="A+" ${grade === 'A+' ? 'selected' : ''}>Grade A+</option>
          <option value="A" ${grade === 'A' ? 'selected' : ''}>Grade A</option>
          <option value="B" ${grade === 'B' ? 'selected' : ''}>Grade B</option>
          <option value="C" ${grade === 'C' ? 'selected' : ''}>Grade C</option>
          <option value="D" ${grade === 'D' ? 'selected' : ''}>Grade D</option>
          <option value="E" ${grade === 'E' ? 'selected' : ''}>Grade E</option>
          <option value="No Grade" ${grade === 'No Grade' ? 'selected' : ''}>No Grade</option>
        </select>

        <!-- Independent Custom Points Input -->
        <input type="number" class="form-input win-points-input" value="${points}" placeholder="Points" min="0" title="Custom Points" required>

        <!-- Remove Row Button -->
        <button type="button" class="btn-remove-row" title="Remove Winner"><i class="fa-solid fa-trash"></i></button>
      `;

      // Setup participant auto-suggest for this row
      const nameInput = row.querySelector('.win-name-input');
      const dropdown = row.querySelector('.win-part-dropdown');
      const teamSelect = row.querySelector('.win-team-select');
      const posSelect = row.querySelector('.win-pos-select');
      const pointsInput = row.querySelector('.win-points-input');

      posSelect.addEventListener('change', () => {
        const val = posSelect.value;
        if (val === '1st' && pointsInput.value == 0) pointsInput.value = 10;
        else if (val === '2nd' && pointsInput.value == 0) pointsInput.value = 6;
        else if (val === '3rd' && pointsInput.value == 0) pointsInput.value = 3;
      });

      nameInput.addEventListener('input', () => {
        const query = nameInput.value.trim().toLowerCase();
        const state = window.FiestaAPI.getState();
        const parts = state.participants || [];

        const matched = parts.filter(p => p.name.toLowerCase().includes(query));
        if (matched.length > 0 && query.length > 0) {
          dropdown.innerHTML = matched.slice(0, 6).map(p => `
            <div class="combobox-item" data-name="${escapeHTML(p.name)}" data-team="${escapeHTML(p.team)}">
              <span>${escapeHTML(p.name)}</span>
              <span class="winner-team-badge team-badge-${p.team.toLowerCase()}">${escapeHTML(p.team)}</span>
            </div>
          `).join('');

          dropdown.querySelectorAll('.combobox-item').forEach(item => {
            item.addEventListener('click', () => {
              nameInput.value = item.dataset.name;
              teamSelect.value = item.dataset.team;
              dropdown.classList.add('hidden');
            });
          });
          dropdown.classList.remove('hidden');
        } else {
          dropdown.classList.add('hidden');
        }
      });

      document.addEventListener('click', (e) => {
        if (!row.contains(e.target)) dropdown.classList.add('hidden');
      });

      row.querySelector('.btn-remove-row').addEventListener('click', () => row.remove());
      winnersContainer.appendChild(row);
    }

    if (btnAddWinner) btnAddWinner.addEventListener('click', () => addWinnerRow());

    function openResultModal(existingResult = null, prefillData = null) {
      if (!modal) return;
      form.reset();
      winnersContainer.innerHTML = '';
      
      // Explicitly reset program selector state
      if (progIdHidden) progIdHidden.value = '';
      if (progSearchInput) {
        progSearchInput.value = '';
        progSearchInput.dataset.name = '';
        progSearchInput.dataset.code = '';
      }
      if (selectedBadge) selectedBadge.classList.add('hidden');
      if (selectedBadgeText) selectedBadgeText.textContent = '';
      if (progDropdown) progDropdown.classList.add('hidden');

      const state = window.FiestaAPI.getState();
      const resNumInput = document.getElementById('res-result-number');
      const isPublicChk = document.getElementById('res-is-public');

      if (existingResult) {
        document.getElementById('result-modal-title').textContent = 'Edit Published Result';
        document.getElementById('edit-result-id').value = existingResult.id;
        if (resNumInput) resNumInput.value = existingResult.resultNumber || 1;
        if (isPublicChk) isPublicChk.checked = existingResult.isPublic !== false;
        selectProgram(existingResult.programId, existingResult.programName, existingResult.category);

        const winners = window.FiestaResults?.getNormalizedWinners
          ? window.FiestaResults.getNormalizedWinners(existingResult)
          : (existingResult.winners || []);

        if (winners.length > 0) {
          winners.forEach(w => addWinnerRow(w));
        } else {
          addWinnerRow({ position: '1st' });
        }
      } else {
        document.getElementById('result-modal-title').textContent = 'Publish Official Result';
        document.getElementById('edit-result-id').value = '';
        if (isPublicChk) isPublicChk.checked = true;

        // Auto-assign next sequential result number
        const maxNum = (state.results || []).reduce((max, r) => Math.max(max, Number(r.resultNumber) || 0), 0);
        if (resNumInput) resNumInput.value = maxNum + 1;

        if (prefillData) {
          if (prefillData.programName) {
            const p = (state.programs || []).find(prog => prog.name.toLowerCase().includes(prefillData.programName.toLowerCase()));
            if (p) selectProgram(p.id, p.name, p.category);
            else selectProgram('', prefillData.programName, 'A-Zone');
          }
          addWinnerRow({
            position: '1st',
            participantName: prefillData.requesterName || '',
            team: prefillData.requesterTeam || 'Bukhara'
          });
        } else {
          // Default start with 1st, 2nd, 3rd rows ready!
          addWinnerRow({ position: '1st', points: 10 });
          addWinnerRow({ position: '2nd', points: 6 });
          addWinnerRow({ position: '3rd', points: 3 });
        }
      }

      modal.classList.add('open');
    }

    globalOpenResultModal = openResultModal;

    function closeResultModal() {
      if (modal) modal.classList.remove('open');
    }

    if (btnOpenAdd) btnOpenAdd.addEventListener('click', () => openResultModal());
    if (btnClose) btnClose.addEventListener('click', closeResultModal);
    if (btnCancel) btnCancel.addEventListener('click', closeResultModal);

    let isSubmittingResult = false;
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmittingResult) return;

        const editId = document.getElementById('edit-result-id').value;
        const progId = progIdHidden ? progIdHidden.value : '';
        const state = window.FiestaAPI.getState();
        const progObj = (state.programs || []).find(p => p.id === progId);

        const progName = progObj ? progObj.name : (progSearchInput?.value?.trim() || progSearchInput?.dataset?.name || 'Fiesta Event');
        const progCode = progObj ? (progObj.code || 'PROG') : 'PROG';
        const category = document.getElementById('res-category').value;
        const resultNumInput = document.getElementById('res-result-number');
        const resultNumber = resultNumInput ? (Number(resultNumInput.value) || 1) : 1;

        // Collect dynamic winners
        const winnerRows = winnersContainer.querySelectorAll('.winner-input-row');
        const winners = [];

        winnerRows.forEach(row => {
          const pos = row.querySelector('.win-pos-select').value;
          const pName = row.querySelector('.win-name-input').value.trim();
          const team = row.querySelector('.win-team-select').value;
          const grade = row.querySelector('.win-grade-select').value;
          const points = Number(row.querySelector('.win-points-input').value) || 0;

          if (pName) {
            winners.push({
              position: pos,
              participantName: pName,
              team: team,
              grade: grade,
              points: points
            });
          }
        });

        if (winners.length === 0) {
          window.showToast('Please add at least one winner for this result', 'warning');
          return;
        }

        const isPublicChk = document.getElementById('res-is-public');
        const isPublic = isPublicChk ? isPublicChk.checked : true;

        const payload = {
          programId: progId,
          programCode: progCode,
          programName: progName,
          category: category,
          resultNumber: resultNumber,
          isPublic: isPublic,
          winners: winners
        };

        const btnSubmit = document.getElementById('btn-submit-result-form');
        const origBtnHTML = btnSubmit ? btnSubmit.innerHTML : '';

        isSubmittingResult = true;
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
        }

        try {
          if (editId) {
            await window.FiestaAPI.updateResult(editId, payload);
            window.showToast('Result updated and team standings recalculated!', 'success');
          } else {
            await window.FiestaAPI.addResult(payload);
            window.showToast('Official result published! Points updated across all teams.', 'success');
            if (typeof confetti === 'function') confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          }
          closeResultModal();
        } catch (err) {
          window.showToast('Failed to save result', 'error');
        } finally {
          isSubmittingResult = false;
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origBtnHTML;
          }
        }
      });
    }

    window.FiestaAdmin.openResultModalWithPrefill = openResultModal;
  }

  // --- VIDEOS MANAGER ---
  function setupVideosManager() {
    const modalVideo = document.getElementById('modal-video-editor');
    const btnOpenVideo = document.getElementById('btn-open-add-video-modal');
    const btnCloseVideo = document.getElementById('btn-close-video-modal');
    const formVideo = document.getElementById('form-video-editor');

    // PC Video Elements
    const dropzoneVideo = document.getElementById('vid-upload-box');
    const btnBrowseVid = document.getElementById('btn-browse-vid-pc');
    const fileVideoInput = document.getElementById('vid-pc-file');
    const vidPrompt = document.getElementById('vid-upload-prompt');
    const vidSelectedInfo = document.getElementById('vid-selected-info');
    const vidFileName = document.getElementById('vid-file-name');
    const vidFileSize = document.getElementById('vid-file-size');
    const btnRemoveVid = document.getElementById('btn-remove-vid-file');
    const vidUrlInput = document.getElementById('vid-url');
    const vidTitleInput = document.getElementById('vid-title');

    // Thumbnail Elements
    const btnBrowseThumb = document.getElementById('btn-browse-vid-thumb');
    const fileThumbInput = document.getElementById('vid-thumb-pc-file');
    const thumbTextInput = document.getElementById('vid-thumb');
    const thumbPreviewWrap = document.getElementById('vid-thumb-preview-wrap');
    const thumbPreviewImg = document.getElementById('vid-thumb-preview');

    // Progress Elements
    const progressContainer = document.getElementById('vid-upload-progress-container');
    const progressPercent = document.getElementById('vid-upload-percent');
    const progressBar = document.getElementById('vid-upload-progress-bar');
    const btnSubmitVideo = document.getElementById('btn-submit-video');

    let stagedVideoFile = null;
    let isUploadingVideo = false;

    function resetVideoForm() {
      if (formVideo) formVideo.reset();
      stagedVideoFile = null;
      if (fileVideoInput) fileVideoInput.value = '';
      if (fileThumbInput) fileThumbInput.value = '';
      if (vidPrompt) vidPrompt.style.display = 'block';
      if (vidSelectedInfo) vidSelectedInfo.style.display = 'none';
      if (vidUrlInput) {
        vidUrlInput.value = '';
        vidUrlInput.placeholder = 'Or enter Video URL (https://... / YouTube / Embed)';
        vidUrlInput.removeAttribute('disabled');
      }
      if (thumbPreviewWrap) thumbPreviewWrap.style.display = 'none';
      if (thumbPreviewImg) thumbPreviewImg.src = '';
      if (progressContainer) progressContainer.style.display = 'none';
      if (progressBar) progressBar.style.width = '0%';
      if (progressPercent) progressPercent.textContent = '0%';
      if (btnSubmitVideo) {
        btnSubmitVideo.disabled = false;
        btnSubmitVideo.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Video Highlight';
      }
    }

    if (btnOpenVideo && modalVideo) {
      btnOpenVideo.addEventListener('click', () => {
        resetVideoForm();
        modalVideo.classList.add('open');
      });
    }

    if (btnCloseVideo && modalVideo) {
      btnCloseVideo.addEventListener('click', () => {
        if (isUploadingVideo) {
          if (!confirm('A video upload is currently in progress. Are you sure you want to cancel?')) return;
        }
        modalVideo.classList.remove('open');
        resetVideoForm();
      });
    }

    function formatFileSize(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
    }

    // Auto-capture thumbnail frame from local video file & upload as image
    function autoCaptureThumbnail(file) {
      if (!file) return;
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        const objUrl = URL.createObjectURL(file);
        video.src = objUrl;

        video.addEventListener('loadeddata', () => {
          video.currentTime = Math.min(1.0, (video.duration || 2) / 2);
        });

        video.addEventListener('seeked', () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(640, video.videoWidth || 640);
            canvas.height = Math.min(360, video.videoHeight || 360);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objUrl);

            canvas.toBlob(async (blob) => {
              if (blob) {
                const thumbFile = new File([blob], `thumb_${Date.now()}.jpg`, { type: 'image/jpeg' });
                try {
                  const uploadRes = await window.FiestaAPI.uploadImageFile(thumbFile);
                  if (uploadRes.success && uploadRes.url) {
                    if (thumbTextInput && (!thumbTextInput.value.trim() || thumbTextInput.value.startsWith('data:'))) {
                      thumbTextInput.value = uploadRes.url;
                      if (thumbPreviewImg && thumbPreviewWrap) {
                        thumbPreviewImg.src = uploadRes.url;
                        thumbPreviewWrap.style.display = 'block';
                      }
                    }
                  }
                } catch (e) {
                  console.warn('Auto thumb upload fallback:', e);
                }
              }
            }, 'image/jpeg', 0.85);
          } catch (e) {
            console.warn('Canvas video thumb extract fallback:', e);
          }
        });
      } catch (err) {
        console.warn('Auto video thumb capture error:', err);
      }
    }

    function handleSelectedVideoFile(file) {
      if (!file) return;
      const validExts = /\.(mp4|webm|ogg|mov|mkv|avi|m4v|3gp|wmv|quicktime|flv)$/i;
      if (!file.type.startsWith('video/') && !file.name.match(validExts)) {
        window.showToast('Please select a valid video file (MP4, MOV, WebM, MKV, AVI)', 'warning');
        return;
      }
      if (file.size > 1024 * 1024 * 1024) {
        window.showToast('Video file size exceeds maximum limit of 1GB', 'error');
        return;
      }

      stagedVideoFile = file;
      if (vidPrompt) vidPrompt.style.display = 'none';
      if (vidSelectedInfo) vidSelectedInfo.style.display = 'flex';
      if (vidFileName) vidFileName.textContent = file.name;
      if (vidFileSize) vidFileSize.textContent = formatFileSize(file.size);

      if (vidUrlInput) {
        vidUrlInput.value = `[PC File: ${file.name}]`;
        vidUrlInput.setAttribute('disabled', 'disabled');
      }

      // Auto-suggest title if empty
      if (vidTitleInput && !vidTitleInput.value.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
        vidTitleInput.value = cleanName;
      }

      // Auto-capture frame thumbnail
      autoCaptureThumbnail(file);

      window.showToast(`Selected "${file.name}" (${formatFileSize(file.size)}) for upload!`, 'info');
    }

    if (btnBrowseVid && fileVideoInput) {
      btnBrowseVid.addEventListener('click', (e) => {
        e.stopPropagation();
        fileVideoInput.click();
      });
    }

    if (dropzoneVideo && fileVideoInput) {
      dropzoneVideo.addEventListener('click', (e) => {
        if (e.target.closest('#btn-remove-vid-file') || e.target.closest('#btn-browse-vid-pc')) return;
        if (!stagedVideoFile) fileVideoInput.click();
      });

      dropzoneVideo.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzoneVideo.classList.add('dragover');
        dropzoneVideo.style.borderColor = 'var(--cyan-glow)';
        dropzoneVideo.style.background = 'rgba(0, 240, 255, 0.12)';
      });

      dropzoneVideo.addEventListener('dragleave', () => {
        dropzoneVideo.classList.remove('dragover');
        dropzoneVideo.style.borderColor = 'rgba(0, 240, 255, 0.35)';
        dropzoneVideo.style.background = 'rgba(0, 240, 255, 0.03)';
      });

      dropzoneVideo.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzoneVideo.classList.remove('dragover');
        dropzoneVideo.style.borderColor = 'rgba(0, 240, 255, 0.35)';
        dropzoneVideo.style.background = 'rgba(0, 240, 255, 0.03)';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleSelectedVideoFile(e.dataTransfer.files[0]);
        }
      });

      fileVideoInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleSelectedVideoFile(e.target.files[0]);
        }
      });
    }

    if (btnRemoveVid) {
      btnRemoveVid.addEventListener('click', (e) => {
        e.stopPropagation();
        stagedVideoFile = null;
        if (fileVideoInput) fileVideoInput.value = '';
        if (vidPrompt) vidPrompt.style.display = 'block';
        if (vidSelectedInfo) vidSelectedInfo.style.display = 'none';
        if (vidUrlInput) {
          vidUrlInput.value = '';
          vidUrlInput.removeAttribute('disabled');
        }
      });
    }

    // Thumbnail PC file selection & direct upload
    if (btnBrowseThumb && fileThumbInput) {
      btnBrowseThumb.addEventListener('click', (e) => {
        e.stopPropagation();
        fileThumbInput.click();
      });
    }

    if (fileThumbInput) {
      fileThumbInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          window.showToast('Uploading thumbnail image...', 'info');
          try {
            const uploadRes = await window.FiestaAPI.uploadImageFile(file);
            if (uploadRes.success && uploadRes.url) {
              if (thumbTextInput) thumbTextInput.value = uploadRes.url;
              if (thumbPreviewImg && thumbPreviewWrap) {
                thumbPreviewImg.src = uploadRes.url;
                thumbPreviewWrap.style.display = 'block';
              }
              window.showToast('Thumbnail image uploaded from PC!', 'success');
            } else {
              window.showToast(uploadRes.message || 'Thumbnail upload failed', 'error');
            }
          } catch (err) {
            window.showToast('Thumbnail upload connection error', 'error');
          }
        }
      });
    }

    if (thumbTextInput) {
      thumbTextInput.addEventListener('input', () => {
        const val = thumbTextInput.value.trim();
        if (val && thumbPreviewImg && thumbPreviewWrap) {
          thumbPreviewImg.src = val;
          thumbPreviewWrap.style.display = 'block';
        } else if (thumbPreviewWrap) {
          thumbPreviewWrap.style.display = 'none';
        }
      });
    }

    // Video upload function using FiestaAPI with real percentage progress
    function uploadVideoFile(file) {
      if (progressContainer) progressContainer.style.display = 'block';
      if (progressBar) progressBar.style.width = '0%';
      if (progressPercent) progressPercent.textContent = '0%';

      return window.FiestaAPI.uploadVideoFile(file, (percent) => {
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${percent}%`;
      });
    }

    // Form submission handler
    if (formVideo) {
      formVideo.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isUploadingVideo) return;

        const title = vidTitleInput ? vidTitleInput.value.trim() : '';
        const category = document.getElementById('vid-category')?.value || 'General';
        const description = document.getElementById('vid-desc')?.value.trim() || '';
        let thumbnail = thumbTextInput ? thumbTextInput.value.trim() : '';
        if (!thumbnail) {
          thumbnail = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800';
        }

        let videoUrl = vidUrlInput ? vidUrlInput.value.trim() : '';

        if (!stagedVideoFile && (!videoUrl || videoUrl.startsWith('[PC File:'))) {
          window.showToast('Please either select a video file from your PC or enter a video URL', 'warning');
          return;
        }

        isUploadingVideo = true;
        if (btnSubmitVideo) {
          btnSubmitVideo.disabled = true;
          btnSubmitVideo.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading & Saving...';
        }

        try {
          if (stagedVideoFile) {
            window.showToast(`Uploading video "${stagedVideoFile.name}" (${formatFileSize(stagedVideoFile.size)})...`, 'info');
            const uploadRes = await uploadVideoFile(stagedVideoFile);
            if (!uploadRes.success || !uploadRes.url) {
              throw new Error(uploadRes.message || 'Failed to upload video file');
            }
            videoUrl = uploadRes.url;
          }

          const payload = {
            title,
            category,
            thumbnail,
            url: videoUrl,
            description
          };

          const res = await fetch('/api/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            await window.FiestaAPI.fetchState();
            modalVideo.classList.remove('open');
            resetVideoForm();
            window.showToast('Video highlight uploaded and saved to festival gallery!', 'success');
          } else {
            throw new Error(data.message || 'Failed to save video highlight');
          }
        } catch (err) {
          console.error('Video save error:', err);
          window.showToast(err.message || 'Failed to upload and save video', 'error');
        } finally {
          isUploadingVideo = false;
          if (btnSubmitVideo) {
            btnSubmitVideo.disabled = false;
            btnSubmitVideo.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Video Highlight';
          }
        }
      });
    }
  }

  // --- GALLERY & BULK PC UPLOAD ---
  function setupGalleryPCUpload() {
    const fileInput = document.getElementById('pc-gallery-file-input');
    const btnBrowse = document.getElementById('btn-browse-pc-gallery');
    const dropzone = document.getElementById('pc-gallery-dropzone');
    const catSelect = document.getElementById('bulk-default-category');

    let isUploadingGallery = false;

    if (btnBrowse && fileInput) {
      btnBrowse.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target !== fileInput && !e.target.closest('#btn-browse-pc-gallery')) {
          fileInput.click();
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handlePCImagesUpload(Array.from(e.dataTransfer.files));
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handlePCImagesUpload(Array.from(e.target.files));
        }
      });
    }

    async function handlePCImagesUpload(files) {
      if (isUploadingGallery) return;
      const imageFiles = files.filter(f => f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|gif|svg|bmp|avif|heic|heif)$/i));
      if (imageFiles.length === 0) {
        window.showToast('Please select valid image files (JPG, PNG, WebP, etc.)', 'warning');
        return;
      }

      isUploadingGallery = true;
      window.showToast(`Uploading ${imageFiles.length} photos directly from PC...`, 'info');

      try {
        const selectedCat = catSelect ? catSelect.value : 'A-Zone';
        const res = await window.FiestaAPI.uploadGalleryFiles(imageFiles, selectedCat);
        if (res.success) {
          window.showToast(`Successfully uploaded ${res.count} photos to the Fiesta Gallery!`, 'success');
          if (fileInput) fileInput.value = '';
        } else {
          window.showToast(res.message || 'Failed to upload PC images', 'error');
        }
      } catch (err) {
        console.error('Gallery PC upload error:', err);
        window.showToast('Failed to upload PC images. Please check your connection.', 'error');
      } finally {
        isUploadingGallery = false;
        if (fileInput) fileInput.value = '';
      }
    }
  }

  // --- BULK EXCEL PARTICIPANTS ---
  function setupExcelImporter() {
    const dropzone = document.getElementById('excel-dropzone');
    const fileInput = document.getElementById('excel-file-input');
    const btnBrowse = document.getElementById('btn-browse-excel');
    const previewBox = document.getElementById('excel-preview-box');
    const previewTbody = document.getElementById('excel-preview-tbody');
    const previewRowCount = document.getElementById('preview-row-count');
    const btnConfirmImport = document.getElementById('btn-confirm-excel-import');
    const btnCancelImport = document.getElementById('btn-cancel-excel-import');
    const chkOverwrite = document.getElementById('chk-overwrite-participants');

    if (btnBrowse && fileInput) {
      btnBrowse.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleExcelFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleExcelFile(e.target.files[0]);
        }
      });
    }

    function handleExcelFile(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (!jsonData || jsonData.length === 0) {
            window.showToast('No participant rows found in the selected file', 'warning');
            return;
          }

          stagedExcelParticipants = jsonData.map((row) => {
            return {
              name: String(row.Name || row.Participant || row.StudentName || '').trim(),
              team: normalizeTeam(String(row.Team || row.House || 'Bukhara').trim()),
              category: normalizeCategory(String(row.Category || row.Zone || 'A-Zone').trim()),
              class: String(row.Class || row.Grade || '')
            };
          }).filter(p => p.name);

          if (stagedExcelParticipants.length === 0) {
            window.showToast('No valid participant names found in the sheet columns', 'error');
            return;
          }

          if (previewRowCount) previewRowCount.textContent = stagedExcelParticipants.length;
          if (previewTbody) {
            previewTbody.innerHTML = stagedExcelParticipants.map(p => `
              <tr>
                <td><strong>${escapeHTML(p.name)}</strong></td>
                <td><span class="winner-team-badge team-badge-${p.team.toLowerCase()}">${escapeHTML(p.team)}</span></td>
                <td><span class="badge-zone">${escapeHTML(p.category)}</span></td>
                <td>${escapeHTML(p.class || '-')}</td>
              </tr>
            `).join('');
          }

          if (previewBox) previewBox.classList.remove('hidden');
          window.showToast(`Loaded ${stagedExcelParticipants.length} participants for preview`, 'success');
        } catch (err) {
          window.showToast('Failed to parse Excel file', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }

    if (btnConfirmImport) {
      btnConfirmImport.addEventListener('click', async () => {
        if (stagedExcelParticipants.length === 0) return;
        const overwrite = chkOverwrite ? chkOverwrite.checked : false;

        const res = await window.FiestaAPI.importBulkParticipants(stagedExcelParticipants, overwrite);
        if (res.success) {
          window.showToast(`Imported ${res.count} participants permanently!`, 'success');
          stagedExcelParticipants = [];
          if (previewBox) previewBox.classList.add('hidden');
          if (fileInput) fileInput.value = '';
        }
      });
    }

    if (btnCancelImport) {
      btnCancelImport.addEventListener('click', () => {
        stagedExcelParticipants = [];
        if (previewBox) previewBox.classList.add('hidden');
        if (fileInput) fileInput.value = '';
      });
    }

    const btnSingle = document.getElementById('btn-open-single-participant-modal');
    const modalPart = document.getElementById('modal-participant-form');
    const btnClosePart = document.getElementById('btn-close-participant-modal');
    const formPart = document.getElementById('form-single-participant');

    if (btnSingle && modalPart) {
      btnSingle.addEventListener('click', () => {
        if (formPart) formPart.reset();
        modalPart.classList.add('open');
      });
    }

    if (btnClosePart && modalPart) {
      btnClosePart.addEventListener('click', () => modalPart.classList.remove('open'));
    }

    let isSubmittingPart = false;
    if (formPart) {
      formPart.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmittingPart) return;

        const name = document.getElementById('part-name-input').value.trim();
        const team = document.getElementById('part-team-input').value;
        const category = document.getElementById('part-category-input').value;

        const btnSubmit = formPart.querySelector('button[type="submit"]');
        const origBtnHTML = btnSubmit ? btnSubmit.innerHTML : '';

        isSubmittingPart = true;
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        }

        try {
          const res = await window.FiestaAPI.addSingleParticipant({
            name: name,
            team: team,
            category: category
          });

          if (res.success) {
            if (modalPart) modalPart.classList.remove('open');
            formPart.reset();
            window.showToast(`Participant "${name}" registered successfully!`, 'success');
          } else {
            window.showToast(res.message || 'Failed to add participant', 'error');
          }
        } catch (err) {
          window.showToast('Failed to add participant', 'error');
        } finally {
          isSubmittingPart = false;
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origBtnHTML;
          }
        }
      });
    }
  }

  function normalizeTeam(str) {
    const s = (str || '').toLowerCase();
    if (s.includes('bukh')) return 'Bukhara';
    if (s.includes('undu')) return 'Undulus';
    if (s.includes('samar')) return 'Samarkhand';
    if (s.includes('qur')) return 'Qurthuba';
    return 'Bukhara';
  }

  function normalizeCategory(str) {
    const s = (str || '').toUpperCase();
    if (s.includes('GEN')) return 'General';
    if (s.includes('B')) return 'B-Zone';
    if (s.includes('C')) return 'C-Zone';
    return 'A-Zone';
  }

  // --- BULK EXCEL PROGRAMS ---
  function setupProgramsExcelImporter() {
    const dropzone = document.getElementById('excel-programs-dropzone');
    const fileInput = document.getElementById('excel-programs-file-input');
    const btnBrowse = document.getElementById('btn-browse-programs-excel');
    const previewBox = document.getElementById('excel-programs-preview-box');
    const previewTbody = document.getElementById('excel-programs-preview-tbody');
    const previewRowCount = document.getElementById('preview-programs-row-count');
    const btnConfirmImport = document.getElementById('btn-confirm-programs-excel-import');
    const btnCancelImport = document.getElementById('btn-cancel-programs-excel-import');
    const chkOverwrite = document.getElementById('chk-overwrite-programs');

    if (btnBrowse && fileInput) {
      btnBrowse.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleProgramsExcelFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleProgramsExcelFile(e.target.files[0]);
        }
      });
    }

    function handleProgramsExcelFile(file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (!jsonData || jsonData.length === 0) {
            window.showToast('No program rows found in the selected Excel file', 'warning');
            return;
          }

          stagedExcelPrograms = jsonData.map((row) => {
            return {
              name: String(row['Program Name'] || row.ProgramName || row.Name || row.Title || '').trim(),
              category: normalizeCategory(String(row.Category || row.Zone || 'A-Zone').trim()),
              date: String(row.Date || row['Fiesta Date'] || '2026-09-16').trim()
            };
          }).filter(p => Boolean(p.name));

          if (previewRowCount) previewRowCount.textContent = stagedExcelPrograms.length;

          if (previewTbody) {
            previewTbody.innerHTML = stagedExcelPrograms.map(p => `
              <tr>
                <td><strong>${escapeHTML(p.name)}</strong></td>
                <td><span class="badge-zone">${escapeHTML(p.category)}</span></td>
                <td>${escapeHTML(p.date || '-')}</td>
              </tr>
            `).join('');
          }

          if (previewBox) previewBox.classList.remove('hidden');
          window.showToast(`Loaded ${stagedExcelPrograms.length} programs for preview`, 'success');
        } catch (err) {
          window.showToast('Failed to parse Program Excel file', 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }

    if (btnConfirmImport) {
      btnConfirmImport.addEventListener('click', async () => {
        if (stagedExcelPrograms.length === 0) return;
        const overwrite = chkOverwrite ? chkOverwrite.checked : false;

        const res = await fetch('/api/programs/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programs: stagedExcelPrograms, overwrite })
        });
        const data = await res.json();
        if (data.success) {
          await window.FiestaAPI.fetchState();
          window.showToast(`Imported ${data.count} programs permanently!`, 'success');
          stagedExcelPrograms = [];
          if (previewBox) previewBox.classList.add('hidden');
          if (fileInput) fileInput.value = '';
        }
      });
    }

    if (btnCancelImport) {
      btnCancelImport.addEventListener('click', () => {
        stagedExcelPrograms = [];
        if (previewBox) previewBox.classList.add('hidden');
        if (fileInput) fileInput.value = '';
      });
    }
  }

  // --- PROGRAMS & NEWS MANAGERS ---
  function setupProgramsManager() {
    const btnAddProg = document.getElementById('btn-open-add-program-modal');
    const modalProg = document.getElementById('modal-program-form');
    const btnCloseProg = document.getElementById('btn-close-program-modal');
    const formProg = document.getElementById('form-single-program');

    if (btnAddProg && modalProg) {
      btnAddProg.addEventListener('click', () => {
        if (formProg) formProg.reset();
        modalProg.classList.add('open');
      });
    }

    if (btnCloseProg && modalProg) {
      btnCloseProg.addEventListener('click', () => modalProg.classList.remove('open'));
    }

    let isSubmittingProg = false;
    if (formProg) {
      formProg.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmittingProg) return;

        const name = document.getElementById('prog-name-input').value.trim();
        const category = document.getElementById('prog-category-input').value;

        const btnSubmit = formProg.querySelector('button[type="submit"]');
        const origBtnHTML = btnSubmit ? btnSubmit.innerHTML : '';

        isSubmittingProg = true;
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
        }

        try {
          const res = await fetch('/api/programs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, category: normalizeCategory(category) })
          });
          const data = await res.json();
          if (data.success) {
            if (modalProg) modalProg.classList.remove('open');
            formProg.reset();
            await window.FiestaAPI.fetchState();
            window.showToast(`Program "${name}" created successfully!`, 'success');
          } else {
            window.showToast(data.message || 'Failed to create program', 'error');
          }
        } catch (err) {
          window.showToast('Network error creating program', 'error');
        } finally {
          isSubmittingProg = false;
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origBtnHTML;
          }
        }
      });
    }
  }

  function setupNewsManager() {
    const btnAddNews = document.getElementById('btn-open-add-news-modal');
    const modalNews = document.getElementById('modal-news-editor');
    const btnCloseNews = document.getElementById('btn-close-news-modal');
    const formNews = document.getElementById('form-news-editor');
    const btnBrowsePc = document.getElementById('btn-browse-news-pc');
    const fileInputPc = document.getElementById('news-pc-file-input');
    const imgUrlInput = document.getElementById('news-image');
    const previewWrap = document.getElementById('news-image-preview-wrap');
    const previewImg = document.getElementById('news-image-preview');
    const btnBulkDelNews = document.getElementById('btn-bulk-delete-news');
    const btnClearAllNews = document.getElementById('btn-clear-all-news');
    const btnCleanUnuploaded = document.getElementById('btn-clean-unuploaded-news');
    const chkSelectAllNews = document.getElementById('chk-select-all-news');

    if (btnBrowsePc && fileInputPc) {
      btnBrowsePc.addEventListener('click', () => fileInputPc.click());
    }

    if (fileInputPc) {
      fileInputPc.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          window.showToast('Uploading news image from PC...', 'info');
          try {
            const uploadRes = await window.FiestaAPI.uploadImageFile(file);
            if (uploadRes.success && uploadRes.url) {
              if (imgUrlInput) imgUrlInput.value = uploadRes.url;
              if (previewImg) previewImg.src = uploadRes.url;
              if (previewWrap) previewWrap.classList.remove('hidden');
              window.showToast('News image uploaded from PC!', 'success');
            } else {
              window.showToast(uploadRes.message || 'Image upload failed', 'error');
            }
          } catch (err) {
            window.showToast('Image upload failed due to connection error', 'error');
          }
        }
      });
    }

    if (imgUrlInput) {
      imgUrlInput.addEventListener('input', () => {
        const val = imgUrlInput.value.trim();
        if (val && previewImg && previewWrap) {
          previewImg.src = val;
          previewWrap.classList.remove('hidden');
        }
      });
    }

    if (btnAddNews && modalNews) {
      btnAddNews.addEventListener('click', () => {
        if (formNews) formNews.reset();
        const editIdInput = document.getElementById('edit-news-id');
        if (editIdInput) editIdInput.value = '';
        const modalTitle = document.getElementById('news-modal-title');
        if (modalTitle) modalTitle.textContent = 'Post News / Announcement';
        const isPublicChk = document.getElementById('news-is-public');
        if (isPublicChk) isPublicChk.checked = true;
        if (previewWrap) previewWrap.classList.add('hidden');
        modalNews.classList.add('open');
      });
    }
    if (btnCloseNews && modalNews) btnCloseNews.addEventListener('click', () => modalNews.classList.remove('open'));

    // Bulk Delete Selected News
    if (btnBulkDelNews) {
      btnBulkDelNews.addEventListener('click', async () => {
        const ids = Array.from(selectedNewsIds);
        if (ids.length === 0) return;
        if (confirm(`Delete ${ids.length} selected news article(s)?`)) {
          btnBulkDelNews.disabled = true;
          btnBulkDelNews.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
          selectedNewsIds.clear();
          updateNewsSelectionUI();
          await window.FiestaAPI.bulkDeleteNews(ids);
          btnBulkDelNews.disabled = false;
          window.showToast(`Deleted ${ids.length} news article(s)!`, 'success');
        }
      });
    }

    // Delete All News
    if (btnClearAllNews) {
      btnClearAllNews.addEventListener('click', async () => {
        if (confirm("WARNING: Are you sure you want to delete ALL news articles?")) {
          btnClearAllNews.disabled = true;
          selectedNewsIds.clear();
          updateNewsSelectionUI();
          await window.FiestaAPI.bulkDeleteNews([], true);
          btnClearAllNews.disabled = false;
          window.showToast('All news articles deleted!', 'info');
        }
      });
    }

    // Clean Unuploaded & Invalid News
    if (btnCleanUnuploaded) {
      btnCleanUnuploaded.addEventListener('click', async () => {
        btnCleanUnuploaded.disabled = true;
        btnCleanUnuploaded.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cleaning...';
        try {
          const res = await window.FiestaAPI.cleanUnuploadedNews();
          if (res.success) {
            window.showToast(`Cleaned up ${res.removedCount || 0} unuploaded / draft newses.`, 'success');
          } else {
            window.showToast('Clean up completed', 'info');
          }
        } catch (e) {
          window.showToast('Error cleaning unuploaded news', 'error');
        } finally {
          btnCleanUnuploaded.disabled = false;
          btnCleanUnuploaded.innerHTML = '<i class="fa-solid fa-broom"></i> Clean Unuploaded';
        }
      });
    }

    // Select All News Checkbox
    if (chkSelectAllNews) {
      chkSelectAllNews.addEventListener('change', (e) => {
        const state = window.FiestaAPI.getState();
        const news = state.news || [];
        if (e.target.checked) {
          news.forEach(n => selectedNewsIds.add(n.id));
        } else {
          selectedNewsIds.clear();
        }
        updateNewsSelectionUI();
      });
    }

    let isSubmittingNews = false;
    if (formNews) {
      formNews.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmittingNews) return;

        const editId = document.getElementById('edit-news-id')?.value;
        const isPublicChk = document.getElementById('news-is-public');
        const isPublic = isPublicChk ? isPublicChk.checked : true;

        const payload = {
          title: document.getElementById('news-title').value.trim(),
          category: document.getElementById('news-category').value.trim(),
          badge: document.getElementById('news-badge').value.trim() || 'Announcement',
          image: document.getElementById('news-image').value.trim() || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
          summary: document.getElementById('news-summary').value.trim(),
          isUploaded: true,
          isPublic: isPublic,
          isPublished: isPublic
        };

        const btnSubmit = formNews.querySelector('button[type="submit"]');
        const origBtnHTML = btnSubmit ? btnSubmit.innerHTML : '';

        isSubmittingNews = true;
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        }

        try {
          if (editId) {
            await window.FiestaAPI.updateNews(editId, payload);
            window.showToast('News article updated successfully!', 'success');
          } else {
            await window.FiestaAPI.addNews(payload);
            window.showToast('News article published successfully!', 'success');
          }
          modalNews.classList.remove('open');
          formNews.reset();
          if (previewWrap) previewWrap.classList.add('hidden');
        } catch (err) {
          window.showToast('Failed to save news article', 'error');
        } finally {
          isSubmittingNews = false;
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = origBtnHTML;
          }
        }
      });
    }
  }

  // --- NOTIFICATIONS & REPORTS INBOX ---
  function setupNotificationsInbox() {
    const btnTestChime = document.getElementById('btn-test-chime-sound');
    if (btnTestChime) {
      btnTestChime.addEventListener('click', () => {
        playNotificationChime();
        window.showToast('Testing notification alert chime sound', 'info');
      });
    }
  }

  function renderNotifications() {
    const list = document.getElementById('admin-notifications-list');
    const badge = document.getElementById('admin-notif-badge');
    const state = window.FiestaAPI.getState();
    const notifs = state.notifications || [];

    const pendingNotifs = notifs.filter(n => n.status === 'pending');
    const pendingCount = pendingNotifs.length;
    if (badge) badge.textContent = pendingCount;

    // Trigger chime if new pending report arrives while admin panel is open
    if (pendingCount > lastKnownPendingCount && lastKnownPendingCount !== 0) {
      playNotificationChime();
    }
    lastKnownPendingCount = pendingCount;

    if (!list) return;

    if (notifs.length === 0) {
      list.innerHTML = `
        <div class="glass-panel p-6 text-center text-muted" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-bell-slash fa-2x mb-2 text-cyan"></i>
          <h4>No Discrepancy Reports</h4>
          <p>When participants report a result discrepancy, it will appear here with instant solve actions.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = notifs.map(n => {
      const isPending = n.status === 'pending';
      const isResolved = n.status === 'resolved';
      const statusPill = isPending
        ? '<span class="notif-status-badge status-badge-pending"><i class="fa-solid fa-circle-exclamation"></i> Pending Action</span>'
        : (isResolved
          ? '<span class="notif-status-badge status-badge-resolved"><i class="fa-solid fa-circle-check"></i> Solved / Resolved</span>'
          : '<span class="notif-status-badge status-badge-ignored"><i class="fa-solid fa-ban"></i> Ignored</span>');

      const programName = escapeHTML(n.programName || n.title || 'Official Result');
      const requester = escapeHTML(n.requesterName || 'Participant');
      const team = escapeHTML(n.requesterTeam || 'General');
      const teamKey = team.toLowerCase();
      const notes = escapeHTML(n.notes || 'No description provided.');
      const timeStr = formatTimeAgo(n.timestamp);

      return `
        <div class="notif-card status-${n.status || 'pending'}">
          <div class="notif-card-header">
            <div class="flex-row-gap align-center" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span class="notif-type-tag type-report"><i class="fa-solid fa-triangle-exclamation"></i> DISCREPANCY REPORT</span>
              ${statusPill}
            </div>
            <span class="notif-time"><i class="fa-regular fa-clock"></i> ${timeStr}</span>
          </div>

          <h4 class="notif-title mt-2 mb-2" style="font-size: 1.15rem; font-weight: 800; color: #ffffff;">${programName}</h4>

          <div class="notif-requester-info mb-2" style="font-size: 0.88rem; color: var(--ice-blue);">
            <i class="fa-solid fa-user-circle text-cyan"></i> Reported by: <strong>${requester}</strong>
            <span class="winner-team-badge team-badge-${teamKey} ml-1">${team}</span>
          </div>

          <div class="notif-notes-box">
            <strong style="color: #ffffff;"><i class="fa-solid fa-comment-dots text-gold"></i> Issue Note:</strong>
            <p class="mt-1 m-0" style="color: #cbd5e1; font-size: 0.9rem;">${notes}</p>
          </div>

          <div class="notif-actions-row mt-3" style="display: flex; align-items: center; justify-content: flex-end; gap: 0.6rem; border-top: 1px solid var(--border-glass-subtle); padding-top: 0.85rem; flex-wrap: wrap;">
            ${isPending ? `
              <button type="button" class="btn-notif-solve" onclick="window.FiestaAdmin.solveReport('${n.id}', '${n.resultId || ''}', '${programName.replace(/'/g, "\\'")}')" title="Solve this report and open Result Editor">
                <i class="fa-solid fa-wrench"></i> Solve &amp; Edit Result
              </button>
            ` : `
              <span class="text-success font-weight-bold mr-auto" style="font-size: 0.85rem; color: #34d399;">
                <i class="fa-solid fa-check-double"></i> Resolved
              </span>
            `}
            <button type="button" class="btn-notif-ignore" onclick="window.FiestaAdmin.handleNotifAction('${n.id}', 'ignore')">
              ${n.status === 'ignored' ? 'Un-ignore' : 'Ignore'}
            </button>
            <button type="button" class="btn-notif-ignore text-ruby" onclick="window.FiestaAdmin.handleNotifAction('${n.id}', 'delete')" title="Delete Report">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function solveReport(notifId, resultId, progName) {
    try {
      // 1. Mark notification as resolved
      await window.FiestaAPI.handleNotificationAction(notifId, 'resolve');

      // 2. Switch to Results Manager Tab
      const tabResults = document.querySelector('.admin-tab[data-tab="tab-results"]');
      if (tabResults) tabResults.click();

      // 3. Find matching result in state
      const state = window.FiestaAPI.getState();
      let targetResult = null;
      if (resultId) {
        targetResult = (state.results || []).find(r => r.id === resultId);
      }
      if (!targetResult && progName) {
        const cleanName = progName.toLowerCase().trim();
        targetResult = (state.results || []).find(r => {
          const rName = (r.programName || '').toLowerCase().trim();
          return rName === cleanName || cleanName.includes(rName) || rName.includes(cleanName);
        });
      }

      // 4. Open Result Editor Modal pre-filled
      if (globalOpenResultModal) {
        if (targetResult) {
          globalOpenResultModal(targetResult);
          window.showToast(`Report marked as Solved. Opened Result Editor for "${targetResult.programName}".`, 'success');
        } else {
          globalOpenResultModal(null, { programName: progName });
          window.showToast(`Report marked as Solved. Opened Result Editor for "${progName}".`, 'info');
        }
      } else {
        window.showToast('Report marked as Solved.', 'success');
      }
    } catch (err) {
      console.error('Solve report error:', err);
      window.showToast('Failed to solve report', 'error');
    }
  }

  async function handleNotifAction(id, action) {
    await window.FiestaAPI.handleNotificationAction(id, action);
    window.showToast('Report updated', 'info');
  }

  function updateAdminBadgesOnly(state) {
    if (!state) return;
    const notifs = state.notifications || [];
    const pendingCount = notifs.filter(n => n.status === 'pending').length;
    const badge = document.getElementById('notif-badge-count');
    const tabBadge = document.getElementById('tab-notif-badge');
    if (badge) {
      badge.textContent = pendingCount;
      badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
    if (tabBadge) {
      tabBadge.textContent = pendingCount;
      tabBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
  }

  // --- RENDER ADMIN TABLES (OPTIMIZED & VIEW-GATED) ---
  function renderAdminData() {
    const state = window.FiestaAPI.getState();
    if (!state) return;

    updateAdminBadgesOnly(state);

    const adminView = document.getElementById('admin-view');
    if (!adminView || !adminView.classList.contains('active-view')) {
      return;
    }

    // 1. Live stream config inputs
    if (state.settings?.liveStream) {
      const s = state.settings.liveStream;
      const titleInp = document.getElementById('cfg-stream-title');
      const statusInp = document.getElementById('cfg-stream-status');
      const urlInp = document.getElementById('cfg-stream-url');
      const descInp = document.getElementById('cfg-stream-desc');

      if (titleInp && !titleInp.value) titleInp.value = s.title || '';
      if (statusInp) statusInp.value = s.status || 'LIVE NOW';
      if (urlInp && !urlInp.value) urlInp.value = s.embedUrl || '';
      if (descInp && !descInp.value) descInp.value = s.description || '';
    }

    // 2. Sync Visibility & Cutoff Settings
    const toggleScore = document.getElementById('toggle-show-team-scores');
    const scorePill = document.getElementById('team-scores-status-pill');
    const inputCutoff = document.getElementById('input-max-result-number');
    const cutoffText = document.getElementById('current-cutoff-text');

    const isScoresVisible = state.settings?.showTeamScores !== false;
    if (toggleScore) toggleScore.checked = isScoresVisible;
    if (scorePill) {
      if (isScoresVisible) {
        scorePill.className = 'visibility-status-pill pill-active';
        scorePill.innerHTML = '<i class="fa-solid fa-eye"></i> Scores Visible';
      } else {
        scorePill.className = 'visibility-status-pill pill-hidden';
        scorePill.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Scores Concealed';
      }
    }

    const maxCutoff = state.settings?.maxVisibleResultNumber;
    if (inputCutoff && document.activeElement !== inputCutoff) {
      inputCutoff.value = (maxCutoff !== null && maxCutoff !== undefined) ? maxCutoff : '';
    }
    const inputInterval = document.getElementById('input-standings-interval');
    const curInterval = (state.settings?.standingsSlideInterval !== undefined && state.settings.standingsSlideInterval !== null)
      ? Number(state.settings.standingsSlideInterval)
      : 3;
    if (inputInterval && document.activeElement !== inputInterval) {
      inputInterval.value = curInterval;
    }

    if (cutoffText) {
      const intervalNote = curInterval > 0
        ? `• Team Points slide shows after every ${curInterval} results in slideshow.`
        : `• Automatic Team Points slide is disabled in slideshow.`;

      if (maxCutoff !== null && maxCutoff !== undefined && maxCutoff !== '') {
        cutoffText.innerHTML = `<strong>Active Cutoff:</strong> Team overview standings calculated up to Result <strong>#${maxCutoff}</strong> ${intervalNote}`;
      } else {
        cutoffText.textContent = `Team overview points currently reflect all ${state.results?.length || 0} published results ${intervalNote}`;
      }
    }

    // 3. Results Table (with Result #, Selection Checkboxes, and Team Score status)
    const resBody = document.getElementById('admin-results-table-body');
    if (resBody) {
      const results = (state.results || []).slice().sort((a, b) => (Number(b.resultNumber) || 0) - (Number(a.resultNumber) || 0));
      if (results.length === 0) {
        resBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted p-4">No results published yet.</td></tr>';
      } else {
        resBody.innerHTML = results.map(r => {
          const winners = window.FiestaResults?.getNormalizedWinners
            ? window.FiestaResults.getNormalizedWinners(r)
            : (r.winners || []);

          const totalPts = winners.reduce((sum, w) => sum + (Number(w.points) || 0), 0);

          const winnersSummary = winners.map(w => `
            <span class="winner-team-badge team-badge-${(w.team || '').toLowerCase()} mr-1">
              ${w.position}: ${escapeHTML(w.participantName)} (${w.team} - ${w.points}pts)
            </span>
          `).join(' ');

          const resNum = r.resultNumber || 1;
          const isPublic = r.isPublic !== false;
          const isIncludedInTeamScore = (maxCutoff !== null && maxCutoff !== undefined && maxCutoff !== '')
            ? (Number(resNum) <= Number(maxCutoff))
            : true;

          const toggleButtonHTML = isPublic
            ? `<button type="button" class="btn-status-toggle status-live-pill" onclick="window.FiestaAdmin.toggleResultVisibility('${r.id}')" title="Click to Hide this result from Public Results Hub & Slideshow">
                <i class="fa-solid fa-eye text-cyan"></i> Shown
               </button>`
            : `<button type="button" class="btn-status-toggle status-hidden-pill" onclick="window.FiestaAdmin.toggleResultVisibility('${r.id}')" title="Click to Show this result on Public Results Hub & Slideshow">
                <i class="fa-solid fa-eye-slash text-ruby"></i> Hidden
               </button>`;

          const teamScorePill = isIncludedInTeamScore
            ? `<span class="badge-team-score-in" title="Included in Leaderboard Standings"><i class="fa-solid fa-chart-line text-cyan"></i> In Standings</span>`
            : `<span class="badge-team-score-out" title="Excluded from Leaderboard Standings until cutoff is raised"><i class="fa-solid fa-clock text-gold"></i> Cutoff Excluded</span>`;

          return `
            <tr>
              <td style="text-align: center;">
                <input type="checkbox" class="chk-result-item" data-id="${r.id}" ${selectedResultIds.has(r.id) ? 'checked' : ''}>
              </td>
              <td style="text-align: center;"><span class="badge-result-num">#${String(resNum).padStart(2, '0')}</span></td>
              <td><strong>${escapeHTML(r.programCode || '-')}</strong></td>
              <td>${escapeHTML(r.programName || '-')}</td>
              <td><span class="badge-zone">${escapeHTML(r.category || '-')}</span></td>
              <td>${winnersSummary}</td>
              <td><strong>${totalPts} pts</strong></td>
              <td>
                <div class="result-status-stack">
                  ${toggleButtonHTML}
                  ${teamScorePill}
                </div>
              </td>
              <td style="text-align: center;">
                <button class="btn-sm-action" onclick="window.FiestaAdmin.editResultPrompt('${r.id}')" title="Edit Result & Number">
                  <i class="fa-solid fa-pen-to-square text-cyan"></i>
                </button>
                <button class="btn-sm-action ml-1" onclick="window.FiestaAdmin.deleteResultPrompt('${r.id}')" title="Delete Result">
                  <i class="fa-solid fa-trash text-ruby"></i>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }

      attachResultCheckboxEvents();
    }

    // 4. Participants Roster with Bulk Selection (NO Class Column)
    const rosterBody = document.getElementById('admin-roster-table-body');
    const rosterTotal = document.getElementById('roster-total-count');
    if (rosterBody) {
      const participants = state.participants || [];
      if (rosterTotal) rosterTotal.textContent = participants.length;

      if (participants.length === 0) {
        rosterBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-4">No participants registered yet.</td></tr>';
      } else {
        rosterBody.innerHTML = participants.map(p => `
          <tr>
            <td style="text-align: center;">
              <input type="checkbox" class="chk-participant-item" data-id="${p.id}" ${selectedParticipantIds.has(p.id) ? 'checked' : ''}>
            </td>
            <td><strong>${escapeHTML(p.name || '-')}</strong></td>
            <td><span class="winner-team-badge team-badge-${(p.team || '').toLowerCase()}">${escapeHTML(p.team || '')}</span></td>
            <td><span class="badge-zone">${escapeHTML(p.category || 'A-Zone')}</span></td>
            <td>
              <button class="btn-sm-action" onclick="window.FiestaAdmin.deleteParticipantPrompt('${p.id}')">
                <i class="fa-solid fa-trash text-ruby"></i>
              </button>
            </td>
          </tr>
        `).join('');
      }

      attachParticipantCheckboxEvents();
    }

    // 5. Videos list
    const vidList = document.getElementById('admin-videos-list');
    if (vidList) {
      const vids = state.videos || [];
      vidList.innerHTML = vids.map(v => `
        <div class="glass-panel p-4 flex-between-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div>
            <strong>${escapeHTML(v.title)}</strong> <span class="badge-zone ml-2">${escapeHTML(v.category)}</span>
            <div class="text-muted" style="font-size: 0.8rem;">${escapeHTML(v.url)}</div>
          </div>
          <button class="btn-sm-action" onclick="window.FiestaAdmin.deleteVideoPrompt('${v.id}')"><i class="fa-solid fa-trash text-ruby"></i></button>
        </div>
      `).join('');
    }

    // 6. Gallery cards with Bulk Selection
    const galGrid = document.getElementById('admin-gallery-cards-grid');
    if (galGrid) {
      const gallery = state.gallery || [];
      if (gallery.length === 0) {
        galGrid.innerHTML = '<p class="text-muted p-4">No gallery photos yet. Use the upload zone above to add photos.</p>';
      } else {
        galGrid.innerHTML = gallery.map(g => `
          <div class="glass-panel p-3" style="position: relative;">
            <input type="checkbox" class="chk-gallery-item" data-id="${g.id}" ${selectedGalleryIds.has(g.id) ? 'checked' : ''} style="position: absolute; top: 12px; left: 12px; transform: scale(1.3); z-index: 5; cursor: pointer;">
            <img src="${escapeHTML(g.image)}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 8px;">
            <div class="mt-2 flex-between-row" style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.82rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${escapeHTML(g.title || 'Capture')}</span>
              <button class="btn-sm-action" onclick="window.FiestaAdmin.deleteGalleryPrompt('${g.id}')"><i class="fa-solid fa-trash text-ruby"></i></button>
            </div>
          </div>
        `).join('');
      }

      attachGalleryCheckboxEvents();
    }

    // 7. Programs Table with Bulk Selection (NO Date Column)
    const progBody = document.getElementById('admin-programs-table-body');
    if (progBody) {
      const progs = state.programs || [];
      if (progs.length === 0) {
        progBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-4">No programs added yet. Use bulk Excel upload or add single program.</td></tr>';
      } else {
        progBody.innerHTML = progs.map(p => `
          <tr>
            <td style="text-align: center;">
              <input type="checkbox" class="chk-program-item" data-id="${p.id}" ${selectedProgramIds.has(p.id) ? 'checked' : ''}>
            </td>
            <td><strong>${escapeHTML(p.name)}</strong></td>
            <td><span class="badge-zone">${escapeHTML(p.category)}</span></td>
            <td><span class="badge-zone">${escapeHTML(p.status || 'Upcoming')}</span></td>
            <td style="text-align: center;">
              <button class="btn-sm-action" onclick="window.FiestaAdmin.deleteProgramPrompt('${p.id}')"><i class="fa-solid fa-trash text-ruby"></i></button>
            </td>
          </tr>
        `).join('');
      }

      attachProgramCheckboxEvents();
    }

    // 8. News Cards with Bulk Selection & Status Toggle
    renderAdminNews(state);

    renderNotifications();
    renderAdminItems(state);
  }

  function renderAdminNews(state) {
    const grid = document.getElementById('admin-news-cards-grid');
    const totalCount = document.getElementById('admin-news-total-count');
    if (!grid) return;

    const news = state.news || [];
    if (totalCount) totalCount.textContent = news.length;

    if (news.length === 0) {
      grid.innerHTML = `
        <div class="glass-panel p-6 text-center text-muted" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-newspaper text-cyan mb-2" style="font-size: 2.2rem; display: block; opacity: 0.85;"></i>
          <h4 style="color: #ffffff; margin: 0.5rem 0 0.25rem 0;">No News Articles Posted</h4>
          <p style="margin: 0; font-size: 0.88rem; color: #94a3b8;">Click "+ Post News Article" to broadcast an official announcement or circular.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = news.map(n => {
      const isPublic = n.isPublic !== false && n.isPublished !== false;
      const isSelected = selectedNewsIds.has(n.id);

      const statusBadge = isPublic
        ? `<button type="button" class="btn-status-toggle status-live-pill" onclick="window.FiestaAdmin.toggleNewsVisibility('${n.id}')" title="Click to Unpublish / Hide this article">
             <i class="fa-solid fa-eye text-cyan"></i> Published
           </button>`
        : `<button type="button" class="btn-status-toggle status-hidden-pill" onclick="window.FiestaAdmin.toggleNewsVisibility('${n.id}')" title="Click to Publish this article to Public">
             <i class="fa-solid fa-eye-slash text-ruby"></i> Hidden Draft
           </button>`;

      return `
        <div class="glass-panel admin-news-card p-3" style="position: relative; display: flex; flex-direction: column; justify-content: space-between;">
          <input type="checkbox" class="chk-news-item" data-id="${n.id}" ${isSelected ? 'checked' : ''} style="position: absolute; top: 12px; left: 12px; transform: scale(1.3); z-index: 5; cursor: pointer;">
          
          <div style="position: relative; width: 100%; height: 140px; border-radius: 8px; overflow: hidden; margin-bottom: 0.75rem; background: rgba(0,0,0,0.4);">
            <img src="${escapeHTML(n.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800')}" style="width: 100%; height: 100%; object-fit: cover;">
            <span class="badge-zone" style="position: absolute; bottom: 8px; right: 8px; font-size: 0.75rem; z-index: 2;">${escapeHTML(n.badge || n.category || 'News')}</span>
          </div>

          <div style="flex: 1; display: flex; flex-direction: column;">
            <div class="flex-between-row mb-1">
              <span class="text-muted" style="font-size: 0.78rem;"><i class="fa-regular fa-calendar text-cyan"></i> ${escapeHTML(n.date || 'Sept 2026')}</span>
              ${statusBadge}
            </div>
            <h4 style="color: #ffffff; font-size: 1rem; font-weight: 700; margin: 0.25rem 0 0.4rem 0; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHTML(n.title)}</h4>
            <p class="text-muted" style="font-size: 0.82rem; margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHTML(n.summary || '')}</p>
          </div>

          <div class="mt-3 flex-between-row" style="border-top: 1px solid var(--border-glass-subtle); padding-top: 0.65rem; gap: 0.5rem;">
            <button type="button" class="btn-ocean-glass btn-sm" onclick="window.FiestaAdmin.editNewsPrompt('${n.id}')" style="flex: 1;">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button type="button" class="btn-danger-glass btn-sm" onclick="window.FiestaAdmin.deleteNewsPrompt('${n.id}')" title="Delete Article">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    attachNewsCheckboxEvents();
    updateNewsSelectionUI();
  }

  // --- WINNING ITEMS & WORKS MANAGER (1ST, 2ND, 3RD PLACES) ---
  function setupItemsManager() {
    const searchInput = document.getElementById('admin-items-search');
    const catFilter = document.getElementById('admin-items-category-filter');
    const statusFilter = document.getElementById('admin-items-status-filter');
    const btnBulkDelete = document.getElementById('btn-bulk-delete-items');
    const modalUploader = document.getElementById('modal-item-uploader');
    const btnCloseUploader = document.getElementById('btn-close-item-uploader');
    const btnCancelUploader = document.getElementById('btn-cancel-item-uploader');
    const formUploader = document.getElementById('form-item-uploader');
    const btnDeleteCurrent = document.getElementById('btn-delete-current-item');
    const btnPreviewLive = document.getElementById('btn-preview-item-live');

    // Filter events
    if (searchInput) searchInput.addEventListener('input', () => renderAdminItems(window.FiestaAPI.getState()));
    if (catFilter) catFilter.addEventListener('change', () => renderAdminItems(window.FiestaAPI.getState()));
    if (statusFilter) statusFilter.addEventListener('change', () => renderAdminItems(window.FiestaAPI.getState()));

    // Bulk delete items
    if (btnBulkDelete) {
      btnBulkDelete.addEventListener('click', async () => {
        const state = window.FiestaAPI.getState();
        const items = state.items || [];
        if (items.length === 0) {
          window.showToast('No uploaded items to delete.', 'info');
          return;
        }
        if (confirm(`Are you sure you want to delete all ${items.length} uploaded winning items? This action cannot be undone.`)) {
          await window.FiestaAPI.bulkDeleteItems({ all: true });
          window.showToast('All winning items deleted successfully.', 'info');
        }
      });
    }

    // Modal close & cancel
    const closeUploader = () => {
      if (modalUploader) modalUploader.classList.remove('open');
    };
    if (btnCloseUploader) btnCloseUploader.addEventListener('click', closeUploader);
    if (btnCancelUploader) btnCancelUploader.addEventListener('click', closeUploader);

    // Rich text editor toolbar setup
    setupRichTextEditorToolbar();

    // Type Tabs setup (Text, Image, Video, PDF)
    const typeTabs = document.querySelectorAll('.item-type-tab');
    typeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        typeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const type = tab.dataset.type;
        document.querySelectorAll('.item-type-pane').forEach(p => p.classList.remove('active-pane'));
        const pane = document.getElementById(`pane-item-${type}`);
        if (pane) pane.classList.add('active-pane');
        document.getElementById('item-uploaded-media-type').value = type;
      });
    });

    // File Upload Handlers (Photo, Video, PDF)
    setupItemFileUploads();

    // Form Submit
    if (formUploader) {
      formUploader.addEventListener('submit', async (e) => {
        e.preventDefault();
        const resultId = document.getElementById('item-result-id').value;
        const resultNum = document.getElementById('item-result-num').value;
        const programName = document.getElementById('item-program-name').value;
        const category = document.getElementById('item-category').value;
        const place = document.getElementById('item-place').value;
        const participantName = document.getElementById('item-participant-name').value;
        const team = document.getElementById('item-team').value;
        const existingId = document.getElementById('item-existing-id').value;
        const subject = document.getElementById('item-subject-input').value.trim();
        const mediaType = document.getElementById('item-uploaded-media-type').value || 'text';
        const mediaUrl = document.getElementById('item-uploaded-media-url').value;
        const originalName = document.getElementById('item-uploaded-original-name').value;
        const textContent = document.getElementById('item-rich-text-editor').innerHTML;

        if (!subject) {
          window.showToast('Please enter a subject / title for the work', 'error');
          return;
        }

        const payload = {
          id: existingId || undefined,
          resultId,
          resultNumber: Number(resultNum) || undefined,
          programName,
          category,
          place,
          participantName,
          team,
          subject,
          textContent,
          mediaType,
          mediaUrl,
          originalName
        };

        try {
          const res = await window.FiestaAPI.saveItem(payload);
          if (res.success) {
            window.showToast(`Item for ${place} place published successfully!`, 'success');
            closeUploader();
          } else {
            window.showToast(res.message || 'Failed to save item', 'error');
          }
        } catch (err) {
          window.showToast('Failed to save item connection error', 'error');
        }
      });
    }

    // Delete current item
    if (btnDeleteCurrent) {
      btnDeleteCurrent.addEventListener('click', async () => {
        const id = document.getElementById('item-existing-id').value;
        if (id && confirm('Delete this uploaded work?')) {
          await window.FiestaAPI.deleteItem(id);
          window.showToast('Item deleted successfully', 'info');
          closeUploader();
        }
      });
    }

    // Live preview from uploader
    if (btnPreviewLive) {
      btnPreviewLive.addEventListener('click', () => {
        const place = document.getElementById('item-place').value;
        const programName = document.getElementById('item-program-name').value;
        const category = document.getElementById('item-category').value;
        const participantName = document.getElementById('item-participant-name').value;
        const team = document.getElementById('item-team').value;
        const subject = document.getElementById('item-subject-input').value || 'Preview of Winning Work';
        const mediaType = document.getElementById('item-uploaded-media-type').value || 'text';
        const mediaUrl = document.getElementById('item-uploaded-media-url').value;
        const textContent = document.getElementById('item-rich-text-editor').innerHTML;

        if (window.FiestaApp && window.FiestaApp.openItemPreviewModal) {
          window.FiestaApp.openItemPreviewModal({
            place,
            programName,
            category,
            participantName,
            team,
            subject,
            mediaType,
            mediaUrl,
            textContent
          });
        }
      });
    }
  }

  function setupRichTextEditorToolbar() {
    const editor = document.getElementById('item-rich-text-editor');
    const toolBtns = document.querySelectorAll('.rich-tool-btn');
    const headingSelect = document.getElementById('rich-heading-select');
    const sizeSelect = document.getElementById('rich-size-select');
    const colorDots = document.querySelectorAll('.color-dot');

    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const val = btn.dataset.val || null;
        if (action) {
          document.execCommand(action, false, val);
          if (editor) editor.focus();
        }
      });
    });

    if (headingSelect) {
      headingSelect.addEventListener('change', (e) => {
        const tag = e.target.value;
        if (tag === 'p') {
          document.execCommand('formatBlock', false, '<p>');
        } else {
          document.execCommand('formatBlock', false, `<${tag}>`);
        }
        if (editor) editor.focus();
      });
    }

    if (sizeSelect) {
      sizeSelect.addEventListener('change', (e) => {
        const size = e.target.value;
        document.execCommand('fontSize', false, size);
        if (editor) editor.focus();
      });
    }

    colorDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const color = dot.dataset.color;
        document.execCommand('foreColor', false, color);
        if (editor) editor.focus();
      });
    });
  }

  function setupItemFileUploads() {
    // 1. Photo
    const inputPhoto = document.getElementById('input-item-photo');
    const btnBrowsePhoto = document.getElementById('btn-browse-photo');
    const dropzonePhoto = document.getElementById('dropzone-item-photo');
    const wrapPhoto = document.getElementById('item-photo-preview-wrap');
    const imgPhoto = document.getElementById('item-photo-preview-img');
    const namePhoto = document.getElementById('item-photo-name');
    const btnRemovePhoto = document.getElementById('btn-remove-photo');

    if (btnBrowsePhoto && inputPhoto) {
      btnBrowsePhoto.addEventListener('click', () => inputPhoto.click());
    }
    if (inputPhoto) {
      inputPhoto.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          await handleItemUpload(e.target.files[0], 'image');
        }
      });
    }
    if (dropzonePhoto) {
      dropzonePhoto.addEventListener('dragover', (e) => { e.preventDefault(); dropzonePhoto.classList.add('dragover'); });
      dropzonePhoto.addEventListener('dragleave', () => dropzonePhoto.classList.remove('dragover'));
      dropzonePhoto.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzonePhoto.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          await handleItemUpload(e.dataTransfer.files[0], 'image');
        }
      });
    }
    if (btnRemovePhoto) {
      btnRemovePhoto.addEventListener('click', () => {
        document.getElementById('item-uploaded-media-url').value = '';
        if (wrapPhoto) wrapPhoto.classList.add('hidden');
        if (inputPhoto) inputPhoto.value = '';
      });
    }

    // 2. Video
    const inputVideo = document.getElementById('input-item-video');
    const btnBrowseVideo = document.getElementById('btn-browse-video');
    const dropzoneVideo = document.getElementById('dropzone-item-video');
    const wrapVideo = document.getElementById('item-video-preview-wrap');
    const playerVideo = document.getElementById('item-video-preview-player');
    const nameVideo = document.getElementById('item-video-name');
    const btnRemoveVideo = document.getElementById('btn-remove-video');

    if (btnBrowseVideo && inputVideo) {
      btnBrowseVideo.addEventListener('click', () => inputVideo.click());
    }
    if (inputVideo) {
      inputVideo.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          await handleItemUpload(e.target.files[0], 'video');
        }
      });
    }
    if (dropzoneVideo) {
      dropzoneVideo.addEventListener('dragover', (e) => { e.preventDefault(); dropzoneVideo.classList.add('dragover'); });
      dropzoneVideo.addEventListener('dragleave', () => dropzoneVideo.classList.remove('dragover'));
      dropzoneVideo.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzoneVideo.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          await handleItemUpload(e.dataTransfer.files[0], 'video');
        }
      });
    }
    if (btnRemoveVideo) {
      btnRemoveVideo.addEventListener('click', () => {
        document.getElementById('item-uploaded-media-url').value = '';
        if (wrapVideo) wrapVideo.classList.add('hidden');
        if (inputVideo) inputVideo.value = '';
      });
    }

    // 3. PDF
    const inputPdf = document.getElementById('input-item-pdf');
    const btnBrowsePdf = document.getElementById('btn-browse-pdf');
    const dropzonePdf = document.getElementById('dropzone-item-pdf');
    const wrapPdf = document.getElementById('item-pdf-preview-wrap');
    const namePdf = document.getElementById('item-pdf-name');
    const btnRemovePdf = document.getElementById('btn-remove-pdf');

    if (btnBrowsePdf && inputPdf) {
      btnBrowsePdf.addEventListener('click', () => inputPdf.click());
    }
    if (inputPdf) {
      inputPdf.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          await handleItemUpload(e.target.files[0], 'pdf');
        }
      });
    }
    if (dropzonePdf) {
      dropzonePdf.addEventListener('dragover', (e) => { e.preventDefault(); dropzonePdf.classList.add('dragover'); });
      dropzonePdf.addEventListener('dragleave', () => dropzonePdf.classList.remove('dragover'));
      dropzonePdf.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzonePdf.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          await handleItemUpload(e.dataTransfer.files[0], 'pdf');
        }
      });
    }
    if (btnRemovePdf) {
      btnRemovePdf.addEventListener('click', () => {
        document.getElementById('item-uploaded-media-url').value = '';
        if (wrapPdf) wrapPdf.classList.add('hidden');
        if (inputPdf) inputPdf.value = '';
      });
    }
  }

  async function handleItemUpload(file, expectedType) {
    window.showToast(`Uploading ${file.name}...`, 'info');
    try {
      const res = await window.FiestaAPI.uploadItemFile(file);
      if (res.success && res.url) {
        document.getElementById('item-uploaded-media-url').value = res.url;
        document.getElementById('item-uploaded-media-type').value = res.mediaType || expectedType;
        document.getElementById('item-uploaded-original-name').value = res.originalName || file.name;

        // Display previews
        if (res.mediaType === 'image' || expectedType === 'image') {
          const wrapPhoto = document.getElementById('item-photo-preview-wrap');
          const imgPhoto = document.getElementById('item-photo-preview-img');
          const namePhoto = document.getElementById('item-photo-name');
          if (imgPhoto) imgPhoto.src = res.url;
          if (namePhoto) namePhoto.textContent = res.originalName || file.name;
          if (wrapPhoto) wrapPhoto.classList.remove('hidden');
        } else if (res.mediaType === 'video' || expectedType === 'video') {
          const wrapVideo = document.getElementById('item-video-preview-wrap');
          const playerVideo = document.getElementById('item-video-preview-player');
          const nameVideo = document.getElementById('item-video-name');
          if (playerVideo) playerVideo.src = res.url;
          if (nameVideo) nameVideo.textContent = res.originalName || file.name;
          if (wrapVideo) wrapVideo.classList.remove('hidden');
        } else if (res.mediaType === 'pdf' || expectedType === 'pdf') {
          const wrapPdf = document.getElementById('item-pdf-preview-wrap');
          const namePdf = document.getElementById('item-pdf-name');
          if (namePdf) namePdf.textContent = res.originalName || file.name;
          if (wrapPdf) wrapPdf.classList.remove('hidden');
        }

        window.showToast(`${file.name} uploaded successfully!`, 'success');
      } else {
        window.showToast(res.message || 'File upload failed', 'error');
      }
    } catch (err) {
      window.showToast('Upload failed due to connection error', 'error');
    }
  }

  function openItemUploader(resultId, place, participantName, team) {
    const state = window.FiestaAPI.getState();
    const result = (state.results || []).find(r => r.id === resultId);
    if (!result) return;

    const modal = document.getElementById('modal-item-uploader');
    const existing = (state.items || []).find(it => it.resultId === resultId && it.place === place && (it.participantName === participantName || !participantName));

    // Fill hidden inputs
    document.getElementById('item-result-id').value = result.id;
    document.getElementById('item-result-num').value = result.resultNumber || '';
    document.getElementById('item-program-name').value = result.programName || '';
    document.getElementById('item-category').value = result.category || 'A-Zone';
    document.getElementById('item-place').value = place;
    document.getElementById('item-participant-name').value = participantName || '';
    document.getElementById('item-team').value = team || '';
    document.getElementById('item-existing-id').value = existing ? existing.id : '';

    // Fill banner info
    const placeBadge = document.getElementById('item-context-place');
    const progText = document.getElementById('item-context-prog');
    const catText = document.getElementById('item-context-cat');
    const nameText = document.getElementById('item-context-name');
    const teamText = document.getElementById('item-context-team');

    if (placeBadge) {
      placeBadge.textContent = `${place} Place Winner`;
      placeBadge.className = `item-context-place-badge place-badge-${place.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }
    if (progText) progText.textContent = result.programName || 'Programme';
    if (catText) catText.textContent = result.category || 'A-Zone';
    if (nameText) nameText.textContent = participantName || 'Winner';
    if (teamText) {
      teamText.textContent = team || 'House';
      teamText.className = `item-context-team-pill team-badge-${(team || '').toLowerCase()}`;
    }

    // Reset or populate fields
    const subjectInput = document.getElementById('item-subject-input');
    const richEditor = document.getElementById('item-rich-text-editor');
    const btnDelete = document.getElementById('btn-delete-current-item');

    // Reset upload previews
    document.getElementById('item-photo-preview-wrap')?.classList.add('hidden');
    document.getElementById('item-video-preview-wrap')?.classList.add('hidden');
    document.getElementById('item-pdf-preview-wrap')?.classList.add('hidden');

    if (existing) {
      if (subjectInput) subjectInput.value = existing.subject || '';
      if (richEditor) richEditor.innerHTML = existing.textContent || '';
      document.getElementById('item-uploaded-media-url').value = existing.mediaUrl || '';
      document.getElementById('item-uploaded-media-type').value = existing.mediaType || 'text';
      document.getElementById('item-uploaded-original-name').value = existing.originalName || '';

      // Activate corresponding tab
      const targetType = existing.mediaType || 'text';
      const targetTab = document.querySelector(`.item-type-tab[data-type="${targetType}"]`);
      if (targetTab) targetTab.click();

      // Show existing media preview
      if (existing.mediaUrl) {
        if (existing.mediaType === 'image') {
          const img = document.getElementById('item-photo-preview-img');
          const name = document.getElementById('item-photo-name');
          if (img) img.src = existing.mediaUrl;
          if (name) name.textContent = existing.originalName || 'Uploaded Image';
          document.getElementById('item-photo-preview-wrap')?.classList.remove('hidden');
        } else if (existing.mediaType === 'video') {
          const player = document.getElementById('item-video-preview-player');
          const name = document.getElementById('item-video-name');
          if (player) player.src = existing.mediaUrl;
          if (name) name.textContent = existing.originalName || 'Uploaded Video';
          document.getElementById('item-video-preview-wrap')?.classList.remove('hidden');
        } else if (existing.mediaType === 'pdf') {
          const name = document.getElementById('item-pdf-name');
          if (name) name.textContent = existing.originalName || 'Uploaded PDF Document';
          document.getElementById('item-pdf-preview-wrap')?.classList.remove('hidden');
        }
      }

      if (btnDelete) btnDelete.classList.remove('hidden');
    } else {
      if (subjectInput) subjectInput.value = `${result.programName || 'Fiesta Work'} - ${participantName || 'Creation'}`;
      if (richEditor) richEditor.innerHTML = '';
      document.getElementById('item-uploaded-media-url').value = '';
      document.getElementById('item-uploaded-media-type').value = 'text';
      document.getElementById('item-uploaded-original-name').value = '';

      const firstTab = document.querySelector('.item-type-tab[data-type="text"]');
      if (firstTab) firstTab.click();

      if (btnDelete) btnDelete.classList.add('hidden');
    }

    if (modal) modal.classList.add('open');
  }

  function renderAdminItems(state) {
    const container = document.getElementById('admin-items-results-container');
    if (!container) return;

    const results = state.results || [];
    const items = state.items || [];
    const searchVal = (document.getElementById('admin-items-search')?.value || '').toLowerCase().trim();
    const catVal = document.getElementById('admin-items-category-filter')?.value || 'ALL';
    const statusVal = document.getElementById('admin-items-status-filter')?.value || 'ALL';

    const filtered = results.filter(r => {
      if (catVal !== 'ALL' && r.category !== catVal) return false;
      if (searchVal) {
        const pName = (r.programName || '').toLowerCase();
        const rNum = String(r.resultNumber || '');
        const hasWinnerMatch = (r.winners || []).some(w => (w.participantName || '').toLowerCase().includes(searchVal) || (w.team || '').toLowerCase().includes(searchVal));
        const hasItemMatch = items.some(it => it.resultId === r.id && ((it.subject || '').toLowerCase().includes(searchVal) || (it.participantName || '').toLowerCase().includes(searchVal)));
        if (!pName.includes(searchVal) && !rNum.includes(searchVal) && !hasWinnerMatch && !hasItemMatch) return false;
      }
      if (statusVal === 'HAS_ITEMS') {
        const hasItem = items.some(it => it.resultId === r.id);
        if (!hasItem) return false;
      } else if (statusVal === 'PENDING') {
        const hasItem = items.some(it => it.resultId === r.id);
        if (hasItem) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="glass-panel p-6 text-center text-muted">
          <i class="fa-solid fa-folder-open fa-2x mb-2 text-cyan"></i>
          <h4>No Published Results Found</h4>
          <p>Publish official results first in the Results Manager to upload winning works.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(r => {
      const resNumStr = String(r.resultNumber || '1').padStart(2, '0');
      const category = escapeHTML(r.category || 'A-Zone');
      const progName = escapeHTML(r.programName || 'Championship Event');

      // Get 1st, 2nd, and 3rd place winners
      const winners = (r.winners || []);
      const firstWinners = winners.filter(w => String(w.position || '').toLowerCase().includes('1'));
      const secondWinners = winners.filter(w => String(w.position || '').toLowerCase().includes('2'));
      const thirdWinners = winners.filter(w => String(w.position || '').toLowerCase().includes('3'));

      const firstWinner = firstWinners[0] || { participantName: '1st Place Winner', team: 'Pending' };
      const secondWinner = secondWinners[0] || { participantName: '2nd Place Winner', team: 'Pending' };
      const thirdWinner = thirdWinners[0] || { participantName: '3rd Place Winner', team: 'Pending' };

      const firstItem = items.find(it => it.resultId === r.id && it.place === '1st');
      const secondItem = items.find(it => it.resultId === r.id && it.place === '2nd');
      const thirdItem = items.find(it => it.resultId === r.id && it.place === '3rd');

      const renderSlot = (place, winner, item) => {
        const pName = escapeHTML(winner.participantName || `${place} Winner`);
        const team = escapeHTML(winner.team || '');
        const teamKey = team.toLowerCase();
        const hasItem = !!item;

        let typeBadge = '';
        if (hasItem) {
          if (item.mediaType === 'image') typeBadge = '<span class="item-type-badge badge-image"><i class="fa-solid fa-image"></i> Photo</span>';
          else if (item.mediaType === 'video') typeBadge = '<span class="item-type-badge badge-video"><i class="fa-solid fa-video"></i> Video</span>';
          else if (item.mediaType === 'pdf') typeBadge = '<span class="item-type-badge badge-pdf"><i class="fa-solid fa-file-pdf"></i> PDF</span>';
          else typeBadge = '<span class="item-type-badge badge-text"><i class="fa-solid fa-pen-nib"></i> Poem/Text</span>';
        }

        return `
          <div class="admin-item-slot glass-card ${hasItem ? 'has-uploaded-item' : 'empty-item-slot'}">
            <div class="slot-header">
              <span class="slot-place-pill place-pill-${place.toLowerCase()}">${place}</span>
              ${typeBadge}
            </div>
            <div class="slot-winner-info">
              <strong class="slot-participant">${pName}</strong>
              <span class="slot-team-tag team-badge-${teamKey}">${team}</span>
            </div>
            ${hasItem ? `<div class="slot-subject text-truncate" title="${escapeHTML(item.subject)}"><i class="fa-solid fa-feather-pointed text-cyan"></i> ${escapeHTML(item.subject)}</div>` : ''}
            <div class="slot-actions mt-2">
              <button type="button" class="${hasItem ? 'btn-ocean-glass btn-sm' : 'btn-ocean-primary btn-sm'} w-100" onclick="window.FiestaAdmin.openItemUploader('${r.id}', '${place}', '${escapeHTML(pName).replace(/'/g, "\\'")}', '${escapeHTML(team).replace(/'/g, "\\'")}')">
                ${hasItem ? '<i class="fa-solid fa-pen-to-square"></i> Edit Work' : `<i class="fa-solid fa-plus"></i> Add ${place} Work`}
              </button>
            </div>
          </div>
        `;
      };

      return `
        <div class="admin-result-item-card glass-panel mb-4 p-4">
          <div class="admin-result-item-header flex-between-row mb-3">
            <div class="flex-row-gap align-center">
              <span class="result-number-pill">#${resNumStr}</span>
              <h4 class="admin-res-title m-0">${progName}</h4>
              <span class="badge-zone">${category}</span>
            </div>
            <button class="btn-ocean-glass btn-sm" onclick="window.FiestaPoster.openPosterModal(window.FiestaAPI.getState().results.find(x => x.id === '${r.id}'))">
              <i class="fa-solid fa-wand-magic-sparkles"></i> Poster
            </button>
          </div>
          <div class="admin-slots-3grid">
            ${renderSlot('1st', firstWinner, firstItem)}
            ${renderSlot('2nd', secondWinner, secondItem)}
            ${renderSlot('3rd', thirdWinner, thirdItem)}
          </div>
        </div>
      `;
    }).join('');
  }

  function editResultPrompt(id) {
    const state = window.FiestaAPI.getState();
    const res = (state.results || []).find(r => r.id === id);
    if (res && window.FiestaAdmin.openResultModalWithPrefill) {
      window.FiestaAdmin.openResultModalWithPrefill(res);
    }
  }

  async function toggleResultVisibility(id) {
    try {
      const res = await window.FiestaAPI.toggleResultVisibility(id);
      if (res.success) {
        window.showToast(res.message || 'Result visibility updated', res.isPublic ? 'success' : 'info');
      } else {
        window.showToast(res.message || 'Failed to update visibility', 'error');
      }
    } catch (err) {
      window.showToast('Error updating result visibility', 'error');
    }
  }

  async function deleteResultPrompt(id) {
    if (confirm("Delete this result? House points will recalculate immediately.")) {
      await window.FiestaAPI.deleteResult(id);
      window.showToast('Result deleted and team points recalculated', 'info');
    }
  }

  async function deleteParticipantPrompt(id) {
    if (confirm("Delete this participant?")) {
      await window.FiestaAPI.deleteParticipant(id);
      window.showToast('Participant removed', 'info');
    }
  }

  async function deleteVideoPrompt(id) {
    if (confirm("Delete this video highlight?")) {
      await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      await window.FiestaAPI.fetchState();
      window.showToast('Video removed', 'info');
    }
  }

  async function deleteGalleryPrompt(id) {
    if (confirm("Delete this photo?")) {
      await window.FiestaAPI.deleteGalleryItem(id);
      window.showToast('Photo removed', 'info');
    }
  }

  async function deleteProgramPrompt(id) {
    if (confirm("Delete this program?")) {
      await fetch(`/api/programs/${id}`, { method: 'DELETE' });
      await window.FiestaAPI.fetchState();
      window.showToast('Program removed', 'info');
    }
  }

  function editNewsPrompt(id) {
    const state = window.FiestaAPI.getState();
    const news = (state.news || []).find(n => n.id === id);
    if (!news) return;

    const modalNews = document.getElementById('modal-news-editor');
    const formNews = document.getElementById('form-news-editor');
    if (!modalNews || !formNews) return;

    formNews.reset();
    document.getElementById('edit-news-id').value = news.id;
    const modalTitle = document.getElementById('news-modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit News / Announcement';

    document.getElementById('news-title').value = news.title || '';
    document.getElementById('news-category').value = news.category || '';
    document.getElementById('news-badge').value = news.badge || '';
    document.getElementById('news-image').value = news.image || '';
    document.getElementById('news-summary').value = news.summary || '';

    const isPublicChk = document.getElementById('news-is-public');
    if (isPublicChk) isPublicChk.checked = news.isPublic !== false && news.isPublished !== false;

    const previewWrap = document.getElementById('news-image-preview-wrap');
    const previewImg = document.getElementById('news-image-preview');
    if (news.image && previewImg && previewWrap) {
      previewImg.src = news.image;
      previewWrap.classList.remove('hidden');
    }

    modalNews.classList.add('open');
  }

  async function deleteNewsPrompt(id) {
    if (confirm("Delete this news article?")) {
      await window.FiestaAPI.deleteNews(id);
      window.showToast('News article removed', 'info');
    }
  }

  async function toggleNewsVisibility(id) {
    try {
      const res = await window.FiestaAPI.toggleNewsVisibility(id);
      if (res.success) {
        window.showToast(res.message || 'News visibility updated', res.isPublic ? 'success' : 'info');
      } else {
        window.showToast(res.message || 'Failed to update visibility', 'error');
      }
    } catch (e) {
      window.showToast('Error updating news visibility', 'error');
    }
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const diffSec = Math.floor((new Date() - date) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mins ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hrs ago`;
    return date.toLocaleDateString();
  }

  // --- BULK SELECTION & DELETE HANDLERS ---
  function setupBulkActions() {
    // 1. Participant Bulk Selection
    const chkAllParts = document.getElementById('chk-select-all-participants');
    const btnBulkDelParts = document.getElementById('btn-bulk-delete-participants');
    const btnClearAllParts = document.getElementById('btn-clear-all-participants');

    if (chkAllParts) {
      chkAllParts.addEventListener('change', (e) => {
        const state = window.FiestaAPI.getState();
        const participants = state.participants || [];
        if (e.target.checked) {
          participants.forEach(p => selectedParticipantIds.add(p.id));
        } else {
          selectedParticipantIds.clear();
        }
        updateParticipantSelectionUI();
      });
    }

    if (btnBulkDelParts) {
      btnBulkDelParts.addEventListener('click', async () => {
        const ids = Array.from(selectedParticipantIds);
        if (ids.length === 0) return;
        if (confirm(`Are you sure you want to delete ${ids.length} selected participant(s)?`)) {
          btnBulkDelParts.disabled = true;
          btnBulkDelParts.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
          selectedParticipantIds.clear();
          updateParticipantSelectionUI();
          await window.FiestaAPI.bulkDeleteParticipants(ids);
          btnBulkDelParts.disabled = false;
          btnBulkDelParts.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Selected (<span id="selected-participants-count">0</span>)';
          window.showToast(`Deleted ${ids.length} participants permanently!`, 'success');
        }
      });
    }

    if (btnClearAllParts) {
      btnClearAllParts.addEventListener('click', async () => {
        if (confirm("WARNING: Are you sure you want to clear the ENTIRE participant roster? This cannot be undone.")) {
          btnClearAllParts.disabled = true;
          selectedParticipantIds.clear();
          updateParticipantSelectionUI();
          await window.FiestaAPI.bulkDeleteParticipants([], true);
          btnClearAllParts.disabled = false;
          window.showToast('Participant roster cleared!', 'info');
        }
      });
    }

    // 2. Results Bulk Selection
    const chkAllRes = document.getElementById('chk-select-all-results');
    const chkHeadRes = document.getElementById('chk-head-results');
    const btnBulkDelRes = document.getElementById('btn-bulk-delete-results');

    function toggleAllResults(checked) {
      const state = window.FiestaAPI.getState();
      const results = state.results || [];
      if (checked) {
        results.forEach(r => selectedResultIds.add(r.id));
      } else {
        selectedResultIds.clear();
      }
      updateResultSelectionUI();
    }

    if (chkAllRes) chkAllRes.addEventListener('change', (e) => toggleAllResults(e.target.checked));
    if (chkHeadRes) chkHeadRes.addEventListener('change', (e) => toggleAllResults(e.target.checked));

    if (btnBulkDelRes) {
      btnBulkDelRes.addEventListener('click', async () => {
        const ids = Array.from(selectedResultIds);
        if (ids.length === 0) return;
        if (confirm(`Delete ${ids.length} selected result(s)? All house points will recalculate immediately.`)) {
          btnBulkDelRes.disabled = true;
          btnBulkDelRes.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
          const res = await fetch('/api/results/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          });
          const data = await res.json();
          selectedResultIds.clear();
          updateResultSelectionUI();
          btnBulkDelRes.disabled = false;
          btnBulkDelRes.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Selected (<span id="selected-results-count">0</span>)';
          if (data.success) {
            await window.FiestaAPI.fetchState();
            window.showToast(`Deleted ${data.count} result(s) and recalculated standings!`, 'success');
          } else {
            window.showToast('Bulk delete failed', 'error');
          }
        }
      });
    }

    // 3. Programs Bulk Selection
    const chkAllProg = document.getElementById('chk-select-all-programs');
    const chkHeadProg = document.getElementById('chk-head-programs');
    const btnBulkDelProg = document.getElementById('btn-bulk-delete-programs');

    function toggleAllPrograms(checked) {
      const state = window.FiestaAPI.getState();
      const progs = state.programs || [];
      if (checked) {
        progs.forEach(p => selectedProgramIds.add(p.id));
      } else {
        selectedProgramIds.clear();
      }
      updateProgramSelectionUI();
    }

    if (chkAllProg) chkAllProg.addEventListener('change', (e) => toggleAllPrograms(e.target.checked));
    if (chkHeadProg) chkHeadProg.addEventListener('change', (e) => toggleAllPrograms(e.target.checked));

    if (btnBulkDelProg) {
      btnBulkDelProg.addEventListener('click', async () => {
        const ids = Array.from(selectedProgramIds);
        if (ids.length === 0) return;
        if (confirm(`Delete ${ids.length} selected program(s)?`)) {
          btnBulkDelProg.disabled = true;
          btnBulkDelProg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
          const res = await fetch('/api/programs/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids })
          });
          const data = await res.json();
          selectedProgramIds.clear();
          updateProgramSelectionUI();
          btnBulkDelProg.disabled = false;
          btnBulkDelProg.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Selected (<span id="selected-programs-count">0</span>)';
          if (data.success) {
            await window.FiestaAPI.fetchState();
            window.showToast(`Deleted ${data.count} program(s)!`, 'success');
          } else {
            window.showToast('Bulk delete failed', 'error');
          }
        }
      });
    }

    // 4. Gallery Bulk Selection
    const chkAllGal = document.getElementById('chk-select-all-gallery');
    const btnBulkDelGal = document.getElementById('btn-bulk-delete-gallery');
    const btnClearAllGal = document.getElementById('btn-clear-all-gallery');

    if (chkAllGal) {
      chkAllGal.addEventListener('change', (e) => {
        const state = window.FiestaAPI.getState();
        const gallery = state.gallery || [];
        if (e.target.checked) {
          gallery.forEach(g => selectedGalleryIds.add(g.id));
        } else {
          selectedGalleryIds.clear();
        }
        updateGallerySelectionUI();
      });
    }

    if (btnBulkDelGal) {
      btnBulkDelGal.addEventListener('click', async () => {
        const ids = Array.from(selectedGalleryIds);
        if (ids.length === 0) return;
        if (confirm(`Are you sure you want to delete ${ids.length} selected photo(s)?`)) {
          btnBulkDelGal.disabled = true;
          btnBulkDelGal.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
          selectedGalleryIds.clear();
          updateGallerySelectionUI();
          await window.FiestaAPI.bulkDeleteGallery(ids);
          btnBulkDelGal.disabled = false;
          btnBulkDelGal.innerHTML = '<i class="fa-solid fa-trash"></i> Delete Selected (<span id="selected-gallery-count">0</span>)';
          window.showToast(`Deleted ${ids.length} photos permanently!`, 'success');
        }
      });
    }

    if (btnClearAllGal) {
      btnClearAllGal.addEventListener('click', async () => {
        if (confirm("WARNING: Are you sure you want to delete ALL photos from the gallery?")) {
          btnClearAllGal.disabled = true;
          selectedGalleryIds.clear();
          updateGallerySelectionUI();
          await window.FiestaAPI.bulkDeleteGallery([], true);
          btnClearAllGal.disabled = false;
          window.showToast('Gallery cleared!', 'info');
        }
      });
    }
  }

  function attachParticipantCheckboxEvents() {
    const checkboxes = document.querySelectorAll('.chk-participant-item');
    checkboxes.forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          selectedParticipantIds.add(id);
        } else {
          selectedParticipantIds.delete(id);
        }
        updateParticipantSelectionUI();
      });
    });
    updateParticipantSelectionUI();
  }

  function updateParticipantSelectionUI() {
    const checkboxes = document.querySelectorAll('.chk-participant-item');
    const chkAll = document.getElementById('chk-select-all-participants');
    const btnBulkDel = document.getElementById('btn-bulk-delete-participants');
    const countSpan = document.getElementById('selected-participants-count');

    checkboxes.forEach(chk => {
      chk.checked = selectedParticipantIds.has(chk.dataset.id);
    });

    if (chkAll && checkboxes.length > 0) {
      chkAll.checked = checkboxes.length === selectedParticipantIds.size;
    }

    const count = selectedParticipantIds.size;
    if (countSpan) countSpan.textContent = count;
    if (btnBulkDel) {
      btnBulkDel.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  function attachResultCheckboxEvents() {
    const checkboxes = document.querySelectorAll('.chk-result-item');
    checkboxes.forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          selectedResultIds.add(id);
        } else {
          selectedResultIds.delete(id);
        }
        updateResultSelectionUI();
      });
    });
    updateResultSelectionUI();
  }

  function updateResultSelectionUI() {
    const checkboxes = document.querySelectorAll('.chk-result-item');
    const chkAll = document.getElementById('chk-select-all-results');
    const chkHead = document.getElementById('chk-head-results');
    const btnBulkDel = document.getElementById('btn-bulk-delete-results');
    const countSpan = document.getElementById('selected-results-count');

    checkboxes.forEach(chk => {
      chk.checked = selectedResultIds.has(chk.dataset.id);
    });

    const allChecked = checkboxes.length > 0 && checkboxes.length === selectedResultIds.size;
    if (chkAll) chkAll.checked = allChecked;
    if (chkHead) chkHead.checked = allChecked;

    const count = selectedResultIds.size;
    if (countSpan) countSpan.textContent = count;
    if (btnBulkDel) {
      btnBulkDel.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  function attachProgramCheckboxEvents() {
    const checkboxes = document.querySelectorAll('.chk-program-item');
    checkboxes.forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          selectedProgramIds.add(id);
        } else {
          selectedProgramIds.delete(id);
        }
        updateProgramSelectionUI();
      });
    });
    updateProgramSelectionUI();
  }

  function updateProgramSelectionUI() {
    const checkboxes = document.querySelectorAll('.chk-program-item');
    const chkAll = document.getElementById('chk-select-all-programs');
    const chkHead = document.getElementById('chk-head-programs');
    const btnBulkDel = document.getElementById('btn-bulk-delete-programs');
    const countSpan = document.getElementById('selected-programs-count');

    checkboxes.forEach(chk => {
      chk.checked = selectedProgramIds.has(chk.dataset.id);
    });

    const allChecked = checkboxes.length > 0 && checkboxes.length === selectedProgramIds.size;
    if (chkAll) chkAll.checked = allChecked;
    if (chkHead) chkHead.checked = allChecked;

    const count = selectedProgramIds.size;
    if (countSpan) countSpan.textContent = count;
    if (btnBulkDel) {
      btnBulkDel.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  function attachGalleryCheckboxEvents() {
    const checkboxes = document.querySelectorAll('.chk-gallery-item');
    checkboxes.forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          selectedGalleryIds.add(id);
        } else {
          selectedGalleryIds.delete(id);
        }
        updateGallerySelectionUI();
      });
    });
    updateGallerySelectionUI();
  }

  function updateGallerySelectionUI() {
    const checkboxes = document.querySelectorAll('.chk-gallery-item');
    const chkAll = document.getElementById('chk-select-all-gallery');
    const btnBulkDel = document.getElementById('btn-bulk-delete-gallery');
    const countSpan = document.getElementById('selected-gallery-count');

    checkboxes.forEach(chk => {
      chk.checked = selectedGalleryIds.has(chk.dataset.id);
    });

    if (chkAll && checkboxes.length > 0) {
      chkAll.checked = checkboxes.length === selectedGalleryIds.size;
    }

    const count = selectedGalleryIds.size;
    if (countSpan) countSpan.textContent = count;
    if (btnBulkDel) {
      btnBulkDel.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  function attachNewsCheckboxEvents() {
    const checkboxes = document.querySelectorAll('.chk-news-item');
    checkboxes.forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          selectedNewsIds.add(id);
        } else {
          selectedNewsIds.delete(id);
        }
        updateNewsSelectionUI();
      });
    });
    updateNewsSelectionUI();
  }

  function updateNewsSelectionUI() {
    const checkboxes = document.querySelectorAll('.chk-news-item');
    const chkAll = document.getElementById('chk-select-all-news');
    const btnBulkDel = document.getElementById('btn-bulk-delete-news');
    const countSpan = document.getElementById('selected-news-count');

    checkboxes.forEach(chk => {
      chk.checked = selectedNewsIds.has(chk.dataset.id);
    });

    if (chkAll && checkboxes.length > 0) {
      chkAll.checked = checkboxes.length === selectedNewsIds.size;
    }

    const count = selectedNewsIds.size;
    if (countSpan) countSpan.textContent = count;
    if (btnBulkDel) {
      btnBulkDel.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  window.openAdminModal = openLoginModal;
  window.showAdminView = showAdminView;

  return {
    init,
    openLoginModal,
    showAdminView,
    playNotificationChime,
    solveReport,
    handleNotifAction,
    openResultModalWithPrefill: (res, prefill) => globalOpenResultModal && globalOpenResultModal(res, prefill),
    editResultPrompt,
    deleteResultPrompt,
    toggleResultVisibility,
    deleteParticipantPrompt,
    deleteVideoPrompt,
    deleteGalleryPrompt,
    deleteProgramPrompt,
    openItemUploader,
    renderAdminItems,
    renderAdminNews,
    editNewsPrompt,
    deleteNewsPrompt,
    toggleNewsVisibility,
    renderAdminData
  };
})();
