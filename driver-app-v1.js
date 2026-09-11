(function(){
  'use strict';
  if(window.__ROS_DRIVER_APP_V2__) return;
  window.__ROS_DRIVER_APP_V2__=true;

  const isDriver=()=>String(location.hash||'').startsWith('#driver/');
  const token=()=>decodeURIComponent(String(location.hash||'').split('/')[1]||'');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  const esc=v=>typeof window.esc==='function'?window.esc(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const label=s=>({new:'جديد',confirmed:'تم التأكيد',preparing:'قيد التحضير',ready:'جاهز',assigned:'تم التعيين',accepted:'تم القبول',picked_up:'تم الاستلام',out_for_delivery:'خرج للتوصيل',delivered:'تم التسليم',cancelled:'ملغي',unassigned:'بدون مندوب'})[s]||s||'—';

  async function waitReady(){
    for(let i=0;i<180;i++){
      try{if(window.db&&window.store?.restaurant?.id)return true}catch(_){}
      await sleep(100);
    }
    return false;
  }

  function setMenu(){
    try{history.pushState(null,'','#menu');}catch(_){location.hash='#menu'}
    if(typeof window.renderRouter==='function')setTimeout(()=>window.renderRouter(),0);
  }

  async function render(){
    const app=document.querySelector('#app'); if(!app)return;
    const t=token();
    app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-6"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">DRIVER APP</div><h1 class="text-2xl font-extrabold">لوحة المندوب</h1></div><button id="driverBack" type="button" class="rounded-xl border px-4 py-2">العودة للقائمة</button></div><div id="driverBox" class="mt-6">جارٍ تحميل بيانات المندوب...</div></div></div></main>`;
    document.querySelector('#driverBack')?.addEventListener('click',setMenu);
    const ok=await waitReady();
    const box=document.querySelector('#driverBox'); if(!box||!ok)return;
    const r=await db.rpc('driver_get_orders_final',{p_token:t});
    if(r.error){
      box.innerHTML=`<div class="rounded-2xl p-4 bg-red-500/10"><div class="font-extrabold">تعذر تحميل طلبات المندوب</div><div class="mt-2 text-sm" dir="ltr">${esc(r.error.message||'Unknown error')}</div></div>`;
      return;
    }
    const rows=Array.isArray(r.data)?r.data:[];
    if(!rows.length){box.innerHTML='<div class="rounded-2xl p-5" style="background:var(--surface2)">لا توجد طلبات مسندة لهذا المندوب.</div>';return;}
    const renderRow=o=>`<article class="rounded-2xl p-4" style="background:var(--surface2)"><div class="flex justify-between gap-3"><div><div class="font-extrabold">طلب #${esc(String(o.id||'').slice(0,8))}</div><div class="text-sm mt-1">${esc(o.customer_name||'عميل')} • ${esc(o.customer_phone||'')}</div></div><div class="font-extrabold">${money(o.total)}</div></div><div class="mt-3 text-sm">${esc(o.address||'—')}</div><div class="mt-3 font-bold">الحالة: ${label(o.delivery_status||o.status)}</div><div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4"><button data-status="accepted" data-id="${esc(o.id)}" class="driver-status rounded-xl border py-2 text-xs font-extrabold">قبول</button><button data-status="picked_up" data-id="${esc(o.id)}" class="driver-status rounded-xl border py-2 text-xs font-extrabold">استلام</button><button data-status="out_for_delivery" data-id="${esc(o.id)}" class="driver-status rounded-xl border py-2 text-xs font-extrabold">خرج للتوصيل</button><button data-status="delivered" data-id="${esc(o.id)}" class="driver-status rounded-xl border py-2 text-xs font-extrabold">تم التسليم</button></div><button data-gps="${esc(o.id)}" class="driver-gps mt-3 w-full rounded-xl border py-2 font-extrabold">تشغيل GPS</button>${o.driver_latitude!=null?`<div class="mt-3 text-xs" style="color:var(--muted)">آخر موقع مرسل: ${Number(o.driver_latitude).toFixed(6)}, ${Number(o.driver_longitude).toFixed(6)}</div>`:'<div class="mt-3 text-xs" style="color:var(--muted)">آخر موقع مرسل: غير متاح</div>'}</article>`;
    box.innerHTML=`<div class="space-y-4">${rows.map(renderRow).join('')}</div>`;

    box.querySelectorAll('.driver-status').forEach(b=>b.addEventListener('click',async()=>{
      b.disabled=true;
      const x=await db.rpc('driver_update_status',{p_token:t,p_order_id:b.dataset.id,p_status:b.dataset.status});
      if(x.error)alert(x.error.message||'تعذر تحديث الحالة'); else await render();
    }));
    box.querySelectorAll('.driver-gps').forEach(b=>b.addEventListener('click',()=>startGps(t,b.dataset.gps,b)));
  }

  async function startGps(t,orderId,button){
    if(!navigator.geolocation){alert('المتصفح لا يدعم تحديد الموقع');return;}
    button.disabled=true; button.textContent='GPS يعمل...';
    const send=p=>db.rpc('driver_update_location',{p_token:t,p_order_id:orderId,p_latitude:p.coords.latitude,p_longitude:p.coords.longitude,p_accuracy:p.coords.accuracy??null});
    const once=()=>navigator.geolocation.getCurrentPosition(async p=>{const r=await send(p);if(r.error)alert(r.error.message||'تعذر إرسال الموقع');},e=>alert(e.message||'تعذر تحديد الموقع'),{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
    once();
    if(window.__rosDriverWatch)navigator.geolocation.clearWatch(window.__rosDriverWatch);
    window.__rosDriverWatch=navigator.geolocation.watchPosition(send,e=>console.warn('GPS',e),{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
  }

  let rendering=false;
  async function route(){
    if(!isDriver()||rendering)return;
    rendering=true;
    try{await render();}finally{rendering=false;}
  }
  window.addEventListener('hashchange',()=>{if(isDriver())route();},true);
  if(isDriver())setTimeout(route,0);
})();
