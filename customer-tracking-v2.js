(function(){
'use strict';
if(window.__ROS_CUSTOMER_TRACKING_V3__)return;
window.__ROS_CUSTOMER_TRACKING_V3__=true;

const POLL=12000;
let active=null,timer=null,busy=false,last=null,failures=0,isLoading=false;

const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));

function db(){
  try{
    if(window.__ROS_TRACK_DB__)return window.__ROS_TRACK_DB__;
    const c=window.APP_CONFIG||{};
    if(window.supabase?.createClient&&c.supabaseUrl&&c.supabaseAnonKey)return window.__ROS_TRACK_DB__=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);
    return window.db||null;
  }catch(_){return null;}
}

async function waitDb(){
  for(let i=0;i<80;i++){
    if(db())return db();
    await new Promise(r=>setTimeout(r,100));
  }
  return null;
}

function token(){
  const h=String(location.hash||'');
  if(/^#track\//i.test(h)){
    const v=h.slice(h.indexOf('/')+1).split(/[?#]/)[0].trim();
    if(v){
      try{
        const dec=decodeURIComponent(v);
        try{localStorage.setItem('ros_last_order_id',dec)}catch(_){}
        return dec;
      }catch(_){
        try{localStorage.setItem('ros_last_order_id',v)}catch(_){}
        return v;
      }
    }
  }
  const q=new URLSearchParams(location.search||'');
  const paramVal=q.get('id')||q.get('order_id')||q.get('orderId')||q.get('tracking_token')||q.get('trackingToken')||q.get('track')||q.get('token');
  if(paramVal){
    try{localStorage.setItem('ros_last_order_id',paramVal)}catch(_){}
    return paramVal;
  }
  try{
    const saved=localStorage.getItem('ros_last_order_id')||localStorage.getItem('ros_tracking_token')||localStorage.getItem('ros_order_id');
    if(saved)return saved;
  }catch(_){}
  return null;
}

function isTrack(){
  return /^#track\//i.test(location.hash||'')||!!token();
}

function stop(){
  if(timer){clearInterval(timer);timer=null;}
  active=null;last=null;failures=0;isLoading=false;
}

const delivery=s=>['assigned','accepted','picked_up','out_for_delivery'].includes(s);
const status=s=>({new:'تم استلام طلبك',confirmed:'تم استلام طلبك',preparing:'تم استلام طلبك',ready:'تم استلام طلبك',assigned:'تم تعيين مندوب التوصيل',accepted:'المندوب قبل الطلب',picked_up:'المندوب استلم الطلب',out_for_delivery:'الطلب في الطريق إليك',delivered:'تم التسليم',cancelled:'تم إلغاء الطلب'})[s]||'تم استلام طلبك';

function shell(){
  const a=document.querySelector('#app');
  if(!a)return;
  a.innerHTML=`<main class="min-h-screen luxury-page p-4" dir="rtl"><div class="max-w-3xl mx-auto pt-6 pb-10"><div class="lux-card rounded-[30px] overflow-hidden"><header class="p-6" style="background:linear-gradient(135deg,var(--surface),var(--surface2));border-bottom:1px solid color-mix(in srgb,var(--text) 10%,transparent)"><div class="text-[10px] tracking-[.18em] font-black" style="color:var(--brand)">ORDER TRACKING</div><h1 class="text-3xl font-black mt-1">تتبع طلبك</h1><p class="text-sm mt-2" style="color:var(--muted)">متابعة آمنة لحالة طلبك والتوصيل.</p></header><div id="rosTrackBox" class="p-5 sm:p-7"></div></div></div></main>`;
}

function renderLoading(){
  const b=document.querySelector('#rosTrackBox');
  if(!b)return;
  b.innerHTML=`<div class="rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3" style="background:var(--surface2)"><div class="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto" style="border-color:var(--brand) transparent var(--brand) var(--brand)"></div><b>جارٍ تحميل حالة طلبك...</b></div>`;
}

function renderError(){
  const b=document.querySelector('#rosTrackBox');
  if(!b)return;
  b.innerHTML='<div class="rounded-3xl p-6 text-center" style="background:color-mix(in srgb,#ef4444 10%,var(--surface2))"><b>تعذر تحميل حالة الطلب حاليًا.</b><div class="text-xs mt-2">سيتم إعادة المحاولة تلقائيًا.</div></div>';
}

function mapBlock(x){
  const lat=Number(x.latitude),lng=Number(x.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return '';
  const src=`https://www.google.com/maps?q=${encodeURIComponent(lat+','+lng)}&z=15&output=embed`;
  return `<section class="rounded-[30px] overflow-hidden" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--brand) 18%,transparent);box-shadow:0 14px 40px #0004"><div class="p-5 pb-3 flex justify-between items-center gap-3"><div><div class="font-black text-lg">موقع المندوب</div><div class="text-xs mt-1" style="color:var(--muted)">آخر موقع مسجل — يتم تحديثه تلقائيًا</div></div><span class="text-[10px] font-black rounded-full px-3 py-1" style="background:color-mix(in srgb,var(--brand) 12%,var(--surface));color:var(--brand)">LIVE</span></div><div style="height:320px;background:var(--surface);"><iframe title="خريطة موقع المندوب" src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%;height:100%;border:0;display:block"></iframe></div></section>`;
}

function render(x,p){
  const b=document.querySelector('#rosTrackBox');
  if(!b)return;
  const a=delivery(x.status),name=(p?.driver_name||x.driver_name||'').trim(),phone=p?.driver_phone||x.driver_phone||'',photo=p?.driver_photo_url||p?.photo_url||'',steps=['تم تعيين المندوب','تم قبول الطلب','تم استلام الطلب','الطلب في الطريق','تم التسليم'],rank={assigned:0,accepted:1,picked_up:2,out_for_delivery:3,delivered:4}[x.status];
  b.innerHTML=`<div class="space-y-4"><section class="rounded-[30px] p-5 sm:p-6" style="background:linear-gradient(145deg,var(--surface2),var(--surface));border:1px solid color-mix(in srgb,var(--brand) 25%,transparent);box-shadow:0 18px 55px #0006"><div class="text-xs" style="color:var(--muted)">الحالة الحالية</div><div class="text-2xl sm:text-3xl font-black mt-1">${status(x.status)}</div>${!a&&x.status!=='delivered'&&x.status!=='cancelled'?'<div class="mt-5 rounded-2xl p-4" style="background:color-mix(in srgb,var(--brand) 8%,var(--surface))"><b>تم استلام طلبك بنجاح</b><div class="text-sm mt-1" style="color:var(--muted)">المطعم يتابع طلبك، وستظهر بيانات المندوب فور تعيينه.</div></div>':''}${a&&name?`<div class="mt-5 rounded-3xl p-4 flex items-center gap-4" style="background:var(--surface);border:1px solid color-mix(in srgb,var(--brand) 18%,transparent)">${photo?`<img src="${esc(photo)}" alt="صورة المندوب" class="w-16 h-16 rounded-2xl object-cover border" style="border-color:var(--brand)">`:'<div class="w-16 h-16 rounded-2xl grid place-items-center text-2xl font-black" style="background:var(--surface2)">م</div>'}<div class="min-w-0"><div class="text-xs" style="color:var(--muted)">مندوب التوصيل</div><div class="text-lg font-black truncate">${esc(name)}</div>${phone?`<a href="tel:${esc(phone)}" class="text-sm font-bold" style="color:var(--brand)">اتصال بالمندوب</a>`:''}</div></div>`:''}</section>${a?`<section class="rounded-[30px] p-5" style="background:var(--surface2)"><div class="font-black text-lg mb-4">رحلة التوصيل</div>${steps.map((s,i)=>`<div class="flex items-center gap-3 mb-3"><span class="w-8 h-8 rounded-full grid place-items-center text-xs font-black" style="background:${rank!=null&&i<=rank?'var(--brand)':'var(--surface)'};color:${rank!=null&&i<=rank?'#111':'var(--muted)'}">${rank!=null&&i<rank?'✓':i+1}</span><span class="font-extrabold">${s}</span></div>`).join('')}</section>`:''}${a?mapBlock(x):''}${x.status==='delivered'?'<div class="rounded-3xl p-5 text-center font-black" style="background:color-mix(in srgb,#22c55e 12%,var(--surface2))">تم تسليم الطلب بنجاح</div>':''}<div class="text-center text-xs" style="color:var(--muted)">يتم تحديث الحالة تلقائيًا.</div></div>`;
}

async function fetchData(){
  if(!active||busy)return;
  busy=true;
  try{
    let c=await waitDb();
    let data=null;
    const maxAttempts=(isLoading||!last)?3:1;
    for(let attempt=0;attempt<maxAttempts;attempt++){
      if(attempt>0){
        await new Promise(r=>setTimeout(r,800));
        c=await waitDb();
      }
      if(!c)continue;
      let r=await c.rpc('public_track_order_v2',{p_token:active});
      if(r.error||!r.data?.length)r=await c.rpc('public_track_order',{p_token:active});
      if(!r.error&&r.data?.length){
        data=r.data[0];
        break;
      }
    }
    if(data){
      failures=0;
      last=data;
      isLoading=false;
      let p=null;
      if(last.driver_name&&last.status!=='cancelled'){
        const q=await c.rpc('public_driver_profile',{p_token:active});
        if(!q.error&&q.data?.length)p=q.data[0];
      }
      render(last,p);
      if(['delivered','cancelled'].includes(last.status)&&timer){
        clearInterval(timer);
        timer=null;
      }
    }else{
      failures++;
      isLoading=false;
      if(!last){
        renderError();
      }
    }
  }catch(e){
    console.error('ROS customer tracking',e);
    failures++;
    isLoading=false;
    if(!last){
      renderError();
    }
  }finally{
    busy=false;
  }
}

async function load(){
  if(!isTrack())return;
  const t=token(),a=document.querySelector('#app');
  if(!t||!a)return;
  if(active===t&&document.querySelector('#rosTrackBox')){
    fetchData();
    return;
  }
  if(timer){clearInterval(timer);timer=null;}
  active=t;
  last=null;
  failures=0;
  isLoading=true;
  shell();
  renderLoading();
  await fetchData();
  if(active===t&&!timer)timer=setInterval(fetchData,POLL);
}

const originalRouter=window.renderRouter;
window.renderRouter=function(){
  if(isTrack()){
    load();
    return;
  }
  return typeof originalRouter==='function'?originalRouter.apply(this,arguments):undefined;
};

window.addEventListener('hashchange',e=>{
  if(/^#track\//i.test(location.hash||'')){
    e.stopImmediatePropagation();
    load();
  }else{
    stop();
  }
},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
else load();

setTimeout(load,1000);
})();
