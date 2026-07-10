/*
 * Hand-rolled service worker for the MongoDB Champions Map PWA.
 *
 * Offline strategy:
 *   - On install we PRECACHE the full static build (HTML, hashed JS/CSS chunks,
 *     fonts, icons, avatars). The asset list + build id are injected into this
 *     file at build time by `scripts/inject-sw-manifest.ts`, so a first-time
 *     visitor is fully offline-capable after the initial load, regardless of
 *     when the worker takes control.
 *   - Navigations           -> network-first, fall back to the cached app shell.
 *   - Same-origin assets     -> cache-first (served from precache), revalidated
 *                               in the background (stale-while-revalidate).
 *   - CartoDB map tiles      -> cache-first with an LRU-style cap.
 *
 * The two lines below are rewritten during the build; the defaults keep the
 * worker functional in dev where no injection happens.
 */

const BUILD_ID = 'dev'
const PRECACHE_ASSETS = []

const PRECACHE = `champions-precache-${BUILD_ID}`
const RUNTIME = `champions-runtime-${BUILD_ID}`
const TILE_CACHE = `champions-tiles-${BUILD_ID}`

const CURRENT_CACHES = [PRECACHE, RUNTIME, TILE_CACHE]

// Always precache the app shell entry, even in dev where the manifest is empty.
const SHELL_URLS = ['/', '/manifest.webmanifest']

// Max number of map tiles to retain in the tile cache.
const TILE_CACHE_LIMIT = 300

const TILE_HOST = 'basemaps.cartocdn.com'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE)
      const urls = Array.from(new Set([...SHELL_URLS, ...PRECACHE_ASSETS]))
      // Cache resiliently: a single 404 must not abort the whole install.
      await Promise.allSettled(
        urls.map((url) => cache.add(new Request(url, { cache: 'reload' }))),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => !CURRENT_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle GET requests; let the browser deal with the rest.
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  // Map tiles (cross-origin CartoDB) -> cache-first with an LRU cap.
  if (url.hostname.endsWith(TILE_HOST)) {
    event.respondWith(tileStrategy(request))
    return
  }

  // Ignore other cross-origin requests (let the network handle them directly).
  if (url.origin !== self.location.origin) return

  // Navigations -> network-first with app-shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request))
    return
  }

  // Same-origin assets -> stale-while-revalidate (served from precache offline).
  event.respondWith(staleWhileRevalidate(request))
})

async function navigationStrategy(request) {
  try {
    const response = await fetch(request)
    // Keep the app shell fresh for offline use.
    const cache = await caches.open(PRECACHE)
    cache.put('/', response.clone())
    return response
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match('/')) ||
      Response.error()
    )
  }
}

async function staleWhileRevalidate(request) {
  // Search every cache (precache + runtime) for a hit.
  const cached = await caches.match(request)

  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        const cache = await caches.open(RUNTIME)
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => undefined)

  return cached || (await network) || Response.error()
}

async function tileStrategy(request) {
  const cache = await caches.open(TILE_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response && response.ok) {
      await cache.put(request, response.clone())
      await trimCache(TILE_CACHE, TILE_CACHE_LIMIT)
    }
    return response
  } catch {
    return cached || Response.error()
  }
}

// Simple FIFO trim: drop the oldest entries once the cache exceeds the limit.
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i])
  }
}
