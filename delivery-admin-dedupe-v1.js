(function(){
'use strict';
if(window.__ROS_DINEIN_ADMIN_DEDUPE_V1__)return;
window.__ROS_DINEIN_ADMIN_DEDUPE_V1__=true;
let timer=0;
function cleanup(){
  if(!location.hash.startsWith('#admin'))return;
  const deliveryPanel=document.querySelector('#deliveryControlPanel');
  const panels=[...document.querySelectorAll('#rosPrepPanel')];
  if(!deliveryPanel){panels.forEach(x=>x.remove());return}
  panels.slice(1).forEach(x=>x.remove());
  const panel=document.querySelector('#rosPrepPanel');
  if(panel){
    const seen=new Set();
    [...panel.querySelectorAll('[data-ros-order-id]')].forEach(card=>{
      const id=String(card.getAttribute('data-ros-order-id')||'');
      if(id&&seen.has(id))card.remove();else if(id)seen.add(id);
    });
  }
  const loginNodes=[...document.querySelectorAll('*')].filter(el=>el.children.length===0&&el.textContent.trim()==='تسجيل دخول الإدارة');
  loginNodes.slice(1).forEach(el=>el.remove());
}
function boot(){clearTimeout(timer);timer=setTimeout(cleanup,150)}
window.addEventListener('hashchange',boot);
new MutationObserver(boot).observe(document.body,{childList:true,subtree:true});
boot();
})();