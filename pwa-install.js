(function(){
'use strict';
let deferredPrompt=null,button=null,dialog=null;
const INSTALLED_KEY='ros_pwa_installed_v6';
const MIGRATION_KEY='ros_pwa_migrated_v6';
const OLD_KEYS=['ros_pwa_installed_v2','ros_pwa_installed_v3','ros_pwa_installed_v4','ros_pwa_installed_v5'];
function wasInstalled(){return localStorage.getItem(INSTALLED_KEY)==='1'||OLD_KEYS.some(k=>localStorage.getItem(k)==='1')}
const copy={
 ar:{install:'تثبيت التطبيق',close:'إغلاق',iosTitle:'تثبيت التطبيق على iPhone / iPad',iosText:'في Safari اضغط مشاركة ثم اختر «إضافة إلى الشاشة الرئيسية».',desktopTitle:'تثبيت Restaurant OS',desktopText:'اختر «تثبيت التطبيق» من شريط العنوان أو قائمة المتصفح إذا كان متاحًا.'},
 en:{install:'Install App',close:'Close',iosTitle:'Install on iPhone / iPad',iosText:'In Safari tap Share, then choose “Add to Home Screen”.',desktopTitle:'Install Restaurant OS',desktopText:'Choose “Install app” from the address bar or browser menu when available.'}
};
const lang=()=>((document.documentElement.lang||'ar').startsWith('ar')?'ar':'en');
const t=k=>copy[lang()][k];
function standalone(){return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true}
function style(){if(document.getElementById('pwa-style'))return;const s=document.createElement('style');s.id='pwa-style';s.textContent=`
#pwa-install{position:fixed;bottom:84px;left:14px;z-index:70;width:54px;height:54px;padding:0;border:0;border-radius:50%;cursor:pointer;display:none;align-items:center;justify-content:center;background:var(--brand,#111);box-shadow:0 8px 24px #0008,0 0 0 3px #fff7;animation:pwaFloat 2.6s ease-in-out infinite;font-family:Cairo,sans-serif}
#pwa-install.ready{display:flex}#pwa-install img{width:40px;height:40px;border-radius:50%;object-fit:cover}#pwa-install:active{transform:scale(.92)}#pwa-install::after{content:'تثبيت';position:absolute;right:-3px;top:-7px;background:#fff;color:#111;border-radius:9px;padding:1px 5px;font:800 9px Cairo,sans-serif;box-shadow:0 2px 8px #0002}@keyframes pwaFloat{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-6px) rotate(2deg)}}
#pwa-help{position:fixed;inset:0;z-index:90;display:none;place-items:center;padding:16px;background:#000c;backdrop-filter:blur(4px)}#pwa-help.show{display:grid}#pwa-help .box{width:min(380px,100%);padding:22px;text-align:center;color:#ddd;background:#121212;border:1px solid #D4AF37;border-radius:22px;box-shadow:0 10px 40px #000a}#pwa-help h3{margin:0 0 10px;color:#D4AF37;font-weight:900;font-size:22px}#pwa-help p{margin:0;line-height:1.8}#pwa-help button{margin-top:16px;padding:10px 24px;border:0;border-radius:12px;background:#D4AF37;color:#000;font-weight:800}`;document.head.appendChild(s)}
function makeButton(){if(button)return button;button=document.createElement('button');button.id='pwa-install';button.type='button';button.title=t('install');button.setAttribute('aria-label',t('install'));button.innerHTML='<img src="icons/icon-72.png" alt="🍕">';button.addEventListener('click',install);document.body.appendChild(button);return button}
function help(title,text){if(!dialog){dialog=document.createElement('div');dialog.id='pwa-help';dialog.innerHTML='<div class="box"><h3></h3><p></p><button type="button"></button></div>';dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.classList.remove('show')});dialog.querySelector('button').addEventListener('click',()=>dialog.classList.remove('show'));document.body.appendChild(dialog)}dialog.querySelector('h3').textContent=t(title);dialog.querySelector('p').textContent=t(text);dialog.querySelector('button').textContent=t('close');dialog.classList.add('show')}
async function install(){
  if(standalone()||wasInstalled()){hide();return}
  if(!deferredPrompt)return hide();
  try{deferredPrompt.prompt();const result=await deferredPrompt.userChoice;if(result.outcome==='accepted')localStorage.setItem(INSTALLED_KEY,'1')}catch(e){console.warn(e)}finally{deferredPrompt=null;hide()}
}
function hide(){if(button){button.classList.remove('ready');button.hidden=true;button.style.display='none'}}
function show(){if(button&&!standalone()&&!wasInstalled()&&deferredPrompt){button.hidden=false;button.style.display='flex';button.classList.add('ready')}}
async function cleanupLegacySW(){
 if(localStorage.getItem(MIGRATION_KEY)==='1')return;
 try{
   if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.unregister()));}
   if(window.caches){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));}
 }catch(e){console.warn('PWA migration cleanup',e)}
 localStorage.setItem(MIGRATION_KEY,'1');
}
function init(){
 style();makeButton();hide();
 if(standalone()||wasInstalled())return;
 void cleanupLegacySW().finally(()=>{
   if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js?v=6').catch(console.warn);
 });
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;show()});
 window.addEventListener('appinstalled',()=>{localStorage.setItem(INSTALLED_KEY,'1');deferredPrompt=null;hide()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&standalone())hide()});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
