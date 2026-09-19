const CACHE_NAME='restaurant-os-v2-shell-v45';
const SHELL=['./','./index.html','./manifest.json','./icon-180.png?v=3','./icon-192.png?v=3','./icon-512.png?v=3','./icon.svg?v=26','./config.js?v=4','./app.js?v=13','./pwa-bootstrap-v1.js?v=27','./pwa-install.js?v=15','./daily-offer-v1.js?v=1','./ui-cleanups-v1.js?v=1','./ros-realtime-notifications-v1.js?v=1'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)).catch(()=>{}).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE_NAME).map(x=>caches.delete(x)))).then(()=>self.clients.claim()).then(()=>self.clients.matchAll({type:'window',includeUncontrolled:true})).then(cs=>Promise.all(cs.map(c=>c.navigate(c.url).catch(()=>null))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./index.html')));return}e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{caches.open(CACHE_NAME).then(c=>c.put(e.request,r.clone())).catch(()=>{});return r}).catch(()=>caches.match(e.request)))});

// production-pwa-rebuild=2026-09-18T00:04Z
