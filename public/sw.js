// Service worker de Kairos : fonctionnement hors ligne et affichage des notifications.
const CACHE = 'kairos-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Réseau d'abord, puis le cache si l'appareil est hors ligne.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});

// Notification touchée : on ouvre (ou on remet au premier plan) l'application.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('./#/rappels'))));
});

// Prêt pour les notifications envoyées par un serveur (étape Supabase).
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'Kairos', body: '' };
  e.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: './icon-192.png' }));
});
