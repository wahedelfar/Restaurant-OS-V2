(function(){
'use strict';
if(window.__ROS_DELIVERY_ORDER_DETAILS_V2__)return;
window.__ROS_DELIVERY_ORDER_DETAILS_V2__=true;
const POLL_MS=30000;
let timer=0,token=null,lastRoute='';
const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
const status=s=>({new:'جديد',confirmed:'تم التأكيد',preparing:'قيد التحضير',ready:'جاهز',assigned:'تم التعيين',accepted:'تم القبول',picked_up:'تم الاستلام',out_for_delivery:'في الطريق إليك',delivered:'تم التسليم',cancelled:'ملغي'})[s]||s||'—';
function itemsHtml(items){let arr=items;if(typeof arr==='string')try{arr=JSON.parse(arr)}catch(_){arr=[]}if(!Array.isArray(arr)||!arr.length)return '<div class="text-sm" style="color:var(--muted)">لا توجد تفاصيل منتجات.</div>';return `<div class="space-y-2">${arr.map(x=>{const q=Number(x.quantity??x.qty??1),p=Number(x.price||0),n=esc(x.name||'منتج');return `<div class="flex items-center justify-between gap-3 rounded-xl p-3" style="background:var(--surface)"><div class="min-w-0"><div class="font-extrabold truncate">${n}</div><div class="text-xs mt-1" style="color:var(--muted)">${q} × ${money(p)}</div></div><div class="font-extrabold whitespace-nowrap">${money(q*p)}</div></div>`}).join('')}</div>`}
function customerMapButton(x){const lat=Number(x.customer_lat),lng=Number(x.customer_lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))return '<div class="mt-3 text-xs" style="color:var(--muted)">موقع العميل غير محدد لهذا الطلب.</div>';return '<button type="button" data-ros-customer-location class="mt-3 w-full py-3 rounded-xl border font-extrabold">موقع العميل</button>'}
function card(x,mode){
  if(mode==='customer')return `<div data-ros-order-details="customer" class="rounded-3xl p-5 mb-4" dir="rtl" style="background:linear-gradient(145deg,var(--surface2),var(--surface));border:1px solid color-mix(in srgb,var(--brand) 24%,transparent)"><div class="flex justify-between items-center gap-3 mb-4"><div><div class="text-xs font-bold" style="color:var(--muted)">YOUR ORDER</div><div class="text-xl font-extrabold">تفاصيل طلبك</div></div><div class="text-sm font-extrabold">${money(x.total)}</div></div>${itemsHtml(x.items)}<div class="mt-4 pt-4" style="border-top:1px solid color-mix(in srgb,var(--text) 10%,transparent)"><div class="flex justify-between gap-3 text-sm"><span style="color:var(--muted)">الحالة</span><span class="font-extrabold">${esc(status(x.status))}</span></div></div></div>`;
  return `<div data-ros-order-details="driver" data-order-id="${esc(x.id)}" class="rounded-3xl p-5 mb-4" dir="rtl" style="background:linear-gradient(145deg,var(--surface2),var(--surface));border:1px solid color-mix(in srgb,var(--brand) 24%,transparent)"><div class="flex justify-between items-center gap-3 mb-4"><div><div class="text-xs font-bold" style="color:var(--muted)">DELIVERY ORDER</div><div class="text-xl font-extrabold">تفاصيل طلب العميل</div></div><div class="text-sm font-extrabold">${money(x.total)}</div></div><div class="grid gap-2 mb-4"><div><span class="text-xs" style="color:var(--muted)">العميل</span><div class="font-extrabold">${esc(x.customer_name||'—')}</div></div><div><span class="text-xs" style="color:var(--muted)">الهاتف</span><div class="font-bold" dir="ltr">${esc(x.customer_phone||'—')}</div></div><div><span class="text-xs" style="color:var(--muted)">العنوان</span><div class="font-bold">${esc(x.address||'—')}</div></div></div>${customerMapButton(x)}<div class="font-extrabold mb-3 mt-4">الطلب</div>${itemsHtml(x.items)}</div>`;
}
async function customer(){return;}
async function driver(){if(!/^#driver\//.test(location.hash||''))return;const t=decodeURIComponent((location.hash||'').slice(8));if(!t||!window.db)return;token=t;try{const r=await window.db.rpc('driver_get_orders',{p_token:t});if(r.error)return;const rows=Array.isArray(r.data)?r.data:[];const box=document.querySelector('#rosDriverBox');if(!box)return;box.querySelectorAll('[data-ros-order-details]').forEach(el=>el.remove());if(!rows.length)return;const active=rows.filter(x=>!['delivered','cancelled'].includes(x.delivery_status||''));const list=active.length?active:rows;box.insertAdjacentHTML('afterbegin',list.map(x=>card(x,'driver')).join(''))}catch(_){}}
async function run(){
  const h=location.hash||'',q=new URLSearchParams(location.search||'');
  const route=/^#driver\//.test(h)||location.pathname==='/driver'||location.pathname==='/driver/'||q.has('token')?'driver':'';
  if(route!==lastRoute){lastRoute=route;clearInterval(timer);timer=0}
  if(!route)return;
  await driver();
  if(!timer)timer=setInterval(driver,POLL_MS);
}
window.addEventListener('hashchange',run);setTimeout(run,1000);let lastRouteHash='';setInterval(()=>{const h=location.hash||'';if(h!==lastRouteHash){lastRouteHash=h;run()}},1500);
})();