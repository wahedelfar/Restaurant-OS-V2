(function(){
'use strict';
if(window.__ROS_DINEIN_ADMIN_GUARD_V2__)return;
window.__ROS_DINEIN_ADMIN_GUARD_V2__=true;

// Dine-in admin controls must never appear on the login screen.
// Keep only the V10 implementation; V7's duplicate admin panel is removed.
let timer=0;
let checking=false;

function isAdminRoute(){return location.hash==='#admin'||location.hash.startsWith('#admin/');}
function removeV7(){document.querySelectorAll('#rosPrepPanel').forEach(el=>el.remove());}
function removeV10(){document.querySelectorAll('#rosV10DinePanel').forEach(el=>el.remove());}
function hideUntilAuth(){
  if(!document.getElementById('rosDineAdminGuardStyle')){
    const s=document.createElement('style');
    s.id='rosDineAdminGuardStyle';
    s.textContent='#rosPrepPanel,#rosV10DinePanel{display:none!important}body.ros-dine-admin-auth #rosV10DinePanel{display:block!important}';
    document.head.appendChild(s);
  }
}
async function sync(){
  if(checking||!isAdminRoute())return;
  checking=true;
  hideUntilAuth();
  try{
    let session=null;
    try{session=(await db?.auth?.getSession())?.data?.session||null}catch(_){session=null}
    // V7 can create its panel without checking Auth. Always remove that implementation.
    removeV7();
    if(!session){
      document.body.classList.remove('ros-dine-admin-auth');
      removeV10();
      return;
    }
    document.body.classList.add('ros-dine-admin-auth');
  }finally{checking=false}
}
function schedule(){clearTimeout(timer);timer=setTimeout(sync,60)}
window.addEventListener('hashchange',schedule,true);
window.addEventListener('load',schedule,{once:false});
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
setInterval(sync,700);
schedule();
})();
