const CACHE_NAME = "gymtrack-cache-v3";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = ["/", "/login", OFFLINE_URL, "/manifest.webmanifest", "/icons/pwa-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

// Helper to identify Next.js React Server Component (RSC) requests and client-side page data fetches
function isRscRequest(request, url) {
  return (
    request.headers.get("RSC") === "1" ||
    request.headers.has("next-router-state-tree") ||
    request.headers.has("next-url") ||
    request.headers.get("purpose") === "prefetch" ||
    url.searchParams.has("_rsc")
  );
}

// Helper to identify static files that are safe to serve cache-first
function isStaticAsset(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".ttf") ||
    pathname.endsWith(".otf") ||
    pathname.endsWith(".webmanifest")
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // 1. HTML Page Navigation (Full page reload / initial load)
  // Strategy: Network-First. Always run middleware/auth checks on server. Fallback to offline page.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // 2. Next.js RSC / Dynamic Page Data Fetching (Client-side navigations)
  // Strategy: Network-First. Fetch fresh page data, cache it.
  // If offline & not in cache, fallback to pre-cached OFFLINE_URL to prevent Vercel's generic reload error screen.
  if (isRscRequest(event.request, url)) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  // 3. Static Assets (JS, CSS, images, fonts, icons)
  // Strategy: Cache-First. Check cache. If not found, fetch, dynamically cache, and return.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;

        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return networkResponse;
          })
          .catch(() => {
            // Do NOT fallback to OFFLINE_URL to avoid returning HTML when the browser expects static assets
            return new Response("Asset offline", { status: 503, statusText: "Offline" });
          });
      }),
    );
    return;
  }

  // 4. Default GET requests (Generic fallback)
  // Strategy: Network-First with cache fallback.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request)),
  );
});
