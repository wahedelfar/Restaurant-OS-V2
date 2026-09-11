(function(){
'use strict';
if(window.__ROS_DELIVERY_V7_FEATURES__)return;
window.__ROS_DELIVERY_V7_FEATURES__=true;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ready=()=>!!(window.db&&window.store?.restaurant?.id);
const esc=v=>typeof window.esc==='function'?window.esc(v??''):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
const toast=m=>{try{window.toast?window.toast(m):console.log(m)}catch(_) {}};
const PREP=[5,15,30,45,60];
let adminStarted=false,adminTimer=null,adminChannel=null;
const STATUS={new:{label:'تم استلام الطلب',message:'تم استلام طلب حضرتك'},preparing:{label:'جاري التجهيز',message:'جاري تجهيز طلب حضرتك'},ready:{label:'طلبك جاهز',message:'تم التجهيز — طلبك جاهز'},delivered:{label:'شكرًا لاختيارنا',message:'شكرًا لاختيارنا'}};
const statusInfo=s=>STATUS[s]||STATUS.new;
async function enableNotifications(){
 if(!('Notification'in window)){toast('المتصفح لا يدعم إشعارات النظام');return false}
 try{const p=await Notification.requestPermission();toast(p==='granted'?'تم تفعيل تنبيهات الطلب':'لم يتم السماح بالتنبيهات من المتصفح');return p==='granted'}catch(e){console.warn(e);toast('تعذر تفعيل التنبيهات');return false}
}
async function sendNotification(title,body){
 if(!('Notification'in window)||Notification.permission!=='granted')return;
 try{if(navigator.serviceWorker?.ready){const reg=await navigator.serviceWorker.ready;if(reg?.showNotification){await reg.showNotification(title,{body,tag:'ros-order-status',renotify:true,icon:'favicon-192.png',badge:'favicon-192.png',dir:'rtl',lang:'ar',data:{url:location.href}});return}}}catch(e){console.warn('SW notification',e)}
 try{new Notification(title,{body,tag:'ros-order-status',renotify:true})}catch(e){console.warn('Notification',e)}
}
function itemsText(o){let a=o?.items;try{if(typeof a==='string')a=JSON.parse(a)}catch(_){a=[]}return Array.isArray(a)?a.map(x=>`${esc(x.name||x.product_name||'منتج')} × ${Number(x.quantity||x.qty||1)}`).join(' • '):'—'}
async function adminQuery(){
 if(!ready())return[];
 const r=await db.from('orders').select('*').eq('restaurant_id',store.restaurant.id).order('created_at',{ascending:false}).limit(100);
 if(!r.error){
   const all=r.data||[];
   const seen=new Set();
   store.orders=all.filter(o=>{const id=String(o.id||'');if(!id||seen.has(id))return false;seen.add(id);return true});
 }else console.warn('Dine-in admin query',r.error);
 return store.orders||[];
}
async function updateOrder(id,patch){
 if(!ready())return false;
 const r=await db.from('orders').update(patch).eq('id',id).eq('restaurant_id',store.restaurant.id).select('id').maybeSingle();
 if(r.error){toast('تعذر تحديث الطلب: '+r.error.message);console.error(r.error);return false}
 return true;
}
function findAdminHost(){return document.querySelector('#deliveryControlPanel')}
function removeDuplicatePrepPanels(){
 const boxes=[...document.querySelectorAll('#rosPrepPanel')];
 boxes.slice(1).forEach(x=>x.remove());
 return boxes[0]||null;
}
function renderAdmin(){
 if(!ready()||!location.hash.startsWith('#admin'))return;
 const host=findAdminHost();
 if(!host)return;
 let box=removeDuplicatePrepPanels();
 if(!box){box=document.createElement('section');box.id='rosPrepPanel';box.className='lux-card rounded-3xl p-5 mt-6';host.appendChild(box)}
 const map=new Map();
 (store.orders||[]).filter(o=>o.order_type==='dine_in').forEach(o=>map.set(String(o.id),o));
 const rows=[...map.values()].slice(0,30);
 box.innerHTML=`
 <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><div class="eyebrow">إدارة طلبات الصالة</div><h3 class="text-2xl font-extrabold">متابعة طلبات الصالة</h3><p class="text-sm mt-1" style="color:var(--muted)">تحكم في وقت التجهيز وحالة كل طلب وأرسل التحديث للعميل فورًا.</p></div></div>
 <div class="mt-5 grid gap-4">${rows.length?rows.map(o=>{const currentPrep=Number(o.prep_minutes||0),current=statusInfo(o.status);return `<article data-ros-order-id="${esc(o.id)}" class="rounded-3xl p-4 border" style="background:var(--surface2)">
 <div class="flex flex-col sm:flex-row justify-between gap-3"><div><div class="font-extrabold text-lg">الطاولة ${esc(o.table_number||'—')}</div><div class="text-sm mt-1" style="color:var(--muted)">${esc(o.customer_name||'عميل')} • ${itemsText(o)}</div></div><div class="font-extrabold">${money(o.total)}</div></div>
 <div class="mt-5"><div class="font-extrabold mb-3">وقت التجهيز</div><div class="grid grid-cols-2 sm:grid-cols-5 gap-2">${PREP.map(n=>`<button type="button" data-prep="${esc(o.id)}" data-min="${n}" class="ros-prep-btn rounded-2xl border px-3 py-3 font-extrabold transition ${currentPrep===n?'ring-2':''}" style="${currentPrep===n?'background:var(--brand);color:#111;border-color:var(--brand)':''}">${n} دقيقة</button>`).join('')}</div></div>
 <div class="mt-5"><div class="font-extrabold mb-3">حالة الطلب</div><div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><button type="button" data-st="${esc(o.id)}" data-v="preparing" data-m="جاري تجهيز طلب حضرتك" class="ros-status-btn rounded-2xl border px-3 py-4 font-extrabold ${o.status==='preparing'?'ring-2':''}" style="${o.status==='preparing'?'background:var(--brand);color:#111;border-color:var(--brand)':''}">جاري التجهيز</button><button type="button" data-st="${esc(o.id)}" data-v="ready" data-m="تم التجهيز — طلبك جاهز" class="ros-status-btn rounded-2xl border px-3 py-4 font-extrabold ${o.status==='ready'?'ring-2':''}" style="${o.status==='ready'?'background:var(--brand);color:#111;border-color:var(--brand)':''}">تم التجهيز / طلبك جاهز</button><button type="button" data-st="${esc(o.id)}" data-v="delivered" data-m="شكرًا لاختيارنا" class="ros-status-btn rounded-2xl border px-3 py-4 font-extrabold ${o.status==='delivered'?'ring-2':''}" style="${o.status==='delivered'?'background:var(--brand);color:#111;border-color:var(--brand)':''}">شكرًا لاختيارنا</button></div></div>
 <div class="mt-4 rounded-2xl p-4" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">الحالة المعروضة للعميل</div><div class="font-extrabold mt-1">${esc(o.admin_message||current.message)}</div>${currentPrep?`<div class="text-sm mt-1" style="color:var(--muted)">وقت التجهيز المحدد: ${currentPrep} دقيقة</div>`:''}</div></article>`}).join(''):'<div class="py-10 text-center" style="color:var(--muted)">لا توجد طلبات داخلية حاليًا.</div>'}</div>`;
 box.querySelectorAll('[data-prep]').forEach(btn=>btn.addEventListener('click',async()=>{if(btn.disabled)return;btn.disabled=true;const ok=await updateOrder(btn.dataset.prep,{prep_minutes:Number(btn.dataset.min)});if(ok){await adminQuery();renderAdmin();toast('تم حفظ وقت التجهيز')}btn.disabled=false}));
 box.querySelectorAll('[data-st]').forEach(btn=>btn.addEventListener('click',async()=>{if(btn.disabled)return;btn.disabled=true;const ok=await updateOrder(btn.dataset.st,{status:btn.dataset.v,admin_message:btn.dataset.m});if(ok){await adminQuery();renderAdmin();toast('تم تحديث حالة الطلب')}btn.disabled=false}));
}
async function startAdmin(){
 if(adminStarted||!ready()||!location.hash.startsWith('#admin'))return;
 try{const s=await db.auth.getSession();if(!s?.data?.session)return}catch(e){return}
 adminStarted=true;await adminQuery();renderAdmin();
 try{adminChannel=db.channel('ros-dine-admin-'+store.restaurant.id).on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:`restaurant_id=eq.${store.restaurant.id}`},async()=>{await adminQuery();renderAdmin()}).subscribe()}catch(e){console.warn('Admin realtime',e)}
 clearInterval(adminTimer);adminTimer=setInterval(async()=>{if(location.hash.startsWith('#admin')){await adminQuery();renderAdmin()}},5000);
}
function customerStatusCards(x){const rank={new:0,preparing:1,ready:2,delivered:3}[x.status||'new']??0;const steps=[{icon:'✓',label:'تم استلام الطلب'},{icon:'◌',label:'جاري التجهيز'},{icon:'✓',label:'طلبك جاهز'},{icon:'★',label:'شكرًا لاختيارنا'}];return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">${steps.map((s,i)=>`<div class="rounded-2xl p-4 border ${i===rank?'ring-2':''}" style="background:${i<=rank?'color-mix(in srgb,var(--brand) 14%,var(--surface2))':'var(--surface2)'};border-color:${i===rank?'var(--brand)':'color-mix(in srgb,var(--text) 9%,transparent)'}"><div class="w-10 h-10 rounded-full grid place-items-center font-extrabold mb-3" style="background:${i<=rank?'var(--brand)':'var(--surface)'};color:${i<=rank?'#111':'var(--muted)'}">${s.icon}</div><div class="font-extrabold text-sm">${s.label}</div></div>`).join('')}</div>`}
window.__ROS_V7_RENDER_ADMIN__=renderAdmin;
window.__ROS_V7_START_ADMIN__=startAdmin;
window.__ROS_V7_STATUS_INFO__=statusInfo;
function boot(){if(location.hash.startsWith('#admin'))startAdmin()}
window.addEventListener('hashchange',boot);setTimeout(boot,250);
})();