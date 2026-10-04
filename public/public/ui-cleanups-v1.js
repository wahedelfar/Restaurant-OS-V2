(function(){
  'use strict';
  if(window.__ROS_UI_CLEANUPS_V1__)return;
  window.__ROS_UI_CLEANUPS_V1__=true;
  const normalize=s=>String(s||'').replace(/[\u064B-\u065F\u0670]/g,'').replace(/\s+/g,' ').trim().replace(/ة/g,'ه');
  function dedupe(){
    const seen=new Set();
    document.querySelectorAll('button,a,.cat-pill').forEach(el=>{
      const text=normalize(el.textContent);
      if(text!=='مكرونه سبيشيال'&&text!=='مكرونه سبيشال')return;
      if(seen.has(text)){el.style.display='none';el.setAttribute('aria-hidden','true');}
      else seen.add(text);
    });
  }
  dedupe();
  new MutationObserver(dedupe).observe(document.body,{childList:true,subtree:true});
})();
