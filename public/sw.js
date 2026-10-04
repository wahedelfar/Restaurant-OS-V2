const CACHE_NAME='restaurant-os-v2-offline-v2-20261004';
const RUNTIME_CACHE='ros-offline-runtime-v2';
const SHELL=["/admin/index.html", "/admin-action-dock-v1.js", "/app.js", "/config.js", "/daily-offer-v1.js", "/delivery-submit-fix-v1.js", "/icon-180.png", "/icon-192.svg", "/icon-512.svg", "/icon.svg", "/index.html", "/kds/index.html", "/kds.html", "/kitchen/index.html", "/manifest.json", "/manus-routes.json", "/offline-core-v1.js", "/pwa-bootstrap-v1.js", "/pwa-install.js", "/ros-realtime-notifications-v1.js", "/sw.js", "/tracking-resilience-v1.js", "/ui-cleanups-v1.js", "/", "/admin/", "/kds/", "/kitchen/"];
const FALLBACKS={'/admin/':'/admin/index.html','/admin':'/admin/index.html','/kds/':'/kds.html','/kds':'/kds.html','/kitchen/':'/kitchen/index.html','/kitchen':'/kitchen/index.html','/':'/index.html'};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>Promise.all(SHELL.map(url=>cache.add(url).catch(()=>null)))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME&&k!==RUNTIME_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{caches.open(CACHE_NAME).then(c=>c.put(event.request,response.clone())).catch(()=>{});return response}).catch(()=>caches.match(event.request).then(r=>r||caches.match(FALLBACKS[url.pathname]||'/index.html')).then(r=>r||Response.error())));return}
  event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{if(response.ok)caches.open(CACHE_NAME).then(c=>c.put(event.request,response.clone())).catch(()=>{});return response}).catch(()=>caches.match(event.request).then(r=>r||Response.error())));
});
self.addEventListener('message',event=>{if(event.data?.type==='ROS_OFFLINE_CLEAR_CACHES')event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))));});
// offline-first-foundation=2026-10-04
