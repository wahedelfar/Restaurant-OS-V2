(function(){
'use strict';
const ICON='/icon-192.png?v=3',APPLE_ICON='/icon-180.png?v=3';

function restore(){
  document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="mask-icon"]').forEach(x=>x.remove());
  let a=document.createElement('link');a.rel='icon';a.type='image/png';a.sizes='192x192';a.href=ICON;document.head.appendChild(a);
  let b=document.createElement('link');b.rel='shortcut icon';b.type='image/png';b.sizes='192x192';b.href=ICON;document.head.appendChild(b);
  let c=document.createElement('link');c.rel='apple-touch-icon';c.sizes='180x180';c.href=APPLE_ICON;document.head.appendChild(c);
}

function captureInstall(e){
  e.preventDefault();
  window.__ROS_DEFERRED_INSTALL_PROMPT__=e;
  window.dispatchEvent(new CustomEvent('ros-pwa-prompt-ready'));
}

function load(){
  if(document.querySelector('script[data-ros-pwa-install]'))return;
  let s=document.createElement('script');
  s.src='/pwa-install.js?v=15';
  s.async=false;
  s.dataset.rosPwaInstall='1';
  document.head.appendChild(s);
}

function boot(){
  restore();
  window.addEventListener('beforeinstallprompt',captureInstall,{once:false});
  load();
  if('serviceWorker'in navigator){
    addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(r=>r.update()).catch(()=>{}),{once:true});
  }
}

document.readyState==='loading'
  ?document.addEventListener('DOMContentLoaded',boot,{once:true})
  :boot();
})();