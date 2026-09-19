/**
 * Universal Floating Popover Dropdown Engine
 * Excellentia Arts Fiesta 2026 - Discover The Unseen
 * 
 * Replaces rigid browser dropdowns with floating, glassmorphic popover menus.
 * Renders into body portal to completely eliminate modal / overflow clipping,
 * with viewport collision auto-flipping, search filtering, and full keyboard navigation.
 */

window.FiestaPopover = (function() {
  let activePopover = null;
  let activeTrigger = null;
  let activeSelect = null;
  let popoverContainer = null;
  let isInitialized = false;

  // Icons mapping for common option terms
  const ICON_MAP = {
    'all': 'fa-solid fa-layer-group',
    'bukhara': 'fa-solid fa-crown text-gold',
    'undulus': 'fa-solid fa-water text-emerald',
    'samarkhand': 'fa-solid fa-moon text-purple',
    'qurthuba': 'fa-solid fa-fire text-ruby',
    'a-zone': 'fa-solid fa-cube text-cyan',
    'b-zone': 'fa-solid fa-cube text-purple',
    'c-zone': 'fa-solid fa-cube text-gold',
    'general': 'fa-solid fa-star text-gold',
    '1st': 'fa-solid fa-crown text-gold',
    '2nd': 'fa-solid fa-medal text-silver',
    '3rd': 'fa-solid fa-award text-bronze',
    'crystal-magnifier': 'fa-solid fa-gem text-cyan',
    'literary-orange': 'fa-solid fa-book-open text-orange',
    'royal-purple': 'fa-solid fa-wand-magic-sparkles text-purple',
    'stamp-vintage': 'fa-solid fa-stamp text-slate',
    'ocean-compass': 'fa-solid fa-compass text-sky',
    'notebook-craft': 'fa-solid fa-pen-nib text-amber',
    'num-desc': 'fa-solid fa-arrow-down-9-1 text-cyan',
    'num-asc': 'fa-solid fa-arrow-up-1-9 text-purple',
    'name': 'fa-solid fa-arrow-down-a-z text-gold',
    'approved': 'fa-solid fa-circle-check text-emerald',
    'pending': 'fa-solid fa-clock text-gold',
    'text': 'fa-solid fa-pen-nib text-purple',
    'image': 'fa-solid fa-image text-cyan',
    'video': 'fa-solid fa-video text-ruby',
    'pdf': 'fa-solid fa-file-pdf text-gold'
  };

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    // Create global portal container for floating popovers
    popoverContainer = document.getElementById('fiesta-floating-popover-portal');
    if (!popoverContainer) {
      popoverContainer = document.createElement('div');
      popoverContainer.id = 'fiesta-floating-popover-portal';
      popoverContainer.className = 'fiesta-popover-portal';
      document.body.appendChild(popoverContainer);
    }

    // Global dismiss listeners
    document.addEventListener('click', onDocumentClick, true);
    document.addEventListener('keydown', onDocumentKeyDown, true);
    window.addEventListener('resize', closeActive, { passive: true });
    window.addEventListener('scroll', closeActive, { passive: true });

    // Enhance all existing select elements
    enhanceAllSelects();

    // Observe DOM for dynamically added selects (e.g. in Admin modals) with debounced targeted check
    let debounceEnhanceTimer = null;
    const observer = new MutationObserver(mutations => {
      let hasNewSelect = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          for (let i = 0; i < m.addedNodes.length; i++) {
            const node = m.addedNodes[i];
            if (node.nodeType === 1) { // Element node
              if (node.tagName === 'SELECT' || (node.querySelector && node.querySelector('select'))) {
                hasNewSelect = true;
                break;
              }
            }
          }
        }
        if (hasNewSelect) break;
      }
      if (hasNewSelect) {
        if (debounceEnhanceTimer) clearTimeout(debounceEnhanceTimer);
        debounceEnhanceTimer = setTimeout(enhanceAllSelects, 60);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function getIconForText(text, val) {
    const s = `${val || ''} ${text || ''}`.toLowerCase();
    for (const k in ICON_MAP) {
      if (s.includes(k)) return ICON_MAP[k];
    }
    return 'fa-solid fa-chevron-right text-muted';
  }

  function enhanceAllSelects() {
    const selects = document.querySelectorAll('select:not(.native-only):not([data-popover-enhanced])');
    selects.forEach(sel => {
      enhanceSelect(sel);
    });
  }

  function enhanceSelect(selectEl) {
    if (!selectEl || selectEl.dataset.popoverEnhanced === 'true') return;
    selectEl.dataset.popoverEnhanced = 'true';

    // Hide native select visually while keeping accessible for forms
    selectEl.classList.add('popover-hidden-native');

    // Create luxury custom trigger button
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = `floating-popover-trigger ${selectEl.className.replace('popover-hidden-native', '')}`;
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    // Clone styles and width properties
    if (selectEl.style.width) trigger.style.width = selectEl.style.width;
    if (selectEl.style.minWidth) trigger.style.minWidth = selectEl.style.minWidth;
    if (selectEl.style.maxWidth) trigger.style.maxWidth = selectEl.style.maxWidth;

    updateTriggerDisplay(trigger, selectEl);

    // Insert trigger directly after the native select
    selectEl.parentNode.insertBefore(trigger, selectEl.nextSibling);

    // Click trigger to toggle floating popover
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTrigger === trigger) {
        closeActive();
      } else {
        openPopover(trigger, selectEl);
      }
    });

    // Native select change event listener to keep trigger updated
    selectEl.addEventListener('change', () => {
      updateTriggerDisplay(trigger, selectEl);
    });
  }

  function updateTriggerDisplay(trigger, selectEl) {
    const selectedOption = selectEl.options[selectEl.selectedIndex] || selectEl.options[0];
    const text = selectedOption ? selectedOption.text : (selectEl.placeholder || 'Select Option');
    const val = selectedOption ? selectedOption.value : '';
    const iconClass = getIconForText(text, val);

    trigger.innerHTML = `
      <span class="fpop-trigger-inner">
        <span class="fpop-trigger-icon"><i class="${iconClass}"></i></span>
        <span class="fpop-trigger-label">${escapeHTML(text)}</span>
      </span>
      <span class="fpop-trigger-chevron"><i class="fa-solid fa-chevron-down"></i></span>
    `;
  }

  function openPopover(trigger, selectEl) {
    closeActive();

    activeTrigger = trigger;
    activeSelect = selectEl;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.classList.add('active-popover-open');

    const popover = document.createElement('div');
    popover.className = 'floating-popover-menu popover-enter';
    popover.setAttribute('role', 'listbox');

    // Check if search bar is needed (for > 5 items)
    const options = Array.from(selectEl.options);
    const hasSearch = options.length > 5;

    let searchHTML = '';
    if (hasSearch) {
      searchHTML = `
        <div class="fpop-search-bar">
          <i class="fa-solid fa-magnifying-glass fpop-search-icon"></i>
          <input type="text" class="fpop-search-input" placeholder="Search options..." autocomplete="off" />
        </div>
      `;
    }

    const currentVal = selectEl.value;
    const itemsHTML = options.map((opt, idx) => {
      const isSelected = opt.value === currentVal;
      const iconClass = getIconForText(opt.text, opt.value);
      return `
        <div class="fpop-option ${isSelected ? 'selected' : ''}" data-value="${escapeHTML(opt.value)}" data-index="${idx}" role="option" aria-selected="${isSelected}">
          <span class="fpop-opt-left">
            <span class="fpop-opt-icon"><i class="${iconClass}"></i></span>
            <span class="fpop-opt-text">${escapeHTML(opt.text)}</span>
          </span>
          ${isSelected ? '<span class="fpop-opt-check"><i class="fa-solid fa-check text-cyan"></i></span>' : ''}
        </div>
      `;
    }).join('');

    popover.innerHTML = `
      ${searchHTML}
      <div class="fpop-options-list">
        ${itemsHTML}
      </div>
    `;

    popoverContainer.appendChild(popover);
    activePopover = popover;

    // Position popover floating seamlessly above/below trigger
    positionPopover(trigger, popover);

    // Attach search filter listener
    if (hasSearch) {
      const searchInput = popover.querySelector('.fpop-search-input');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 50);
        searchInput.addEventListener('input', (e) => {
          const q = e.target.value.toLowerCase().trim();
          popover.querySelectorAll('.fpop-option').forEach(item => {
            const txt = item.textContent.toLowerCase();
            item.style.display = txt.includes(q) ? 'flex' : 'none';
          });
        });
      }
    }

    // Attach option click listeners
    popover.querySelectorAll('.fpop-option').forEach(optEl => {
      optEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = optEl.dataset.value;
        selectOption(val);
      });
    });
  }

  function positionPopover(trigger, popover) {
    const rect = trigger.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate vertical placement (flip up if not enough space below)
    let top = rect.bottom + margin;
    let isFlipped = false;

    if (top + popoverRect.height > viewportHeight - 16 && rect.top > popoverRect.height + margin + 16) {
      top = rect.top - popoverRect.height - margin;
      isFlipped = true;
    }

    // Calculate horizontal placement (clamp within viewport)
    let left = rect.left;
    const minWidth = Math.max(rect.width, 190);
    popover.style.minWidth = `${minWidth}px`;

    if (left + minWidth > viewportWidth - 16) {
      left = Math.max(16, viewportWidth - minWidth - 16);
    }

    popover.style.top = `${Math.round(top)}px`;
    popover.style.left = `${Math.round(left)}px`;
    if (isFlipped) {
      popover.classList.add('flipped-up');
    }
  }

  function selectOption(value) {
    if (!activeSelect) return;
    activeSelect.value = value;

    // Trigger standard events for compatibility with app & forms
    activeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    activeSelect.dispatchEvent(new Event('input', { bubbles: true }));

    if (activeTrigger) {
      updateTriggerDisplay(activeTrigger, activeSelect);
    }

    closeActive();
  }

  function closeActive() {
    if (activePopover && activePopover.parentNode) {
      activePopover.parentNode.removeChild(activePopover);
    }
    if (activeTrigger) {
      activeTrigger.setAttribute('aria-expanded', 'false');
      activeTrigger.classList.remove('active-popover-open');
    }
    activePopover = null;
    activeTrigger = null;
    activeSelect = null;
  }

  function onDocumentClick(e) {
    if (!activePopover) return;
    if (activePopover.contains(e.target) || (activeTrigger && activeTrigger.contains(e.target))) {
      return;
    }
    closeActive();
  }

  function onDocumentKeyDown(e) {
    if (!activePopover) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeActive();
      if (activeTrigger) activeTrigger.focus();
      return;
    }

    const visibleOptions = Array.from(activePopover.querySelectorAll('.fpop-option')).filter(el => el.style.display !== 'none');
    if (visibleOptions.length === 0) return;

    const focusedIdx = visibleOptions.findIndex(el => el.classList.contains('highlighted'));

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = focusedIdx < visibleOptions.length - 1 ? focusedIdx + 1 : 0;
      visibleOptions.forEach(el => el.classList.remove('highlighted'));
      visibleOptions[nextIdx].classList.add('highlighted');
      visibleOptions[nextIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = focusedIdx > 0 ? focusedIdx - 1 : visibleOptions.length - 1;
      visibleOptions.forEach(el => el.classList.remove('highlighted'));
      visibleOptions[prevIdx].classList.add('highlighted');
      visibleOptions[prevIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      if (focusedIdx >= 0 && visibleOptions[focusedIdx]) {
        e.preventDefault();
        selectOption(visibleOptions[focusedIdx].dataset.value);
      }
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

  return {
    init,
    enhanceSelect,
    enhanceAllSelects,
    closeActive
  };
})();

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.FiestaPopover && typeof window.FiestaPopover.init === 'function') {
    window.FiestaPopover.init();
  }
});
