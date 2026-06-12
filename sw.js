const CACHE = 'dormguard-v1';
const ASSETS = [
  '/dormguard/',
  '/dormguard/index.html',
  '/dormguard/app.js',
  '/dormguard/notifs.js',
  '/dormguard/ui.css',
  '/dormguard/icon.png',
  '/dormguard/badge.png',
  '/dormguard/site.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.hostname.includes('sheets.googleapis.com') || url.hostname.includes('script.google.com')) return;

  const isStatic = ASSETS.some(path => url.pathname === path || url.pathname === path + 'index.html');

  if (isStatic) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const networkFetch = fetch(e.request).then(res => {
          caches.open(CACHE).then(cache => cache.put(e.request, res.clone()));
          return res;
        });
        return cached || networkFetch;
      })
    );
  } else {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow('/dormguard/');
    })
  );
});