(function(){
  'use strict';
  if(window.__ROS_DRIVER_GPS_LIFECYCLE_V1__) return;
  window.__ROS_DRIVER_GPS_LIFECYCLE_V1__=true;

  const geo=navigator.geolocation;
  if(!geo||typeof geo.watchPosition!=='function'||typeof geo.clearWatch!=='function')return;

  const originalWatch=geo.watchPosition.bind(geo);
  const originalClear=geo.clearWatch.bind(geo);
  const active=new Set();

  function isDriver(){return location.hash.startsWith('#driver/');}

  function stopAll(){
    for(const id of active){
      try{originalClear(id)}catch(_){ }
    }
    active.clear();
    window.__ROS_DRIVER_GPS_ACTIVE__=false;
  }

  geo.watchPosition=function(success,error,options){
    const id=originalWatch(function(position){
      window.__ROS_DRIVER_GPS_ACTIVE__=true;
      if(typeof success==='function')success(position);
    },error,options);
    if(isDriver())active.add(id);
    return id;
  };

  geo.clearWatch=function(id){
    active.delete(id);
    return originalClear(id);
  };

  window.__rosStopDriverGps=stopAll;

  window.addEventListener('hashchange',()=>{
    if(!isDriver())stopAll();
  },{passive:true});

  window.addEventListener('pagehide',stopAll,{passive:true});
  window.addEventListener('beforeunload',stopAll,{passive:true});
})();