/* global self: readonly, caches: readonly, fetch: readonly, URL: readonly, Response: readonly */
// AirPal offline shell. Strategy:
// - Navigations: network-first, fall back to the cached app shell, then the
//   offline page. Only the "/" response is cached (it is the SPA shell).
// - /assets/* (hashed, immutable): cache-first with network fallback.
// - Everything else same-origin: network-first with cache fallback.
// - Cross-origin (APIs, fonts, map tiles): untouched, network only.
const CACHE = "airpal-shell-v1";
const SHELL_URL = "/";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SHELL_URL, OFFLINE_URL, "/manifest.json"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function refreshShell(response) {
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(SHELL_URL, copy));
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(refreshShell)
        .catch(() =>
          caches
            .match(SHELL_URL)
            .then((hit) => hit || caches.match(OFFLINE_URL))
            .then((fallback) => fallback || Response.error()),
        ),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request).then((hit) => hit || caches.match(OFFLINE_URL))));
});
