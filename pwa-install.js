(function(){
'use strict';
if(window.__ROS_PWA_INSTALL_V8__)return;
window.__ROS_PWA_INSTALL_V8__=true;
let deferredPrompt=null,button=null,dialog=null;
const INSTALLED_KEY='ros_pwa_installed_v8';
const copy={ar:{install:'تثبيت Restaurant OS كتطبيق',close:'إغلاق',iosTitle:'تثبيت على iPhone / iPad',iosText:'في Safari اضغط مشاركة ثم اختر «إضافة إلى الشاشة الرئيسية».',safariTitle:'تثبيت على Safari',safariText:'من قائمة المشاركة اختر «إضافة إلى Dock» إذا كان الخيار متاحًا، أو «إضافة إلى الشاشة الرئيسية» على الأجهزة المدعومة.',unsupportedTitle:'تثبيت التطبيق',unsupportedText:'هذا المتصفح لا يدعم زر التثبيت المباشر. افتح قائمة المتصفح وابحث عن «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية / سطح المكتب» إذا كان الخيار متاحًا.'},en:{install:'Install Restaurant OS',close:'Close',iosTitle:'Install on iPhone / iPad',iosText:'In Safari tap Share, then choose “Add to Home Screen”.',safariTitle:'Install with Safari',safariText:'Use Share and choose “Add to Dock” when available, or “Add to Home Screen” on supported devices.',unsupportedTitle:'Install App',unsupportedText:'This browser does not expose a direct install prompt. Open the browser menu and look for “Install app” or “Add to Home Screen / Desktop” when available.'}};
const lang=()=>((document.documentElement.lang||'ar').toLowerCase().startsWith('ar')?'ar':'en');
const t=k=>copy[lang()][k];
function standalone(){return window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function isSafari(){return /^((?!chrome|android|crios|fxios|edgios|opr|opera).)*safari/i.test(navigator.userAgent)}
function wasInstalled(){return localStorage.getItem(INSTALLED_KEY)==='1'}
async function browserReportsInstalled(){
  try{
    if(typeof navigator.getInstalledRelatedApps==='function'){
      const apps=await navigator.getInstalledRelatedApps();
      if(Array.isArray(apps)&&apps.length){localStorage.setItem(INSTALLED_KEY,'1');return true}
    }
  }catch(_){ }
  return false;
}
function style(){if(document.getElementById('ros-pwa-style'))return;const s=document.createElement('style');s.id='ros-pwa-style';s.textContent=`#pwa-install{position:fixed;bottom:84px;left:14px;z-index:80;width:58px;height:58px;padding:0;border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 55%,white);border-radius:18px;cursor:pointer;display:none;align-items:center;justify-content:center;background:linear-gradient(145deg,var(--brand,#D4AF37),color-mix(in srgb,var(--brand,#D4AF37) 62%,white));box-shadow:0 12px 34px #0009,0 0 0 3px #ffffff12;font-family:Cairo,sans-serif;transition:transform .2s,opacity .2s}#pwa-install.ready{display:flex}#pwa-install img{width:44px;height:44px;border-radius:12px;object-fit:cover;display:block}.pwa-install-ready{display:flex}#pwa-install:active{transform:scale(.92)}#pwa-install::after{content:'تثبيت';position:absolute;right:-5px;top:-8px;background:#111;color:#fff;border:1px solid #ffffff22;border-radius:9px;padding:2px 6px;font:900 9px Cairo,sans-serif;box-shadow:0 3px 10px #0005}@media(max-width:480px){#pwa-install{bottom:76px;left:12px;width:54px;height:54px}#pwa-install img{width:40px;height:40px}}#ros-pwa-help{position:fixed;inset:0;z-index:120;display:none;place-items:center;padding:18px;background:#000c;backdrop-filter:blur(8px)}#ros-pwa-help.show{display:grid}#ros-pwa-help .box{width:min(410px,100%);padding:24px;text-align:center;color:#eee;background:linear-gradient(145deg,#111315,#1c1f22);border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 65%,transparent);border-radius:26px;box-shadow:0 25px 80px #000b}#ros-pwa-help h3{margin:0 0 10px;color:var(--brand,#D4AF37);font-weight:900;font-size:23px}#ros-pwa-help p{margin:0;line-height:1.9;color:#d4d4d4}#ros-pwa-help button{margin-top:18px;padding:11px 26px;border:0;border-radius:14px;background:var(--brand,#D4AF37);color:#111;font-weight:900}`;document.head.appendChild(s)}
function makeButton(){if(button)return button;button=document.createElement('button');button.id='pwa-install';button.type='button';button.title=t('install');button.setAttribute('aria-label',t('install'));button.innerHTML='<img src="./icon-72.png" alt="">';button.addEventListener('click',install);document.body.appendChild(button);return button}
function help(title,text){if(!dialog){dialog=document.createElement('div');dialog.id='ros-pwa-help';dialog.innerHTML='<div class="box"><h3></h3><p></p><button type="button"></button></div>';dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.classList.remove('show')});dialog.querySelector('button').addEventListener('click',()=>dialog.classList.remove('show'));document.body.appendChild(dialog)}dialog.querySelector('h3').textContent=t(title);dialog.querySelector('p').textContent=t(text);dialog.querySelector('button').textContent=t('close');dialog.classList.add('show')}
async function install(){if(standalone()||wasInstalled()){hide();return}if(deferredPrompt){try{deferredPrompt.prompt();const result=await deferredPrompt.userChoice;if(result?.outcome==='accepted')localStorage.setItem(INSTALLED_KEY,'1')}catch(e){console.warn('PWA install',e)}finally{deferredPrompt=null;if(wasInstalled()||standalone())hide()}return}if(isIOS())return help('iosTitle','iosText');if(isSafari())return help('safariTitle','safariText');return help('unsupportedTitle','unsupportedText')}
function hide(){if(!button)return;button.classList.remove('ready');button.hidden=true;button.style.display='none'}
function show(){if(!button||standalone()||wasInstalled())return;button.hidden=false;button.style.display='flex';button.classList.add('ready')}
async function init(){
  style();makeButton();
  if(standalone()||wasInstalled()){hide();return}
  if(await browserReportsInstalled()){hide();return}
  show();
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;show()});
  window.addEventListener('appinstalled',()=>{localStorage.setItem(INSTALLED_KEY,'1');deferredPrompt=null;hide()});
  document.addEventListener('visibilitychange',async()=>{if(document.hidden)return;if(standalone()||wasInstalled()||await browserReportsInstalled())hide()});
  window.addEventListener('hashchange',()=>{if(standalone()||wasInstalled())hide()});
}
function syncServiceWorker(){
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(window.__ROS_SW_RELOADED__)return;
    window.__ROS_SW_RELOADED__=true;
    location.reload();
  });
  navigator.serviceWorker.getRegistration().then(reg=>{
    if(reg)reg.update().catch(()=>{});
  }).catch(()=>{});
}
syncServiceWorker();
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();