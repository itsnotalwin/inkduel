/**
 * INKDUEL service worker — offline mode for the paper edition.
 *
 * Strategies:
 *  - navigations: network-first, cached copy as fallback, home as last resort
 *  - hashed build assets (_next/static): cache-first (immutable)
 *  - other same-origin GETs: stale-while-revalidate
 *
 * All URLs are relative so the worker works both at the Pages basePath
 * (/inkduel/sw.js → scope /inkduel/) and on localhost (/sw.js → scope /).
 */
const CACHE = "inkduel-v2";
const PAGES = [
  "./",
  "./duel",
  "./collection",
  "./decks",
  "./leaderboard",
  "./profile",
  "./meta",
  "./replays",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png",
];
// build-time injected list of hashed assets (see scripts/build-pages.mjs)
const ASSETS = /*__ASSETS__*/[];
const CORE = [...PAGES, ...ASSETS];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // never fail the install over a single missing page; extensionless page
      // URLs may 404 (or worse, list a directory) on static hosts — prefer the
      // real .html file and only accept HTML responses
      await Promise.allSettled(
        CORE.map(async (url) => {
          const isPage = PAGES.includes(url);
          const attempts = isPage ? [url.endsWith("/") ? url : url + ".html", url] : [url];
          for (const attempt of attempts) {
            try {
              const res = await fetch(attempt, { cache: "no-cache" });
              if (!res.ok) continue;
              if (isPage) {
                // never cache a directory listing or an error page as a route
                const ct = res.headers.get("content-type") ?? "";
                if (!ct.includes("text/html")) continue;
              }
              await cache.put(url, res.clone());
              if (attempt !== url) await cache.put(attempt, res);
              return;
            } catch {
              // offline install — the runtime cache will pick pages up later
            }
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through

  // immutable hashed build output — cache-first
  if (url.pathname.includes("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })(),
    );
    return;
  }

  // page navigations — network-first with offline fallbacks
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const ct = res.headers.get("content-type") ?? "";
          if (res.ok && ct.includes("text/html")) {
            const cache = await caches.open(CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(CACHE);
          const cleanUrl = url.pathname.replace(/\/$/, "") + url.search;
          return (
            (await cache.match(req)) ??
            (await cache.match(cleanUrl)) ??
            (await cache.match(cleanUrl + ".html")) ??
            (await cache.match("./")) ??
            new Response("<h1>Offline</h1>", { headers: { "Content-Type": "text/html" } })
          );
        }
      })(),
    );
    return;
  }

  // everything else same-origin — stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit ?? refresh;
    })(),
  );
});
