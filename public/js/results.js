/**
 * Results Filter Engine & Card Renderer (Image 2 Modern Standard Design)
 * Privacy rule: Admin only can see the students' individual numeric points.
 * Public users see Position (1st, 2nd, 3rd), Participant Name, House / Team, and Grade.
 */

window.FiestaResults = (function() {
  let isInitialized = false;
  let activeFilters = {
    search: '',
    category: 'ALL',
    team: 'ALL',
    position: 'ALL',
    sort: 'num-desc'
  };

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    const searchInput = document.getElementById('result-search-input');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const sortSelect = document.getElementById('res-sort-select');
    const btnResetEmpty = document.getElementById('btn-clear-filters-empty');
    const btnOtherZones = document.getElementById('btn-toggle-other-zones');
    const otherZonesMenu = document.getElementById('other-zones-menu');

    // Search (Debounced by 150ms for buttery-smooth typing)
    let searchDebounceTimer = null;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        activeFilters.search = e.target.value.trim().toLowerCase();
        if (btnClearSearch) btnClearSearch.style.display = activeFilters.search ? 'block' : 'none';
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          renderFilteredResults();
        }, 150);
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        activeFilters.search = '';
        btnClearSearch.style.display = 'none';
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        renderFilteredResults();
      });
    }

    // Sort select
    if (sortSelect) {
      sortSelect.value = activeFilters.sort;
      sortSelect.addEventListener('change', (e) => {
        activeFilters.sort = e.target.value;
        renderFilteredResults();
      });
    }

    // Zone Pills (All Events)
    const zonePills = document.querySelectorAll('#results-zone-pills .res-zone-btn:not(#btn-toggle-other-zones)');
    zonePills.forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#results-zone-pills .res-zone-btn, .other-zone-item').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilters.category = pill.dataset.zone || 'ALL';
        if (btnOtherZones) {
          btnOtherZones.innerHTML = '<i class="fa-solid fa-globe"></i> Other Zones <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>';
        }
        if (otherZonesMenu) otherZonesMenu.classList.add('hidden');
        renderFilteredResults();
      });
    });

    // Other Zones Dropdown Toggle
    if (btnOtherZones && otherZonesMenu) {
      btnOtherZones.addEventListener('click', (e) => {
        e.stopPropagation();
        otherZonesMenu.classList.toggle('hidden');
      });

      document.addEventListener('click', () => {
        otherZonesMenu.classList.add('hidden');
      });

      const otherItems = otherZonesMenu.querySelectorAll('.other-zone-item');
      otherItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('#results-zone-pills .res-zone-btn, .other-zone-item').forEach(p => p.classList.remove('active'));
          btnOtherZones.classList.add('active');
          item.classList.add('active');
          activeFilters.category = item.dataset.zone || 'ALL';
          btnOtherZones.innerHTML = `<i class="fa-solid fa-globe"></i> ${activeFilters.category} <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>`;
          otherZonesMenu.classList.add('hidden');
          renderFilteredResults();
        });
      });
    }

    if (btnResetEmpty) {
      btnResetEmpty.addEventListener('click', () => {
        activeFilters = { search: '', category: 'ALL', team: 'ALL', position: 'ALL', sort: 'num-desc' };
        if (searchInput) searchInput.value = '';
        if (btnClearSearch) btnClearSearch.style.display = 'none';
        if (sortSelect) sortSelect.value = 'num-desc';
        document.querySelectorAll('#results-zone-pills .res-zone-btn').forEach(p => p.classList.remove('active'));
        const allBtn = document.querySelector('#results-zone-pills [data-zone="ALL"]');
        if (allBtn) allBtn.classList.add('active');
        if (btnOtherZones) {
          btnOtherZones.innerHTML = '<i class="fa-solid fa-globe"></i> Other Zones <i class="fa-solid fa-chevron-down" style="font-size: 0.7rem; margin-left: 4px;"></i>';
        }
        renderFilteredResults();
      });
    }

    window.FiestaAPI.subscribe(renderFilteredResults);
  }

  function getNormalizedWinners(res) {
    if (!res) return [];
    if (res._memoWinners) return res._memoWinners;

    if (Array.isArray(res.winners) && res.winners.length > 0) {
      res._memoWinners = res.winners;
      return res.winners;
    }

    const list = [];
    if (res.first?.participantName) list.push({ position: '1st', ...res.first });
    if (res.second?.participantName) list.push({ position: '2nd', ...res.second });
    if (res.third?.participantName) list.push({ position: '3rd', ...res.third });
    if (Array.isArray(res.additionalGrades)) {
      res.additionalGrades.forEach(g => list.push({ position: 'Grade', ...g }));
    }
    res._memoWinners = list;
    return list;
  }

  function filterResults(results) {
    if (!Array.isArray(results)) return [];

    let list = results.filter(res => {
      // Per-result public visibility check
      if (res.isPublic === false) return false;

      // Category filter (A-Zone, B-Zone, C-Zone, General)
      if (activeFilters.category !== 'ALL' && res.category !== activeFilters.category) {
        return false;
      }

      const winners = getNormalizedWinners(res);

      // Search keyword filter
      if (activeFilters.search) {
        const q = activeFilters.search;
        const inProgName = res.programName && res.programName.toLowerCase().includes(q);
        const inProgCode = res.programCode && res.programCode.toLowerCase().includes(q);
        const inWinner = winners.some(w => {
          return (w.participantName && w.participantName.toLowerCase().includes(q)) ||
                 (w.team && w.team.toLowerCase().includes(q));
        });

        if (!inProgName && !inProgCode && !inWinner) {
          return false;
        }
      }

      return true;
    });

    // Sorting (Default: Decreasing / Descending by Result Number: latest / highest result number first)
    if (activeFilters.sort === 'num-asc') {
      list.sort((a, b) => (Number(a.resultNumber) || 0) - (Number(b.resultNumber) || 0));
    } else if (activeFilters.sort === 'name') {
      list.sort((a, b) => (a.programName || '').localeCompare(b.programName || ''));
    } else {
      // Default: 'num-desc' (Result Number decreasing order: latest results first)
      list.sort((a, b) => (Number(b.resultNumber) || 0) - (Number(a.resultNumber) || 0));
    }

    return list;
  }

  function renderFilteredResults() {
    const state = window.FiestaAPI.getState();
    const allResults = state.results || [];
    const filtered = filterResults(allResults);

    const grid = document.getElementById('main-results-grid');
    const emptyState = document.getElementById('no-results-state');

    // Update Hero KPI stats
    const kpiEvents = document.getElementById('kpi-events-count');
    const kpiPart = document.getElementById('kpi-participants-count');
    const kpiRes = document.getElementById('kpi-results-count');
    if (kpiEvents) kpiEvents.textContent = state.programs?.length || 4;
    if (kpiPart) kpiPart.textContent = `${state.participants?.length || 250}+`;
    if (kpiRes) kpiRes.textContent = `${allResults.filter(r => r.isPublic !== false).length}+`;

    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    grid.innerHTML = filtered.map(res => createResultCardHTML(res)).join('');

    // Attach View Result clicks to open the Unified Poster & Result Hub Modal
    const detailBtns = grid.querySelectorAll('.btn-open-result-detail, .modern-res-view-link');
    detailBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const resId = e.currentTarget.dataset.resultId;
        const resObj = allResults.find(r => r.id === resId);
        if (resObj) {
          if (window.FiestaPoster && window.FiestaPoster.openPosterModal) {
            window.FiestaPoster.openPosterModal(resObj);
          } else {
            openResultDetailModal(resObj);
          }
        }
      });
    });
  }

  function createResultCardHTML(res) {
    const winners = getNormalizedWinners(res);
    const resNumStr = String(res.resultNumber || 1).padStart(2, '0');
    const category = escapeHTML(res.category || 'A-Zone');

    const firstWinner = winners.find(w => String(w.position).includes('1')) || winners[0];
    const topTeamKey = (firstWinner?.team || 'bukhara').toLowerCase();

    // Sort winners: 1st -> 2nd -> 3rd -> Grade
    const sortedWinners = [...winners].sort((a, b) => {
      const getPosRank = (p) => {
        const s = String(p || '').toLowerCase();
        if (s.includes('1') || s.includes('first')) return 1;
        if (s.includes('2') || s.includes('second')) return 2;
        if (s.includes('3') || s.includes('third')) return 3;
        return 4;
      };
      return getPosRank(a.position) - getPosRank(b.position);
    });

    const rows = sortedWinners.map((w, idx) => {
      const posStr = String(w.position || '').toLowerCase();
      let rankPos = 3;
      if (posStr.includes('1') || posStr.includes('first')) rankPos = 1;
      else if (posStr.includes('2') || posStr.includes('second')) rankPos = 2;
      else if (posStr.includes('3') || posStr.includes('third')) rankPos = 3;
      else rankPos = 'grade';

      return buildWinnerRow(w, rankPos);
    });

    // If no winners, show unannounced state
    if (rows.length === 0) {
      rows.push('<div class="res-row-empty text-muted">Awaiting official announcement</div>');
    }

    return `
      <div class="modern-result-card card-accent-${topTeamKey}" id="card-${res.id}">
        <div class="modern-res-card-header">
          <div class="modern-res-badges-wrap">
            <span class="modern-res-num-pill result-number-pill">#${resNumStr}</span>
            <span class="modern-res-cat-badge">${category}</span>
          </div>
        </div>

        <h3 class="modern-res-title">${escapeHTML(res.programName || 'Championship Event')}</h3>

        <div class="modern-res-winners-list">
          ${rows.join('')}
        </div>

        <div class="modern-res-footer">
          <button type="button" class="btn-res-action-view btn-open-result-detail" data-result-id="${res.id}">
            <span>View Result</span> <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
  }

  function buildWinnerRow(w, rankPos) {
    const pName = escapeHTML(w.participantName || 'Participant');
    const teamName = escapeHTML(w.team || 'Team');
    const teamKey = teamName.toLowerCase();
    const grade = w.grade && w.grade !== 'No Grade' && w.grade !== 'None' ? escapeHTML(w.grade) : 'A';

    const houseEmblems = {
      bukhara: '/assets/images/houses/bukhara-arch.png',
      undulus: '/assets/images/houses/undulus-arch.png',
      samarkhand: '/assets/images/houses/samarkhand-arch.png',
      qurthuba: '/assets/images/houses/qurthuba-arch.png'
    };
    const emblemSrc = houseEmblems[teamKey] || '/assets/images/houses/bukhara-arch.png';

    let posBadgeHTML = '';
    if (rankPos === 1) {
      posBadgeHTML = `<div class="res-pos-circle pos-circle-1" title="1st Position"><i class="fa-solid fa-crown"></i></div>`;
    } else if (rankPos === 2) {
      posBadgeHTML = `<div class="res-pos-circle pos-circle-2" title="2nd Position">2</div>`;
    } else if (rankPos === 3) {
      posBadgeHTML = `<div class="res-pos-circle pos-circle-3" title="3rd Position">3</div>`;
    } else {
      posBadgeHTML = `<div class="res-pos-circle pos-circle-grade" title="Grade Holder"><i class="fa-solid fa-star text-gold"></i></div>`;
    }

    return `
      <div class="modern-res-row">
        <div class="res-row-left">
          ${posBadgeHTML}
          <span class="res-participant-name">${pName}</span>
          <span class="res-house-badge badge-house-${teamKey}">
            <img src="${emblemSrc}" alt="${teamName}" class="res-house-mini-emblem"> ${teamName}
          </span>
        </div>
        <div class="res-row-right">
          <span class="res-grade-pill">Grade ${grade}</span>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     DEDICATED RESULT DETAIL MODAL
     Contains Poster Generation, Winning Works, and Discrepancy Reporting
     ========================================================================== */
  function openResultDetailModal(res) {
    if (!res) return;
    const modal = document.getElementById('modal-result-detail');
    if (!modal) return;

    const state = window.FiestaAPI?.getState() || {};
    const stateItems = state.items || [];
    const eventItems = stateItems.filter(it => it.resultId === res.id);

    // Header & Meta
    const titleEl = document.getElementById('res-detail-title');
    const numEl = document.getElementById('res-detail-number-badge');
    const catEl = document.getElementById('res-detail-category-badge');
    const pubEl = document.getElementById('res-detail-published-at');

    const resNumStr = String(res.resultNumber || 1).padStart(2, '0');
    if (titleEl) titleEl.textContent = res.programName || 'Championship Event';
    if (numEl) numEl.textContent = `#${resNumStr}`;
    if (catEl) catEl.textContent = res.category || 'A-Zone';
    if (pubEl) {
      if (res.publishedAt) {
        const d = new Date(res.publishedAt);
        pubEl.innerHTML = `<i class="fa-regular fa-clock"></i> Announced: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        pubEl.innerHTML = `<i class="fa-regular fa-clock"></i> Announced Official`;
      }
    }

    // Winners list
    const winnersListEl = document.getElementById('res-detail-winners-list');
    const winners = getNormalizedWinners(res);
    if (winnersListEl) {
      if (winners.length === 0) {
        winnersListEl.innerHTML = '<div class="text-muted text-center p-3">No winners listed.</div>';
      } else {
        const sortedWinners = [...winners].sort((a, b) => {
          const getPosRank = (p) => {
            const s = String(p || '').toLowerCase();
            if (s.includes('1') || s.includes('first')) return 1;
            if (s.includes('2') || s.includes('second')) return 2;
            if (s.includes('3') || s.includes('third')) return 3;
            return 4;
          };
          return getPosRank(a.position) - getPosRank(b.position);
        });

        winnersListEl.innerHTML = sortedWinners.map((w, idx) => {
          const posStr = String(w.position || '').toLowerCase();
          let rankPos = 3;
          let rankText = 'Grade Holder';
          let posBadge = '';

          if (posStr.includes('1') || posStr.includes('first')) {
            rankPos = 1;
            rankText = '1st Place';
            posBadge = '<div class="res-pos-circle pos-circle-1"><i class="fa-solid fa-crown"></i></div>';
          } else if (posStr.includes('2') || posStr.includes('second')) {
            rankPos = 2;
            rankText = '2nd Place';
            posBadge = '<div class="res-pos-circle pos-circle-2">2</div>';
          } else if (posStr.includes('3') || posStr.includes('third')) {
            rankPos = 3;
            rankText = '3rd Place';
            posBadge = '<div class="res-pos-circle pos-circle-3">3</div>';
          } else {
            rankPos = 'grade';
            rankText = 'Grade Holder';
            posBadge = '<div class="res-pos-circle pos-circle-grade"><i class="fa-solid fa-star text-gold"></i></div>';
          }

          const teamKey = (w.team || 'bukhara').toLowerCase();
          const houseEmblems = {
            bukhara: '/assets/images/houses/bukhara-arch.png',
            undulus: '/assets/images/houses/undulus-arch.png',
            samarkhand: '/assets/images/houses/samarkhand-arch.png',
            qurthuba: '/assets/images/houses/qurthuba-arch.png'
          };
          const emblemSrc = houseEmblems[teamKey] || '/assets/images/houses/bukhara-arch.png';
          const grade = w.grade && w.grade !== 'No Grade' && w.grade !== 'None' ? escapeHTML(w.grade) : 'A';
          const pts = w.points ? `${w.points} Pts` : '';

          return `
            <div class="res-detail-winner-row">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                ${posBadge}
                <div>
                  <strong style="color: #fff; font-size: 0.95rem; display: block;">${escapeHTML(w.participantName || 'Winner')}</strong>
                  <span class="text-xs text-muted">${rankText}</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <span class="res-house-badge badge-house-${teamKey}">
                  <img src="${emblemSrc}" alt="${w.team}" class="res-house-mini-emblem"> ${escapeHTML(w.team || '')}
                </span>
                <span class="res-grade-pill">Grade ${grade}</span>
                ${pts ? `<span class="res-points-badge font-mono font-bold text-cyan text-xs">${pts}</span>` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Winning Works Section
    const worksContainer = document.getElementById('res-detail-works-container');
    const worksItemsList = document.getElementById('res-detail-works-items');
    const worksCountEl = document.getElementById('res-detail-works-count');

    if (worksContainer && worksItemsList) {
      if (eventItems.length > 0) {
        worksContainer.classList.remove('hidden');
        if (worksCountEl) worksCountEl.textContent = `${eventItems.length} Work${eventItems.length > 1 ? 's' : ''} Published`;

        worksItemsList.innerHTML = eventItems.map(it => {
          const typeIcons = {
            text: '<i class="fa-solid fa-pen-nib text-purple"></i>',
            image: '<i class="fa-solid fa-image text-cyan"></i>',
            video: '<i class="fa-solid fa-video text-ruby"></i>',
            pdf: '<i class="fa-solid fa-file-pdf text-gold"></i>'
          };
          const icon = typeIcons[it.itemType || 'text'] || '<i class="fa-solid fa-feather-pointed"></i>';
          const place = escapeHTML(it.place || '1st');
          const author = escapeHTML(it.participantName || '');
          const team = escapeHTML(it.team || '');

          return `
            <div class="res-detail-work-card" data-item-id="${it.id}">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="font-size: 1.25rem;">${icon}</div>
                <div>
                  <strong style="color: #fff; font-size: 0.9rem; display: block;">${escapeHTML(it.subject || 'Winning Creation')}</strong>
                  <span class="text-xs text-muted">${place} Place • by ${author} (${team})</span>
                </div>
              </div>
              <button type="button" class="btn-sm-action text-cyan btn-open-item-preview btn-view-result-works" style="font-size: 0.78rem; padding: 0.35rem 0.75rem;">
                <i class="fa-solid fa-eye"></i> Preview Work
              </button>
            </div>
          `;
        }).join('');

        // Attach clicks to open protected preview modal
        const workCards = worksItemsList.querySelectorAll('.res-detail-work-card');
        workCards.forEach(c => {
          c.addEventListener('click', (e) => {
            const iId = e.currentTarget.dataset.itemId;
            const targetItem = eventItems.find(x => x.id === iId);
            if (targetItem && window.FiestaApp && window.FiestaApp.openItemPreviewModal) {
              window.FiestaApp.openItemPreviewModal(targetItem);
            }
          });
        });
      } else {
        worksContainer.classList.add('hidden');
      }
    }

    // Button Actions
    const btnPoster = document.getElementById('btn-detail-generate-poster');
    const btnReport = document.getElementById('btn-detail-report-discrepancy');
    const btnClose = document.getElementById('btn-close-result-detail');

    if (btnPoster) {
      btnPoster.onclick = () => {
        closeResultDetailModal();
        if (window.FiestaPoster && window.FiestaPoster.openPosterModal) {
          window.FiestaPoster.openPosterModal(res);
        }
      };
    }

    if (btnReport) {
      btnReport.onclick = () => {
        closeResultDetailModal();
        if (typeof openReportForProgram === 'function') {
          openReportForProgram(res);
        } else if (window.openReportForProgram) {
          window.openReportForProgram(res);
        }
      };
    }

    if (btnClose) {
      btnClose.onclick = closeResultDetailModal;
    }

    modal.classList.add('open');
  }

  function closeResultDetailModal() {
    const modal = document.getElementById('modal-result-detail');
    if (modal) modal.classList.remove('open');
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    init,
    renderFilteredResults,
    createResultCardHTML,
    openResultDetailModal,
    getNormalizedWinners,
    filterResults
  };
})();
