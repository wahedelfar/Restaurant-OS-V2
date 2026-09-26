(function(){
  'use strict';
  if(window.__ROS_DRIVER_APP_SHIM__)return;
  window.__ROS_DRIVER_APP_SHIM__=true;
  function isDriver(){const h=location.hash||'';const q=new URLSearchParams(location.search||'');return h.startsWith('#driver/')||location.pathname==='/driver'||location.pathname==='/driver/';}
  function loadInlineMap(){
    if(!isDriver()||window.__ROS_DRIVER_INLINE_MAP_LOADED__)return;
    window.__ROS_DRIVER_INLINE_MAP_LOADED__=true;
    const s=document.createElement('script');
    s.src='driver-inline-map-v1.js?v=3';s.async=true;
    s.onerror=()=>{console.warn('Driver inline map failed to load');window.__ROS_DRIVER_INLINE_MAP_LOADED__=false};
    document.body.appendChild(s);
  }
  function dedupeDriverUi(){
    if(!isDriver())return;
    const canonical=document.querySelector('#rosDriverBox');
    if(canonical){
      document.querySelectorAll('#driverBox').forEach(el=>el.remove());
      const boxes=[...document.querySelectorAll('#rosDriverBox')];
      boxes.slice(1).forEach(el=>el.remove());
    }
    // The old profile-polish layer is decorative only and could be injected repeatedly
    // by legacy cached runtimes. Remove it from the canonical driver route.
    document.querySelectorAll('#ros-driver-profile').forEach(el=>el.remove());
    const root=document.querySelector('#rosDriverBox')||document.querySelector('#app');if(!root)return;
    let kept=false;
    [...root.querySelectorAll('*')].forEach(el=>{
      const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!['مندوب التوصيل','لوحة المندوب','لوحة المندوب الخاصة بك','لوحة المندوب • متابعة وتسليم الطلبات'].includes(text))return;
      if(!kept){kept=true;return;}
      el.style.setProperty('display','none','important');
      el.setAttribute('aria-hidden','true');
    });
  }
  function boot(){setTimeout(loadInlineMap,100);setTimeout(dedupeDriverUi,120);setTimeout(dedupeDriverUi,400);setTimeout(dedupeDriverUi,1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('hashchange',()=>{setTimeout(loadInlineMap,100);setTimeout(dedupeDriverUi,150);setTimeout(dedupeDriverUi,500);setTimeout(dedupeDriverUi,1200)});
  new MutationObserver(()=>{if(isDriver()){dedupeDriverUi();loadInlineMap()}}).observe(document.body,{childList:true,subtree:true});
})();