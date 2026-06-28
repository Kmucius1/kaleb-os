// Minimal service worker — enables PWA install. Network-first pass-through
// (no caching of auth/API responses for this private app).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* pass through to network */ });
