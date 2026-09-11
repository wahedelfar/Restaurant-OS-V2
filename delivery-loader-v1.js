(function(){
  'use strict';
  if(window.__ROS_DELIVERY_LOADER_V1__)return;
  window.__ROS_DELIVERY_LOADER_V1__=true;

  const files=[
    'delivery-gps-clean-v2.js?v=4',
    'delivery-admin-enhancements.js?v=2',
    'delivery-hardening-v4.js?v=4'
  ];

  function ready(){
    try{return typeof db!=='undefined'&&!!db&&typeof store!=='undefined'&&!!store?.restaurant?.id}catch(_){return false}
  }

  function loadNext(i){
    if(i>=files.length)return;
    const s=document.createElement('script');
    s.src=files[i];
    s.onload=()=>loadNext(i+1);
    s.onerror=()=>console.error('Failed to load delivery module',files[i]);
    document.body.appendChild(s);
  }

  let tries=0;
  function boot(){
    if(ready()){loadNext(0);return;}
    if(++tries>150){
      console.warn('Delivery modules were not loaded because Supabase was not ready in time.');
      return;
    }
    setTimeout(boot,100);
  }
  boot();
})();
