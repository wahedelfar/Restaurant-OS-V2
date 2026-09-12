(function(){
  'use strict';
  if(window.__ROS_DRIVER_DELIVERED_BUTTON_FIX_V2__) return;
  window.__ROS_DRIVER_DELIVERED_BUTTON_FIX_V2__=true;

  function isDriver(){return location.hash.startsWith('#driver/');}

  function getStatus(article){
    const badge=article?.querySelector('span.px-3.py-1');
    return String(badge?.textContent||'').trim();
  }

  function enhance(){
    if(!isDriver()) return;
    document.querySelectorAll('#rosDriverBox article').forEach(article=>{
      const state=getStatus(article);
      const button=[...article.querySelectorAll('button')].find(btn=>String(btn.textContent||'').trim().startsWith('تم التسليم'));
      if(!button)return;

      const terminal=state==='تم التسليم'||state==='ملغي';
      const ready=state==='خرج للتوصيل';
      const locked=terminal||!ready;

      button.disabled=locked;
      button.setAttribute('aria-disabled',String(locked));
      button.style.opacity=locked?'0.55':'';
      button.style.cursor=locked?'not-allowed':'';

      if(terminal){
        button.removeAttribute('onclick');
        button.textContent='تم التسليم ✓';
        button.title='تم تسليم الطلب بالفعل';
      }else if(!ready){
        button.title='يصبح زر التسليم متاحًا بعد اختيار «خرج للتوصيل»';
      }else{
        button.removeAttribute('title');
      }
    });
  }

  const observer=new MutationObserver(()=>setTimeout(enhance,0));
  function start(){
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    enhance();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('hashchange',()=>setTimeout(enhance,50));
})();
