/* Service worker: network-first.
   In sviluppo prende sempre i file freschi dal server; la cache serve
   solo come rete di sicurezza quando si è offline.
   Si attiva solo se l'app è servita via http(s). */
const CACHE = 'addukira-v4';
const SHELL = ['./', './index.html', './css/style.css',
  './js/supabase-config.js', './js/auth.js', './js/store.js', './js/i18n.js',
  './js/widgets.js', './js/app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/favicon-32.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});
