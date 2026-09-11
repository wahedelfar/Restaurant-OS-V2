const CACHE_NAME='restaurant-os-v2-shell-v8';
const SHELL=['./','./index.html','./config.js?v=2','./app.js?v=10','./cart-bridge.js?v=3','./delivery-gps-clean-v2.js?v=3','./delivery-admin-enhancements.js?v=2','./delivery-hardening-v4.js?v=3','./pwa-install.js?v=10','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('./index.html')));return;}
  event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy)).catch(()=>{});return response}).catch(()=>caches.match(event.request)));
});
