(function(){
'use strict';
if(window.__ROS_DELIVERY_NAV_FIX_V1__)return;
window.__ROS_DELIVERY_NAV_FIX_V1__=true;

document.addEventListener('click',function(e){
  const hash=String(location.hash||'');
  const isTrack=/^#track\//i.test(hash);
  const isDriver=/^#driver\//i.test(hash);
  if(!isTrack&&!isDriver)return;
  const el=e.target&&e.target.closest?e.target.closest('button,a'):null;
  if(!el)return;
  const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
  const shouldGoHome=(isTrack&&text==='القائمة')||(isDriver&&text==='خروج');
  if(!shouldGoHome)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  location.hash='#menu';
},true);
})();
