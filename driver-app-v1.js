(function(){
  'use strict';
  if(window.__ROS_DRIVER_APP_V1__)return;
  window.__ROS_DRIVER_APP_V1__=true;

  // This module is intentionally a compatibility gate for the existing driver UI.
  // The original driver renderer lives in delivery-gps-clean-v2.js. We only prevent
  // its early timer from flashing an error before Supabase finishes initializing.
  const isDriver=()=>String(location.hash||'').startsWith('#driver/');
  const token=()=>{const m=String(location.hash||'').match(/^#driver\/(.+)$/);return m?decodeURIComponent(m[1]):''};
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let held='';

  async function waitReady(){
    for(let i=0;i<150;i++){
      try{if(typeof db!=='undefined'&&db&&typeof store!=='undefined'&&store?.restaurant?.id)return true}catch(_){}
      await sleep(100);
    }
    return false;
  }

  function renameExit(){
    document.querySelectorAll('#app button').forEach(b=>{
      if(b.textContent.trim()==='خروج')b.textContent='العودة للقائمة';
    });
  }

  async function release(){
    if(!held||!isDriver())return;
    const h=held;held='';
    if(location.hash!==h)location.hash=h;
    await waitReady();
    if(typeof window.renderRouter==='function'){
      try{await window.renderRouter()}catch(e){console.warn('driver route',e)}
    }
    setTimeout(renameExit,30);
  }

  // Hold the driver hash briefly while the base app initializes. This prevents
  // delivery-gps-clean-v2's 250ms/1200ms early router attempts from showing an error.
  if(isDriver()){
    held=location.hash;
    try{history.replaceState(null,'','#menu')}catch(_){location.hash='#menu'}
    setTimeout(release,0);
  }

  window.addEventListener('hashchange',()=>{
    if(isDriver()&&!held){held=location.hash;setTimeout(release,0)}
    setTimeout(renameExit,50);
  },true);

  const observer=new MutationObserver(()=>{if(isDriver())renameExit()});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(renameExit,500);
})();
