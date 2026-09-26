(function(){
  'use strict';
  if(window.__ROS_DRIVER_APP_SHIM__)return;
  window.__ROS_DRIVER_APP_SHIM__=true;
  function isDriver(){const h=location.hash||'';const q=new URLSearchParams(location.search||'');return h.startsWith('#driver/')||location.pathname==='/driver'||location.pathname==='/driver/'||q.has('token');}
  function loadInlineMap(){
    if(!isDriver()||window.__ROS_DRIVER_INLINE_MAP_LOADED__)return;
    window.__ROS_DRIVER_INLINE_MAP_LOADED__=true;
    const s=document.createElement('script');
    s.src='driver-inline-map-v1.js?v=3';s.async=true;
    s.onerror=()=>{console.warn('Driver inline map failed to load');window.__ROS_DRIVER_INLINE_MAP_LOADED__=false};
    document.body.appendChild(s);
  }
  function cleanDriverHeadingText(){
    if(!isDriver())return;
    const root=document.querySelector('#rosDriverBox')||document.querySelector('#app');if(!root)return;
    const bad=['لوحة المندوب الخاصة بك','لوحة المندوب • متابعة وتسليم الطلبات','لوحة المندوب'];
    [...root.querySelectorAll('*')].forEach(el=>{
      const t=String(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!t||!bad.includes(t))return;
      el.remove();
    });
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;while(n=walker.nextNode())nodes.push(n);
    nodes.forEach(node=>{let v=String(node.nodeValue||'');bad.forEach(x=>{v=v.split(x).join('')});node.nodeValue=v});
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
  function boot(){setTimeout(loadInlineMap,100);setTimeout(cleanDriverHeadingText,150);setTimeout(dedupeDriverLabels,150);setTimeout(cleanDriverHeadingText,500);setTimeout(dedupeDriverLabels,500);setTimeout(cleanDriverHeadingText,1200);setTimeout(dedupeDriverLabels,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('hashchange',()=>{setTimeout(loadInlineMap,100);setTimeout(cleanDriverHeadingText,150);setTimeout(dedupeDriverLabels,150);setTimeout(cleanDriverHeadingText,500);setTimeout(dedupeDriverLabels,500);setTimeout(cleanDriverHeadingText,1200);setTimeout(dedupeDriverLabels,1200)});
  new MutationObserver(()=>{if(isDriver()){dedupeDriverLabels();loadInlineMap()}}).observe(document.body,{childList:true,subtree:true});
})();