const CACHE_NAME_SHELL = 'onesearch-shell-v104';
const CACHE_NAME_DATA  = 'onesearch-data-v104';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/search.js',
  '/js/recommender.js',
  '/js/app.js',
  '/img/logo-1.png',
  '/img/logo-2.png',
  '/img/logo4.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME_SHELL).then((cache) => {
      console.log('[SW] Pre-caching App Shell v86');
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME_SHELL && key !== CACHE_NAME_DATA) {
          console.log('[SW] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Ignore cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // API calls & proxy requests: Network-only
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/search') || url.pathname.startsWith('/suggest')) {
    return;
  }

  // Data files: Stale-While-Revalidate
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(CACHE_NAME_DATA).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => null);
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Scripts, CSS, and HTML: Network-First strategy
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME_SHELL).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
