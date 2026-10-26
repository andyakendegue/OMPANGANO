/* eslint-disable no-restricted-globals */
/**
 * OMPAGANO NKALA APP - Universal Offline-First Service Worker (v5)
 * 100% compatible with Desktop Firefox (Gecko), Android Default Browser / Chrome (Blink/WebView),
 * and iOS Safari (WebKit) in Airplane Mode.
 */

const CACHE_NAME = 'ompagano-offline-v5';

// Build-time or dev-time manifest injected into `/sw.js`
const INJECTED_MANIFEST = self.__WB_MANIFEST || [];

// Critical files required to boot the React application offline immediately (< 400ms install)
const CRITICAL_BOOT_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg'
];

// Secondary visual assets cached immediately after boot
const SECONDARY_ASSET_URLS = [
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/assets/aistudio/LOGO-symbole_1c65e221.png',
  '/assets/aistudio/LOGO_c7de06c8.jpg'
];

function normalizeManifestUrl(entry) {
  if (!entry) return null;
  const raw = typeof entry === 'string' ? entry : entry.url;
  if (!raw || typeof raw !== 'string') return null;
  return raw.startsWith('/') ? raw : '/' + raw;
}

function isCriticalCodeAsset(url) {
  if (!url) return false;
  const clean = url.split('?')[0];
  return (
    clean === '/' ||
    clean === '/index.html' ||
    clean === '/manifest.webmanifest' ||
    clean === '/icon.svg' ||
    clean === '/@vite/client' ||
    clean.endsWith('.js') ||
    clean.endsWith('.mjs') ||
    clean.endsWith('.css') ||
    clean.endsWith('.ts') ||
    clean.endsWith('.tsx') ||
    clean.includes('firebase-applet-config.json')
  );
}

/**
 * Infers Content-Type from URL or existing Response headers
 */
function resolveContentType(url, response) {
  const existing = response && response.headers ? response.headers.get('Content-Type') : null;
  if (existing) return existing;
  const clean = (url || '').split('?')[0].toLowerCase();
  if (clean.endsWith('.html') || clean === '/') return 'text/html; charset=utf-8';
  if (clean.endsWith('.js') || clean.endsWith('.mjs') || clean.endsWith('.ts') || clean.endsWith('.tsx')) {
    return 'application/javascript; charset=utf-8';
  }
  if (clean.endsWith('.css')) return 'text/css; charset=utf-8';
  if (clean.endsWith('.webmanifest') || clean.endsWith('.json')) return 'application/json; charset=utf-8';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

/**
 * Creates a clean, non-redirected Response WITHOUT `Vary` headers.
 * CRITICAL FOR FIREFOX, ANDROID & iOS SAFARI:
 * - Safari WebKit aborts offline navigation if `response.redirected === true`.
 * - Firefox & Safari fail `cache.match(request)` if the stored Response has `Vary: Origin` or `Vary: Accept-Encoding`.
 */
async function createCleanResponse(response, targetUrl) {
  const buffer = await response.clone().arrayBuffer();
  const contentType = resolveContentType(targetUrl, response);
  return new Response(buffer, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': contentType,
      'X-Ompagano-Cache': CACHE_NAME
    }
  });
}

/**
 * Stores a clean copy of a response under both its relative path (`/assets/...`) and full URL
 * so any browser lookup format hits immediately.
 */
async function putCleanAssetInCache(cache, rawUrl, response) {
  if (!response || !response.ok) return false;
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    const keyWithSearch = parsed.pathname + parsed.search;
    const keyPathname = parsed.pathname;

    const cleanPrimary = await createCleanResponse(response, keyWithSearch);
    await cache.put(keyWithSearch, cleanPrimary);

    if (keyPathname !== keyWithSearch) {
      const cleanByPath = await createCleanResponse(response, keyPathname);
      await cache.put(keyPathname, cleanByPath);
    }
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Discovers all manifest URLs from INJECTED_MANIFEST + `/__ompagano_manifest.json`
 */
async function discoverAllAppUrls() {
  const urls = new Set([
    ...CRITICAL_BOOT_URLS,
    ...SECONDARY_ASSET_URLS
  ]);

  if (Array.isArray(INJECTED_MANIFEST)) {
    for (const item of INJECTED_MANIFEST) {
      const normalized = normalizeManifestUrl(item);
      if (normalized && !normalized.includes('version.json')) {
        urls.add(normalized);
      }
    }
  }

  try {
    const res = await fetch('/__ompagano_manifest.json', {
      cache: 'no-cache',
      credentials: 'same-origin'
    });
    if (res && res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.assets)) {
        for (const item of data.assets) {
          const normalized = normalizeManifestUrl(item);
          if (normalized && !normalized.includes('version.json')) {
            urls.add(normalized);
          }
        }
      }
    }
  } catch (_) {}

  return Array.from(urls);
}

/**
 * Stage 1: Fast-caches HTML + JS + CSS bundles so Service Worker finishes `install`
 * and claims all tabs in < 500ms.
 * Stage 2: Caches icons and images in the background without blocking SW activation.
 */
async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME);

  // 1. Cache clean HTML shell under '/' and '/index.html'
  for (const htmlUrl of ['/index.html', '/']) {
    try {
      const res = await fetch(htmlUrl, { cache: 'no-cache', credentials: 'same-origin' });
      if (res && res.ok) {
        await cache.put('/', await createCleanResponse(res, '/index.html'));
        await cache.put('/index.html', await createCleanResponse(res, '/index.html'));
        break;
      }
    } catch (_) {}
  }

  const allUrls = await discoverAllAppUrls();
  const criticalUrls = allUrls.filter((u) => u !== '/' && u !== '/index.html' && isCriticalCodeAsset(u));
  const secondaryUrls = allUrls.filter((u) => u !== '/' && u !== '/index.html' && !isCriticalCodeAsset(u));

  // 2. Stage 1 (Blocking): Cache all JS, CSS, manifest, and SVG files first!
  await Promise.allSettled(
    criticalUrls.map(async (url) => {
      try {
        const existing = await cache.match(url);
        if (existing && existing.ok) return;
        const res = await fetch(url, { credentials: 'same-origin' });
        if (res && res.ok) {
          await putCleanAssetInCache(cache, url, res);
        }
      } catch (_) {}
    })
  );

  // 3. Stage 2 (Non-blocking background): Cache PNG/JPG icons and images
  Promise.allSettled(
    secondaryUrls.map(async (url) => {
      try {
        const existing = await cache.match(url);
        if (existing && existing.ok) return;
        const res = await fetch(url, { credentials: 'same-origin' });
        if (res && res.ok) {
          await putCleanAssetInCache(cache, url, res);
        }
      } catch (_) {}
    })
  ).catch(() => {});
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precacheAppShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Immediately take control of all open tabs on Firefox, Android & iOS Safari
      await self.clients.claim();

      const currentCache = await caches.open(CACHE_NAME);
      const hasShell = await currentCache.match('/index.html');
      if (!hasShell) {
        await precacheAppShell();
      }

      // Remove outdated caches from previous versions
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key.startsWith('ompagano-'))
          .map((key) => caches.delete(key))
      );

      // Notify all open tabs that SW is active and controlling the page
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) {
        client.postMessage({ type: 'SW_ACTIVE_AND_READY', cacheName: CACHE_NAME });
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'WARMUP_CACHE') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const clientUrls = Array.isArray(data.urls) ? data.urls : [];
        const manifestUrls = await discoverAllAppUrls();
        const combinedUrls = Array.from(new Set([...manifestUrls, ...clientUrls]));
        let cachedCount = 0;

        // Also cache the exact page URL if sent by the client
        if (typeof data.pageUrl === 'string' && data.pageUrl) {
          try {
            const existingShell =
              (await cache.match('/index.html')) ||
              (await cache.match('/'));
            if (existingShell) {
              await cache.put(data.pageUrl, await createCleanResponse(existingShell, '/index.html'));
            }
          } catch (_) {}
        }

        await Promise.allSettled(
          combinedUrls.map(async (rawUrl) => {
            if (!rawUrl || typeof rawUrl !== 'string') return;
            if (
              rawUrl.includes('version.json') ||
              rawUrl.includes('__ompagano_manifest.json') ||
              rawUrl.includes('firestore.googleapis.com') ||
              rawUrl.includes('firebaseio.com') ||
              rawUrl.includes('firebasedatabase.app') ||
              rawUrl.includes('identitytoolkit.googleapis.com') ||
              rawUrl.includes('securetoken.googleapis.com')
            ) {
              return;
            }
            try {
              const parsed = new URL(rawUrl, self.location.origin);
              const isSameOrigin = parsed.origin === self.location.origin;

              if (isSameOrigin) {
                const key = parsed.pathname + parsed.search;
                const existing = await cache.match(key);
                if (existing && existing.ok) {
                  cachedCount++;
                  return;
                }
                const res = await fetch(key, { credentials: 'same-origin' });
                if (res && res.ok) {
                  await putCleanAssetInCache(cache, key, res);
                  cachedCount++;
                }
              } else {
                const existing = await cache.match(rawUrl);
                if (existing && (existing.ok || existing.type === 'opaque')) {
                  cachedCount++;
                  return;
                }
                const res = await fetch(rawUrl, { credentials: 'omit', mode: 'no-cors' });
                if (res && (res.ok || res.type === 'opaque')) {
                  await cache.put(rawUrl, res.clone());
                  cachedCount++;
                }
              }
            } catch (_) {}
          })
        );

        if (event.source && typeof event.source.postMessage === 'function') {
          event.source.postMessage({
            type: 'WARMUP_COMPLETE',
            cachedCount,
            cacheName: CACHE_NAME
          });
        }
      })()
    );
  }
});

/**
 * Multi-strategy cache lookup that succeeds across Firefox, Android WebView/Chrome, and iOS Safari
 * regardless of Request mode (`cors` vs `same-origin`), `Vary` headers, or query parameters.
 */
async function matchAssetInCaches(request, url) {
  const primaryCache = await caches.open(CACHE_NAME);
  const keyWithSearch = url.pathname + url.search;
  const keyPathname = url.pathname;

  // 1. Exact path + query string match in primary cache
  let hit = await primaryCache.match(keyWithSearch);
  if (hit) return hit;

  // 2. Exact pathname match in primary cache
  if (keyPathname !== keyWithSearch) {
    hit = await primaryCache.match(keyPathname);
    if (hit) return hit;
  }

  // 3. Request match ignoring Vary and search
  hit = await primaryCache.match(request, { ignoreVary: true });
  if (hit) return hit;

  hit = await primaryCache.match(keyPathname, { ignoreSearch: true, ignoreVary: true });
  if (hit) return hit;

  // 4. Fallback across any other cache in CacheStorage
  hit = await caches.match(keyWithSearch, { ignoreVary: true });
  if (hit) return hit;

  hit = await caches.match(keyPathname, { ignoreSearch: true, ignoreVary: true });
  if (hit) return hit;

  return null;
}

/**
 * Retrieves the cached HTML shell and always wraps it in a fresh, non-redirected 200 OK Response
 */
async function getOfflineHtmlShellResponse(request, url) {
  const candidates = [
    '/index.html',
    '/',
    url ? url.pathname : null,
    request ? request.url : null
  ];

  const primaryCache = await caches.open(CACHE_NAME);

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const matched =
        (await primaryCache.match(candidate, { ignoreSearch: true, ignoreVary: true })) ||
        (await caches.match(candidate, { ignoreSearch: true, ignoreVary: true }));
      if (matched && matched.ok) {
        return await createCleanResponse(matched, '/index.html');
      }
    } catch (_) {}
  }

  return null;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Bypass live Firebase API endpoints (handled by Firestore/RTDB IndexedDB & localStorage persistence)
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('apis.google.com') ||
    url.hostname.includes('www.googleapis.com')
  ) {
    return;
  }

  // Graceful offline response for /version.json
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ version: 'offline', buildTime: 0, builtAt: '' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          })
      )
    );
    return;
  }

  const acceptHeader = request.headers.get('accept') || '';
  const isNavigation =
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    acceptHeader.includes('text/html');

  // 1. NAVIGATION REQUESTS (Page loads, reloads, offline launch on Firefox, Android & iOS Safari)
  if (isNavigation) {
    event.respondWith(
      (async () => {
        // Check if we already have the offline HTML shell cached
        const cachedShell = await getOfflineHtmlShellResponse(request, url);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1800);

          const networkResponse = await fetch(request, {
            signal: controller.signal,
            credentials: 'same-origin'
          });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put('/', await createCleanResponse(networkResponse, '/index.html'));
            await cache.put('/index.html', await createCleanResponse(networkResponse, '/index.html'));
            return await createCleanResponse(networkResponse, '/index.html');
          }
        } catch (_) {
          // Network offline or timed out -> immediately serve cached shell
        }

        if (cachedShell) {
          return cachedShell;
        }

        // Emergency offline fallback if cache was manually cleared while offline
        return new Response(
          '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OMPAGANO - Mode Hors-Ligne</title></head><body style="background:#1c120c;color:#fdfaf7;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;text-align:center;"><div><h2>OMPAGANO NKALA APP</h2><p>Veuillez charger l\'application une première fois avec Internet pour activer le Mode Hors-Ligne.</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 20px;background:#c85a32;color:#fff;border:none;border-radius:12px;font-weight:bold;">Réessayer</button></div></body></html>',
          {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          }
        );
      })()
    );
    return;
  }

  // 2. SAME-ORIGIN CODE & STATIC ASSETS (JS, CSS, Manifest, Icons, Logos, Dev Modules)
  const isSameOrigin = url.origin === self.location.origin;
  if (isSameOrigin) {
    event.respondWith(
      (async () => {
        // CACHE-FIRST for all cached same-origin assets so offline reloads in Firefox/Android/Safari are instant (0ms network wait)
        const cachedResponse = await matchAssetInCaches(request, url);
        if (cachedResponse) {
          // Background revalidation when online
          fetch(request, { credentials: 'same-origin' })
            .then(async (fresh) => {
              if (fresh && fresh.ok) {
                const cache = await caches.open(CACHE_NAME);
                await putCleanAssetInCache(cache, url.pathname + url.search, fresh);
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Not in cache yet: fetch from network and store cleanly
        try {
          const networkResponse = await fetch(request, { credentials: 'same-origin' });
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            await putCleanAssetInCache(cache, url.pathname + url.search, networkResponse);
            return await createCleanResponse(networkResponse, url.pathname);
          }
          return networkResponse;
        } catch (err) {
          // Safe fallback for Vite dev client if ever missed offline
          if (url.pathname === '/@vite/client' || url.pathname.endsWith('/env.mjs')) {
            return new Response(
              'export function createHotContext(){return {accept(){},prune(){},dispose(){},on(){},send(){}};}\nexport function updateStyle(){}\nexport function removeStyle(){}\nexport function injectQuery(u){return u;}\nexport class ErrorOverlay {}\nexport default {};',
              { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8' } }
            );
          }

          // Fallback image for uncached images offline
          if (request.destination === 'image' || /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(url.pathname)) {
            const fallbackLogo = await matchAssetInCaches(
              new Request(self.location.origin + '/icon.svg'),
              new URL('/icon.svg', self.location.origin)
            );
            if (fallbackLogo) return fallbackLogo;
          }

          throw err;
        }
      })()
    );
    return;
  }

  // 3. EXTERNAL FONTS & IMAGES (Google Fonts, Unsplash)
  const isFontRequest =
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');
  const isExternalImage = url.hostname.includes('images.unsplash.com');

  if (isFontRequest || isExternalImage) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request, { ignoreVary: true });
        if (cached) return cached;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);
          const res = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res && (res.ok || res.type === 'opaque')) {
            cache.put(request, res.clone()).catch(() => {});
          }
          return res;
        } catch (_) {
          // Never fail or block page render on offline fonts in Firefox/Android/Safari
          if (isFontRequest) {
            return new Response('/* offline font fallback */', {
              status: 200,
              headers: { 'Content-Type': 'text/css; charset=utf-8' }
            });
          }
          return new Response('', { status: 200 });
        }
      })()
    );
  }
});
