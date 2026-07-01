const CACHE = 'dormguard-v2';
const FONT_CACHE = 'dormguard-fonts-v1';
const ASSETS = [
  '/dormguard/',
  '/dormguard/index.html',
  '/dormguard/app.js',
  '/dormguard/db.js',
  '/dormguard/notifs.js',
  '/dormguard/ui.css',
  '/dormguard/icon.png',
  '/dormguard/badge.png',
  '/dormguard/site.webmanifest',
  'https://avatars.githubusercontent.com/u/231379422?v=4'
];

self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(CACHE).then(cache => cache.addAll(ASSETS)),
      caches.open(FONT_CACHE).then(cache =>
        cache.add('https://fonts.googleapis.com/css2?family=Fredoka:wght@700&family=Google+Sans+Flex:opsz,wght@8..144,100..1000&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap')
          .catch(() => {})
      )
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('sheets.googleapis.com') || url.hostname.includes('script.google.com')) return;

  if (url.hostname === 'github.com' || url.hostname === 'avatars.githubusercontent.com') {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const networkFetch = fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  if (url.hostname === 'fonts.googleapis.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const networkFetch = fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  if (url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

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