const CACHE = "frc-battery-v5";
const STATIC = [
  "/",
  "/index.html",
  "/css/app.css",
  "/js/app.js?v=20260319a",
  "/js/app.js",
  "/js/api.js",
  "/js/views/dashboard.js",
  "/js/views/battery.js",
  "/js/views/edit-battery.js",
  "/js/views/log-event.js",
  "/js/views/register.js",
  "/js/utils/qr-scanner.js",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isScanRoute = url.pathname.startsWith("/scan/");
  const isAppShellRequest =
    e.request.mode === "navigate" ||
    url.pathname === "/index.html" ||
    url.pathname.startsWith("/js/") ||
    url.pathname.startsWith("/css/");

  // Never cache cross-origin requests (API calls to FastAPI)
  // and never cache /scan/ routes so NFC lookups always hit the network.
  if (!isSameOrigin || isScanRoute) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(
        JSON.stringify({ error: "Offline — no network connection" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      ))
    );
    return;
  }

  // App shell files should be network-first to avoid stale clients.
  if (isAppShellRequest) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Same-origin static assets: cache first.
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
