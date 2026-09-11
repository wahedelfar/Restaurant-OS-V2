(function(){
  'use strict';
  if(window.__ROS_DRIVER_APP_V1__)return;
  window.__ROS_DRIVER_APP_V1__=true;

  // Compatibility gate for the existing driver UI. The actual driver renderer
  // remains in delivery-gps-clean-v2.js; this prevents its early route timers
  // from flashing a false error while Supabase is still initializing.
  const isDriver=()=>String(location.hash||'').startsWith('#driver/');
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
    if(!held)return;
    const h=held;
    await waitReady();
    if(!h)return;
    try{history.replaceState(null,'',h)}catch(_){location.hash=h}
    held='';
    if(typeof window.renderRouter==='function'){
      try{await window.renderRouter()}catch(e){console.warn('driver route',e)}
    }
    setTimeout(renameExit,30);
  }

  if(isDriver()){
    held=location.hash;
    try{history.replaceState(null,'','#menu')}catch(_){location.hash='#menu'}
    setTimeout(release,0);
  }

  window.addEventListener('hashchange',()=>{
    if(isDriver()&&!held){held=location.hash;try{history.replaceState(null,'','#menu')}catch(_){location.hash='#menu'};setTimeout(release,0)}
    setTimeout(renameExit,50);
  },true);

  const observer=new MutationObserver(()=>{if(isDriver())renameExit()});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(renameExit,500);
})();
