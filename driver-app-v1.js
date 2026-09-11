(function(){
  'use strict';
  // Compatibility shim only. The canonical driver UI and GPS logic live in
  // delivery-gps-clean-v2.js. Never call the removed driver_get_orders_v2 RPC.
  if(window.__ROS_DRIVER_APP_SHIM__) return;
  window.__ROS_DRIVER_APP_SHIM__=true;

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
})();
