const CACHE = 'quick-jira-log-v1.8.0-shell';
const APP_SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/lib/bulk-allocation.js', '/lib/late-log-warning.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/icons/favicon-64.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || (url.pathname === '/api' || url.pathname.startsWith('/api/'))) return;

  // Network-first giữ UI mới nhất; cache chỉ là fallback PWA khi offline.
  event.respondWith(
    fetch(req).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('/')))
  );
});
