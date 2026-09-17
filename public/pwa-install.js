(function(){
'use strict';
if(window.__ROS_PWA_INSTALL_CURRENT__)return;
window.__ROS_PWA_INSTALL_CURRENT__=true;
let deferredPrompt=null,button=null,dialog=null;
const KEY='ros_pwa_installed_v9';
const ICON='/icon.svg?v=25';
const APPLE_ICON='/icon-180.png?v=1';
const copy={ar:{install:'تثبيت Restaurant OS كتطبيق',close:'إغلاق',iosTitle:'تثبيت على iPhone / iPad',iosText:'في Safari اضغط مشاركة ثم اختر «إضافة إلى الشاشة الرئيسية».',unsupportedTitle:'تثبيت التطبيق',unsupportedText:'افتح قائمة المتصفح وابحث عن «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». '}};
const t=k=>copy.ar[k];
function standalone(){return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function wasInstalled(){try{return localStorage.getItem(KEY)==='1'}catch(_){return false}}
function restoreIcons(){
  document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="mask-icon"]').forEach(x=>x.remove());
  const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href=ICON;document.head.appendChild(icon);
  const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.type='image/svg+xml';shortcut.href=ICON;document.head.appendChild(shortcut);
  const apple=document.createElement('link');apple.rel='apple-touch-icon';apple.sizes='180x180';apple.href=APPLE_ICON;document.head.appendChild(apple);
  const mask=document.createElement('link');mask.rel='mask-icon';mask.href=ICON;mask.color='#0D0E10';document.head.appendChild(mask);
}
function style(){if(document.getElementById('ros-pwa-style'))return;const s=document.createElement('style');s.id='ros-pwa-style';s.textContent='#pwa-install{position:fixed;bottom:84px;left:14px;z-index:9999;width:58px;height:58px;padding:0;border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 55%,white);border-radius:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,var(--brand,#D4AF37),color-mix(in srgb,var(--brand,#D4AF37) 62%,white));box-shadow:0 12px 34px #0009;font-family:Cairo,sans-serif}#pwa-install img{width:44px;height:44px;border-radius:12px;display:block}#pwa-install::after{content:"تثبيت";position:absolute;right:-5px;top:-8px;background:#111;color:#fff;border:1px solid #ffffff22;border-radius:9px;padding:2px 6px;font:900 9px Cairo,sans-serif}@media(max-width:480px){#pwa-install{bottom:76px;left:12px;width:54px;height:54px}#pwa-install img{width:40px;height:40px}}#ros-pwa-help{position:fixed;inset:0;z-index:10000;display:none;place-items:center;padding:18px;background:#000c;backdrop-filter:blur(8px)}#ros-pwa-help.show{display:grid}#ros-pwa-help .box{width:min(410px,100%);padding:24px;text-align:center;color:#eee;background:#15171a;border:1px solid var(--brand,#D4AF37);border-radius:26px}.pwa-install-ready{display:flex}';document.head.appendChild(s)}
function make(){if(button)return;button=document.createElement('button');button.id='pwa-install';button.type='button';button.title=t('install');button.setAttribute('aria-label',t('install'));button.innerHTML='<img src="'+ICON+'" alt="">';button.onclick=install;document.body.appendChild(button)}
function help(title,text){if(!dialog){dialog=document.createElement('div');dialog.id='ros-pwa-help';dialog.innerHTML='<div class="box"><h3></h3><p></p><button type="button"></button></div>';dialog.onclick=e=>{if(e.target===dialog)dialog.classList.remove('show')};dialog.querySelector('button').onclick=()=>dialog.classList.remove('show');document.body.appendChild(dialog)}dialog.querySelector('h3').textContent=title;dialog.querySelector('p').textContent=text;dialog.querySelector('button').textContent=t('close');dialog.classList.add('show')}
async function install(){if(standalone()||wasInstalled()){button.style.display='none';return}if(deferredPrompt){try{deferredPrompt.prompt();const r=await deferredPrompt.userChoice;if(r?.outcome==='accepted')localStorage.setItem(KEY,'1')}catch(e){console.warn(e)}deferredPrompt=null;return}if(isIOS())return help(t('iosTitle'),t('iosText'));return help(t('unsupportedTitle'),t('unsupportedText'))}
function init(){restoreIcons();style();make();if(standalone()||wasInstalled()){button.style.display='none';return}window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e});window.addEventListener('appinstalled',()=>{try{localStorage.setItem(KEY,'1')}catch(_){}button.style.display='none'});}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();