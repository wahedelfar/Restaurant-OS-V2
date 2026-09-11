(function(){
  'use strict';
  if(window.__ROS_DRIVER_APP_SHIM__) return;
  window.__ROS_DRIVER_APP_SHIM__=true;

  // Canonical driver UI/GPS lives in delivery-gps-clean-v2.js.
  // Do NOT load delivery-fixes-v5.js here: that legacy layer overrides checkout()
  // and creates a second, non-canonical dine-in submission path.
  // Keep only the driver-only inline map enhancement, and load it only on #driver/.
  function isDriver(){return location.hash.startsWith('#driver/');}
  function loadInlineMap(){
    if(!isDriver()||window.__ROS_DRIVER_INLINE_MAP_LOADED__)return;
    window.__ROS_DRIVER_INLINE_MAP_LOADED__=true;
    const s=document.createElement('script');
    s.src='driver-inline-map-v1.js?v=1';
    s.async=true;
    s.onerror=()=>{console.warn('Driver inline map failed to load');window.__ROS_DRIVER_INLINE_MAP_LOADED__=false};
    document.body.appendChild(s);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(loadInlineMap,100),{once:true});
  }else setTimeout(loadInlineMap,100);
  window.addEventListener('hashchange',()=>setTimeout(loadInlineMap,100));
})();
