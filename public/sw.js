// Lets the installed app open with no signal. Pages are fetched fresh when online and the copy
// is kept; offline, the last copy is used. Next's build files never change under the same
// name, so they are served from the copy first. Only this site's own files are kept:
// requests to Supabase are not touched, and the data itself is saved by lib/offline.js.
const CACHE = "namaz-v1";
const PAGES = ["/app", "/history"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PAGES))
      .catch(() => {}) // a page that fails now is kept the next time it is opened
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

async function keep(request, response) {
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function freshFirst(request) {
  try {
    return await keep(request, await fetch(request));
  } catch (problem) {
    const saved = await caches.match(request);
    if (saved) return saved;
    throw problem;
  }
}

async function savedFirst(request) {
  return (await caches.match(request)) || keep(request, await fetch(request));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) event.respondWith(savedFirst(request));
  else if (!url.pathname.startsWith("/auth/callback")) event.respondWith(freshFirst(request));
});
