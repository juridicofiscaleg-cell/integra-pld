/* Service worker de limpieza — reemplaza versiones viejas que bloqueaban la carga en móvil */
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => {
        clients.forEach((client) => client.navigate(client.url))
      }),
  )
})

self.addEventListener('fetch', () => {
  /* No interceptar — dejar pasar todo a la red */
})
