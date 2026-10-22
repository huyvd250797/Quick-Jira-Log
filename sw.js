const CACHE = 'quick-jira-log-v1.23.0-shell';
const DESKTOP_SHELL = ['/calendar-desktop.css', '/jira-search.css', '/jira-search.js', '/jira-detail.css', '/lib/jira-content.js', '/jira-actions.js', '/jira-create.js'];
const APP_SHELL = ['/', '/index.html', '/styles.css', '/ui.css', '/mobile-calendar.css', '/motion.css', '/calendar-colors.css', '/mobile-refinements.css', '/lib/calendar-style.js', '/lib/remembered-login.js', '/app.js', '/summary.css', '/calendar-interactions.css', '/calendar-interactions.js', '/calendar-viewer.js', '/calendar-viewer.css', '/calendar-scroll-guard.css', '/lib/calendar-scroll-bounds.js', '/calendar-scroll-guard.js', '/branding.js', '/branding.css', '/calendar-hours.css', '/loading-feedback.css', '/calendar-fullscreen.css', '/calendar-resize.css', '/calendar-zoom.css', '/calendar-experience.css', '/lib/calendar-experience.js', '/calendar-zoom.js', '/lib/calendar-zoom.js', '/loading-feedback.js', '/lib/calendar-drafts.js', '/lib/swap-motion.js', '/lib/worklog-summary.js', '/lib/ui-tools.js', '/lib/bulk-allocation.js', '/lib/late-log-warning.js', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/icons/favicon-64.png', '/icons/icon-1024.png', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png', '/icons/icon-192-v1152.png', '/icons/icon-512-v1152.png', '/icons/icon-1024-v1152.png', '/icons/apple-touch-icon-v1152.png', '/icons/favicon-64-v1152.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...APP_SHELL, ...DESKTOP_SHELL])));
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
