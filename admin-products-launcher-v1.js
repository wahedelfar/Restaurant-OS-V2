(function(){
'use strict';
if(window.__ROS_ADMIN_PRODUCTS_LAUNCHER_V1__)return;
window.__ROS_ADMIN_PRODUCTS_LAUNCHER_V1__=true;
function isAdmin(){return location.hash==='#admin'||location.hash.startsWith('#admin/')}
function esc(v){return typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function findLegacy(){
 if(!isAdmin())return null;
 const all=document.querySelectorAll('#app section,#app > div,#app .lux-card,#app [class*="rounded"]');
 for(const el of all){
  if(el.dataset?.rosProductPanel==='1'||el.closest('#ros-products-panel'))continue;
  const text=(el.textContent||'').replace(/\s+/g,' ').trim();
  const hasFormButton=[...el.querySelectorAll('button,[role="button"]')].some(b=>/productForm\s*\(/.test(b.getAttribute('onclick')||''));
  const hasProductHeading=[...el.querySelectorAll('h1,h2,h3,h4')].some(h=>/المنتجات|إدارة المنتجات/.test((h.textContent||'').trim()));
  const hasProductSave=el.querySelector('#saveProductBtn');
  if((hasProductHeading||hasFormButton||hasProductSave)&&text.length>20){
    el.dataset.rosProductLegacy='1';
    return el;
  }
 }
 return null;
}
function hideLegacy(){const el=findLegacy();if(!el||el.dataset.rosProductOpen==='1')return;el.style.setProperty('display','none','important')}
function css(){if(document.getElementById('ros-products-launcher-style'))return;const s=document.createElement('style');s.id='ros-products-launcher-style';s.textContent=`#ros-products-launcher{position:fixed;right:150px;bottom:18px;z-index:9988;border:1px solid #ffffff20;background:#17191df5;color:#f6f1e7;border-radius:18px;padding:13px 17px;min-width:118px;height:46px;font:800 14px Cairo,Arial;box-shadow:0 15px 45px #0008;cursor:pointer;backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;gap:7px}#ros-products-panel{position:fixed;inset:0;z-index:9994;background:#0d0e10f7;backdrop-filter:blur(14px);display:none;overflow:auto;font-family:Cairo,Arial;color:var(--text);padding:18px}#ros-products-panel.open{display:block}#ros-products-panel-inner{max-width:1180px;margin:0 auto;padding:4px 0 30px}.rp-head{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:10px 0}.rp-title{font-size:24px;font-weight:900}.rp-close{width:44px;height:44px;border-radius:14px;border:1px solid #ffffff18;background:var(--surface2);color:var(--text);font-size:24px;cursor:pointer}.rp-note{font-size:12px;color:var(--muted);margin-top:2px}@media(max-width:600px){#ros-products-launcher{right:150px;bottom:18px;min-width:112px}.rp-title{font-size:21px}#ros-products-panel{padding:12px}}`;document.head.appendChild(s)}
function ensure(){if(!isAdmin())return;css();hideLegacy();if(!document.getElementById('ros-products-launcher')){const b=document.createElement('button');b.id='ros-products-launcher';b.type='button';b.innerHTML='<span>🍔</span><span>المنتجات</span>';b.onclick=openPanel;document.body.appendChild(b)}if(!document.getElementById('ros-products-panel')){const p=document.createElement('div');p.id='ros-products-panel';p.innerHTML='<div id="ros-products-panel-inner"><div class="rp-head"><div><div class="rp-title">إدارة المنتجات</div><div class="rp-note">كل إدارة المنتجات في مساحة مستقلة بدون ازدحام لوحة الإدارة.</div></div><button type="button" class="rp-close" aria-label="إغلاق">×</button></div><div id="ros-products-host"></div></div>';p.querySelector('.rp-close').onclick=closePanel;p.addEventListener('click',e=>{if(e.target===p)closePanel()});document.body.appendChild(p)}}
function openPanel(){ensure();const el=findLegacy(),host=document.getElementById('ros-products-host'),panel=document.getElementById('ros-products-panel');if(!el||!host||!panel){if(typeof toast==='function')toast('تعذر العثور على لوحة إدارة المنتجات');return}if(!el.dataset.rosProductPlaceholder){const ph=document.createElement('span');ph.id='ros-product-placeholder';ph.style.display='none';el.parentNode.insertBefore(ph,el);el.dataset.rosProductPlaceholder='ros-product-placeholder'}el.dataset.rosProductOpen='1';el.style.removeProperty('display');host.appendChild(el);panel.classList.add('open')}
function closePanel(){const panel=document.getElementById('ros-products-panel'),el=document.querySelector('[data-ros-product-legacy="1"],[data-ros-product-legacy="1"]');if(el){const ph=document.getElementById('ros-product-placeholder');if(ph?.parentNode){ph.parentNode.insertBefore(el,ph.nextSibling)}else document.querySelector('#app')?.appendChild(el);el.dataset.rosProductOpen='';el.style.setProperty('display','none','important')}panel?.classList.remove('open')}
new MutationObserver(()=>{if(isAdmin())ensure()}).observe(document.body,{childList:true,subtree:true});
addEventListener('hashchange',()=>{if(!isAdmin()){document.getElementById('ros-products-panel')?.classList.remove('open');return}setTimeout(ensure,0)});
ensure();
})();
