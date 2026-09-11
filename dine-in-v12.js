(function(){
'use strict';
if(window.__ROS_DINEIN_V12__)return;
window.__ROS_DINEIN_V12__=true;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PREP=[5,15,30,45,60];
const STATUS={new:'تم استلام الطلب',preparing:'جاري التجهيز',ready:'طلبك جاهز',delivered:'شكرًا لاختيارنا'};
const esc=v=>typeof window.esc==='function'?window.esc(v??''):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
const toast=m=>{try{window.toast?window.toast(m):console.log(m)}catch(_){}};
const trackKey=t=>'ros_dinein_'+t;
const markDine=t=>{try{localStorage.setItem(trackKey(t),'1')}catch(_) {}};
const knownDine=t=>{try{return localStorage.getItem(trackKey(t))==='1'}catch(_){return false}};

// Prevent the old delivery tracker/router from taking over a known dine-in tracking URL.
window.addEventListener('hashchange',function(e){
  const h=location.hash;
  if(h.startsWith('#track/')){
    const token=decodeURIComponent(h.slice(7));
    if(knownDine(token))e.stopImmediatePropagation();
  }
},true);

function ready(){return !!(window.db&&window.store?.restaurant?.id)}
function table(){return typeof window.tableFromUrl==='function'?window.tableFromUrl():null}

async function notify(body){
  if(!('Notification'in window)||Notification.permission!=='granted')return;
  try{
    if(navigator.serviceWorker?.ready){const reg=await navigator.serviceWorker.ready;if(reg?.showNotification){await reg.showNotification('تحديث حالة طلبك',{body,tag:'ros-dinein-status',renotify:true,dir:'rtl',lang:'ar'});return}}
  }catch(e){console.warn(e)}
  try{new Notification('تحديث حالة طلبك',{body,tag:'ros-dinein-status',renotify:true})}catch(e){console.warn(e)}
}
async function enableNotifications(){
  if(!('Notification'in window)){toast('المتصفح لا يدعم الإشعارات');return false}
  try{const p=await Notification.requestPermission();toast(p==='granted'?'تم تفعيل تنبيهات حالة الطلب':'لم يتم السماح بالتنبيهات');return p==='granted'}catch(e){toast('تعذر تفعيل التنبيهات');return false}
}

async function createDineOrder(){
  const t=table();
  if(!t||!ready())return false;
  if(!Array.isArray(window.cart)||!cart.length){toast('السلة فارغة');return true}
  const btn=document.querySelector('#rosDineSubmitBtn');
  if(btn){btn.disabled=true;btn.textContent='جارٍ إرسال الطلب...'}
  try{
    const items=cart.map(x=>({product_id:x.id,name:x.name,quantity:Number(x.qty||1),price:Number(x.price||0)}));
    const total=items.reduce((s,x)=>s+x.price*x.quantity,0);
    const token=crypto.randomUUID();
    const name=document.querySelector('#cust')?.value.trim()||'عميل';
    const row=(store.tables||[]).find(x=>Number(x.table_number)===Number(t)&&x.active);
    const r=await db.from('orders').insert({restaurant_id:store.restaurant.id,table_id:row?.id||null,table_number:Number(t),order_type:'dine_in',customer_name:name,customer_phone:null,address:null,payment_method:'cash',total,items,status:'new',tracking_token:token,prep_minutes:null,admin_message:'تم استلام طلب حضرتك'}).select('id').single();
    if(r.error)throw r.error;
    markDine(token);
    cart=[];if(typeof updateCart==='function')updateCart();
    const modal=document.querySelector('#modal');
    if(modal)modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-[32px] p-6 text-center"><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-black">تم إرسال طلبك للمطبخ</h2><p class="mt-2" style="color:var(--muted)">العميل — الطاولة رقم ${esc(t)}</p><div class="mt-4 rounded-2xl p-4 font-bold" style="background:var(--surface2)">أهلاً بحضرتك في مطعمنا — طلبك وصل للمطبخ.</div><button id="rosDineTrack" type="button" class="mt-5 w-full py-4 rounded-2xl font-black" style="background:var(--brand);color:#111">حالة طلبك</button><button id="rosDineBack" type="button" class="mt-3 w-full py-3 rounded-2xl border font-bold">العودة للقائمة</button></div></div>`;
    document.querySelector('#rosDineTrack')?.addEventListener('click',()=>{location.hash='track/'+encodeURIComponent(token)});
    document.querySelector('#rosDineBack')?.addEventListener('click',()=>typeof closeModal==='function'?closeModal():modal.innerHTML='');
    return true;
  }catch(e){console.error(e);toast('تعذر إرسال الطلب: '+(e?.message||'خطأ غير معروف'));return true}
  finally{if(btn){btn.disabled=false;btn.textContent='إتمام الطلب'}}
}
function showDineCheckout(){
  if(!ready())return false;
  const t=table();if(!t)return false;
  if(!Array.isArray(window.cart)||!cart.length){toast('السلة فارغة');return true}
  const modal=document.querySelector('#modal');if(!modal)return true;
  modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center" onclick="if(event.target===this)closeModal()"><div class="checkout-modal w-full max-w-lg rounded-[32px] p-5 max-h-[92vh] overflow-auto"><div class="flex justify-between items-center"><h2 class="text-2xl font-black">تأكيد الطلب</h2><button type="button" onclick="closeModal()" class="w-10 h-10 rounded-full border text-2xl">×</button></div><div class="checkout-note rounded-2xl p-4 my-4 font-bold">أهلاً بحضرتك في مطعمنا — الطاولة رقم ${esc(t)}</div><input id="cust" class="w-full border rounded-2xl p-4" placeholder="اسم اختياري"><button id="rosDineSubmitBtn" type="button" class="w-full mt-5 py-4 rounded-2xl font-black" style="background:var(--brand);color:#111">إتمام الطلب</button></div></div>`;
  document.querySelector('#rosDineSubmitBtn')?.addEventListener('click',createDineOrder);
  return true;
}
const previousCheckout=window.checkout;
window.checkout=function(){return table()?showDineCheckout():(typeof previousCheckout==='function'?previousCheckout():undefined)};

async function updateOrder(id,patch){
  if(!ready())return false;
  const r=await db.from('orders').update(patch).eq('id',id).eq('restaurant_id',store.restaurant.id).select('id').maybeSingle();
  if(r.error){toast('تعذر تحديث الطلب: '+r.error.message);return false}
  return true;
}
async function loadDineOrders(){
  if(!ready())return [];
  const r=await db.from('orders').select('id,table_number,customer_name,total,status,prep_minutes,admin_message,created_at,order_type').eq('restaurant_id',store.restaurant.id).eq('order_type','dine_in').order('created_at',{ascending:false}).limit(50);
  if(r.error){console.warn(r.error);return []}
  return r.data||[];
}
function adminHost(){return document.querySelector('#deliveryControlPanel')||document.querySelector('#app main')||document.querySelector('#app')}
async function renderAdminDine(){
  if(!location.hash.startsWith('#admin')||!ready())return;
  const host=adminHost();if(!host)return;
  let panel=document.querySelector('#rosDineV12Panel');
  if(!panel){panel=document.createElement('section');panel.id='rosDineV12Panel';panel.className='lux-card rounded-[32px] p-5 mt-6';host.appendChild(panel)}
  const rows=await loadDineOrders();
  panel.innerHTML=`<div class="flex items-center justify-between gap-3"><div><div class="text-xs font-bold" style="color:var(--muted)">DINE-IN</div><h2 class="text-2xl font-black">طلبات الصالة</h2><p class="text-sm mt-1" style="color:var(--muted)">إدارة وقت التجهيز وحالة الطلب للعميل داخل المطعم.</p></div><button id="rosDineRefresh" type="button" class="rounded-2xl border px-4 py-2 font-bold">تحديث</button></div><div class="grid gap-4 mt-5">${rows.length?rows.map(o=>{const p=Number(o.prep_minutes||0);return `<article class="rounded-[28px] border p-4" style="background:var(--surface2)"><div class="flex justify-between gap-3"><div><div class="font-black text-xl">عميل — الطاولة ${esc(o.table_number||'—')}</div><div class="text-sm mt-1" style="color:var(--muted)">${esc(o.customer_name||'عميل')}</div></div><div class="font-black">${money(o.total)}</div></div><div class="mt-5"><div class="font-black mb-3">وقت التجهيز</div><div class="grid grid-cols-2 sm:grid-cols-5 gap-2">${PREP.map(n=>`<button type="button" data-prep-id="${esc(o.id)}" data-prep-min="${n}" class="rounded-2xl border px-3 py-3 font-black" style="${p===n?'background:var(--brand);color:#111;border-color:var(--brand)':''}">${n} دقيقة</button>`).join('')}</div></div><div class="mt-5"><div class="font-black mb-3">حالة الطلب</div><div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><button type="button" data-status-id="${esc(o.id)}" data-status-v="preparing" data-status-m="جاري تجهيز طلب حضرتك" class="rounded-2xl border px-3 py-4 font-black" style="${o.status==='preparing'?'background:var(--brand);color:#111;border-color:var(--brand)':''}">جاري التجهيز</button><button type="button" data-status-id="${esc(o.id)}" data-status-v="ready" data-status-m="تم التجهيز — طلبك جاهز" class="rounded-2xl border px-3 py-4 font-black" style="${o.status==='ready'?'background:var(--brand);color:#111;border-color:var(--brand)':''}">تم التجهيز / طلبك جاهز</button><button type="button" data-status-id="${esc(o.id)}" data-status-v="delivered" data-status-m="شكرًا لاختيارنا" class="rounded-2xl border px-3 py-4 font-black" style="${o.status==='delivered'?'background:var(--brand);color:#111;border-color:var(--brand)':''}">شكرًا لاختيارنا</button></div></div><div class="mt-4 rounded-2xl p-4" style="background:var(--surface)"><div class="text-xs" style="color:var(--muted)">المعروض للعميل</div><div class="font-black mt-1">${esc(o.admin_message||STATUS[o.status]||STATUS.new)}</div>${p?`<div class="text-sm mt-1" style="color:var(--muted)">وقت التجهيز: ${p} دقيقة</div>`:''}</div></article>`}).join(''):'<div class="py-10 text-center" style="color:var(--muted)">لا توجد طلبات داخل المطعم حاليًا.</div>'}</div>`;
  document.querySelector('#rosDineRefresh')?.addEventListener('click',renderAdminDine);
  panel.querySelectorAll('[data-prep-id]').forEach(b=>b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;const ok=await updateOrder(b.dataset.prepId,{prep_minutes:Number(b.dataset.prepMin)});if(ok){toast('تم حفظ وقت التجهيز');await renderAdminDine()}b.disabled=false}));
  panel.querySelectorAll('[data-status-id]').forEach(b=>b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;const ok=await updateOrder(b.dataset.statusId,{status:b.dataset.statusV,admin_message:b.dataset.statusM});if(ok){toast('تم تحديث حالة الطلب');await renderAdminDine()}b.disabled=false}));
}

async function deleteOldOrders(){
  if(!ready())return toast('بيانات المطعم غير متاحة');
  const q=await db.from('orders').select('id').eq('restaurant_id',store.restaurant.id).limit(1);
  if(q.error)return toast('تعذر قراءة الطلبات: '+q.error.message);
  if(!q.data?.length)return toast('لا توجد طلبات للحذف');
  if(!confirm('سيتم حذف جميع الطلبات السابقة نهائيًا. هل أنت متأكد؟'))return;
  const r=await db.from('orders').delete().eq('restaurant_id',store.restaurant.id);
  if(r.error)return toast('تعذر حذف الطلبات: '+r.error.message);
  store.orders=[];toast('تم حذف الطلبات السابقة');if(typeof window.renderAdmin==='function')await window.renderAdmin();setTimeout(renderAdminDine,100);
}
window.deleteAllOrders=deleteOldOrders;

async function track(token){
  if(!ready())return;
  const r=await db.rpc('public_track_order',{p_token:token});
  if(r.error||!r.data?.[0])return false;
  const x=r.data[0];
  if(x.order_type!=='dine_in')return false;
  markDine(token);
  const app=document.querySelector('#app');if(!app)return true;
  app.innerHTML=`<main class="min-h-screen luxury-page p-4" dir="rtl"><div class="max-w-3xl mx-auto pt-5 pb-10"><div class="lux-card rounded-[32px] p-5 sm:p-7"><div class="flex items-center justify-between gap-4"><div><div class="text-sm font-bold" style="color:var(--muted)">حالة الطلب</div><h1 class="text-3xl sm:text-4xl font-black">تتبع طلبك</h1></div><button id="rosDineMenu" type="button" class="rounded-2xl border px-5 py-3 font-black">القائمة</button></div><div id="rosDineTrackBody" class="mt-6"></div></div></div></main>`;
  document.querySelector('#rosDineMenu')?.addEventListener('click',()=>location.hash='menu');
  const host=document.querySelector('#rosDineTrackBody');let lastKey='';
  async function load(silent){
    const q=await db.rpc('public_track_order',{p_token:token});if(q.error||!q.data?.[0])return;const o=q.data[0];if(o.order_type!=='dine_in')return;
    const prep=PREP.includes(Number(o.prep_minutes))?Number(o.prep_minutes):0;
    const key=`${o.status}|${o.admin_message||''}|${prep}`;
    if(!silent&&lastKey&&key!==lastKey)notify(o.admin_message||STATUS[o.status]||'تم تحديث حالة الطلب');
    lastKey=key;
    const rank={new:0,preparing:1,ready:2,delivered:3}[o.status]??0;
    const steps=['تم استلام الطلب','جاري التجهيز','طلبك جاهز','شكرًا لاختيارنا'];
    host.innerHTML=`<section class="space-y-4"><div class="rounded-[28px] p-5 sm:p-6" style="background:linear-gradient(145deg,var(--surface2),color-mix(in srgb,var(--surface2) 80%,var(--brand) 20%));border:1px solid color-mix(in srgb,var(--brand) 22%,transparent)"><div class="text-sm font-bold" style="color:var(--muted)">طلب داخل المطعم</div><div class="text-2xl sm:text-3xl font-black mt-2">عميل — الطاولة رقم ${esc(o.table_number||'—')}</div><div class="text-lg font-black mt-3">الإجمالي: ${money(o.total)}</div></div><div class="rounded-[28px] p-5 sm:p-6" style="background:var(--surface2)"><div class="text-xl font-black mb-4">حالة طلبك</div><div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${steps.map((s,i)=>`<div class="rounded-2xl p-4 border ${i===rank?'ring-2':''}" style="background:${i<=rank?'color-mix(in srgb,var(--brand) 14%,var(--surface2))':'var(--surface2)'};border-color:${i===rank?'var(--brand)':'color-mix(in srgb,var(--text) 9%,transparent)'}"><div class="w-10 h-10 rounded-full grid place-items-center font-black mb-3" style="background:${i<=rank?'var(--brand)':'var(--surface)'};color:${i<=rank?'#111':'var(--muted)'}">${i<rank?'✓':i===rank?'●':'○'}</div><div class="font-black text-sm leading-tight">${s}</div>${i===rank?'<div class="text-xs mt-2 font-bold" style="color:var(--brand)">الحالة الحالية</div>':''}</div>`).join('')}</div></div><div class="rounded-[28px] p-5 sm:p-6 border" style="background:var(--surface);border-color:color-mix(in srgb,var(--brand) 25%,transparent)"><div class="text-sm font-bold" style="color:var(--muted)">الحالة الآن</div><div class="text-2xl sm:text-3xl font-black mt-2">${esc(o.admin_message||STATUS[o.status]||STATUS.new)}</div>${o.status==='preparing'&&prep?`<div class="mt-4 rounded-2xl p-4" style="background:color-mix(in srgb,var(--brand) 10%,var(--surface2))"><div class="text-sm font-bold" style="color:var(--muted)">الوقت المحدد للتجهيز</div><div class="text-3xl font-black mt-1">أمامك ${prep} دقيقة</div></div>`:''}</div><button id="rosDineNotify" type="button" class="w-full rounded-2xl py-4 font-black border" style="background:var(--brand);color:#111;border-color:var(--brand)">${('Notification'in window&&Notification.permission==='granted')?'التنبيهات مفعّلة':'تفعيل تنبيهات حالة الطلب'}</button><div class="text-center text-xs" style="color:var(--muted)">سيظهر تنبيه تلقائي عند تغيير حالة الطلب.</div></section>`;
    document.querySelector('#rosDineNotify')?.addEventListener('click',async()=>{if(await enableNotifications())await load(true)});
  }
  await load(false);
  clearInterval(window.__ROS_DINE_TRACK_TIMER__);window.__ROS_DINE_TRACK_TIMER__=setInterval(()=>{if(location.hash.startsWith('#track/'))load(true)},3000);
  try{if(window.__ROS_DINE_TRACK_CHANNEL__)db.removeChannel(window.__ROS_DINE_TRACK_CHANNEL__);window.__ROS_DINE_TRACK_CHANNEL__=db.channel('ros-dinein-v12-'+token).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},p=>{if(p.new?.tracking_token===token)load(false)}).subscribe()}catch(e){console.warn(e)}
  return true;
}

async function route(){
  for(let i=0;i<120&&!ready();i++)await sleep(100);
  if(!ready())return;
  if(location.hash.startsWith('#admin')){await renderAdminDine();return}
  if(location.hash.startsWith('#track/')){
    const token=decodeURIComponent(location.hash.slice(7));
    if(knownDine(token)||await track(token))return;
  }
}
window.addEventListener('hashchange',()=>setTimeout(route,0));
setTimeout(route,50);
})();