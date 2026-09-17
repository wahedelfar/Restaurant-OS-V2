(function(){
  'use strict';
  const ICON='/icon.svg?v=25';
  const APPLE_ICON='/icon-180.png?v=1';
  const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true;
  function restoreOfficialIcons(){
    document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="mask-icon"]').forEach(x=>x.remove());
    const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href=ICON;document.head.appendChild(icon);
    const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.type='image/svg+xml';shortcut.href=ICON;document.head.appendChild(shortcut);
    const apple=document.createElement('link');apple.rel='apple-touch-icon';apple.sizes='180x180';apple.href=APPLE_ICON;document.head.appendChild(apple);
    const mask=document.createElement('link');mask.rel='mask-icon';mask.href=ICON;mask.color='#0D0E10';document.head.appendChild(mask);
  }
  function hideInstalled(){const b=document.getElementById('pwa-install');if(b&&(standalone()||localStorage.getItem('ros_pwa_installed_v9')==='1')){b.hidden=true;b.classList.remove('ready');b.style.display='none';}}
  function syncButton(){const b=document.getElementById('pwa-install');if(!b)return false;const img=b.querySelector('img');if(img){img.src=ICON;img.alt='Restaurant OS';img.width=44;img.height=44;}b.title='تثبيت Restaurant OS كتطبيق';b.setAttribute('aria-label','تثبيت Restaurant OS كتطبيق');hideInstalled();return true;}
  function loadInstallController(){
    if(document.querySelector('script[data-ros-pwa-install]'))return;
    const s=document.createElement('script');s.src='/pwa-install.js?v=13';s.async=false;s.dataset.rosPwaInstall='1';document.head.appendChild(s);
  }
  function watch(){restoreOfficialIcons();syncButton();loadInstallController();const mo=new MutationObserver(()=>{restoreOfficialIcons();syncButton();});mo.observe(document.body,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),10000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
  window.addEventListener('appinstalled',hideInstalled);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)hideInstalled();});
  if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(r=>r.update()).catch(e=>console.warn('ROS service worker registration failed',e));});}
})();
