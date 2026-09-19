// Service Worker for Excellentia Arts Fiesta 2026 PWA
const CACHE_NAME = 'excellentia-arts-fiesta-2026-v2.1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/css/main.css',
  '/css/components.css',
  '/css/poster.css',
  '/css/admin.css',
  '/js/api.js',
  '/js/app.js',
  '/js/results.js',
  '/js/slideshow.js',
  '/js/poster-canvas.js',
  '/js/admin.js',
  '/js/pwa.js',
  '/assets/images/theme-iceberg-logo.png',
  '/assets/images/excellentia-brand-logo.png',
  '/assets/images/theme-text-discover.png',
  '/assets/images/icons/icon-72.png',
  '/assets/images/icons/icon-96.png',
  '/assets/images/icons/icon-128.png',
  '/assets/images/icons/icon-144.png',
  '/assets/images/icons/icon-152.png',
  '/assets/images/icons/icon-192.png',
  '/assets/images/icons/icon-384.png',
  '/assets/images/icons/icon-512.png',
  '/assets/images/icons/icon-1024.png',
  '/assets/images/icons/icon-maskable-192.png',
  '/assets/images/icons/icon-maskable-512.png',
  '/assets/images/icons/shortcut-results.png',
  '/assets/images/icons/shortcut-leaderboard.png',
  '/assets/images/icons/shortcut-slideshow.png',
  '/assets/images/icons/shortcut-gallery.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('Some precache assets could not be loaded immediately:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always use Network-First for API calls and dynamic uploads/videos
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/videos/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-While-Revalidate or Cache-First for static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
