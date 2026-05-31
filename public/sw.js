const CACHE_NAME = 'sinfonia-karaoke-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png'
];

// Instalação do Service Worker e salvamento em cache dos arquivos estáticos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
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

// Interceptação de requisições para servir do cache em caso de falha de rede
self.addEventListener('fetch', (event) => {
  // Ignora requisições de APIs de terceiros (como YouTube ou Firebase) para evitar problemas de CORS ou falha de integridade
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Retorna a resposta se não for um asset dinâmico
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Cacheia novas requisições estáticas locais
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(() => {
        // Fallback offline se a rota for de navegação
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
