// Kaleb OS service worker — PWA install, Web Push, and offline. v3
//
// Offline strategy, deliberately conservative:
//   • navigations  → network first, fall back to the last page we saw, then to
//                    a plain offline notice. Never a browser error page.
//   • today's plan → network first, fall back to cache. The rhythm is the one
//                    thing that has to work on a beach with no signal.
//   • static icons → cache first.
// Everything else passes straight through, so nothing auth-related or
// mutating is ever served from a stale cache.

const VERSION = 'kos-v3';
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;

const PRECACHE = ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

const OFFLINE_HTML = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline · Kaleb OS</title>
<style>
  body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;
    background:#050507;color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;padding:24px}
  .c{max-width:320px;text-align:center}
  h1{font-size:20px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px}
  p{font-size:14px;line-height:1.5;color:#a0a0ad;margin:0 0 20px}
  button{min-height:48px;padding:0 22px;border:none;border-radius:14px;background:#8b5cf6;
    color:#fff;font-size:15px;font-weight:600;cursor:pointer}
</style></head><body><div class="c">
<h1>You're offline</h1>
<p>Kaleb OS can't reach the network. Your schedule and anything you've written are safe — this page will load again once you're back.</p>
<button onclick="location.reload()">Try again</button>
</div></body></html>`;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Today's resolved plan — the thing worth having offline.
  if (url.pathname === '/api/rhythm/today') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(DATA).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || Response.json(
          { error: 'offline', offline: true },
          { status: 503 }
        )))
    );
    return;
  }

  // Icons and the manifest.
  if (PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
    return;
  }

  // Page navigations.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((hit) =>
            hit || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 })
          )
        )
    );
  }
});

// Incoming push -> show a notification.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { title: 'Kaleb OS', body: event.data && event.data.text() }; }
  const title = data.title || 'Kaleb OS';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag,
    renotify: !!data.tag,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tap a notification -> focus existing window or open the deep link.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client) { try { client.navigate(url); } catch (_) {} }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
