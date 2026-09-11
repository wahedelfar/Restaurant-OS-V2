(function(){
'use strict';
if(window.__ROS_DRIVER_FIX_V3__) return;
window.__ROS_DRIVER_FIX_V3__=true;
const isDriver=()=>String(location.hash||'').startsWith('#driver/');
const token=()=>decodeURIComponent(String(location.hash||'').split('/')[1]||'');
async function waitReady(){for(let i=0;i<180;i++){if(window.db&&window.store?.restaurant?.id)return true;await new Promise(r=>setTimeout(r,100));}return false;}
async function render(){
 const app=document.querySelector('#app'); if(!app)return;
 app.innerHTML='<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-6"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">DRIVER APP</div><h1 class="text-2xl font-extrabold">لوحة المندوب</h1></div><button id="driverBack" type="button" class="rounded-xl border px-4 py-2">العودة للقائمة</button></div><div id="driverBox" class="mt-6">جارٍ تحميل بيانات المندوب...</div></div></div></main>';
 document.querySelector('#driverBack')?.addEventListener('click',()=>{location.hash='menu';if(typeof window.renderRouter==='function')window.renderRouter();});
 if(!await waitReady())return;
 const box=document.querySelector('#driverBox');
 const r=await db.rpc('driver_get_orders',{p_token:token()});
 if(r.error){box.innerHTML='<div class="rounded-2xl p-4 bg-red-500/10"><b>تعذر تحميل طلبات المندوب</b><div class="mt-2 text-sm" dir="ltr">'+String(r.error.message||'Unknown error')+'</div></div>';return;}
 const rows=Array.isArray(r.data)?r.data:[];
 if(!rows.length){box.innerHTML='<div class="rounded-2xl p-5" style="background:var(--surface2)">لا توجد طلبات مسندة لهذا المندوب.</div>';return;}
 box.innerHTML='<div class="space-y-4">'+rows.map(o=>'<article class="rounded-2xl p-4" style="background:var(--surface2)"><div class="flex justify-between gap-3"><div><div class="font-extrabold">طلب #'+String(o.id||'').slice(0,8)+'</div><div class="text-sm mt-1">'+String(o.customer_name||'عميل')+' • '+String(o.customer_phone||'')+'</div></div><div class="font-extrabold">'+(typeof window.money==='function'?window.money(o.total):Number(o.total||0).toFixed(0)+' جنيه')+'</div></div><div class="mt-3 text-sm">'+String(o.address||'—')+'</div><div class="mt-3 font-bold">الحالة: '+String(o.delivery_status||o.status||'—')+'</div><div class="mt-3 text-xs" style="color:var(--muted)">آخر موقع مرسل: '+(o.driver_latitude!=null?Number(o.driver_latitude).toFixed(6)+', '+Number(o.driver_longitude).toFixed(6):'غير متاح')+'</div></article>').join('')+'</div>';
}
if(isDriver())setTimeout(render,2500);
window.addEventListener('hashchange',()=>{if(isDriver())setTimeout(render,500)},true);
})();
