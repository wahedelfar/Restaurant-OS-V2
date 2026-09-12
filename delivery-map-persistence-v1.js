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
      mapEl.style.height=target.style.height||mapEl.style.height||'300px';
      if(target.className)target.className.split(/\s+/).filter(Boolean).forEach(c=>mapEl.classList.add(c));
      target.replaceWith(mapEl);
      detached.delete(mapEl);
      setTimeout(()=>{try{window.dispatchEvent(new Event('resize'));if(window.L&&mapEl._leaflet_id){const map=mapEl._leaflet_id&&window.L.Map?null:null}}catch(_){ }},100);
    }catch(_){ }
  });
}
const observer=new MutationObserver(scan);
observer.observe(document.body,{childList:true,subtree:true});
scan();
})();
