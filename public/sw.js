/* Huella service worker — makes the guide usable with flaky signal on the street.
 *  - Pages:            network first, cached copy when offline.
 *  - /_next/static:    cache first (content-hashed, immutable).
 *  - Images:           stale-while-revalidate, capped.
 */
const VERSION = "v2";
const PAGES = `pages-${VERSION}`;
const STATIC = `static-${VERSION}`;
const IMAGES = `images-${VERSION}`;
const MAX_IMAGES = 160;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add("/")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, STATIC, IMAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/image") || request.destination === "image") {
    event.respondWith(
      caches.open(IMAGES).then(async (cache) => {
        const hit = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone()).then(() => trim(IMAGES, MAX_IMAGES));
            return res;
          })
          .catch(() => hit);
        return hit || network;
      }),
    );
    return;
  }

  // HTML documents and RSC payloads for client navigations.
  const isPage = request.mode === "navigate" || request.headers.get("RSC") === "1";
  if (isPage) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/")) || Response.error()),
    );
  }
});
