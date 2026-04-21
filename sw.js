const CACHE_NAME_SHELL = 'onesearch-shell-v2';
const CACHE_NAME_DATA  = 'onesearch-data-v1';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
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
      console.log('[SW] Pre-caching App Shell');
      return cache.addAll(SHELL_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME_SHELL && key !== CACHE_NAME_DATA) {
          console.log('[SW] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // If it's a request to our data directory (books.json, prodi_index.json, etc.)
  // We use Stale-While-Revalidate strategy
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(CACHE_NAME_DATA).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            console.log('[SW] Network error on data fetch, using cached if available', err);
          });
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // For app shell and other assets: Cache-First strategy with network fallback
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then(fetchRes => {
         // Optionally cache new found images/assets dynamically 
         if(event.request.method === 'GET' && fetchRes.status === 200) {
             return caches.open(CACHE_NAME_SHELL).then(cache => {
                 cache.put(event.request, fetchRes.clone());
                 return fetchRes;
             });
         }
         return fetchRes;
      });
    })
  );
});
