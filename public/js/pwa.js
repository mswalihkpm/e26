/**
 * Progressive Web App (PWA) Install & Service Worker Controller
 * Excellentia Arts Fiesta 2026
 */

(function() {
  let deferredPrompt = null;

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Excellentia 2026 PWA Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA Service Worker registration failed:', err);
        });
    });
  }

  // Check if running in standalone PWA mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) {
    document.documentElement.classList.add('is-pwa-standalone');
  }

  // Detect iOS Safari
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Capture install prompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent standard mini-infobar
    e.preventDefault();
    deferredPrompt = e;
    window.deferredPWAInstallPrompt = e;

    // Show Install UI elements
    updateInstallUI(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.deferredPWAInstallPrompt = null;
    updateInstallUI(false);
    if (window.showToast) {
      window.showToast('🎉 Excellentia Arts Fiesta 2026 installed successfully!', 'success', 5000);
    }
    if (typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  });

  function updateInstallUI(show) {
    const footerBtn = document.getElementById('btn-footer-pwa-install');
    const drawerBtn = document.getElementById('btn-drawer-pwa-install');
    const settingsBtn = document.getElementById('btn-settings-pwa-install');
    const floatingBanner = document.getElementById('pwa-install-banner');

    if (footerBtn) footerBtn.style.display = show ? 'inline-flex' : 'none';
    if (drawerBtn) drawerBtn.style.display = show ? 'flex' : 'none';
    if (settingsBtn) settingsBtn.style.display = show ? 'inline-flex' : 'none';
    if (floatingBanner && show && !isStandalone && !localStorage.getItem('fiesta_pwa_banner_dismissed')) {
      floatingBanner.classList.remove('hidden');
    }
  }

  // Global trigger function for any install button
  window.triggerPWAInstall = async function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        if (window.showToast) window.showToast('Installing Excellentia 2026 App...', 'info');
      }
      deferredPrompt = null;
      window.deferredPWAInstallPrompt = null;
      updateInstallUI(false);
    } else if (isIOS && !isStandalone) {
      // Show iOS installation instruction modal
      showIOSInstallModal();
    } else {
      if (window.showToast) {
        window.showToast('App is already installed or ready on your device!', 'info');
      }
    }
  };

  function showIOSInstallModal() {
    const modal = document.getElementById('modal-ios-install-guide');
    if (modal) {
      modal.classList.add('active');
    } else if (window.showToast) {
      window.showToast("To install on iOS: Tap 'Share' (⎋) in Safari and choose 'Add to Home Screen'", 'info', 7000);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Attach click handlers to all PWA install triggers
    const triggers = document.querySelectorAll('.btn-trigger-pwa-install, #btn-footer-pwa-install, #btn-drawer-pwa-install, #btn-settings-pwa-install, #btn-banner-install');
    triggers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.triggerPWAInstall();
      });
    });

    const btnDismissBanner = document.getElementById('btn-dismiss-pwa-banner');
    if (btnDismissBanner) {
      btnDismissBanner.addEventListener('click', () => {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.classList.add('hidden');
        localStorage.setItem('fiesta_pwa_banner_dismissed', 'true');
      });
    }

    const btnCloseIOS = document.getElementById('btn-close-ios-guide');
    if (btnCloseIOS) {
      btnCloseIOS.addEventListener('click', () => {
        const modal = document.getElementById('modal-ios-install-guide');
        if (modal) modal.classList.remove('active');
      });
    }

    // Check on launch
    if (!isStandalone && isIOS) {
      // Show iOS install option in footer, settings and drawer
      const footerBtn = document.getElementById('btn-footer-pwa-install');
      const drawerBtn = document.getElementById('btn-drawer-pwa-install');
      const settingsBtn = document.getElementById('btn-settings-pwa-install');
      if (footerBtn) footerBtn.style.display = 'inline-flex';
      if (drawerBtn) drawerBtn.style.display = 'flex';
      if (settingsBtn) settingsBtn.style.display = 'inline-flex';
    }
  });
})();
