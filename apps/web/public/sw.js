const CACHE = "popwam-static-v1";
const OFFLINE = "/offline";
const SAFE_PRECACHE = [OFFLINE, "/manifest.webmanifest", "/api/pwa-icon?size=192", "/api/pwa-icon?size=512"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SAFE_PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const request = event.request; if (request.method !== "GET") return;
  const url = new URL(request.url); if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/login") || url.pathname.startsWith("/auth")) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/api/pwa-icon") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(request)) || fetch(request).then(response => { if (response.ok) cache.put(request, response.clone()); return response; })));
    return;
  }
  if (request.mode === "navigate") event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)));
});
