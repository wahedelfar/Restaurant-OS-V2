(function(){
'use strict';
if(window.__ROS_PWA_INSTALL_CURRENT__){window.__ROS_PWA_INSTALL_REFRESH__?.();return}
window.__ROS_PWA_INSTALL_CURRENT__=true;

let deferredPrompt=window.__ROS_DEFERRED_INSTALL_PROMPT__||null;
let button=null;

const KEY='ros_pwa_installed_v11';
const ICON='/icon-192.png?v=3';
const APPLE_ICON='/icon-180.png?v=3';

const standalone=()=>matchMedia('(display-mode: standalone)').matches||
  matchMedia('(display-mode: window-controls-overlay)').matches||
  navigator.standalone===true;

function style(){
  if(document.getElementById('ros-pwa-install-style'))return;
  const s=document.createElement('style');
  s.id='ros-pwa-install-style';
  s.textContent=
    '#pwa-install{position:fixed;left:16px;bottom:16px;z-index:2147483000;display:none;align-items:center;gap:9px;padding:9px 14px 9px 10px;border:1px solid rgba(212,175,55,.55);border-radius:16px;background:linear-gradient(135deg,#D4AF37,#B8860B);color:#111;font-family:Cairo,Arial,sans-serif;font-size:13px;font-weight:900;line-height:1;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:pointer;direction:rtl;transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease}'+
    '#pwa-install:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(0,0,0,.42)}'+
    '#pwa-install:active{transform:translateY(0) scale(.98)}'+
    '#pwa-install img{width:36px;height:36px;border-radius:10px;display:block;object-fit:cover;background:#0D0E10;box-shadow:0 2px 8px rgba(0,0,0,.28)}'+
    '@media(max-width:480px){#pwa-install{left:12px;bottom:12px;padding:8px 12px 8px 8px;border-radius:14px}#pwa-install img{width:34px;height:34px}}';
  document.head.appendChild(s);
}

function restoreIcons(){
  document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="mask-icon"]').forEach(x=>x.remove());
  const icon=document.createElement('link');
  icon.rel='icon';icon.type='image/png';icon.sizes='192x192';icon.href=ICON;document.head.appendChild(icon);
  const shortcut=document.createElement('link');
  shortcut.rel='shortcut icon';shortcut.type='image/png';shortcut.sizes='192x192';shortcut.href=ICON;document.head.appendChild(shortcut);
  const apple=document.createElement('link');
  apple.rel='apple-touch-icon';apple.sizes='180x180';apple.href=APPLE_ICON;document.head.appendChild(apple);
}

function hide(){
  if(!button)return;
  button.hidden=true;
  button.style.display='none';
}

function show(){
  if(!button||standalone()||localStorage.getItem(KEY)==='1')return;
  button.hidden=false;
  button.style.display='flex';
}

function toast(message){
  const host=document.getElementById('toast');
  if(!host){alert(message);return}
  host.innerHTML='<div class="fixed left-4 bottom-20 z-[2147483000] max-w-[calc(100vw-32px)] rounded-2xl px-4 py-3 bg-black/90 text-white text-sm font-bold shadow-2xl border border-white/10">'+message+'</div>';
  setTimeout(()=>host.innerHTML='',4000);
}

function make(){
  if(button)return;
  button=document.createElement('button');
  button.id='pwa-install';
  button.type='button';
  button.title='تثبيت Restaurant OS كتطبيق';
  button.setAttribute('aria-label','تثبيت Restaurant OS كتطبيق');
  button.hidden=true;
  button.innerHTML='<img src="'+ICON+'" alt="" width="36" height="36"><span>تثبيت التطبيق</span>';
  button.onclick=async()=>{
    if(standalone()){hide();return}
    if(!deferredPrompt){
      toast('إذا لم تظهر نافذة التثبيت، افتح قائمة المتصفح ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».');
      return
    }
    const e=deferredPrompt;
    deferredPrompt=null;
    try{
      e.prompt();
      const choice=await e.userChoice;
      if(choice?.outcome==='accepted'){
        localStorage.setItem(KEY,'1');
        hide()
      }else{
        show()
      }
    }catch(err){
      console.warn('PWA install prompt failed',err);
      show()
    }
  };
  document.body.appendChild(button);
}

function capture(e){
  e.preventDefault();
  deferredPrompt=e;
  window.__ROS_DEFERRED_INSTALL_PROMPT__=e;
  show();
}

function init(){
  style();
  restoreIcons();
  make();

  if(standalone()){hide();return}

  window.addEventListener('beforeinstallprompt',capture);
  window.addEventListener('appinstalled',()=>{
    localStorage.setItem(KEY,'1');
    deferredPrompt=null;
    window.__ROS_DEFERRED_INSTALL_PROMPT__=null;
    hide();
  });

  if(window.__ROS_DEFERRED_INSTALL_PROMPT__)show();
  else show();
}

window.__ROS_PWA_INSTALL_REFRESH__=function(){
  deferredPrompt=window.__ROS_DEFERRED_INSTALL_PROMPT__||deferredPrompt;
  style();restoreIcons();make();
  if(standalone())hide();else show();
};

document.readyState==='loading'
  ?document.addEventListener('DOMContentLoaded',init,{once:true})
  :init();
})();