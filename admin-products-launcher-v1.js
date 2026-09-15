(function(){
'use strict';
if(window.__ROS_ADMIN_PRODUCTS_LAUNCHER_V2__)return;
window.__ROS_ADMIN_PRODUCTS_LAUNCHER_V2__=true;
function isAdmin(){return location.hash==='#admin'||location.hash.startsWith('#admin/')}
function css(){if(document.getElementById('ros-products-launcher-style'))return;const s=document.createElement('style');s.id='ros-products-launcher-style';s.textContent=`#ros-products-launcher{position:fixed;right:150px;bottom:18px;z-index:9988;border:1px solid #ffffff20;background:#17191df5;color:#f6f1e7;border-radius:18px;padding:13px 17px;min-width:118px;height:46px;font:800 14px Cairo,Arial;box-shadow:0 15px 45px #0008;cursor:pointer;backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;gap:7px}#ros-products-panel{position:fixed;inset:0;z-index:9994;background:#0d0e10f7;backdrop-filter:blur(14px);display:none;overflow:auto;font-family:Cairo,Arial;color:var(--text);padding:18px}#ros-products-panel.open{display:block}#ros-products-panel-inner{max-width:1180px;margin:0 auto;padding:4px 0 30px}.rp-head{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding:10px 0}.rp-title{font-size:24px;font-weight:900}.rp-close{width:44px;height:44px;border-radius:14px;border:1px solid #ffffff18;background:var(--surface2);color:var(--text);font-size:24px;cursor:pointer}.rp-note{font-size:12px;color:var(--muted);margin-top:2px}@media(max-width:600px){#ros-products-launcher{right:150px;bottom:18px;min-width:112px}.rp-title{font-size:21px}#ros-products-panel{padding:12px}}`;document.head.appendChild(s)}
function ensure(){if(!isAdmin())return;css();if(!document.getElementById('ros-products-launcher')){const b=document.createElement('button');b.id='ros-products-launcher';b.type='button';b.innerHTML='<span>🍔</span><span>المنتجات</span>';b.onclick=openProducts;b.setAttribute('aria-label','إدارة المنتجات');document.body.appendChild(b)}if(!document.getElementById('ros-products-panel')){const p=document.createElement('div');p.id='ros-products-panel';p.innerHTML='<div id="ros-products-panel-inner"><div class="rp-head"><div><div class="rp-title">إدارة المنتجات</div><div class="rp-note">اختر إدارة المنتجات من لوحة الإدارة الحالية بدون تغيير أي منطق أو بيانات.</div></div><button type="button" class="rp-close" aria-label="إغلاق">×</button></div><div id="ros-products-host"></div></div>';p.querySelector('.rp-close').onclick=closeProducts;p.addEventListener('click',e=>{if(e.target===p)closeProducts()});document.body.appendChild(p)}}
function openProducts(){
 ensure();
 const panel=document.getElementById('ros-products-panel');
 const host=document.getElementById('ros-products-host');
 if(!panel||!host)return;
 host.innerHTML='';
 const candidates=[...document.querySelectorAll('#app button,[role="button"],button')].filter(b=>{const t=(b.textContent||'').replace(/\\s+/g,' ').trim();const oc=b.getAttribute('onclick')||'';return /productForm\\s*\\(/.test(oc)||/إضافة منتج|منتج جديد/.test(t)});
 if(candidates[0]){
   const b=candidates[0];
   const clone=b.cloneNode(true);
   clone.style.cssText='width:100%;min-height:54px;border-radius:16px;font-weight:900;cursor:pointer;';
   clone.textContent='فتح إدارة المنتجات';
   clone.onclick=function(){closeProducts();setTimeout(()=>{try{b.click()}catch(_){if(typeof window.productForm==='function')window.productForm()}},0)};
   host.appendChild(clone);
 }else{
   host.innerHTML='<div style="padding:24px;border-radius:18px;background:var(--surface2);color:var(--muted);text-align:center">لوحة إدارة المنتجات الحالية غير متاحة الآن.</div>';
 }
 panel.classList.add('open');
}
function closeProducts(){document.getElementById('ros-products-panel')?.classList.remove('open')}
new MutationObserver(()=>{if(isAdmin())ensure()}).observe(document.body,{childList:true,subtree:true});
addEventListener('hashchange',()=>{if(!isAdmin())closeProducts();else setTimeout(ensure,0)});
ensure();
})();
