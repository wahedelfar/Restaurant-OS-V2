(function(){
'use strict';
if(window.__ROS_DINEIN_ADMIN_GUARD_V2__)return;
window.__ROS_DINEIN_ADMIN_GUARD_V2__=true;

// The dine-in admin UI must exist only after a real Supabase admin session.
// Keep exactly one V7 panel; V10 is retired from the page and any stale instance is removed.
const PANEL_IDS=['rosPrepPanel','rosV10DinePanel'];
let timer=0;
let checking=false;

function isAdminRoute(){return location.hash==='#admin'||location.hash.startsWith('#admin/');}
function removePanels(){PANEL_IDS.forEach(id=>document.querySelectorAll('#'+id).forEach(el=>el.remove()));}
function removeDuplicates(){
  const panels=[...document.querySelectorAll('#rosPrepPanel')];
  panels.slice(1).forEach(el=>el.remove());
}
function hideUntilAuth(){
  if(!document.getElementById('rosDineAdminGuardStyle')){
    const s=document.createElement('style');
    s.id='rosDineAdminGuardStyle';
    s.textContent='#rosPrepPanel,#rosV10DinePanel{display:none!important}body.ros-dine-admin-auth #rosPrepPanel{display:block!important}';
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
    if(!session){
      document.body.classList.remove('ros-dine-admin-auth');
      removePanels();
      return;
    }
    document.body.classList.add('ros-dine-admin-auth');
    // V10 rendered a second dine-in admin implementation. Never allow it to coexist with V7.
    document.querySelectorAll('#rosV10DinePanel').forEach(el=>el.remove());
    removeDuplicates();
  }finally{checking=false}
}
function schedule(){clearTimeout(timer);timer=setTimeout(sync,60)}
window.addEventListener('hashchange',schedule,true);
window.addEventListener('load',schedule,{once:false});
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
setInterval(sync,700);
schedule();
})();
