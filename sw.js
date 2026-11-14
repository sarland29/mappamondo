/* Mappamondo service worker: app shell cached, news always fresh when online */
const SHELL = "mm-shell-v2";
const DATA = "mm-data-v1";
const SHELL_FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== DATA).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin === location.origin && url.pathname.includes("/data/")) {
    // news: network first, saved copy when offline
    const key = url.origin + url.pathname;
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(DATA).then(ca => ca.put(key, c)); return r; }).catch(() => caches.match(key)));
    return;
  }
  // the page itself: newest version when online, saved copy when offline
  if (e.request.mode === "navigate" || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(SHELL).then(ca => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then(h => h || caches.match("index.html"))));
    return;
  }
  // app shell, map geometry and fonts: cache first, refresh in background
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === "opaque")) { const c = r.clone(); caches.open(SHELL).then(ca => ca.put(e.request, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
