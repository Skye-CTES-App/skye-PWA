const CACHE_NAME = ‘skye-v3-cache’;
const OFFLINE_URLS = [
‘./’,
‘./index.html’,
‘./manifest.json’
];

// Install: cache core files
self.addEventListener(‘install’, event => {
event.waitUntil(
caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
);
self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener(‘activate’, event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
)
);
self.clients.claim();
});

// Fetch: network first for API calls, cache first for app files
self.addEventListener(‘fetch’, event => {
const url = new URL(event.request.url);

// Network-first for NWS API calls (always want fresh weather data)
if (url.hostname === ‘api.weather.gov’) {
event.respondWith(
fetch(event.request)
.then(response => {
// Cache successful API responses for offline fallback
if (response.ok) {
  const clone = response.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
}
return response;
})
.catch(() => {
// If offline, serve cached API response
return caches.match(event.request);
})
);
return;
}

// Cache-first for app files
event.respondWith(
caches.match(event.request).then(cached => {
if (cached) return cached;
return fetch(event.request).then(response => {
const clone = response.clone();
caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
return response;
});
}).catch(() => {
// Ultimate fallback
if (event.request.destination === ‘document’) {
return caches.match(’./index.html’);
}
})
);
});
