(function(){
'use strict';
if(window.__ROS_PWA_INSTALL_CURRENT__)return;
window.__ROS_PWA_INSTALL_CURRENT__=true;
let deferredPrompt=null,button=null;
const KEY='ros_pwa_installed_v10';
const ICON='/icon-192.png?v=2';
const APPLE_ICON='/icon-180.png?v=2';
const standalone=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true;
function restoreIcons(){
  document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="mask-icon"]').forEach(x=>x.remove());
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/png';icon.sizes='192x192';icon.href=ICON;document.head.appendChild(icon);
  const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.type='image/png';shortcut.sizes='192x192';shortcut.href=ICON;document.head.appendChild(shortcut);
  const apple=document.createElement('link');apple.rel='apple-touch-icon';apple.sizes='180x180';apple.href=APPLE_ICON;document.head.appendChild(apple);
}
function hide(){if(button){button.hidden=true;button.style.display='none'}}
function show(){if(button&&!standalone()){button.hidden=false;button.style.display='flex'}}
function make(){if(button)return;button=document.createElement('button');button.id='pwa-install';button.type='button';button.title='تثبيت Restaurant OS كتطبيق';button.setAttribute('aria-label','تثبيت Restaurant OS كتطبيق');button.hidden=true;button.style.display='none';button.innerHTML='<img src="'+ICON+'" alt="Restaurant OS" width="44" height="44">';button.onclick=async()=>{if(!deferredPrompt)return;const e=deferredPrompt;deferredPrompt=null;try{e.prompt();const choice=await e.userChoice;if(choice?.outcome==='accepted'){localStorage.setItem(KEY,'1');hide()}}catch(err){console.warn('PWA install prompt failed',err)}};document.body.appendChild(button)}
function init(){
  restoreIcons();make();
  if(standalone()||localStorage.getItem(KEY)==='1'){hide();return}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;show()});
  window.addEventListener('appinstalled',()=>{localStorage.setItem(KEY,'1');hide()});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();