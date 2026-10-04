(function(){
  'use strict';
  if(window.__ROS_ADMIN_DRIVER_LEGACY_HIDE_V2__)return;
  window.__ROS_ADMIN_DRIVER_LEGACY_HIDE_V2__=true;
  function isAdmin(){return location.hash==='#admin'||location.hash.startsWith('#admin/');}
  function hideLegacy(){
    if(!isAdmin())return;
    ['#newDriverName','#rosName'].forEach(function(nameSel){
      document.querySelectorAll('#app '+nameSel).forEach(function(input){
        var row=input.closest('.grid');
        if(!row)row=input.parentElement;
        if(!row)return;
        var phone=row.querySelector('#newDriverPhone,#rosPhone');
        if(phone){
          row.style.setProperty('display','none','important');
          row.setAttribute('data-ros-legacy-driver-add-hidden','1');
        }
      });
    });
  }
  function run(){hideLegacy();setTimeout(hideLegacy,50);setTimeout(hideLegacy,250);setTimeout(hideLegacy,1000);}
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  addEventListener('hashchange',run);
  run();
})();
