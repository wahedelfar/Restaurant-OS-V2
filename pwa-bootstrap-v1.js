(function(){
  'use strict';
  const ICON='/icon-192.png';
  const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true;
  function restoreOfficialIcons(){
    if (document.querySelector('link[rel="icon"][href="/icon-192.png"]')) return;
    document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(x=>x.remove());
    const icon=document.createElement('link');icon.rel='icon';icon.type='image/png';icon.sizes='192x192';icon.href=ICON;document.head.appendChild(icon);
    const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.type='image/png';shortcut.href=ICON;document.head.appendChild(shortcut);
    const apple=document.createElement('link');apple.rel='apple-touch-icon';apple.href=ICON;document.head.appendChild(apple);
  }
  function hideInstalled(){const b=document.getElementById('pwa-install');if(b&&(standalone()||localStorage.getItem('ros_pwa_installed_v9')==='1')){b.hidden=true;b.classList.remove('ready');b.style.display='none';}}
  function syncButton(){const b=document.getElementById('pwa-install');if(!b)return false;const img=b.querySelector('img');if(img){img.src=ICON;img.alt='Restaurant OS';img.width=44;img.height=44;}b.title='تثبيت Restaurant OS كتطبيق';b.setAttribute('aria-label','تثبيت Restaurant OS كتطبيق');hideInstalled();return true;}
  function watch(){restoreOfficialIcons();syncButton();const mo=new MutationObserver(()=>{restoreOfficialIcons();syncButton();});mo.observe(document.body,{childList:true,subtree:true});setTimeout(()=>mo.disconnect(),10000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
  window.addEventListener('appinstalled',hideInstalled);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)hideInstalled();});
  if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js',{scope:'/'}).then(r=>r.update()).catch(e=>console.warn('ROS service worker registration failed',e));});}
})();
