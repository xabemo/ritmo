const CACHE = "ritmo-v133-amigos-rutas";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./ritmo-features.js?v=133", "./ritmo-features.css?v=131", "./jspdf.umd.min.js", "./ritmo-admin.js?v=1321", "./ritmo-admin.css?v=13211", "./ritmo-social.js?v=133", "./ritmo-social.css?v=133", "./ritmo-routing.js?v=133"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      caches.open(CACHE).then((cache) => cache.put("./index.html", response.clone()));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});


