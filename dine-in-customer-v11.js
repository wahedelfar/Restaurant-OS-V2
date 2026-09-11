(function(){
'use strict';
if(window.__ROS_DINEIN_CUSTOMER_V11__)return;
window.__ROS_DINEIN_CUSTOMER_V11__=true;

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const esc=v=>typeof window.esc==='function'?window.esc(v??''):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
const toast=m=>{try{window.toast?window.toast(m):console.log(m)}catch(_){}};
const PREP=[5,15,30,45,60];
const STATUS={
  new:{label:'تم استلام الطلب',message:'تم استلام طلب حضرتك'},
  preparing:{label:'جاري التجهيز',message:'جاري تجهيز طلب حضرتك'},
  ready:{label:'طلبك جاهز',message:'تم التجهيز — طلبك جاهز'},
  delivered:{label:'شكرًا لاختيارنا',message:'شكرًا لاختيارنا'}
};
let timer=null,lastKey=null,permission=false;

function isTrack(){return location.hash.startsWith('#track/');}
function ready(){return !!(window.db&&window.store?.restaurant?.id);}

async function notificationPermission(){
  if(!('Notification' in window)){toast('المتصفح لا يدعم الإشعارات');return false}
  try{
    const p=await Notification.requestPermission();
    permission=p==='granted';
    toast(permission?'تم تفعيل تنبيهات حالة الطلب':'لم يتم السماح بالتنبيهات');
    return permission;
  }catch(e){console.warn(e);return false}
}

async function notify(body){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  try{
    if('serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.ready;
      if(reg?.showNotification){
        await reg.showNotification('تحديث حالة طلبك',{body,tag:'ros-dine-in-status',renotify:true,dir:'rtl',lang:'ar'});
        return;
      }
    }
  }catch(e){console.warn('dine notification sw',e)}
  try{new Notification('تحديث حالة طلبك',{body,tag:'ros-dine-in-status',renotify:true})}catch(e){console.warn('dine notification',e)}
}

function statusCards(status){
  const rank={new:0,preparing:1,ready:2,delivered:3}[status]??0;
  const steps=[
    ['1','تم استلام الطلب'],
    ['2','جاري التجهيز'],
    ['3','طلبك جاهز'],
    ['✓','شكرًا لاختيارنا']
  ];
  return `<div class="grid grid-cols-2 md:grid-cols-4 gap-3">${steps.map((s,i)=>{
    const done=i<rank,active=i===rank;
    return `<div class="rounded-3xl p-4 border transition-all ${active?'ring-2':''}" style="background:${done||active?'color-mix(in srgb,var(--brand) 13%,var(--surface2))':'var(--surface2)'};border-color:${active?'var(--brand)':'color-mix(in srgb,var(--text) 10%,transparent)'}">
      <div class="w-11 h-11 rounded-2xl grid place-items-center font-black text-lg mb-3" style="background:${done||active?'var(--brand)':'var(--surface)'};color:${done||active?'#111':'var(--muted)'}">${done?'✓':s[0]}</div>
      <div class="font-extrabold leading-tight">${s[1]}</div>
      ${active?'<div class="text-xs mt-2 font-bold" style="color:var(--brand)">الحالة الحالية</div>':''}
    </div>`;
  }).join('')}</div>`;
}

function shell(){
  const app=document.querySelector('#app');
  if(!app)return null;
  app.innerHTML=`<main class="min-h-screen luxury-page p-4" dir="rtl"><div class="max-w-3xl mx-auto pt-4 pb-10">
    <div class="lux-card rounded-[32px] p-5 sm:p-7">
      <div class="flex items-center justify-between gap-4">
        <div><div class="text-sm font-bold" style="color:var(--muted)">حالة الطلب</div><h1 class="text-3xl sm:text-4xl font-black mt-1">تتبع طلبك</h1></div>
        <button id="rosDineBack" type="button" class="rounded-2xl border px-5 py-3 font-extrabold">القائمة</button>
      </div>
      <div id="rosDineCustomerBody" class="mt-6">جارٍ تحميل طلبك...</div>
    </div>
  </div></main>`;
  document.getElementById('rosDineBack')?.addEventListener('click',()=>{location.hash='menu'});
  return document.getElementById('rosDineCustomerBody');
}

async function load(token,host,silent){
  if(!ready()||!host)return;
  const r=await db.rpc('public_track_order',{p_token:token});
  if(r.error){host.innerHTML=`<div class="rounded-3xl p-6 text-center" style="background:var(--surface2)"><div class="text-xl font-extrabold">تعذر تحميل حالة الطلب</div><div class="text-sm mt-2" style="color:var(--muted)">يرجى تحديث الصفحة.</div></div>`;return}
  const x=r.data?.[0];
  if(!x){host.innerHTML='<div class="rounded-3xl p-6 text-center">رابط متابعة الطلب غير صالح.</div>';return}

  // This layer is ONLY for in-restaurant orders. Delivery keeps its existing UI.
  if(x.order_type!=='dine_in')return;

  const info=STATUS[x.status]||STATUS.new;
  const mins=PREP.includes(Number(x.prep_minutes))?Number(x.prep_minutes):0;
  const key=`${x.status}|${x.admin_message||''}|${mins}`;
  if(!silent&&lastKey&&key!==lastKey)notify(x.admin_message||info.message);
  lastKey=key;

  const statusMessage=x.admin_message||info.message;
  host.innerHTML=`
    <section class="space-y-4">
      <div class="rounded-[28px] p-5 sm:p-6" style="background:linear-gradient(145deg,var(--surface2),color-mix(in srgb,var(--surface2) 80%,var(--brand) 20%));border:1px solid color-mix(in srgb,var(--brand) 20%,transparent)">
        <div class="text-sm font-bold" style="color:var(--muted)">الطلب داخل المطعم</div>
        <div class="text-2xl sm:text-3xl font-black mt-2">عميل — الطاولة رقم ${esc(x.table_number||'—')}</div>
        <div class="mt-3 text-lg font-extrabold">الإجمالي: ${money(x.total)}</div>
      </div>

      <div class="rounded-[28px] p-5 sm:p-6" style="background:var(--surface2)">
        <div class="text-xl font-black mb-4">حالة طلبك</div>
        ${statusCards(x.status)}
      </div>

      <div class="rounded-[28px] p-5 sm:p-6 border" style="background:var(--surface);border-color:color-mix(in srgb,var(--brand) 28%,transparent)">
        <div class="text-sm font-bold" style="color:var(--muted)">الحالة الآن</div>
        <div class="text-2xl sm:text-3xl font-black mt-2">${esc(statusMessage)}</div>
        ${x.status==='preparing'&&mins?`<div class="mt-4 rounded-2xl p-4" style="background:color-mix(in srgb,var(--brand) 10%,var(--surface2))"><div class="text-sm font-bold" style="color:var(--muted)">الوقت المحدد للتجهيز</div><div class="text-3xl font-black mt-1">أمامك ${mins} دقيقة</div></div>`:''}
      </div>

      <button id="rosDineNotify" type="button" class="w-full rounded-2xl py-4 font-black border" style="background:var(--brand);color:#111;border-color:var(--brand)">${Notification?.permission==='granted'?'التنبيهات مفعّلة':'تفعيل تنبيهات حالة الطلب'}</button>
      <div class="text-center text-xs px-3" style="color:var(--muted)">سيظهر تنبيه تلقائيًا عند انتقال طلبك إلى حالة جديدة.</div>
    </section>`;

  document.getElementById('rosDineNotify')?.addEventListener('click',notificationPermission);
}

async function start(){
  for(let i=0;i<150;i++){if(ready())break;await sleep(100)}
  if(!isTrack())return;
  const token=decodeURIComponent(location.hash.slice(7));
  const host=shell();
  if(!host)return;
  await load(token,host,false);
  clearInterval(timer);
  timer=setInterval(()=>{if(isTrack())load(token,host,true)},2500);
}

function route(){
  if(isTrack())start();
  else{clearInterval(timer);timer=null;lastKey=null}
}
window.addEventListener('hashchange',route);
setTimeout(route,50);
})();