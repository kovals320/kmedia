// Minimal service worker: it only makes the site installable as an app.
// It caches nothing, so the app always shows the latest photos and films.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
