self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Sin caché: los expedientes y estados de cuenta contienen datos privados.
