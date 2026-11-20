const CACHE_NAME = 'adichat-shell-v1';
const APP_SHELL = ['/', '/offline.html', '/manifest.webmanifest', '/icons/adichat.svg', '/icons/adichat-192.png', '/icons/adichat-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('adichat-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated APIs, Supabase requests, private media or signed URLs.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/storage/') ||
    url.pathname.includes('token') ||
    url.searchParams.has('token') ||
    url.searchParams.has('download')
  ) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match(request)) ||
        (await caches.match('/')) ||
        (await caches.match('/offline.html'))
      )
    );
    return;
  }

  // Cache only same-origin static build assets and app icons/fonts.
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|woff2?|png|svg|webp|ico)$/.test(url.pathname);

  if (!isStaticAsset) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') void cache.put(request, response.clone());
        return response;
      });
      return cached || network;
    })
  );
});
