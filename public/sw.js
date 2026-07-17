const CACHE = 'integra-pld-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

function isAppShellRequest(request) {
  const url = new URL(request.url)
  if (request.mode === 'navigate') return true
  return url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html')
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  if (isAppShellRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(event.request, copy))
          }
          return response
        })
        .catch(() => caches.match(event.request)),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  )
})
