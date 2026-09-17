(function(){
  'use strict';
  if(window.__ROS_DRIVER_APP_SHIM__)return;
  window.__ROS_DRIVER_APP_SHIM__=true;
  function isDriver(){return location.hash.startsWith('#driver/');}
  function loadInlineMap(){
    if(!isDriver()||window.__ROS_DRIVER_INLINE_MAP_LOADED__)return;
    window.__ROS_DRIVER_INLINE_MAP_LOADED__=true;
    const s=document.createElement('script');
    s.src='driver-inline-map-v1.js?v=3';s.async=true;
    s.onerror=()=>{console.warn('Driver inline map failed to load');window.__ROS_DRIVER_INLINE_MAP_LOADED__=false};
    document.body.appendChild(s);
  }
  function dedupeDriverLabels(){
    if(!isDriver())return;
    const root=document.querySelector('#rosDriverBox')||document.querySelector('#app');if(!root)return;
    let kept=false;
    [...root.querySelectorAll('*')].forEach(el=>{
      const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
      if(text!=='مندوب التوصيل')return;
      if(!kept){kept=true;return;}
      el.style.setProperty('display','none','important');
      el.setAttribute('aria-hidden','true');
    });
  }
  function boot(){setTimeout(loadInlineMap,100);setTimeout(dedupeDriverLabels,150);setTimeout(dedupeDriverLabels,500);setTimeout(dedupeDriverLabels,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('hashchange',()=>{setTimeout(loadInlineMap,100);setTimeout(dedupeDriverLabels,150);setTimeout(dedupeDriverLabels,500);setTimeout(dedupeDriverLabels,1200)});
  new MutationObserver(()=>{if(isDriver()){dedupeDriverLabels();loadInlineMap()}}).observe(document.body,{childList:true,subtree:true});
})();