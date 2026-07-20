'use strict';

const EXPORT_CACHE = 'capto-export-download-v1';
const EXPORT_PREFIX = '/studio/export-download/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.pathname.startsWith(EXPORT_PREFIX)) return;
  event.respondWith((async () => {
    const cache = await caches.open(EXPORT_CACHE);
    const response = await cache.match(event.request);
    return response || new Response('Export expired. Return to Capto and export again.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  })());
});
