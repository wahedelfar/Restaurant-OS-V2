(function(){
'use strict';
if(window.__ROS_DELIVERY_MAP_PERSISTENCE_V1__)return;
window.__ROS_DELIVERY_MAP_PERSISTENCE_V1__=true;
const ids=['rosLiveMap','rosLiveMapV2','rosInlineMap'];
const detached=new Set();
function scan(){
  document.querySelectorAll('.leaflet-container').forEach(el=>detached.add(el));
  ids.forEach(id=>{
    const target=document.getElementById(id);
    if(!target||target.querySelector('.leaflet-container'))return;
    let mapEl=null;
    for(const el of detached){if(!document.documentElement.contains(el)){mapEl=el;break}}
    if(!mapEl)return;
    try{
      mapEl.id=id;
      mapEl.style.height=target.style.height||mapEl.style.height||'300px';
      target.className.split(/\s+/).filter(Boolean).forEach(c=>mapEl.classList.add(c));
      target.replaceWith(mapEl);
      detached.delete(mapEl);
      setTimeout(()=>{try{window.dispatchEvent(new Event('resize'))}catch(_){ }},100);
    }catch(_){ }
  });
}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
scan();
})();
