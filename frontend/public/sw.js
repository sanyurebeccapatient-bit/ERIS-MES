// ERIS MES Service Worker
// Precaches the app shell (via vite-plugin-pwa injectManifest), serves an
// offline fallback page for failed navigations, and handles push notifications.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

self.skipWaiting()
cleanupOutdatedCaches()

// Injected at build time by vite-plugin-pwa with the full list of hashed
// build assets (JS/CSS/HTML/icons/manifest, etc.)
precacheAndRoute(self.__WB_MANIFEST)

// Navigation requests: serve the cached app shell first; if that specific
// page was never cached, workbox-precaching's fallback plus our fetch
// handler below will route to the offline page when there's no network.
registerRoute(
  new NavigationRoute(
    async ({ event }) => {
      try {
        const preload = await event.preloadResponse
        if (preload) return preload
        const cached = await caches.match('/index.html')
        if (cached) return cached
        return await fetch(event.request)
      } catch {
        const offline = await caches.match('/offline.html')
        return offline || new Response('Offline', { status: 503 })
      }
    },
    { denylist: [/^\/offline\.html$/] }
  )
)

// Google Fonts stylesheets
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({ cacheName: 'google-fonts-stylesheets' })
)

// Google Fonts font files
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
)

// API calls: try the network first (short timeout), fall back to cache when offline
registerRoute(
  /^\/api\/.*/i,
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
)

// Generic fetch fallback for anything not matched above (e.g. same-origin
// assets requested in a way workbox routing didn't intercept): network
// first, cache fallback, offline page fallback for navigations.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return // handled by the route above

  const isNavigation = event.request.mode === 'navigate'
  if (!isNavigation) return // static assets are handled by precacheAndRoute

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request)
      if (cached) return cached
      const offline = await caches.match('/offline.html')
      return offline || new Response('Offline', { status: 503 })
    })
  )
})

// Push notification event
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() || {} } catch { /* ignore */ }

  const title = data.title || 'ERIS MES'
  const options = {
    body: data.body || 'You have a new notification.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    data: data.url ? { url: data.url } : undefined,
    vibrate: [100, 50, 100],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(self.clients.openWindow(url))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
