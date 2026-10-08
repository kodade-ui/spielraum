const CACHE = 'spielraum-shell-v3-1';
const ASSETS = ['./app.css', './planner-ui.js', './month-ui.js', './planner.js', './legacy.js', './intelligence.js', './reserves.js', './reserves-ui.js', './actuals.js', './actuals-ui.js', './goals.js', './goals-ui.js', './reconciliation.js', './reconciliation-ui.js', './plan-payments-ui.js', './reconciliation-graphics.js', './budget-insights.js', './planning-schema.js', './scenarios.js', './scenarios-schema.js', './theme.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png', './apple-touch-icon.png', './icon-shortcut-192.png'];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS.map(url=>new Request(url,{credentials:'include',cache:'reload'})));
  const response = await fetch('./index.html', {cache:'reload',credentials:'include'});
  if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
    const text = await response.clone().text();
    if (text.includes('data-version="2"')) await cache.put('./index.html', response);
  }
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('spielraum-shell-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  if(event.request.mode === 'navigate') {
    // Auch bei Server-Fehlern (z. B. 404, wenn das Hosting ausfällt) die gespeicherte App zeigen,
    // damit Backup und Daten erreichbar bleiben.
    event.respondWith(fetch(event.request).then(async response => response.ok ? response : (await caches.match('./index.html')) || response).catch(async () => await caches.match('./index.html') || Response.error()));
    return;
  }
  const path = new URL(event.request.url).pathname;
  if(!ASSETS.some(a=>path.endsWith(a.slice(1)))) return;
  event.respondWith(fetch(event.request).then(async response => {
    if(response.ok) {
      const cache=await caches.open(CACHE);
      await cache.put(event.request,response.clone());
    }
    return response;
  }).catch(()=>caches.match(event.request)));
});
