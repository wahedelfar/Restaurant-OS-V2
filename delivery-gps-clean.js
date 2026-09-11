(function(){
  'use strict';
  if(window.__ROS_DELIVERY_CLEAN__) return;
  window.__ROS_DELIVERY_CLEAN__=true;

  const originalRouter = window.renderRouter;
  const originalAdmin = window.renderAdmin;
  const PUBLIC_BASE = (window.APP_CONFIG && window.APP_CONFIG.publicAppUrl) || 'https://restaurant-os-multi.vercel.app';
  const cleanBase = String(PUBLIC_BASE).replace(/\/$/,'');

  function esc(v){
    if(typeof window.esc==='function') return window.esc(v==null?'':String(v));
    return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function money(v){ return typeof window.money==='function' ? window.money(v) : `${Number(v||0).toFixed(0)} جنيه`; }
  function notify(msg){ try{ if(typeof toast==='function') toast(msg); else alert(msg); }catch(_){ alert(msg); } }
  function baseUrl(){ return cleanBase || location.origin; }
  function trackUrl(token){ return baseUrl() + '/#track/' + encodeURIComponent(token); }
  function driverUrl(token){ return baseUrl() + '/#driver/' + encodeURIComponent(token); }
  function statusLabel(s){ return ({new:'جديد',confirmed:'تم التأكيد',preparing:'قيد التحضير',ready:'جاهز',assigned:'تم التعيين',accepted:'تم القبول',picked_up:'تم الاستلام',out_for_delivery:'خرج للتوصيل',delivered:'تم التسليم',cancelled:'ملغي',unassigned:'بدون مندوب'})[s]||s||'—'; }
  function fmtCoords(lat,lng){ return lat==null||lng==null?'غير متاح':`${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`; }

  async function getSession(){
    try{
      let r=await db.auth.getSession();
      if(r?.data?.session) return r.data.session;
      r=await db.auth.refreshSession();
      return r?.data?.session||null;
    }catch(_){ return null; }
  }

  function removeOriginalRouteListener(){
    if(typeof originalRouter==='function'){
      try{ window.removeEventListener('hashchange', originalRouter); }catch(_){ }
    }
  }

  async function loadLeaflet(){
    if(window.L) return true;
    if(!document.getElementById('ros-leaflet-css')){
      const l=document.createElement('link'); l.id='ros-leaflet-css'; l.rel='stylesheet'; l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(l);
    }
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script'); s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
    return !!window.L;
  }

  async function renderTracking(token){
    const app=document.querySelector('#app'); if(!app) return;
    app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-6"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">ORDER TRACKING</div><h1 class="text-3xl font-extrabold">تتبع طلبك</h1></div><button type="button" onclick="location.hash='menu'" class="rounded-xl border px-4 py-2">القائمة</button></div><div id="rosTrackBox" class="mt-6">جارٍ تحميل الطلب...</div></div></div></main>`;
    let timer=null, map=null, marker=null, alive=true;
    async function load(){
      if(!alive || !window.db) return;
      const r=await db.rpc('public_track_order',{p_token:token});
      const box=document.querySelector('#rosTrackBox'); if(!box) return;
      if(r.error || !r.data?.length){ box.innerHTML='<div class="p-5 rounded-2xl bg-red-500/10">رابط التتبع غير صالح أو الطلب غير موجود.</div>'; if(timer)clearInterval(timer); alive=false; return; }
      const x=r.data[0];
      const stages=['new','confirmed','preparing','ready','assigned','accepted','picked_up','out_for_delivery','delivered'];
      const idx=Math.max(0,stages.indexOf(x.status));
      const gps=x.latitude!=null && x.longitude!=null;
      box.innerHTML=`<div class="space-y-4"><div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="text-sm" style="color:var(--muted)">المطعم</div><div class="font-extrabold text-xl">${esc(x.restaurant_name)}</div><div class="mt-3 text-sm" style="color:var(--muted)">العميل</div><div class="font-bold">${esc(x.customer_name||'عميل')}</div><div class="mt-3 text-sm" style="color:var(--muted)">الإجمالي</div><div class="font-extrabold text-xl">${money(x.total)}</div></div><div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${stages.map((s,i)=>`<div class="rounded-xl p-3 text-center text-xs font-bold" style="background:${i<=idx?'var(--brand)':'var(--surface2)'};color:${i<=idx?'#111':'var(--text)'}">${statusLabel(s)}</div>`).join('')}</div><div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="font-extrabold text-lg">المندوب</div><div class="mt-1">${esc(x.driver_name||'لم يتم تعيين مندوب بعد')}</div>${gps?`<div class="mt-3 text-sm" style="color:var(--muted)">آخر موقع: ${fmtCoords(x.latitude,x.longitude)}</div><div id="rosLiveMap" class="mt-4 rounded-2xl overflow-hidden" style="height:300px"></div><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${Number(x.latitude)},${Number(x.longitude)}" class="inline-block mt-3 px-4 py-2 rounded-xl border font-bold">فتح الموقع على الخريطة</a>`:'<div class="mt-3 text-sm" style="color:var(--muted)">سيظهر موقع المندوب هنا بعد تشغيل GPS.</div>'}</div>${x.status==='delivered'?'<div class="text-center font-extrabold">تم تسليم الطلب بنجاح</div>':'<div class="text-center text-sm" style="color:var(--muted)">تتحدث الحالة وموقع المندوب تلقائيًا كل 5 ثوانٍ.</div>'}</div>`;
      if(gps){
        try{
          if(!map){
            await loadLeaflet();
            const mapEl=document.querySelector('#rosLiveMap');
            if(mapEl && window.L){ map=L.map(mapEl,{zoomControl:true}).setView([Number(x.latitude),Number(x.longitude)],15); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map); marker=L.marker([Number(x.latitude),Number(x.longitude)]).addTo(map); }
          } else if(marker){ marker.setLatLng([Number(x.latitude),Number(x.longitude)]); map.panTo([Number(x.latitude),Number(x.longitude)]); }
        }catch(_){ }
      }
      if(x.status==='delivered'||x.status==='cancelled'){ if(timer)clearInterval(timer); }
    }
    await load();
    timer=setInterval(load,5000);
  }

  async function renderDriver(token){
    const app=document.querySelector('#app'); if(!app)return;
    app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-6"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">DRIVER APP</div><h1 class="text-2xl font-extrabold">لوحة المندوب</h1></div><button type="button" onclick="location.hash='menu'" class="rounded-xl border px-4 py-2">خروج</button></div><div id="rosDriverBox" class="mt-5">جارٍ تحميل الطلبات...</div></div></div></main>`;
    let watch=null, activeOrder=null, lastSent=0;
    function stop(){ if(watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watch); watch=null; activeOrder=null; }
    async function sendLocation(orderId,lat,lng,accuracy){
      if(Date.now()-lastSent<4000)return; lastSent=Date.now();
      await db.rpc('driver_update_location',{p_token:token,p_order_id:orderId,p_latitude:lat,p_longitude:lng,p_accuracy:accuracy??null});
    }
    async function load(){
      const r=await db.rpc('driver_get_orders',{p_token:token});
      const box=document.querySelector('#rosDriverBox'); if(!box)return;
      if(r.error){box.innerHTML=`<div class="p-5 rounded-2xl bg-red-500/10">${esc(r.error.message||'رابط المندوب غير صالح')}</div>`;stop();return;}
      const rows=r.data||[];
      if(!rows.length){box.innerHTML='<div class="text-center py-12" style="color:var(--muted)">لا توجد طلبات مسندة إليك حاليًا.</div>';stop();return;}
      box.innerHTML=rows.map(o=>`<article class="rounded-2xl p-4 mb-4" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--text) 10%,transparent)"><div class="flex justify-between gap-3"><div><div class="font-extrabold">طلب #${esc(o.id.slice(0,8))}</div><div class="mt-1">${esc(o.customer_name)} • ${esc(o.customer_phone)}</div></div><span class="px-3 py-1 rounded-full text-xs font-bold" style="background:var(--brand);color:#111">${statusLabel(o.delivery_status)}</span></div><div class="mt-3 text-sm">${esc(o.address)}</div><div class="mt-3 font-extrabold">${money(o.total)}</div><div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4"><button type="button" onclick="window.__rosDriverStatus('${esc(o.id)}','accepted')" class="rounded-xl border p-3 font-bold">قبول</button><button type="button" onclick="window.__rosDriverStatus('${esc(o.id)}','picked_up')" class="rounded-xl border p-3 font-bold">استلام</button><button type="button" onclick="window.__rosDriverStatus('${esc(o.id)}','out_for_delivery')" class="rounded-xl border p-3 font-bold">خرج للتوصيل</button><button type="button" onclick="window.__rosDriverStatus('${esc(o.id)}','delivered')" class="rounded-xl border p-3 font-bold">تم التسليم</button>${o.customer_lat!=null&&o.customer_lng!=null?`<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${Number(o.customer_lat)},${Number(o.customer_lng)}" class="rounded-xl border p-3 font-bold text-center">موقع العميل</a>`:''}<button type="button" onclick="window.__rosDriverGps('${esc(o.id)}')" class="rounded-xl border p-3 font-bold">تشغيل GPS</button></div><div class="mt-3 text-sm" style="color:var(--muted)">آخر موقع مرسل: ${fmtCoords(o.latitude,o.longitude)}</div></article>`).join('');
      window.__rosDriverStatus=async function(orderId,status){ const rr=await db.rpc('driver_update_status',{p_token:token,p_order_id:orderId,p_status:status}); if(rr.error)return notify(rr.error.message||'تعذر تحديث الحالة'); notify('تم تحديث الحالة'); await load(); };
      window.__rosDriverGps=function(orderId){
        if(!navigator.geolocation)return notify('المتصفح لا يدعم GPS');
        if(activeOrder===orderId&&watch!==null){stop();notify('تم إيقاف GPS');return;}
        stop(); activeOrder=orderId;
        watch=navigator.geolocation.watchPosition(async p=>{ await sendLocation(orderId,p.coords.latitude,p.coords.longitude,p.coords.accuracy); await load(); },e=>notify(e.message||'تعذر تشغيل GPS'),{enableHighAccuracy:true,maximumAge:3000,timeout:20000});
        notify('تم تشغيل GPS للمندوب');
      };
    }
    await load();
  }

  async function renderDeliveryAdmin(){
    const app=document.querySelector('#app'); if(!app)return;
    const existing=document.querySelector('#deliveryControlPanel'); if(existing)existing.remove();
    const session=await getSession();
    if(!session || !window.store?.restaurant?.id)return;
    const id=store.restaurant.id;
    const panel=document.createElement('section'); panel.id='deliveryControlPanel'; panel.className='lux-card rounded-3xl p-5 mt-6';
    panel.innerHTML=`<div class="flex justify-between items-center gap-3"><div><div class="eyebrow">DELIVERY CONTROL</div><h2 class="text-2xl font-extrabold">إدارة التوصيل و GPS</h2><p class="text-sm mt-1" style="color:var(--muted)">تعيين المندوب يتم يدويًا. حالات التوصيل يغيّرها المندوب من لوحة المندوب.</p></div><button type="button" id="rosDeliveryRefresh" class="rounded-xl border px-4 py-2">تحديث</button></div><div class="mt-5 grid gap-3"><input id="rosDriverName" class="w-full border p-4" placeholder="اسم المندوب"><input id="rosDriverPhone" class="w-full border p-4" placeholder="رقم الموبايل"><button type="button" id="rosAddDriver" class="w-full py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">إضافة مندوب</button></div><div class="mt-7"><h3 class="text-xl font-extrabold">المندوبون</h3><div id="rosDrivers" class="mt-3"></div></div><div class="mt-7"><h3 class="text-xl font-extrabold">طلبات التوصيل</h3><div id="rosDeliveryOrders" class="mt-3"></div></div>`;
    app.appendChild(panel);

    async function loadPanel(){
      const [dr,doq,oq]=await Promise.all([
        db.from('drivers').select('*').eq('restaurant_id',id).order('created_at',{ascending:false}),
        db.from('delivery_orders').select('*').eq('restaurant_id',id).order('created_at',{ascending:false}).limit(50),
        db.from('orders').select('*').eq('restaurant_id',id).order('created_at',{ascending:false}).limit(50)
      ]);
      const drivers=dr.data||[]; const dos=doq.data||[]; const orders=oq.data||[];
      const byOrder=new Map(orders.map(o=>[o.id,o])); const byDriver=new Map(drivers.map(d=>[d.id,d]));
      const dbox=document.querySelector('#rosDrivers');
      dbox.innerHTML=drivers.length?drivers.map(d=>`<div class="rounded-2xl p-4 mb-3" style="background:var(--surface2)"><div class="font-extrabold text-lg">${esc(d.name)} <span class="text-sm" style="color:var(--muted)">• ${esc(d.phone||'بدون رقم')}</span></div><div class="mt-1 text-sm">${d.active?'● نشط':'○ متوقف'}</div><div class="flex flex-wrap gap-2 mt-3"><a href="${esc(driverUrl(d.access_token))}" target="_blank" rel="noopener" class="rounded-xl border px-4 py-2 font-bold">فتح لوحة المندوب</a><button type="button" data-copy-driver="${esc(driverUrl(d.access_token))}" class="rounded-xl border px-4 py-2 font-bold">نسخ رابط المندوب</button></div></div>`).join(''):'<div class="py-5" style="color:var(--muted)">لا يوجد مندوبون بعد.</div>';
      const candidates=drivers.filter(d=>d.active);
      const obox=document.querySelector('#rosDeliveryOrders');
      obox.innerHTML=dos.length?dos.map(d=>{const o=byOrder.get(d.order_id)||{}; const current=byDriver.get(d.driver_id); return `<article class="rounded-2xl p-4 mb-3" style="background:var(--surface2)"><div class="flex justify-between gap-3"><div><div class="font-extrabold">طلب #${esc(String(d.order_id).slice(0,8))}</div><div>${esc(o.customer_name||'عميل')} • ${esc(o.customer_phone||'')}</div><div class="mt-1 text-sm">${esc(o.address||'')}</div></div><span class="px-3 py-1 rounded-full text-xs font-bold" style="background:var(--brand);color:#111">${statusLabel(d.status)}</span></div><div class="mt-3 font-extrabold">${money(o.total)}</div><div class="mt-3 text-sm">المندوب الحالي: <b>${esc(current?.name||'بدون مندوب')}</b></div>${!d.driver_id?`<div class="mt-3 flex gap-2"><select data-assign-select="${esc(d.order_id)}" class="flex-1 border p-3"><option value="">اختر مندوبًا</option>${candidates.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.phone||'')}</option>`).join('')}</select><button type="button" data-assign-order="${esc(d.order_id)}" class="rounded-xl px-5 font-extrabold" style="background:var(--brand);color:#111">تعيين</button></div>`:`<div class="mt-3 flex flex-wrap gap-2"><span class="rounded-xl px-4 py-2" style="background:var(--surface)">تم التعيين يدويًا</span><a href="${esc(trackUrl(o.tracking_token))}" target="_blank" rel="noopener" class="rounded-xl border px-4 py-2 font-bold">فتح تتبع العميل</a></div>`}</article>`;}).join(''):'<div class="py-5" style="color:var(--muted)">لا توجد طلبات توصيل.</div>';
      panel.querySelectorAll('[data-copy-driver]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copyDriver);notify('تم نسخ رابط المندوب');}catch(_){prompt('انسخ الرابط:',b.dataset.copyDriver);}});
      panel.querySelectorAll('[data-assign-order]').forEach(b=>b.onclick=async()=>{const s=panel.querySelector(`[data-assign-select="${b.dataset.assignOrder}"]`);if(!s?.value)return notify('اختر مندوبًا أولًا');const rr=await db.rpc('admin_assign_delivery',{p_order_id:b.dataset.assignOrder,p_driver_id:s.value});if(rr.error)return notify(rr.error.message||'تعذر تعيين المندوب');notify('تم تعيين المندوب');await loadPanel();});
      if(dr.error)notify(dr.error.message||'تعذر تحميل المندوبين');
      if(doq.error)notify(doq.error.message||'تعذر تحميل طلبات التوصيل');
      if(oq.error)notify(oq.error.message||'تعذر تحميل الطلبات');
    }
    panel.querySelector('#rosAddDriver').onclick=async()=>{const name=panel.querySelector('#rosDriverName').value.trim();const phone=panel.querySelector('#rosDriverPhone').value.trim();if(!name)return notify('اكتب اسم المندوب');const r=await db.rpc('admin_create_driver',{p_restaurant_id:id,p_name:name,p_phone:phone||null});if(r.error)return notify(r.error.message||'تعذر إضافة المندوب');panel.querySelector('#rosDriverName').value='';panel.querySelector('#rosDriverPhone').value='';notify('تمت إضافة المندوب');await loadPanel();};
    panel.querySelector('#rosDeliveryRefresh').onclick=loadPanel;
    await loadPanel();
  }

  async function adminWrapper(){
    if(typeof originalAdmin==='function') await originalAdmin();
    await renderDeliveryAdmin();
  }

  async function routerWrapper(){
    const h=location.hash||'';
    if(/^#track\//.test(h)) return renderTracking(decodeURIComponent(h.slice(7)));
    if(/^#driver\//.test(h)) return renderDriver(decodeURIComponent(h.slice(8)));
    if(h==='#admin') return adminWrapper();
    return typeof originalRouter==='function' ? originalRouter.apply(this,arguments) : undefined;
  }

  removeOriginalRouteListener();
  window.renderAdmin=adminWrapper;
  window.renderRouter=routerWrapper;
  window.addEventListener('hashchange',routerWrapper);
  setTimeout(()=>{ if(/^#(track|driver)\//.test(location.hash||'')) routerWrapper(); },250);
  setTimeout(()=>{ if(/^#(track|driver)\//.test(location.hash||'')) routerWrapper(); },1200);
})();
