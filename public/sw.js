const CACHE_NAME = 'batamart-v2'

// Only cache static assets — NEVER cache API routes
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/BATAMART - logo.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // NEVER intercept API calls — let them go straight to network
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // For everything else, network first, fall back to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})