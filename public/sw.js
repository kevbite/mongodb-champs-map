/*
 * Hand-rolled service worker for the MongoDB Champions Map PWA.
 *
 * Strategies:
 *   - Navigations           -> network-first, fall back to cached app shell (offline).
 *   - Same-origin static     -> stale-while-revalidate (hashed assets are immutable).
 *   - CartoDB map tiles      -> cache-first with an LRU-style cap (offline visited areas).
 *
 * Bump CACHE_VERSION to invalidate all caches on the next activation.
 */

const CACHE_VERSION = 'v2'
const SHELL_CACHE = `champions-shell-${CACHE_VERSION}`
const ASSET_CACHE = `champions-assets-${CACHE_VERSION}`
const TILE_CACHE = `champions-tiles-${CACHE_VERSION}`

const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE, TILE_CACHE]

// App shell resources precached on install so the site opens offline.
const SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon-16x16.png',
  '/icon-32x32.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-maskable-512x512.png',
  '/apple-icon.png',
]

// Max number of map tiles to retain in the tile cache.
const TILE_CACHE_LIMIT = 300

const TILE_HOST = 'basemaps.cartocdn.com'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !CURRENT_CACHES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
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

  // Same-origin static assets -> stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request))
})

async function navigationStrategy(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await fetch(request)
    // Keep the app shell fresh for offline use.
    cache.put('/', response.clone())
    return response
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match('/')) ||
      Response.error()
    )
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) {
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
