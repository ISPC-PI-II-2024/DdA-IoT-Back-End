// ==========================
// Service Worker básico (PWA)
// - Precache de shell mínimo
// - Runtime cache GET (network-first con fallback a cache)
// ==========================
const CACHE = "shell-v4";
const ASSETS = [
  "/", 
  "/index.html", 
  "/style.css", 
  "/manifest.webmanifest",
  "/icons/Proyecto-logo.jpg",
  "/src/app.js",
  "/src/api.js",
  "/src/loader.js",
  "/src/router/index.js",
  "/src/state/store.js",
  "/src/utils/dom.js",
  "/src/utils/storage.js",
  "/src/ws.js",
  "/src/components/navbar.js",
  "/src/components/footer.js",
  "/src/pwa-install.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

// Manejar eventos de instalación PWA
self.addEventListener("beforeinstallprompt", e => {
  console.log("PWA instalable detectada");
  // El evento se manejará en el cliente
});

// network-first con fallback a cache, evitando cachear errores y /config.json
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.url.startsWith("chrome-extension:")) return;

  // Nunca cachear config.json (siempre a red, sin almacenar)
  if (new URL(req.url).pathname === "/config.json") {
    e.respondWith(fetch(req).catch(() => new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })));
    return;
  }

  e.respondWith((async () => {
    try {
      const net = await fetch(req);
      // Cachear solo respuestas OK
      if (net.ok) {
        const clonedResponse = net.clone();
        caches.open(CACHE).then(c => c.put(req, clonedResponse));
      }
      return net;
    } catch {
      const cached = await caches.match(req);
      return cached || caches.match("/index.html");
    }
  })());
});
