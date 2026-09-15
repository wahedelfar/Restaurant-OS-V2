(function(){
  'use strict';
  if(window.__ROS_DRIVER_APP_SHIM__) return;
  window.__ROS_DRIVER_APP_SHIM__=true;
  function isDriver(){return location.hash.startsWith('#driver/');}
  function loadInlineMap(){
    if(!isDriver()||window.__ROS_DRIVER_INLINE_MAP_LOADED__)return;
    window.__ROS_DRIVER_INLINE_MAP_LOADED__=true;
    const s=document.createElement('script');
    s.src='driver-inline-map-v1.js?v=2';
    s.async=true;
    s.onerror=()=>{console.warn('Driver inline map failed to load');window.__ROS_DRIVER_INLINE_MAP_LOADED__=false};
    document.body.appendChild(s);
  }
  function dedupeDriverButtons(){
    if(!isDriver())return;
    const seen=new Set();
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
      if(text!=='مندوب التوصيل')return;
      if(seen.has(text))el.remove();else seen.add(text);
    });
  }
  function boot(){setTimeout(loadInlineMap,100);setTimeout(dedupeDriverButtons,150);setTimeout(dedupeDriverButtons,700)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  window.addEventListener('hashchange',()=>{setTimeout(loadInlineMap,100);setTimeout(dedupeDriverButtons,150);setTimeout(dedupeDriverButtons,700)});
  new MutationObserver(()=>{if(isDriver())dedupeDriverButtons()}).observe(document.body,{childList:true,subtree:true});
})();