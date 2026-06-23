const STATIC_CACHE = "el-static-v1";

// Cache static assets on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(["/", "/calendar"]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch handler: cache-first for static, network-only for everything else
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API routes or lesson/dynamic content
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/lesson/") ||
    url.pathname.startsWith("/monthly-exam") ||
    event.request.method !== "GET"
  ) {
    return; // Let browser handle natively
  }

  // Cache-first for Next.js static assets
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        })
      )
    );
    return;
  }
});
