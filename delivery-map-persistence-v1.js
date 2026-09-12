(function(){
'use strict';
if(window.__ROS_DELIVERY_MAP_PERSISTENCE_V1__)return;
window.__ROS_DELIVERY_MAP_PERSISTENCE_V1__=true;
const ids=['rosLiveMap','rosLiveMapV2'];
const detached=new Set();
function scan(){
  document.querySelectorAll('.leaflet-container').forEach(el=>detached.add(el));
  ids.forEach(id=>{
    const target=document.getElementById(id);
    if(!target||target.querySelector('.leaflet-container'))return;
    let mapEl=null;
    for(const el of detached){
      if(!document.documentElement.contains(el)){mapEl=el;break}
    }
    if(!mapEl)return;
    try{
      mapEl.id=id;
      mapEl.style.height=target.style.height||'300px';
      mapEl.className=target.className||'rounded-2xl overflow-hidden';
      target.replaceWith(mapEl);
      detached.delete(mapEl);
      setTimeout(()=>{
        try{if(window.L&&mapEl._leaflet_id){const m=mapEl._leaflet_id;window.dispatchEvent(new Event('resize'))}}catch(_){ }
      },80);
    }catch(_){ }
  });
}
const observer=new MutationObserver(scan);
observer.observe(document.body,{childList:true,subtree:true});
scan();
})();
