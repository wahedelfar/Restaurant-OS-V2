const CACHE_NAME='restaurant-os-v2-shell-v41';
const SHELL=[
  './','./index.html','./manifest.json','./icon.svg',
  './config.js?v=4','./app.js?v=13','./pwa-bootstrap-v1.js?v=24','./pwa-install.js?v=12',
  './daily-offer-v1.js?v=1','./ui-cleanups-v1.js?v=1','./ros-realtime-notifications-v1.js?v=1'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(SHELL)).catch(()=>{}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(()=>self.clients.matchAll({type:'window',includeUncontrolled:true})).then(clients=>Promise.all(clients.map(client=>client.navigate(client.url).catch(()=>null)))))});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('./index.html')));return}event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(c=>c.put(event.request,copy)).catch(()=>{});return response}).catch(()=>caches.match(event.request)))});
