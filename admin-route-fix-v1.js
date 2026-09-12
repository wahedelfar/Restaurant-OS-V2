(function(){'use strict';
if(window.__ROS_ADMIN_ROUTE_FIX_V1__)return;window.__ROS_ADMIN_ROUTE_FIX_V1__=true;
function isAdmin(){return /^#admin(?:\/|$)/i.test(String(location.hash||''));}
function route(){if(!isAdmin())return;try{if(typeof window.renderAdmin==='function'){window.renderAdmin();return}}catch(e){console.warn('[ROS admin route]',e)}try{if(typeof window.renderRouter==='function')window.renderRouter()}catch(e){console.warn('[ROS admin router]',e)}}
window.addEventListener('hashchange',function(){if(isAdmin())setTimeout(route,0)},true);
function boot(){if(isAdmin()){route();setTimeout(route,250);setTimeout(route,1000)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
