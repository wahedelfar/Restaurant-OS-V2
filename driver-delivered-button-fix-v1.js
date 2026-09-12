(function(){
  'use strict';
  if(window.__ROS_DRIVER_DELIVERED_BUTTON_FIX_V1__) return;
  window.__ROS_DRIVER_DELIVERED_BUTTON_FIX_V1__=true;

  function isDriver(){return location.hash.startsWith('#driver/');}

  function enhance(){
    if(!isDriver()) return;
    document.querySelectorAll('#rosDriverBox article').forEach(article=>{
      const badge=article.querySelector('span');
      const delivered=String(badge?.textContent||'').trim()==='تم التسليم';
      if(!delivered) return;

      article.querySelectorAll('button').forEach(btn=>{
        if(String(btn.textContent||'').trim()!=='تم التسليم') return;
        btn.disabled=true;
        btn.removeAttribute('onclick');
        btn.setAttribute('aria-disabled','true');
        btn.textContent='تم التسليم ✓';
        btn.style.opacity='0.6';
        btn.style.cursor='default';
      });
    });
  }

  const observer=new MutationObserver(()=>setTimeout(enhance,0));
  const start=()=>{
    if(document.body) observer.observe(document.body,{childList:true,subtree:true});
    enhance();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('hashchange',()=>setTimeout(enhance,50));
})();