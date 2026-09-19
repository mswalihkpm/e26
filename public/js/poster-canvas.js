/**
 * Official Canvas Result Poster Generator
 * Supports 4 Official Layouts:
 * 1. Crystal Magnifier (Official White & Sapphire Theme - 3D Polygonal Artwork)
 * 2. Postage Stamp (Perforated Vintage Grey/White)
 * 3. Deep Ocean Compass (Official Navy Blue)
 * 4. Spiral Notebook & Mobile (Craft Studio - with Montserrat typography)
 * Strictly renders 1st, 2nd, and 3rd podium winners (including ties/doubles).
 */

window.FiestaPoster = (function() {
  let currentResult = null;
  let currentTemplate = 'crystal-magnifier'; // let currentTemplate = 'crystal-magnifier'; 'literary-orange', 'royal-purple', 'stamp-vintage', 'ocean-compass', 'notebook-craft'
  let currentResultNum = '01';

  // Pre-load Clean Textless Template Images
  const imgLiteraryOrangeClean = new Image();
  imgLiteraryOrangeClean.crossOrigin = "anonymous";
  imgLiteraryOrangeClean.src = '/assets/images/poster-bg-literary-orange.jpg';

  const imgRoyalPurpleClean = new Image();
  imgRoyalPurpleClean.crossOrigin = "anonymous";
  imgRoyalPurpleClean.src = '/assets/images/poster-bg-royal-purple.jpg';

  const imgCrystalClean = new Image();
  imgCrystalClean.crossOrigin = "anonymous";
  imgCrystalClean.src = '/assets/images/poster-bg-crystal-clean.png';

  const imgOceanClean = new Image();
  imgOceanClean.crossOrigin = "anonymous";
  imgOceanClean.src = '/assets/images/poster-bg-ocean-clean.jpg';

  const imgStampClean = new Image();
  imgStampClean.crossOrigin = "anonymous";
  imgStampClean.src = '/assets/images/poster-bg-stamp-clean.jpg';

  const imgNotebookClean = new Image();
  imgNotebookClean.crossOrigin = "anonymous";
  imgNotebookClean.src = '/assets/images/poster-bg-notebook-clean.jpg';

  // Redraw when images load
  [imgLiteraryOrangeClean, imgRoyalPurpleClean, imgCrystalClean, imgOceanClean, imgStampClean, imgNotebookClean].forEach(img => {
    img.onload = () => {
      if (currentResult) renderPoster();
    };
  });

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function openPosterModal(result) {
    currentResult = result;
    
    // Auto-calculate 2-digit result number from program code or index
    if (result) {
      if (result.resultNumber) {
        currentResultNum = String(result.resultNumber).padStart(2, '0');
      } else {
        const state = window.FiestaAPI?.getState();
        const allResults = state?.results || [];
        const resIndex = allResults.findIndex(r => r.id === result.id);
        const numVal = resIndex !== -1 ? (resIndex + 1) : 1;
        currentResultNum = String(numVal).padStart(2, '0');
      }
    }

    const modal = document.getElementById('modal-poster-generator');
    const resultNumInput = document.getElementById('poster-result-num');
    const adminNumGroup = document.getElementById('poster-result-num-group');
    const templateSelect = document.getElementById('poster-template-select');

    if (templateSelect) {
      templateSelect.value = currentTemplate;
    }

    // Only display result number editor to authenticated admins
    const isAdmin = window.FiestaAPI && window.FiestaAPI.isAdminLoggedIn();
    if (adminNumGroup) {
      if (isAdmin) {
        adminNumGroup.classList.remove('hidden');
      } else {
        adminNumGroup.classList.add('hidden');
      }
    }

    if (resultNumInput) resultNumInput.value = currentResultNum;

    // Header Report Discrepancy Icon Button
    const btnHeaderReport = document.getElementById('btn-poster-header-report');
    if (btnHeaderReport && result) {
      btnHeaderReport.onclick = () => {
        closePosterModal();
        if (typeof openReportForProgram === 'function') {
          openReportForProgram(result);
        } else if (window.openReportForProgram) {
          window.openReportForProgram(result);
        }
      };
    }

    // Populate Winning Works Section below the download button
    populatePosterWorksList(result);

    if (modal) {
      modal.classList.add('open');
      renderPoster();
    }
  }

  function populatePosterWorksList(result) {
    const worksSection = document.getElementById('poster-works-section');
    const worksList = document.getElementById('poster-works-list');
    const worksCount = document.getElementById('poster-works-count');
    if (!worksList) return;

    if (!result || !result.id) {
      if (worksSection) worksSection.style.display = 'none';
      worksList.innerHTML = '';
      if (worksCount) worksCount.textContent = '0 Works';
      return;
    }

    const state = window.FiestaAPI?.getState() || {};
    const allItems = state.items || [];
    const eventItems = allItems.filter(it => it.resultId === result.id);

    // If admin has not added winning works for this result, completely hide the section from the user
    if (eventItems.length === 0) {
      if (worksSection) worksSection.style.display = 'none';
      worksList.innerHTML = '';
      if (worksCount) worksCount.textContent = '0 Works';
      return;
    }

    // When winning works exist, display the container and populate the items
    if (worksSection) worksSection.style.display = 'block';
    if (worksCount) {
      worksCount.textContent = `${eventItems.length} Work${eventItems.length === 1 ? '' : 's'}`;
    }

    const typeIcons = {
      text: '<i class="fa-solid fa-pen-nib text-purple"></i>',
      image: '<i class="fa-solid fa-image text-cyan"></i>',
      video: '<i class="fa-solid fa-video text-ruby"></i>',
      pdf: '<i class="fa-solid fa-file-pdf text-gold"></i>'
    };

    worksList.innerHTML = eventItems.map(it => {
      const icon = typeIcons[it.mediaType || 'text'] || '<i class="fa-solid fa-feather-pointed"></i>';
      const place = escapeHTML(it.place || '1st');
      const placeKey = place.toLowerCase().replace(/[^a-z0-9]/g, '');
      const subject = escapeHTML(it.subject || 'Winning Work');
      const pName = escapeHTML(it.participantName || 'Champion');
      const team = escapeHTML(it.team || '');
      const teamKey = team.toLowerCase();

      return `
        <div class="poster-work-item-card" data-item-id="${it.id}">
          <div class="poster-work-item-left">
            <span class="poster-work-type-icon">${icon}</span>
            <div class="poster-work-info">
              <div class="poster-work-title-row">
                <span class="poster-work-place-badge place-${placeKey}">${place}</span>
                <strong class="poster-work-subject">${subject}</strong>
              </div>
              <span class="poster-work-meta">${pName} • <span class="team-badge-${teamKey}">${team}</span></span>
            </div>
          </div>
          <button type="button" class="btn-preview-poster-work" title="Preview Work in Protected Viewer">
            <i class="fa-solid fa-eye"></i> View
          </button>
        </div>
      `;
    }).join('');

    // Attach click listeners to open protected viewer
    worksList.querySelectorAll('.poster-work-item-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const itemId = card.dataset.itemId;
        const target = eventItems.find(x => x.id === itemId);
        if (target && window.FiestaApp && window.FiestaApp.openItemPreviewModal) {
          window.FiestaApp.openItemPreviewModal(target);
        }
      });
    });
  }

  function closePosterModal() {
    const modal = document.getElementById('modal-poster-generator');
    if (modal) modal.classList.remove('open');
  }

  function setTemplate(tpl) {
    currentTemplate = tpl;
    renderPoster();
  }

  function setResultNumber(numStr) {
    currentResultNum = String(numStr || '01').trim();
    renderPoster();
  }

  // Helper to draw smooth rounded rectangles on canvas
  function roundRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  // Get and sort winners: ONLY 1st, 2nd, and 3rd place holders (including ties/doubles)
  function getSortedWinners() {
    if (!currentResult) return [];
    let list = [];
    if (window.FiestaResults && typeof window.FiestaResults.getNormalizedWinners === 'function') {
      list = window.FiestaResults.getNormalizedWinners(currentResult);
    } else if (Array.isArray(currentResult.winners)) {
      list = currentResult.winners;
    }

    // Filter strictly to only 1st, 2nd, and 3rd place winners (exclude general grades)
    const podiumWinners = list.filter(w => {
      const pos = String(w.position || '').toLowerCase();
      return pos.includes('1') || pos.includes('2') || pos.includes('3') || pos.includes('first') || pos.includes('second') || pos.includes('third');
    });

    if (podiumWinners.length === 0) {
      return [
        { position: '1st', participantName: '1st Holder Name', team: 'Bukhara' },
        { position: '2nd', participantName: '2nd Holder Name', team: 'Undulus' },
        { position: '3rd', participantName: '3rd Holder Name', team: 'Samarkhand' }
      ];
    }

    // Sort order: 1st -> 2nd -> 3rd
    const sorted = [...podiumWinners].sort((a, b) => {
      const posOrder = (p) => {
        const s = String(p || '').toLowerCase();
        if (s.includes('1') || s.includes('first')) return 1;
        if (s.includes('2') || s.includes('second')) return 2;
        if (s.includes('3') || s.includes('third')) return 3;
        return 99;
      };
      return posOrder(a.position) - posOrder(b.position);
    });

    return sorted;
  }

  function renderPoster() {
    if (!currentResult) return;
    const canvas = document.getElementById('fiesta-poster-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // High Resolution Ultra-HD Retina Scale (2x) for 300 DPI crystal print quality
    const scaleFactor = 2;
    const isSquare = currentTemplate === 'literary-orange' || currentTemplate === 'royal-purple';
    const baseWidth = isSquare ? 1024 : 819;
    const baseHeight = 1024;
    canvas.width = baseWidth * scaleFactor;
    canvas.height = baseHeight * scaleFactor;

    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(scaleFactor, scaleFactor); // 2x supersampling for all drawing operations

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (currentTemplate === 'literary-orange') {
      renderLiteraryOrangePoster(ctx, baseWidth, baseHeight);
    } else if (currentTemplate === 'royal-purple') {
      renderRoyalPurplePoster(ctx, baseWidth, baseHeight);
    } else if (currentTemplate === 'crystal-magnifier') {
      renderCrystalMagnifierPoster(ctx, baseWidth, baseHeight);
    } else if (currentTemplate === 'stamp-vintage') {
      renderStampVintagePoster(ctx, baseWidth, baseHeight);
    } else if (currentTemplate === 'ocean-compass') {
      renderOceanCompassPoster(ctx, baseWidth, baseHeight);
    } else {
      renderNotebookCraftPoster(ctx, baseWidth, baseHeight);
    }
  }

  /* ==========================================================================
     0A. LITERARY OPEN BOOK & BLOOMING FLOWERS POSTER (OFFICIAL ORANGE EMBLEM)
     Matches User's Base Image & Mockup Layout with 100% Precision!
     Strictly avoids overlapping the book illustration (Max Text Width = 280px).
     ========================================================================== */
  function renderLiteraryOrangePoster(ctx, width, height) {
    const winners = getSortedWinners();
    const rawProgName = (currentResult.programName || 'Essay Writing Malayalam');
    const category = (currentResult.category || 'junior');
    const resultNum = currentResultNum || '15';

    // 1. Draw Clean Base Image
    if (imgLiteraryOrangeClean.complete && imgLiteraryOrangeClean.naturalWidth > 0) {
      ctx.drawImage(imgLiteraryOrangeClean, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Render Result Number (e.g. "15" or "01") on the Left Side
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#1e3a4c'; // Deep slate / teal-navy
    ctx.font = '300 110px "Montserrat", "Space Grotesk", sans-serif';
    const numX = 135;
    const numBaseY = 415;
    ctx.fillText(resultNum, numX, numBaseY);
    const numWidth = ctx.measureText(resultNum).width;
    ctx.restore();

    // 3. Render Category (e.g. "junior", "B-Zone") to the right of the number
    const catX = Math.max(285, numX + numWidth + 20);
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#334155'; // Slate
    ctx.font = '500 30px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.fillText(category, catX, 328);
    ctx.restore();

    // 4. Render Programme Name in Bold Dark Navy (Strict width constraint)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const maxProgWidth = 275; // Available width before open book illustration
    let progFontSize = 38;
    ctx.font = `700 ${progFontSize}px "Plus Jakarta Sans", "Montserrat", sans-serif`;

    // Word wrap
    const words = rawProgName.split(' ');
    let lines = [];
    let curLine = '';

    words.forEach(w => {
      const testLine = curLine ? `${curLine} ${w}` : w;
      if (ctx.measureText(testLine).width <= maxProgWidth) {
        curLine = testLine;
      } else {
        if (curLine) lines.push(curLine);
        curLine = w;
      }
    });
    if (curLine) lines.push(curLine);

    if (lines.length > 2) {
      progFontSize = 28;
      ctx.font = `700 ${progFontSize}px "Plus Jakarta Sans", "Montserrat", sans-serif`;
    }

    const startProgY = 345;
    const lineSpacing = progFontSize * 1.16;

    lines.forEach((lineText, lIdx) => {
      const lineY = startProgY + (lIdx * lineSpacing);
      ctx.fillStyle = '#1e293b'; // Deep dark navy
      ctx.fillText(lineText, catX, lineY);
    });
    ctx.restore();

    // 5. Render Podium Winners (1st, 2nd, 3rd) strictly bounded to the left (Max text width = 275px)
    const count = winners.length;
    let startWinnersY = 495;
    let gapY = 88;

    if (lines.length >= 2) {
      startWinnersY = 515;
      gapY = 84;
    }
    if (count >= 4) {
      gapY = 70;
      startWinnersY = 485;
    }

    const maxHolderWidth = 275; // Absolute bound: book starts at X 475, text starts at X 186 -> 186 + 275 = 461

    winners.forEach((w, idx) => {
      const pos = String(w.position || '').toLowerCase();
      let rank = 1;
      if (pos.includes('1') || pos.includes('first')) rank = 1;
      else if (pos.includes('2') || pos.includes('second')) rank = 2;
      else if (pos.includes('3') || pos.includes('third')) rank = 3;
      else rank = idx + 1;

      const currY = startWinnersY + (idx * gapY);

      // Draw Red/Orange Dots •, ••, •••
      ctx.save();
      ctx.fillStyle = '#dc2626'; // Vibrant Red/Orange accent
      const dotRadius = 5.5;
      const dotCenterY = currY - 9;

      if (rank === 1) {
        ctx.beginPath();
        ctx.arc(165, dotCenterY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (rank === 2) {
        ctx.beginPath();
        ctx.arc(155, dotCenterY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(170, dotCenterY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(146, dotCenterY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(160, dotCenterY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(174, dotCenterY, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Winner Name (Bold with dynamic font auto-scaler so it never reaches book)
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#1e293b';
      
      let nameFontSize = 26;
      ctx.font = `700 ${nameFontSize}px "Plus Jakarta Sans", "Montserrat", sans-serif`;
      const name = w.participantName || (rank === 1 ? '1st Winner' : rank === 2 ? '2nd Winner' : '3rd Winner');
      
      while (ctx.measureText(name).width > maxHolderWidth && nameFontSize > 15) {
        nameFontSize -= 1;
        ctx.font = `700 ${nameFontSize}px "Plus Jakarta Sans", "Montserrat", sans-serif`;
      }
      ctx.fillText(name, 186, currY);

      // Team Name (Regular / Medium with dynamic auto-scaler)
      ctx.fillStyle = '#475569';
      let teamFontSize = 20;
      ctx.font = `500 ${teamFontSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
      const team = w.team || '';
      while (ctx.measureText(team).width > maxHolderWidth && teamFontSize > 13) {
        teamFontSize -= 1;
        ctx.font = `500 ${teamFontSize}px "Plus Jakarta Sans", "Inter", sans-serif`;
      }
      ctx.fillText(team, 186, currY + 28);
      ctx.restore();
    });
  }

  /* ==========================================================================
     0B. ROYAL PURPLE POSTER (OFFICIAL DISCOVER THE UNSEEN EDITION)
     Matches Clean Base Image & User Mockup with 100% Precision!
     ========================================================================== */
  function renderRoyalPurplePoster(ctx, width, height) {
    const winners = getSortedWinners();
    const rawProgName = (currentResult.programName || 'PROGRAMME NAME');
    const category = (currentResult.category || 'Category');
    const resultNum = currentResultNum || '01';

    // 1. Draw Clean Royal Purple Base Image
    if (imgRoyalPurpleClean.complete && imgRoyalPurpleClean.naturalWidth > 0) {
      ctx.drawImage(imgRoyalPurpleClean, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Render Result Number inside the circular badge (center around X: 205, Y: 295)
    ctx.save();
    // Clear circle interior with crisp white
    ctx.beginPath();
    ctx.arc(205, 295, 78, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Draw subtle circle outline & horizontal bisector line
    ctx.beginPath();
    ctx.arc(205, 295, 78, 0, Math.PI * 2);
    ctx.strokeStyle = '#94a3b8'; // Clean light slate / violet outline
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(112, 295);
    ctx.lineTo(298, 295);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dynamic 2-digit number (e.g. "01", "02", "04")
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#334155';
    ctx.font = '300 102px "Outfit", "Space Grotesk", sans-serif';
    ctx.fillText(resultNum, 205, 290);
    ctx.restore();

    // 3. Render "Category" in elegant purple script/cursive font (above Programme Name)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#581c87'; // Royal purple script
    ctx.font = '400 44px "Satisfy", "Dancing Script", "Caveat", cursive';
    ctx.fillText(category, 310, 260);
    ctx.restore();

    // 4. Render "Programme Name" in bold deep purple
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const maxTextWidth = 475; // Available width before the vertical RESULT artwork on right
    let progFontSize = 46;
    ctx.font = `800 ${progFontSize}px "Montserrat", "Space Grotesk", sans-serif`;

    // Word wrap
    const words = rawProgName.split(' ');
    let lines = [];
    let curLine = '';

    words.forEach(w => {
      const testLine = curLine ? `${curLine} ${w}` : w;
      if (ctx.measureText(testLine).width <= maxTextWidth) {
        curLine = testLine;
      } else {
        if (curLine) lines.push(curLine);
        curLine = w;
      }
    });
    if (curLine) lines.push(curLine);

    if (lines.length > 2) {
      progFontSize = 36;
      ctx.font = `800 ${progFontSize}px "Montserrat", "Space Grotesk", sans-serif`;
    }
    if (lines.length > 3) {
      progFontSize = 28;
      ctx.font = `800 ${progFontSize}px "Montserrat", "Space Grotesk", sans-serif`;
    }

    const startProgY = 278;
    const lineSpacing = progFontSize * 1.15;

    lines.forEach((lineText, lIdx) => {
      const lineY = startProgY + (lIdx * lineSpacing);
      ctx.fillStyle = '#2e1065'; // Bold royal purple
      ctx.fillText(lineText, 310, lineY);
    });
    ctx.restore();

    // 5. Render Podium Winners (1st, 2nd, 3rd)
    const count = winners.length;
    let startWinnersY = 410;
    let gapY = 104;
    let nameFontSize = 33;
    let teamFontSize = 21;
    let badgeRadius = 25;

    if (lines.length >= 2) {
      startWinnersY = 430;
      gapY = 96;
    }
    if (count === 4) {
      gapY = 78;
      nameFontSize = 26;
      teamFontSize = 17;
      badgeRadius = 21;
    } else if (count >= 5) {
      gapY = 65;
      nameFontSize = 22;
      teamFontSize = 15;
      badgeRadius = 18;
    }

    winners.forEach((w, idx) => {
      const rowCenterY = startWinnersY + (idx * gapY);
      const posStr = String(w.position || '').toLowerCase();
      let posNum = '1';
      if (posStr.includes('2') || posStr.includes('second')) posNum = '2';
      else if (posStr.includes('3') || posStr.includes('third')) posNum = '3';
      else if (posStr.includes('1') || posStr.includes('first')) posNum = '1';
      else posNum = String(idx + 1);

      const pName = (w.participantName || `Winner ${idx + 1}`).toUpperCase();
      const team = (w.team || 'Team').toLowerCase();

      // Badge Circle (Solid dark purple circle with white bold number)
      ctx.save();
      const badgeCenterX = 168;
      const badgeCenterY = rowCenterY - 4;

      ctx.beginPath();
      ctx.arc(badgeCenterX, badgeCenterY, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#2e1065'; // Deep royal purple
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.round(badgeRadius * 1.15)}px "Montserrat", sans-serif`;
      ctx.fillText(posNum, badgeCenterX, badgeCenterY + 1);
      ctx.restore();

      // Holder Name (Bold deep purple text)
      ctx.save();
      const textStartX = 208;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1e0a3c'; // Deep bold purple
      ctx.font = `700 ${nameFontSize}px "Montserrat", sans-serif`;

      let displayName = pName;
      if (ctx.measureText(displayName).width > 480) {
        ctx.font = `700 ${nameFontSize - 4}px "Montserrat", sans-serif`;
      }
      ctx.fillText(displayName, textStartX, rowCenterY - 14);

      // Team Name (Slate / Purple-grey font)
      ctx.fillStyle = '#6d597a'; // Muted purple slate
      ctx.font = `500 ${teamFontSize}px "Montserrat", sans-serif`;
      ctx.fillText(team, textStartX, rowCenterY + 17);
      ctx.restore();
    });
  }

  /* ==========================================================================
     1. CRYSTAL MAGNIFIER POSTER (OFFICIAL WHITE & SAPPHIRE THEME)
     Matches User's Base (3rd image) and Example Layout (4th image) Perfectly!
     ========================================================================== */
  function renderCrystalMagnifierPoster(ctx, width, height) {
    const winners = getSortedWinners();
    const rawProgName = (currentResult.programName || 'PROGRAMME NAME').toUpperCase();
    const category = (currentResult.category || 'CATEGORY').toUpperCase();
    const resultNum = currentResultNum || '01';

    // 1. Draw Clean Base Background Image (with Header logos & Low-Poly Magnifier Map)
    if (imgCrystalClean.complete && imgCrystalClean.naturalWidth > 0) {
      ctx.drawImage(imgCrystalClean, 0, 0, width, height);
    } else {
      // Crisp white with soft icy vignette background fallback
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Render Header: "Result [ 01 ]" (Top Right)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // "Result" word in refined sans-serif
    ctx.fillStyle = '#0f2952'; // Deep navy
    ctx.font = '300 44px "Outfit", "Space Grotesk", sans-serif';
    ctx.fillText('Result', 385, 370);

    const resultWordWidth = ctx.measureText('Result').width;
    const boxX = 385 + resultWordWidth + 18;
    const boxY = 343;
    const boxW = 104;
    const boxH = 54;

    // Light-blue rounded pill badge
    roundRect(ctx, boxX, boxY, boxW, boxH, 8);
    ctx.fillStyle = '#cde5fb'; // Light sky blue
    ctx.fill();

    // Result number inside pill badge
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0b2545';
    ctx.font = '800 38px "Space Grotesk", "Outfit", sans-serif';
    ctx.fillText(resultNum, boxX + (boxW / 2), 370);
    ctx.restore();

    // 3. Render PROGRAMME NAME (Large Vibrant Electric Blue)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const maxTextWidth = 380; // Available width on the right column
    let progFontSize = 44;
    ctx.font = `900 ${progFontSize}px "Space Grotesk", "Outfit", sans-serif`;

    // Intelligent word wrap into lines
    const words = rawProgName.split(' ');
    let lines = [];
    let curLine = '';

    words.forEach(w => {
      const testLine = curLine ? `${curLine} ${w}` : w;
      if (ctx.measureText(testLine).width <= maxTextWidth) {
        curLine = testLine;
      } else {
        if (curLine) lines.push(curLine);
        curLine = w;
      }
    });
    if (curLine) lines.push(curLine);

    // If still too tall or wide, scale down font
    if (lines.length > 2) {
      progFontSize = 36;
      ctx.font = `900 ${progFontSize}px "Space Grotesk", "Outfit", sans-serif`;
    }
    if (lines.length > 3) {
      progFontSize = 30;
      ctx.font = `900 ${progFontSize}px "Space Grotesk", "Outfit", sans-serif`;
    }

    const startProgY = 416;
    const lineSpacing = progFontSize * 1.12;

    lines.forEach((lineText, lIdx) => {
      const lineY = startProgY + (lIdx * lineSpacing);
      // Vibrant royal blue gradient
      const textGrad = ctx.createLinearGradient(385, lineY, 385, lineY + progFontSize);
      textGrad.addColorStop(0, '#0062f5');
      textGrad.addColorStop(1, '#004fd4');
      ctx.fillStyle = textGrad;
      ctx.fillText(lineText, 385, lineY);
    });

    const afterProgY = startProgY + (lines.length * lineSpacing);

    // 4. Render CATEGORY (Cyan Sky Blue, Uppercase)
    const catY = afterProgY + 8;
    ctx.fillStyle = '#0ea5e9'; // Bright cyan/sky blue
    ctx.font = '700 20px "Outfit", sans-serif';
    ctx.fillText(category, 385, catY);
    ctx.restore();

    // 5. Render Winners Rows (1st, 2nd, 3rd, etc.)
    const count = winners.length;
    let startWinnersY = Math.max(554, catY + 48);
    let gapY = 88;
    let nameFontSize = 27;
    let teamFontSize = 18;

    if (count === 4) {
      gapY = 74;
      nameFontSize = 23;
      teamFontSize = 16;
    } else if (count >= 5) {
      gapY = 62;
      nameFontSize = 19;
      teamFontSize = 14;
    }

    winners.forEach((w, idx) => {
      const y = startWinnersY + (idx * gapY);
      const name = (w.participantName || `${w.position || '1st'} Holder NAME`).toUpperCase();
      const team = (w.team || 'HIS TEAM').toUpperCase();
      const posStr = String(w.position || '').toLowerCase();

      // Determine position number: 1, 2, 3
      let posNum = idx + 1;
      if (posStr.includes('1') || posStr.includes('first')) posNum = 1;
      else if (posStr.includes('2') || posStr.includes('second')) posNum = 2;
      else if (posStr.includes('3') || posStr.includes('third')) posNum = 3;

      let posLabel = `${posNum}st`;
      if (posNum === 2) posLabel = '2nd';
      if (posNum === 3) posLabel = '3rd';
      if (posNum >= 4) posLabel = `${posNum}th`;

      // Draw Stylized Cyan-to-Blue Marker on Left
      ctx.save();
      const markerX = 385;
      const markerY = y - 14;
      const markerW = 20;

      if (posNum === 1) {
        // 1st Place: Solid vertical gradient pill
        const markerH = 26;
        roundRect(ctx, markerX, markerY, markerW, markerH, 3);
        const markerGrad = ctx.createLinearGradient(markerX, markerY, markerX, markerY + markerH);
        markerGrad.addColorStop(0, '#00c0ff');
        markerGrad.addColorStop(1, '#0055ff');
        ctx.fillStyle = markerGrad;
        ctx.fill();
      } else if (posNum === 2) {
        // 2nd Place: 2 horizontal bar segments stacked vertically
        const barH = 11;
        const gap = 4;
        [0, 1].forEach(bIdx => {
          const bY = markerY + (bIdx * (barH + gap));
          roundRect(ctx, markerX, bY, markerW, barH, 2);
          const barGrad = ctx.createLinearGradient(markerX, bY, markerX, bY + barH);
          barGrad.addColorStop(0, '#00c0ff');
          barGrad.addColorStop(1, '#0077ff');
          ctx.fillStyle = barGrad;
          ctx.fill();
        });
      } else if (posNum === 3) {
        // 3rd Place: 3 horizontal bar segments stacked vertically
        const barH = 6.5;
        const gap = 3.2;
        [0, 1, 2].forEach(bIdx => {
          const bY = markerY + (bIdx * (barH + gap));
          roundRect(ctx, markerX, bY, markerW, barH, 1.5);
          const barGrad = ctx.createLinearGradient(markerX, bY, markerX, bY + barH);
          barGrad.addColorStop(0, '#00c0ff');
          barGrad.addColorStop(1, '#0088ff');
          ctx.fillStyle = barGrad;
          ctx.fill();
        });
      } else {
        // 4th+ Place: 4 segments or diamond
        const barH = 4.5;
        const gap = 2.5;
        [0, 1, 2, 3].forEach(bIdx => {
          const bY = markerY + (bIdx * (barH + gap));
          roundRect(ctx, markerX, bY, markerW, barH, 1);
          ctx.fillStyle = '#0ea5e9';
          ctx.fill();
        });
      }
      ctx.restore();

      // Render Winner Name (Clean name without "1st, 2nd, 3rd" text per user request)
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      let fittedNameSize = nameFontSize;
      if (name.length > 20) fittedNameSize = nameFontSize - 3;
      if (name.length > 28) fittedNameSize = nameFontSize - 6;

      ctx.fillStyle = '#09223f'; // Deep midnight navy
      ctx.font = `800 ${fittedNameSize}px "Outfit", "Space Grotesk", sans-serif`;

      // Render: Participant NAME directly (geometric marker on left indicates position)
      ctx.fillText(name, 418, y - 2);

      // Render Winner Team: "HIS TEAM"
      ctx.fillStyle = '#0284c7'; // Vivid cyan sky blue
      ctx.font = `700 ${teamFontSize}px "Outfit", sans-serif`;
      ctx.fillText(team, 418, y + 24);
      ctx.restore();
    });
  }

  /* ==========================================================================
     2. POSTAGE STAMP POSTER (GREY/WHITE TEMPLATE)
     Significantly Enlarged Typography for Programme Name & Category per Screenshot!
     ========================================================================== */
  function renderStampVintagePoster(ctx, width, height) {
    const winners = getSortedWinners();
    const progName = (currentResult.programName || 'PROGRAMME NAME').toUpperCase();
    const category = currentResult.category || 'Category';
    const resultNum = currentResultNum || '01';

    // 1. Draw Clean Base Background Image
    if (imgStampClean.complete && imgStampClean.naturalWidth > 0) {
      ctx.drawImage(imgStampClean, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Render Left Result Number "01"
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '800 86px "Space Grotesk", "Outfit", sans-serif';
    ctx.fillText(resultNum, 175, 335);
    ctx.restore();

    // 3. Render Vertical Rotated Text for Programme Name & Category (MAXIMUM LEGIBILITY & SCALE!)
    ctx.save();
    ctx.translate(205, 805);
    ctx.rotate(-Math.PI / 2); // Rotate 90 degrees counter-clockwise
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Significantly Enlarged font size for Programme Name (38px baseline / vertFontSize = 32)
    let vertFontSize = 38;
    if (progName.length > 14) vertFontSize = 33;
    if (progName.length > 22) vertFontSize = 28;
    if (progName.length > 30) vertFontSize = 23;
    if (progName.length > 38) vertFontSize = 19;

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${vertFontSize}px "Space Grotesk", "Outfit", sans-serif`;
    ctx.fillText(progName, 0, 0);

    // Significantly Enlarged font size for Category (26px baseline / font = '700 24px "Outfit", sans-serif')
    ctx.fillStyle = '#f1f5f9'; // Bright crisp white/silver
    ctx.font = '700 26px "Outfit", sans-serif';
    ctx.fillText(category, 0, Math.max(38, vertFontSize + 6));
    ctx.restore();

    // 4. Render Winners List Inside Stamp
    const count = winners.length;
    let startY = 526;
    let gapY = 98;
    let nameFontSize = 25;
    let teamFontSize = 20;

    if (count === 4) {
      startY = 512;
      gapY = 74;
      nameFontSize = 22;
      teamFontSize = 17;
    } else if (count >= 5) {
      startY = 500;
      gapY = 62;
      nameFontSize = 19;
      teamFontSize = 15;
    }

    winners.forEach((w, idx) => {
      const y = startY + (idx * gapY);
      const name = (w.participantName || 'Holder Name').toUpperCase();
      const team = w.team || 'Bukhara';

      // Number of dots according to position
      let dots = 1;
      const posStr = String(w.position || '').toLowerCase();
      if (posStr.includes('1')) dots = 1;
      else if (posStr.includes('2')) dots = 2;
      else if (posStr.includes('3')) dots = 3;
      else dots = 1;

      // Draw Dark Grey Bullet Dots
      ctx.save();
      ctx.fillStyle = '#4b5563';
      const dotRadius = count >= 5 ? 5.5 : 7;
      const dotSpacing = count >= 5 ? 13 : 16;
      const baseDotX = 430;

      for (let d = 0; d < dots; d++) {
        const dotX = baseDotX - ((dots - 1 - d) * dotSpacing);
        ctx.beginPath();
        ctx.arc(dotX, y - (count >= 5 ? 2 : 4), dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Winner Name
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      let fittedNameSize = nameFontSize;
      if (name.length > 18) fittedNameSize = nameFontSize - 3;
      if (name.length > 26) fittedNameSize = nameFontSize - 6;

      ctx.fillStyle = '#111827'; // Charcoal dark
      ctx.font = `700 ${fittedNameSize}px "Outfit", sans-serif`;
      ctx.fillText(name, 460, y - 4);

      // Draw Winner Team
      ctx.fillStyle = '#4b5563'; // Slate grey
      ctx.font = `600 ${teamFontSize}px "Outfit", sans-serif`;
      ctx.fillText(team, 460, y + (count >= 5 ? 18 : 26));
      ctx.restore();
    });
  }

  /* ==========================================================================
     3. DEEP OCEAN COMPASS POSTER (BLUE TEMPLATE)
     ========================================================================== */
  function renderOceanCompassPoster(ctx, width, height) {
    const winners = getSortedWinners();
    const progName = (currentResult.programName || 'PROGRAMME NAME').toUpperCase();
    const category = currentResult.category || 'Category';
    const resultNum = currentResultNum || '01';

    // 1. Draw Clean Base Background Image
    if (imgOceanClean.complete && imgOceanClean.naturalWidth > 0) {
      ctx.drawImage(imgOceanClean, 0, 0, width, height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#042759');
      grad.addColorStop(1, '#01132e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Render PROGRAMME NAME & Category (Top Right)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    let progFontSize = 26;
    if (progName.length > 22) progFontSize = 21;
    if (progName.length > 30) progFontSize = 18;

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${progFontSize}px "Space Grotesk", "Outfit", sans-serif`;
    ctx.fillText(progName, 395, 422);

    ctx.fillStyle = '#f59e0b'; // Golden yellow
    ctx.font = '600 22px "Outfit", sans-serif';
    ctx.fillText(category, 395, 456);
    ctx.restore();

    // 3. Render Result Number (e.g. 01) over Compass
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.65)'; // Luminous soft crystal blue
    ctx.font = '800 86px "Space Grotesk", "Outfit", sans-serif';
    ctx.fillText(resultNum, 185, 570);
    ctx.restore();

    // 4. Render Winners List (Dynamically arranged for 1 to 5 winners)
    const count = winners.length;
    let startY = 558;
    let gapY = 98;
    let nameFontSize = 25;
    let teamFontSize = 20;

    if (count === 4) {
      startY = 538;
      gapY = 76;
      nameFontSize = 22;
      teamFontSize = 17;
    } else if (count >= 5) {
      startY = 525;
      gapY = 64;
      nameFontSize = 19;
      teamFontSize = 15;
    }

    winners.forEach((w, idx) => {
      const y = startY + (idx * gapY);
      const name = (w.participantName || 'Holder Name').toUpperCase();
      const team = w.team || 'Bukhara';

      // Number of dots according to position
      let dots = 1;
      const posStr = String(w.position || '').toLowerCase();
      if (posStr.includes('1')) dots = 1;
      else if (posStr.includes('2')) dots = 2;
      else if (posStr.includes('3')) dots = 3;
      else dots = 1;

      // Draw Golden Bullet Dots
      ctx.save();
      ctx.fillStyle = '#f59e0b';
      const dotRadius = count >= 5 ? 5.5 : 7;
      const dotSpacing = count >= 5 ? 13 : 16;
      const baseDotX = 350;

      for (let d = 0; d < dots; d++) {
        const dotX = baseDotX - ((dots - 1 - d) * dotSpacing);
        ctx.beginPath();
        ctx.arc(dotX, y - (count >= 5 ? 2 : 4), dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Winner Name
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      let fittedNameSize = nameFontSize;
      if (name.length > 20) fittedNameSize = nameFontSize - 3;
      if (name.length > 28) fittedNameSize = nameFontSize - 6;

      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${fittedNameSize}px "Outfit", sans-serif`;
      ctx.fillText(name, 385, y - 4);

      // Draw Winner Team
      ctx.fillStyle = '#fbbf24';
      ctx.font = `600 ${teamFontSize}px "Outfit", sans-serif`;
      ctx.fillText(team, 385, y + (count >= 5 ? 18 : 26));
      ctx.restore();
    });
  }

  /* ==========================================================================
     4. SPIRAL NOTEBOOK & MOBILE POSTER (MONTSERRAT TYPOGRAPHY & EXACT COLOR)
     ========================================================================== */
  function renderNotebookCraftPoster(ctx, width, height) {
    const winners = getSortedWinners();
    const progName = (currentResult.programName || 'PROGRAMME NAME').toUpperCase();
    const category = (currentResult.category || 'CATEGORY').toUpperCase();
    const resultNum = currentResultNum || '01';

    // 1. Draw Clean Base Background Image
    if (imgNotebookClean.complete && imgNotebookClean.naturalWidth > 0) {
      ctx.drawImage(imgNotebookClean, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Render Result Number (Top Right of Notebook Page, before phone)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(124, 45, 55, 0.75)'; // Soft wine red / mauve
    ctx.font = '800 84px "Montserrat", sans-serif';
    ctx.fillText(resultNum, 590, 310);
    ctx.restore();

    // 3. Render CATEGORY (Top Left of Notebook)
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#b45309'; // Golden brown / mustard
    ctx.font = '700 19px "Montserrat", sans-serif';
    ctx.fillText(category, 175, 305);

    // 4. Render PROGRAMME NAME (Below Category with strict max width before phone)
    const maxProgWidth = 280;
    let progFontSize = 28;
    ctx.font = `800 ${progFontSize}px "Montserrat", sans-serif`;
    while (ctx.measureText(progName).width > maxProgWidth && progFontSize > 15) {
      progFontSize -= 0.5;
      ctx.font = `800 ${progFontSize}px "Montserrat", sans-serif`;
    }

    ctx.fillStyle = '#111827'; // Bold dark charcoal/black
    ctx.fillText(progName, 175, 345);
    ctx.restore();

    // 5. Render Winners Rows on Notebook Grid with 1, 2, 3 Square Indicators
    const count = winners.length;
    let startY = 440;
    let gapY = 94;
    let nameFontSize = 22;
    let teamFontSize = 16;
    const maxWinnerWidth = 250; // Strictly safe from the phone edge at X ≈ 460

    if (count === 4) {
      startY = 425;
      gapY = 76;
      nameFontSize = 19;
      teamFontSize = 14;
    } else if (count >= 5) {
      startY = 410;
      gapY = 62;
      nameFontSize = 17;
      teamFontSize = 13;
    }

    winners.forEach((w, idx) => {
      const y = startY + (idx * gapY);
      const name = (w.participantName || `${w.position || '1st'} Holder Name`).toUpperCase();
      const team = (w.team || 'HIS TEAM').toUpperCase();

      // Determine rank position number (1, 2, 3)
      const posStr = String(w.position || '').toLowerCase();
      let rankNum = idx + 1;
      if (posStr.includes('1') || posStr.includes('first')) rankNum = 1;
      else if (posStr.includes('2') || posStr.includes('second')) rankNum = 2;
      else if (posStr.includes('3') || posStr.includes('third')) rankNum = 3;
      else rankNum = Math.min(3, idx + 1);

      // Draw exact small squares according to standing (1 square for 1st, 2 squares for 2nd, 3 squares for 3rd)
      ctx.save();
      ctx.fillStyle = '#1f2937'; // Solid charcoal black

      const sqX = 175;
      if (rankNum === 1) {
        // 1 Square for 1st Place
        const sqSize = count >= 5 ? 11 : 13;
        ctx.fillRect(sqX, y - (sqSize / 2) - 4, sqSize, sqSize);
      } else if (rankNum === 2) {
        // 2 Squares stacked vertically for 2nd Place
        const sqSize = count >= 5 ? 9 : 11;
        const gap = 3;
        const totalH = (sqSize * 2) + gap;
        const topY = y - (totalH / 2) - 4;
        ctx.fillRect(sqX, topY, sqSize, sqSize);
        ctx.fillRect(sqX, topY + sqSize + gap, sqSize, sqSize);
      } else if (rankNum === 3) {
        // 3 Squares stacked vertically for 3rd Place
        const sqSize = count >= 5 ? 8 : 10;
        const gap = 3;
        const totalH = (sqSize * 3) + (gap * 2);
        const topY = y - (totalH / 2) - 4;
        ctx.fillRect(sqX, topY, sqSize, sqSize);
        ctx.fillRect(sqX, topY + sqSize + gap, sqSize, sqSize);
        ctx.fillRect(sqX, topY + (sqSize * 2) + (gap * 2), sqSize, sqSize);
      } else {
        // Default 1 square
        const sqSize = 11;
        ctx.fillRect(sqX, y - (sqSize / 2) - 4, sqSize, sqSize);
      }
      ctx.restore();

      const textStartX = 200;

      // Winner Name (Slate Grey) with auto-scaling to guarantee NO overlap with phone
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      let fittedNameSize = nameFontSize;
      ctx.font = `700 ${fittedNameSize}px "Montserrat", sans-serif`;
      while (ctx.measureText(name).width > maxWinnerWidth && fittedNameSize > 12) {
        fittedNameSize -= 0.5;
        ctx.font = `700 ${fittedNameSize}px "Montserrat", sans-serif`;
      }

      ctx.fillStyle = '#334155'; // Dark slate grey for crisp readability
      ctx.fillText(name, textStartX, y - (count >= 5 ? 4 : 6));

      // Winner Team (Mustard / Golden Yellow) with auto-scaling
      let fittedTeamSize = teamFontSize;
      ctx.font = `700 ${fittedTeamSize}px "Montserrat", sans-serif`;
      while (ctx.measureText(team).width > maxWinnerWidth && fittedTeamSize > 10) {
        fittedTeamSize -= 0.5;
        ctx.font = `700 ${fittedTeamSize}px "Montserrat", sans-serif`;
      }

      ctx.fillStyle = '#b45309'; // Mustard golden yellow
      ctx.fillText(team, textStartX, y + (count >= 5 ? 14 : 18));
      ctx.restore();
    });
  }

  /* ==========================================================================
     DOWNLOAD HIGH RESOLUTION POSTER
     ========================================================================== */
  function downloadPosterPNG() {
    const canvas = document.getElementById('fiesta-poster-canvas');
    if (!canvas) return;

    const progName = currentResult ? (currentResult.programName || 'Result').replace(/[^a-zA-Z0-9_-]/g, '_') : 'Result';
    const num = currentResultNum || '01';
    const link = document.createElement('a');
    link.download = `Excellentia_2026_Result_${num}_${progName}_${currentTemplate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function initPosterListeners() {
    const btnClose = document.getElementById('btn-close-poster-modal');
    if (btnClose) btnClose.addEventListener('click', closePosterModal);

    const btnDownload = document.getElementById('btn-download-poster-png');
    if (btnDownload) btnDownload.addEventListener('click', downloadPosterPNG);

    const templateSelect = document.getElementById('poster-template-select');
    if (templateSelect) {
      templateSelect.addEventListener('change', (e) => setTemplate(e.target.value));
    }

    const resultNumInput = document.getElementById('poster-result-num');
    if (resultNumInput) {
      resultNumInput.addEventListener('input', (e) => setResultNumber(e.target.value));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPosterListeners);
  } else {
    initPosterListeners();
  }

  return {
    openPosterModal,
    closePosterModal,
    renderPoster,
    setTemplate,
    setResultNumber,
    downloadPosterPNG
  };
})();
