self.addEventListener('install', event => {
    console.log('Service Worker instalado');
    event.waitUntil(
      caches.open('mi-cache').then(cache => {
        return cache.addAll([
          '/',
          '/manifest.json',
          '/assets/GYM SPORTS.png'
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', event => {
    event.respondWith(
      caches.match(event.request)
        .then(resp => resp || fetch(event.request))
    );
  });
  