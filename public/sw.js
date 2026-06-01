const CACHE_NAME = 'sinfonia-karaoke-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

// Instalação do Service Worker - cacheia apenas assets estáticos conhecidos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usa addAll com tratamento de erros para cada recurso individualmente
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => cache.add(url).catch((err) => {
          console.warn(`SW: Falha ao cachear ${url}:`, err);
        }))
      );
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia: Network First para navegação, Cache First para assets estáticos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições de APIs de terceiros (YouTube, Firebase, Google Fonts, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Para requisições de navegação (HTML), sempre tenta a rede primeiro
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cacheia a página principal para uso offline
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match('/') || caches.match(request);
        })
    );
    return;
  }

  // Para assets com hash do Vite (/assets/*), usa Cache First (são imutáveis)
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Para outros recursos locais, tenta cache primeiro, depois rede
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return cachedResponse || fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Retorna vazio para recursos não essenciais
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});
