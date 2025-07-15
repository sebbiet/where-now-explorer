// Service Worker for offline support
const CACHE_NAME = 'thereyetapp-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/og-image.png',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap',
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /nominatim\.openstreetmap\.org/,
  /router\.project-osrm\.org/,
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (shouldCacheAPI(request.url)) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response and fetch in background
            fetchAndCache(request, cache);
            return cachedResponse;
          }
          // Not in cache, fetch and cache
          return fetchAndCache(request, cache);
        });
      })
    );
    return;
  }

  // Handle static assets and app routes
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return offline fallback for HTML requests
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
    );
  }
});

function shouldCacheAPI(url) {
  return API_CACHE_PATTERNS.some((pattern) => pattern.test(url));
}

function fetchAndCache(request, cache) {
  return fetch(request)
    .then((response) => {
      if (response.status === 200) {
        const responseClone = response.clone();
        // Cache API responses for 5 minutes
        const headers = new Headers(responseClone.headers);
        headers.set('sw-cache-timestamp', Date.now().toString());

        const modifiedResponse = new Response(responseClone.body, {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers: headers,
        });

        cache.put(request, modifiedResponse);
      }
      return response;
    })
    .catch((error) => {
      console.log('Fetch failed, checking cache...', error);
      return cache.match(request);
    });
}

// Clean up old API cache entries (older than 5 minutes)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAN_API_CACHE') {
    caches.open(DYNAMIC_CACHE).then((cache) => {
      cache.keys().then((requests) => {
        requests.forEach((request) => {
          cache.match(request).then((response) => {
            if (response) {
              const timestamp = response.headers.get('sw-cache-timestamp');
              if (
                timestamp &&
                Date.now() - parseInt(timestamp) > 5 * 60 * 1000
              ) {
                cache.delete(request);
              }
            }
          });
        });
      });
    });
  }
});
