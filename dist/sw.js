const CACHE = 'spielraum-shell-v2-15';
const ASSETS = ['./refinement.css', './purchase.js', './purchase-ui.js', './budget-insights.js', './reconciliation-graphics.js', './plan-payments-ui.js', './planning-schema.js', './timeline.js', './timeline-ui.js', './decision-assistant.js', './reconciliation.js', './reconciliation-ui.js', './scenarios-schema.js', './scenarios.js', './scenarios-ui.js', './goals.js', './goals-ui.js', './theme.js', './actuals.js', './actuals-ui.js', './reserves.js', './reserves-ui.js', './app-icon-v3.svg', './app-icon-v3-192.png', './app-icon-v3-512.png', './app-icon-v3-1024.png', './app-icon-v3-maskable-512.png', './intelligence.js', './planner.css', './planner-ui.js', './planner.js', './legacy.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
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
    event.respondWith(fetch(event.request).catch(async () => await caches.match('./index.html') || Response.error()));
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
