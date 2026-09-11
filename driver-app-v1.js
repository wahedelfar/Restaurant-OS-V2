(function(){
  'use strict';
  // Compatibility shim only. Canonical driver UI and GPS logic live in
  // delivery-gps-clean-v2.js. Never render a second driver UI here.
  if(window.__ROS_DRIVER_APP_SHIM__) return;
  window.__ROS_DRIVER_APP_SHIM__=true;

  // Keep older cached clients compatible while the database is migrated.
  // The canonical RPC is driver_get_orders.
  try{
    if(window.db && typeof window.db.rpc==='function' && !window.__ROS_DRIVER_RPC_BRIDGE__){
      const rpc=window.db.rpc.bind(window.db);
      window.db.rpc=function(name,args){
        if(name==='driver_get_orders_v2') name='driver_get_orders';
        return rpc(name,args);
      };
      window.__ROS_DRIVER_RPC_BRIDGE__=true;
    }
  }catch(_){ }

  // Load the final delivery repair layer after the base scripts have initialized.
  // This keeps the original files intact while fixing GPS/tracking/dine-in behavior.
  function loadFixes(){
    if(window.__ROS_DELIVERY_FIXES_LOADER__)return;
    window.__ROS_DELIVERY_FIXES_LOADER__=true;
    const s=document.createElement('script');
    s.src='delivery-fixes-v5.js?v=1';
    s.async=true;
    s.onerror=e=>console.warn('Delivery fixes failed to load',e);
    document.body.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(loadFixes,100),{once:true});
  else setTimeout(loadFixes,100);
})();
