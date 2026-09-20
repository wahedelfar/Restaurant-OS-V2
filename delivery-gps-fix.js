(function(){
  'use strict';

  const originalRenderAdmin = window.renderAdmin;
  const originalRenderRouter = window.renderRouter;
  const originalCheckout = window.checkout;

  function notify(msg){
    try{ toast(msg); }catch(_){ alert(msg); }
  }

  function trackUrl(token){
    return location.origin + location.pathname + '#track/' + encodeURIComponent(token);
  }

  function driverUrl(token){
    return location.origin + location.pathname + '#driver/' + encodeURIComponent(token);
  }

  function coordsText(lat,lng){
    if(lat==null||lng==null)return 'غير محدد';
    return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  }

  function statusLabel(s){
    return ({new:'جديد',confirmed:'تم التأكيد',preparing:'قيد التحضير',ready:'جاهز',assigned:'تم التعيين',out_for_delivery:'خرج للتوصيل',delivered:'تم التسليم',cancelled:'ملغي',completed:'مكتمل',unassigned:'بدون مندوب',accepted:'تم القبول',picked_up:'تم الاستلام'})[s]||s||'—';
  }

  async function uploadProof(file){
    if(!file)return null;
    if(typeof uploadPaymentProof==='function') return await uploadPaymentProof(file);
    return null;
  }

  window.getCustomerLocation=function(){
    if(!navigator.geolocation)return notify('المتصفح لا يدعم تحديد الموقع');
    if(!window.isSecureContext)return notify('تحديد الموقع يحتاج HTTPS');
    const el=document.querySelector('#customerGps');
    if(el)el.textContent='جارٍ تحديد موقعك بدقة...';
    navigator.geolocation.getCurrentPosition(function(p){
      window.__customerCoords={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};
      if(el)el.textContent=`تم تحديد الموقع ✓ • الدقة التقريبية ${Math.round(p.coords.accuracy||0)} متر`;
    },function(e){
      if(el)el.textContent='تعذر تحديد الموقع: '+(e.message||'تم رفض الإذن');
    },{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  };

  window.checkout=function(){
    if(typeof tableFromUrl==='function' && tableFromUrl()){
      if(typeof originalCheckout==='function') return originalCheckout();
      return;
    }
    if(!cart.length)return notify('السلة فارغة');
    const total=cart.reduce((a,b)=>a+b.price*b.qty,0);
    $('#modal').innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center" onclick="if(event.target===this)closeModal()"><div class="checkout-modal w-full max-w-lg rounded-3xl p-5 max-h-[94vh] overflow-auto"><div class="flex justify-between items-center"><h2 class="text-2xl font-extrabold">طلب توصيل</h2><button onclick="closeModal()" class="w-10 h-10 rounded-full border">×</button></div><div class="checkout-note rounded-2xl p-4 my-4 font-bold">الإجمالي: ${money(total)}</div><div class="space-y-3"><input id="cust" class="w-full border rounded-2xl p-4" placeholder="الاسم"><input id="customerPhone" inputmode="tel" class="w-full border rounded-2xl p-4" placeholder="رقم الهاتف"><textarea id="addr" class="w-full border rounded-2xl p-4" placeholder="العنوان بالتفصيل"></textarea><button type="button" onclick="getCustomerLocation()" class="w-full py-3 rounded-2xl border font-extrabold">📍 تحديد موقعي الحالي</button><div id="customerGps" class="text-xs" style="color:var(--muted)">لم يتم تحديد الموقع بعد</div><select id="pay" onchange="toggleVodafoneFields()" class="w-full border rounded-2xl p-4"><option value="cash">دفع عند الاستلام</option><option value="vodafone">Vodafone Cash</option></select><div id="vodafoneBox" class="vodafone-box hidden rounded-2xl p-4 space-y-3"><div class="font-extrabold">الدفع عبر Vodafone Cash</div><div class="font-bold">التحويل على الرقم: <span dir="ltr">01063537686</span></div><input id="transferPhone" inputmode="tel" class="w-full border rounded-2xl p-4" placeholder="رقم التليفون المحوّل منه"><input id="proof" type="file" accept="image/*" class="w-full border rounded-2xl p-3"><div id="proofName" class="text-xs"></div></div><div class="text-xs" style="color:var(--muted)">بعد إرسال الطلب سيظهر لك رابط تتبع الطلب، ويمكن للمطعم تعيين مندوب ومتابعة موقعه.</div><button onclick="sendDeliveryOrder()" class="w-full py-4 rounded-2xl text-white font-extrabold" style="background:var(--brand)">إرسال طلب التوصيل</button></div></div></div>`;
    if(typeof toggleVodafoneFields==='function')toggleVodafoneFields();
  };

  window.sendDeliveryOrder=async function(){
    if(!cart.length)return notify('السلة فارغة');
    const name=$('#cust')?.value.trim()||'';
    const phone=$('#customerPhone')?.value.trim()||'';
    const address=$('#addr')?.value.trim()||'';
    const pay=$('#pay')?.value||'cash';
    const transferPhone=$('#transferPhone')?.value.trim()||null;
    const proofFile=$('#proof')?.files?.[0]||null;
    if(!name||!phone||!address)return notify('اكتب الاسم ورقم الهاتف والعنوان');
    if(pay==='vodafone'&&(!transferPhone||!proofFile))return notify('أدخل رقم التليفون المحوّل منه وأرفق صورة التحويل');
    if(!store.restaurant?.id)return notify('بيانات المطعم غير متاحة');

    const items=cart.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price}));
    let proofUrl=null;
    try{if(pay==='vodafone')proofUrl=await uploadProof(proofFile);}catch(e){return notify(e?.message||'تعذر رفع صورة التحويل');}

    const r=await db.rpc('create_delivery_order',{
      p_restaurant_id:store.restaurant.id,
      p_customer_name:name,
      p_customer_phone:phone,
      p_address:address,
      p_payment_method:pay,
      p_items:items,
      p_customer_lat:window.__customerCoords?.lat??null,
      p_customer_lng:window.__customerCoords?.lng??null,
      p_transfer_phone:transferPhone,
      p_payment_proof_url:proofUrl
    });
    if(r.error)return notify(r.error.message||'تعذر إنشاء الطلب');

    const result=r.data?.[0]||r.data;
    const token=result?.tracking_token;
    if(!token)return notify('تم إنشاء الطلب لكن لم يتم إنشاء رابط التتبع');

    const url=trackUrl(token);
    const total=cart.reduce((a,b)=>a+b.price*b.qty,0);
    const msg=`طلب توصيل جديد من ${store.restaurant.name}\nالاسم: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\nالموقع: ${window.__customerCoords?coordsText(window.__customerCoords.lat,window.__customerCoords.lng):'غير محدد'}\n\n${cart.map(x=>`${x.name} × ${x.qty}`).join('\n')}\n\nالإجمالي: ${money(total)}\nتتبع الطلب: ${url}`;

    cart=[];updateCart();
    $('#modal').innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center"><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم استلام طلبك</h2><p class="mt-2" style="color:var(--muted)">احتفظ برابط التتبع لمتابعة حالة الطلب وموقع المندوب.</p><a href="${esc(url)}" class="block mt-5 w-full py-4 rounded-2xl text-white font-extrabold text-center" style="background:var(--brand)">متابعة الطلب</a><button onclick="window.location.href='https://wa.me/'+getWaNumber()+'?text='+encodeURIComponent(${JSON.stringify(msg)})" class="mt-3 w-full py-3 rounded-2xl border font-extrabold">إرسال الطلب للمطعم عبر WhatsApp</button></div></div>`;
  };

  // Customer tracking is owned exclusively by customer-tracking-v2.js.
  // This delivery layer owns only the driver route.
  async function ensureDriverLeaflet(){if(window.L)return true;if(!document.querySelector('link[data-ros-driver-leaflet]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.dataset.rosDriverLeaflet='1';document.head.appendChild(l)}return true}

  async function renderDriver(token){
    $('#app').innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-6"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center"><div><div class="eyebrow">DRIVER APP</div><h1 class="text-2xl font-extrabold">لوحة المندوب</h1></div><button onclick="location.hash='menu'" class="rounded-xl border px-4 py-2">خروج</button></div><div id="driverBox" class="mt-5">جارٍ تحميل الطلبات...</div></div></div></main>`;
    let watch=null,activeOrder=null,lastSent=0,rowsCache=[];
    function stopGps(){if(watch!==null&&navigator.geolocation){navigator.geolocation.clearWatch(watch);watch=null;}activeOrder=null;}
    async function load(){
      const r=await db.rpc('driver_get_orders',{p_token:token});
      const box=$('#driverBox');
      if(!box)return;
      if(r.error){box.innerHTML=`<div class="p-5 rounded-2xl bg-red-500/10">${esc(r.error.message||'رابط المندوب غير صالح')}</div>`;return;}
      const rows=r.data||[];
      rowsCache=rows;
      if(!rows.length){box.innerHTML='<div class="text-center py-12" style="color:var(--muted)">لا توجد طلبات مسندة إليك حاليًا.</div>';stopGps();return;}
      box.innerHTML=rows.map(o=>`<article class="rounded-2xl p-4 mb-4" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--text) 10%,transparent)"><div class="flex justify-between gap-3"><div><div class="font-extrabold">طلب #${esc(o.id.slice(0,8))}</div><div class="mt-1">${esc(o.customer_name)} • ${esc(o.customer_phone)}</div></div><span class="px-3 py-1 rounded-full text-xs font-bold" style="background:var(--brand);color:#111">${statusLabel(o.delivery_status)}</span></div><div class="mt-3 text-sm">${esc(o.address)}</div><div class="mt-3 font-extrabold">${money(o.total)}</div><div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4"><button onclick="driverStatus('${esc(o.id)}','accepted')" class="rounded-xl border p-3 font-bold">قبول</button><button onclick="driverStatus('${esc(o.id)}','picked_up')" class="rounded-xl border p-3 font-bold">استلام</button><button onclick="driverStatus('${esc(o.id)}','out_for_delivery')" class="rounded-xl border p-3 font-bold">خرج للتوصيل</button><button onclick="driverStatus('${esc(o.id)}','delivered')" class="rounded-xl p-3 font-bold" style="background:var(--brand);color:#111">تم التسليم</button></div><div class="grid grid-cols-2 gap-2 mt-2"><button type="button" onclick="showCustomerMap('${esc(o.id)}')" class="rounded-xl border p-3 text-center font-bold">موقع العميل</button><button onclick="startDriverGps('${esc(o.id)}')" class="rounded-xl border p-3 font-bold">📍 تشغيل GPS</button></div><div id="gps-${esc(o.id)}" class="mt-2 text-xs" style="color:var(--muted)"></div><div id="customer-map-${esc(o.id)}" class="mt-3 rounded-2xl overflow-hidden" style="height:280px;display:none"></div></article>`).join('');
    }
    window.driverStatus=async function(orderId,status){
      const r=await db.rpc('driver_update_status',{p_token:token,p_order_id:orderId,p_status:status});
      if(r.error)return notify(r.error.message||'تعذر تحديث الحالة');
      if(status==='delivered')stopGps();
      await load();notify('تم تحديث حالة الطلب');
    };
    window.showCustomerMap=async function(orderId){
      const row=(rowsCache||[]).find(x=>String(x.id)===String(orderId));
      const lat=Number(row?.customer_lat),lng=Number(row?.customer_lng);
      const el=document.querySelector('#customer-map-'+CSS.escape(String(orderId)));
      if(!el)return;
      if(!Number.isFinite(lat)||!Number.isFinite(lng)){el.style.display='block';el.innerHTML='<div class="h-full grid place-items-center p-4 text-sm" style="color:var(--muted);background:var(--surface2)">لم يتم تسجيل موقع العميل مع الطلب.</div>';return;}
      el.style.display='block';
      if(!(await (async()=>{if(window.L)return true;const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=()=>{};s.onerror=()=>{};document.head.appendChild(s);for(let i=0;i<100&&!window.L;i++)await new Promise(r=>setTimeout(r,100));return !!window.L})()){el.innerHTML='<div class="h-full grid place-items-center p-4 text-sm" style="color:var(--muted);background:var(--surface2)">تعذر تحميل الخريطة حاليًا.</div>';return;}
      if(el.__rosCustomerMap){el.__rosCustomerMap.setView([lat,lng],16);el.__rosCustomerMarker?.setLatLng([lat,lng]);return;}
      el.innerHTML='';
      const cm=L.map(el).setView([lat,lng],16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(cm);
      const marker=L.marker([lat,lng]).addTo(cm).bindPopup('موقع العميل').openPopup();
      el.__rosCustomerMap=cm;el.__rosCustomerMarker=marker;
    };
    window.startDriverGps=function(orderId){
      if(!navigator.geolocation)return notify('المتصفح لا يدعم GPS');
      if(!window.isSecureContext)return notify('GPS يحتاج HTTPS');
      activeOrder=orderId;
      if(watch!==null)navigator.geolocation.clearWatch(watch);
      const target=$('#gps-'+orderId);
      if(target)target.textContent='GPS يعمل — يتم إرسال الموقع للمطعم...';
      watch=navigator.geolocation.watchPosition(async function(p){
        if(!activeOrder)return;
        const now=Date.now();
        if(now-lastSent<5000)return;
        lastSent=now;
        const r=await db.rpc('driver_update_location',{p_token:token,p_order_id:activeOrder,p_latitude:p.coords.latitude,p_longitude:p.coords.longitude,p_accuracy:p.coords.accuracy||null});
        if(r.error){if(target)target.textContent='تعذر إرسال الموقع: '+r.error.message;return;}
        if(target)target.textContent=`GPS نشط ✓ • ${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`;
      },function(e){if(target)target.textContent='تعذر تشغيل GPS: '+(e.message||'تم رفض الإذن');},{enableHighAccuracy:true,timeout:20000,maximumAge:3000});
    };
    window.addEventListener('beforeunload',stopGps,{once:true});
    load();
  }

  async function deliveryAdminPanel(){
    if(!store?.restaurant?.id||!db)return '';
    const restaurantId=store.restaurant.id;
    const [dr,od]=await Promise.all([
      db.from('drivers').select('id,name,phone,access_token,active').eq('restaurant_id',restaurantId).order('created_at',{ascending:false}),
      db.from('delivery_orders').select('order_id,driver_id,status,assigned_at,updated_at,orders(id,customer_name,customer_phone,address,total,status,tracking_token,customer_lat,customer_lng)').eq('restaurant_id',restaurantId).order('updated_at',{ascending:false}).limit(100)
    ]);
    if(dr.error)throw dr.error;
    if(od.error)throw od.error;
    const drivers=dr.data||[],orders=od.data||[];
    const driverOptions=drivers.filter(d=>d.active).map(d=>`<option value="${esc(d.id)}">${esc(d.name)}${d.phone?' — '+esc(d.phone):''}</option>`).join('');
    return `<section id="deliveryPanel" class="mt-6 rounded-3xl p-5" style="background:var(--surface);border:1px solid color-mix(in srgb,var(--brand) 22%,transparent)"><div class="flex flex-wrap items-center justify-between gap-3"><div><div class="eyebrow">DELIVERY CONTROL</div><h2 class="text-2xl font-extrabold">إدارة الدليفري و GPS</h2></div><button onclick="refreshDeliveryPanel()" class="rounded-xl border px-4 py-2 font-bold">تحديث</button></div><div class="grid md:grid-cols-3 gap-3 mt-5"><input id="newDriverName" class="border rounded-2xl p-3" placeholder="اسم المندوب"><input id="newDriverPhone" class="border rounded-2xl p-3" placeholder="رقم الموبايل"><button onclick="addDriver()" class="rounded-2xl p-3 font-extrabold" style="background:var(--brand);color:#111">إضافة مندوب</button></div><div class="mt-6"><h3 class="font-extrabold text-lg">المندوبون</h3><div class="space-y-2 mt-3">${drivers.length?drivers.map(d=>`<div class="rounded-2xl p-3" style="background:var(--surface2)"><div class="flex flex-wrap justify-between gap-2"><div><b>${esc(d.name)}</b>${d.phone?' • '+esc(d.phone):''} <span class="text-xs">${d.active?'• نشط':'• متوقف'}</span></div><button onclick="toggleDriver('${esc(d.id)}',${!d.active})" class="rounded-xl border px-3 py-2 text-sm">${d.active?'إيقاف':'تفعيل'}</button></div><div class="mt-2 text-xs break-all" style="color:var(--muted)">رابط المندوب: ${esc(driverUrl(d.access_token))}</div></div>`).join(''):'<div style="color:var(--muted)">لم تتم إضافة مندوبين بعد.</div>'}</div></div><div class="mt-7"><h3 class="font-extrabold text-lg">طلبات التوصيل</h3><div class="space-y-3 mt-3">${orders.length?orders.map(x=>{const o=x.orders||{};return `<article class="rounded-2xl p-4" style="background:var(--surface2)"><div class="flex flex-wrap justify-between gap-2"><div><b>طلب #${esc(String(o.id||x.order_id).slice(0,8))}</b> • ${esc(o.customer_name||'عميل')}</div><span class="px-3 py-1 rounded-full text-xs font-bold" style="background:var(--brand);color:#111">${statusLabel(x.status)}</span></div><div class="mt-2 text-sm">${esc(o.address||'')}</div><div class="mt-2 font-extrabold">${money(o.total)}</div><div class="mt-3 grid md:grid-cols-3 gap-2"><select id="assign-${esc(x.order_id)}" class="border rounded-xl p-3"><option value="">اختر مندوبًا</option>${driverOptions}</select><button onclick="assignDriver('${esc(x.order_id)}')" class="rounded-xl border p-3 font-bold">تعيين</button><a target="_blank" rel="noopener" href="${esc(trackUrl(o.tracking_token))}" class="rounded-xl border p-3 text-center font-bold">تتبع العميل</a></div><div class="mt-2 text-xs" style="color:var(--muted)">موقع العميل: ${coordsText(o.customer_lat,o.customer_lng)}</div></article>`}).join(''):'<div style="color:var(--muted)">لا توجد طلبات توصيل حتى الآن.</div>'}</div></div></section>`;
  }

  window.refreshDeliveryPanel=async function(){
    const old=$('#deliveryPanel');
    if(!old)return;
    try{old.outerHTML=await deliveryAdminPanel();}catch(e){notify(e?.message||'تعذر تحديث إدارة الدليفري');}
  };

  window.addDriver=async function(){
    const name=$('#newDriverName')?.value.trim();
    const phone=$('#newDriverPhone')?.value.trim()||null;
    if(!name)return notify('اكتب اسم المندوب');
    const r=await db.from('drivers').insert({restaurant_id:store.restaurant.id,name,phone,active:true}).select('id,name,phone,access_token').single();
    if(r.error)return notify(r.error.message||'تعذر إضافة المندوب');
    notify('تمت إضافة المندوب');
    await refreshDeliveryPanel();
  };

  window.toggleDriver=async function(id,active){
    const r=await db.from('drivers').update({active,updated_at:new Date().toISOString()}).eq('id',id).eq('restaurant_id',store.restaurant.id);
    if(r.error)return notify(r.error.message||'تعذر تعديل المندوب');
    await refreshDeliveryPanel();
  };

  window.assignDriver=async function(orderId){
    const driverId=$('#assign-'+orderId)?.value||null;
    if(!driverId)return notify('اختر مندوبًا أولًا');
    const r=await db.from('delivery_orders').update({driver_id:driverId,status:'assigned',assigned_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('order_id',orderId).eq('restaurant_id',store.restaurant.id);
    if(r.error)return notify(r.error.message||'تعذر تعيين المندوب');
    const o=await db.from('orders').update({status:'assigned'}).eq('id',orderId).eq('restaurant_id',store.restaurant.id);
    if(o.error)return notify(o.error.message||'تم التعيين لكن تعذر تحديث حالة الطلب');
    await refreshDeliveryPanel();notify('تم تعيين المندوب');
  };

  async function renderAdminWithDelivery(){
    try{if(typeof originalRenderAdmin==='function')await originalRenderAdmin();}catch(e){console.error(e);}
    const app=$('#app');
    if(!app||!store?.restaurant)return;
    const existing=$('#deliveryPanel');if(existing)existing.remove();
    try{app.insertAdjacentHTML('beforeend',await deliveryAdminPanel());}catch(e){console.error(e);}
  }
  window.renderAdmin=renderAdminWithDelivery;

  function route(){
    const h=location.hash||'#menu';
    const mt=h.match(/^#track\/([^/]+)$/);
    if(mt){renderTracking(decodeURIComponent(mt[1]));return true;}
    const md=h.match(/^#driver\/([^/]+)$/);
    if(md){renderDriver(decodeURIComponent(md[1]));return true;}
    return false;
  }

  window.addEventListener('hashchange',function(){
    if(!route() && typeof originalRenderRouter==='function')originalRenderRouter();
  });

  if(location.hash&&route())return;
})();
