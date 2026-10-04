const CACHE_NAME='restaurant-os-v2-offline-v1-20261004';
const RUNTIME_CACHE='ros-offline-runtime-v1';

const SHELL=[
  './',
  './index.html',
  './manifest.json',
  './icon-180.png?v=3',
  './icon-192.png?v=3',
  './icon-512.png?v=3',
  './icon.svg?v=26',
  './config.js?v=4',
  './offline-core-v1.js?v=1',
  './app.js?v=10',
  './app.js?v=offline-runtime-v1',
  './pwa-bootstrap-v1.js?v=1',
  './pwa-install.js?v=11',
  './product-modifiers-v2.js?v=1',
  './product-image-upload-v1.js?v=2',
  './dine-in-admin-guard-v2.js?v=1',
  './cart-bridge.js?v=3',
  './delivery-gps-clean-v2.js?v=3',
  './customer-tracking-v2.js?v=7',
  './delivery-ui-polish-v1.js?v=1',
  './delivery-idempotency-v1.js?v=1',
  './order-modifier-bridge-v1.js?v=1',
  './delivery-admin-enhancements.js?v=5',
  './driver-photo-field-v2.js?v=3',
  './admin-payment-proof-v1.js?v=5',
  './admin-tables-launcher-v1.js?v=4',
  './admin-driver-launcher-v1.js?v=2',
  './admin-driver-legacy-hide-v1.js?v=2',
  './admin-products-launcher-v1.js?v=5',
  './admin-drivers-management-v1.js?v=4',
  './admin-action-dock-v1.js?v=4',
  './admin-ux-notifications-v1.js?v=3',
  './delivery-hardening-v4.js?v=3',
  './driver-app-v1.js?v=5',
  './delivery-map-persistence-v1.js?v=3',
  './delivery-order-details-v1.js?v=3',
  './driver-delivered-button-fix-v1.js?v=1',
  './dine-in-v10-fix.js?v=2',
  './dine-in-track-router-v1.js?v=1',
  './driver-gps-lifecycle-v1.js?v=1',
  './kitchen-admin-v1.js?v=3'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>Promise.allSettled(SHELL.map(url=>cache.add(url).catch(err=>{
        console.warn('[ROS SW] precache skipped:',url,err);
        return null;
      }))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys
          .filter(key=>key!==CACHE_NAME&&key!==RUNTIME_CACHE)
          .map(key=>caches.delete(key))
      ))
      .then(()=>self.clients.claim())
      .then(()=>self.clients.matchAll({type:'window',includeUncontrolled:true}))
      .then(clients=>Promise.all(clients.map(client=>client.navigate(client.url).catch(()=>null))))
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;

  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy)).catch(()=>{});
          return response;
        })
        .catch(()=>caches.match('./index.html').then(r=>r||Response.error()))
    );
    return;
  }

  event.respondWith(
    fetch(event.request,{cache:'no-store'})
      .then(response=>{
        if(response.ok){
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request,response.clone())).catch(()=>{});
        }
        return response;
      })
      .catch(()=>caches.match(event.request).then(r=>r||Response.error()))
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='ROS_OFFLINE_CLEAR_CACHES'){
    event.waitUntil(
      caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key))))
    );
  }
});

// offline-first-foundation=2026-10-04
