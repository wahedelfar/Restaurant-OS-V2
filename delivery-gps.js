/* Restaurant OS V8 — Delivery + Driver GPS add-on
   Loaded after app.js. It extends the existing single-restaurant V8 without changing main behavior. */
(function(){
  'use strict';
  const esc2 = s => String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmtMoney = n => `${Number(n||0).toFixed(0)} ${C.currency}`;
  const tokenFromHash = (prefix) => { const m=(location.hash||'').match(new RegExp('^#'+prefix+'/(.+)$')); return m?decodeURIComponent(m[1]):null; };
  const statusNames={new:'جديد',confirmed:'تم التأكيد',preparing:'قيد التحضير',ready:'جاهز',assigned:'تم تعيين المندوب',out_for_delivery:'خرج للتوصيل',delivered:'تم التسليم',cancelled:'ملغي',completed:'مكتمل'};
  const driverStatusNames={unassigned:'غير معين',assigned:'تم التعيين',accepted:'استلم المندوب الطلب',picked_up:'تم الاستلام',out_for_delivery:'في الطريق',delivered:'تم التسليم',cancelled:'ملغي'};
  const gps={watchId:null,token:null,orderId:null,last:null};

  function card(html){return `<div class="bg-white rounded-3xl p-5 shadow-xl border">${html}</div>`}
  function btn(label,onclick,cls='bg-black text-white'){return `<button type="button" onclick="${onclick}" class="px-4 py-3 rounded-2xl font-extrabold ${cls}">${label}</button>`}
  function stopGps(){if(gps.watchId!==null){navigator.geolocation.clearWatch(gps.watchId);gps.watchId=null}}
  function startGps(token,orderId){
    stopGps(); gps.token=token; gps.orderId=orderId;
    if(!navigator.geolocation){toast('المتصفح لا يدعم تحديد الموقع');return}
    if(!window.isSecureContext){toast('GPS يحتاج HTTPS — افتح رابط Vercel');return}
    gps.watchId=navigator.geolocation.watchPosition(async p=>{
      gps.last=p.coords;
      try{await db.rpc('driver_update_location',{p_token:token,p_order_id:orderId,p_latitude:p.coords.latitude,p_longitude:p.coords.longitude,p_accuracy:p.coords.accuracy||null})}
      catch(e){console.warn('GPS update failed',e)}
      const el=document.getElementById('gpsState'); if(el)el.textContent=`GPS يعمل • دقة تقريبية ${Math.round(p.coords.accuracy||0)}م`;
    },e=>{const el=document.getElementById('gpsState');if(el)el.textContent='تعذر الوصول للموقع: '+e.message},{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  }

  async function createDriver(){
    const name=$('#newDriverName')?.value.trim(), phone=$('#newDriverPhone')?.value.trim();
    if(!name)return toast('اكتب اسم المندوب');
    const access_token=crypto.randomUUID();
    const r=await db.from('drivers').insert({restaurant_id:store.restaurant.id,name,phone:phone||null,access_token,active:true}).select().single();
    if(r.error)return toast(r.error.message);
    const link=location.origin+location.pathname+'#driver/'+encodeURIComponent(access_token);
    $('#driverCreateResult').innerHTML=`<div class="mt-4 p-4 rounded-2xl border bg-gray-50"><b>تم إنشاء المندوب</b><div class="mt-2">${esc2(name)}</div><div class="text-xs mt-2 break-all">رابط المندوب: ${esc2(link)}</div>${btn('فتح لوحة المندوب',`location.href='${link}'`,'bg-black text-white')} <button type="button" onclick="navigator.clipboard?.writeText('${link.replace(/'/g,"\\'")}');toast('تم نسخ الرابط')" class="px-4 py-3 rounded-2xl font-extrabold border">نسخ الرابط</button></div>`;
    await renderAdmin();
  }
  window.createDriver=createDriver;

  async function assignOrder(orderId){
    const sel=$(`#driver_${orderId}`); const driverId=sel?.value;
    if(!driverId)return toast('اختر مندوبًا');
    const r=await db.from('delivery_orders').upsert({order_id:orderId,restaurant_id:store.restaurant.id,driver_id:driverId,status:'assigned'},{onConflict:'order_id'});
    if(r.error)return toast(r.error.message);
    const u=await db.from('orders').update({status:'assigned'}).eq('id',orderId).eq('restaurant_id',store.restaurant.id);
    if(u.error)console.warn(u.error);
    toast('تم تعيين المندوب'); await loadSupabase(); await renderAdmin();
  }
  window.assignOrder=assignOrder;

  async function adminOrderStatus(orderId,status){
    const r=await db.from('orders').update({status}).eq('id',orderId).eq('restaurant_id',store.restaurant.id);
    if(r.error)return toast(r.error.message); await loadSupabase(); await renderAdmin();
  }
  window.adminOrderStatus=adminOrderStatus;

  async function renderDeliveryAdmin(){
    const driversQ=await db.from('drivers').select('*').eq('restaurant_id',store.restaurant.id).order('created_at',{ascending:false});
    const delQ=await db.from('delivery_orders').select('*').eq('restaurant_id',store.restaurant.id);
    const drivers=driversQ.data||[], dels=delQ.data||[];
    const deliveryOrders=store.orders.filter(o=>o.order_type==='delivery');
    const sec=document.getElementById('deliverySection'); if(!sec)return;
    sec.innerHTML=`${card(`<div class="flex items-center justify-between gap-3 flex-wrap"><div><h2 class="text-xl font-extrabold">إدارة التوصيل + GPS</h2><p class="text-sm text-gray-500 mt-1">إنشاء مندوب، تعيين الطلب، ومتابعة موقعه لحظيًا.</p></div><span class="px-3 py-2 rounded-full bg-gray-100">${deliveryOrders.length} طلب توصيل</span></div><div class="grid md:grid-cols-3 gap-3 mt-4"><input id="newDriverName" class="border rounded-2xl p-4" placeholder="اسم المندوب"><input id="newDriverPhone" class="border rounded-2xl p-4" placeholder="رقم المندوب"><div>${btn('إضافة مندوب','createDriver()')}</div></div><div id="driverCreateResult"></div><div class="mt-5 space-y-3">${drivers.length?drivers.map(d=>`<div class="border rounded-2xl p-4 flex justify-between gap-3 flex-wrap"><div><b>${esc2(d.name)}</b><div class="text-sm text-gray-500">${esc2(d.phone||'')} • ${d.active?'نشط':'متوقف'}</div></div><button type="button" onclick="navigator.clipboard?.writeText('${(location.origin+location.pathname+'#driver/'+encodeURIComponent(d.access_token)).replace(/'/g,"\\'")}');toast('تم نسخ رابط المندوب')" class="px-3 py-2 rounded-xl border font-bold">نسخ رابط المندوب</button></div>`).join(''):'<div class="text-gray-500">لا يوجد مندوبون بعد.</div>'}</div><div class="mt-5"><h3 class="font-extrabold text-lg mb-3">طلبات التوصيل</h3><div class="space-y-3">${deliveryOrders.length?deliveryOrders.map(o=>{const d=dels.find(x=>x.order_id===o.id);return `<div class="border rounded-2xl p-4"><div class="flex justify-between gap-3 flex-wrap"><div><b>طلب #${esc2(o.id?.slice?.(0,8)||'')}</b> — ${esc2(o.customer_name||'عميل')}</div><b>${fmtMoney(o.total)}</b></div><div class="text-sm text-gray-500 mt-2">${esc2(o.customer_phone||'')} • ${esc2(o.address||'بدون عنوان')}</div><div class="flex flex-wrap gap-2 mt-3"><select id="driver_${o.id}" class="border rounded-xl p-3"><option value="">اختر المندوب</option>${drivers.filter(x=>x.active).map(x=>`<option value="${x.id}" ${d?.driver_id===x.id?'selected':''}>${esc2(x.name)}</option>`).join('')}</select>${btn('تعيين',`assignOrder('${o.id}')`)}<select onchange="adminOrderStatus('${o.id}',this.value)" class="border rounded-xl p-3"><option value="">حالة الطلب</option>${Object.entries(statusNames).map(([k,v])=>`<option value="${k}" ${o.status===k?'selected':''}>${v}</option>`).join('')}</select>${o.tracking_token?btn('تتبع العميل',`location.hash='track/${o.tracking_token}'`,'border bg-white text-black'):''}</div><div class="text-xs text-gray-500 mt-2">${d?`المندوب: ${esc2(drivers.find(x=>x.id===d.driver_id)?.name||'')} • ${driverStatusNames[d.status]||d.status}`:'لم يتم تعيين مندوب'}</div></div>`}).join(''):'<div class="text-gray-500">لا توجد طلبات توصيل.</div>'}</div></div>`)}>`;
  }

  const originalCheckout=window.checkout;
  window.checkout=function(){
    const table=tableFromUrl();
    if(table){return originalCheckout()}
    const total=cart.reduce((a,b)=>a+b.price*b.qty,0);
    $('#modal').innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center" onclick="if(event.target===this)closeModal()"><div class="checkout-modal w-full max-w-lg rounded-3xl p-5 max-h-[94vh] overflow-auto"><div class="flex justify-between items-center"><h2 class="text-2xl font-extrabold">طلب توصيل</h2><button onclick="closeModal()" class="w-10 h-10 rounded-full border">×</button></div><div class="checkout-note rounded-2xl p-4 my-4 font-bold">الإجمالي: ${fmtMoney(total)}</div><div class="space-y-3"><input id="cust" class="w-full border rounded-2xl p-4" placeholder="الاسم"><input id="customerPhone" inputmode="tel" class="w-full border rounded-2xl p-4" placeholder="رقم الهاتف"><textarea id="addr" class="w-full border rounded-2xl p-4" placeholder="العنوان بالتفصيل"></textarea><button type="button" onclick="getCustomerLocation()" class="w-full py-3 rounded-2xl border font-extrabold">📍 استخدام موقعي الحالي</button><div id="customerGps" class="text-xs text-gray-500"></div><select id="pay" class="w-full border rounded-2xl p-4"><option value="cash">دفع عند الاستلام</option><option value="vodafone">Vodafone Cash</option></select><div class="text-xs text-gray-500">بعد إرسال الطلب سيظهر لك رابط تتبع حالة الطلب وموقع المندوب.</div><button onclick="sendDeliveryOrder()" class="w-full py-4 rounded-2xl text-white font-extrabold" style="background:var(--brand)">إرسال طلب التوصيل</button></div></div></div>`;
  };

  let customerCoords=null;
  window.getCustomerLocation=function(){
    if(!navigator.geolocation)return toast('المتصفح لا يدعم GPS');
    if(!window.isSecureContext)return toast('GPS يحتاج HTTPS');
    const el=$('#customerGps'); if(el)el.textContent='جارٍ تحديد موقعك...';
    navigator.geolocation.getCurrentPosition(p=>{customerCoords={lat:p.coords.latitude,lng:p.coords.longitude};if(el)el.textContent=`تم تحديد موقعك • دقة تقريبية ${Math.round(p.coords.accuracy||0)}م`;},e=>{if(el)el.textContent='تعذر تحديد الموقع: '+e.message},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  };

  window.sendDeliveryOrder=async function(){
    if(!cart.length)return toast('السلة فارغة');
    const name=$('#cust')?.value.trim()||'عميل', phone=$('#customerPhone')?.value.trim()||'', address=$('#addr')?.value.trim()||'', pay=$('#pay')?.value||'cash';
    if(!name||!phone||!address)return toast('اكتب الاسم ورقم الهاتف والعنوان');
    const items=cart.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price}));
    const fallbackTracking=crypto.randomUUID();
    const r=await db.rpc('create_delivery_order',{p_restaurant_id:store.restaurant.id,p_customer_name:name,p_customer_phone:phone,p_address:address,p_payment_method:pay,p_items:items,p_customer_lat:customerCoords?.lat||null,p_customer_lng:customerCoords?.lng||null});
    if(r.error)return toast(r.error.message||'تعذر إنشاء الطلب');
    const result=r.data?.[0]||r.data; const tracking=result?.tracking_token||fallbackTracking;
    const trackUrl=location.origin+location.pathname+'#track/'+tracking;
    const msg=`طلب توصيل جديد من ${store.restaurant.name}\nالاسم: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\n\n${cart.map(x=>`${x.name} × ${x.qty}`).join('\n')}\n\nالإجمالي: ${fmtMoney(total)}\nتتبع الطلب: ${trackUrl}`;
    cart=[];updateCart();closeModal();
    const wa=getWaNumber(); window.location.href=`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  };

  async function renderTrack(token){
    $('#app').innerHTML=`<main class="min-h-screen p-4 md:p-8 luxury-page"><div class="max-w-xl mx-auto space-y-4"><div class="flex justify-between items-center"><a href="#menu" class="px-4 py-2 rounded-xl border">← المنيو</a><div class="font-extrabold">تتبع الطلب</div></div><div id="trackBox">${card('<div class="text-center py-8">جارٍ تحميل الطلب...</div>')}</div></div></main>`;
    const load=async()=>{const r=await db.rpc('public_track_order',{p_token:token});const box=$('#trackBox');if(r.error){if(box)box.innerHTML=card(`<div class="text-center text-red-500">تعذر تحميل التتبع</div>`);return}const o=r.data?.[0]||r.data;if(!o){if(box)box.innerHTML=card('<div class="text-center py-8">الطلب غير موجود</div>');return}const status=statusNames[o.status]||o.status;box.innerHTML=card(`<div class="text-center"><div class="text-sm text-gray-500">${esc2(o.restaurant_name||store.restaurant?.name||'المطعم')}</div><div class="text-3xl font-extrabold mt-2">${esc2(status)}</div><div class="mt-5 h-3 rounded-full bg-gray-200 overflow-hidden"><div style="width:${Math.max(8,(['new','confirmed','preparing','ready','assigned','out_for_delivery','delivered'].indexOf(o.status)+1)*14)}%;background:var(--brand)" class="h-full rounded-full"></div></div><div class="grid grid-cols-2 gap-3 mt-5 text-right"><div class="p-3 rounded-2xl bg-gray-50"><div class="text-xs text-gray-500">العميل</div><b>${esc2(o.customer_name||'')}</b></div><div class="p-3 rounded-2xl bg-gray-50"><div class="text-xs text-gray-500">الإجمالي</div><b>${fmtMoney(o.total)}</b></div></div>${o.driver_name?`<div class="mt-4 p-4 rounded-2xl border"><b>المندوب: ${esc2(o.driver_name)}</b>${o.latitude?`<div class="text-sm text-gray-500 mt-1">الموقع متاح الآن</div><a class="inline-block mt-2 text-blue-600 font-bold" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${o.latitude},${o.longitude}">فتح الموقع على الخريطة</a>`:'<div class="text-sm text-gray-500 mt-1">لم يبدأ المندوب مشاركة موقعه بعد.</div>'}</div>`:''}<div class="text-xs text-gray-500 mt-4">يتم تحديث الحالة والموقع تلقائيًا.</div></div>`)};
    await load(); window.__trackTimer=setInterval(load,5000);
  }

  async function renderDriver(token){
    if(window.__trackTimer)clearInterval(window.__trackTimer); if(window.__driverTimer)clearInterval(window.__driverTimer); stopGps();
    $('#app').innerHTML=`<main class="min-h-screen p-4 md:p-8 luxury-page"><div class="max-w-xl mx-auto space-y-4"><div class="flex justify-between items-center"><div class="font-extrabold text-xl">لوحة المندوب</div><a href="#menu" class="px-4 py-2 rounded-xl border">خروج</a></div><div id="driverBox">${card('<div class="text-center py-8">جارٍ تحميل الطلبات...</div>')}</div></div></main>`;
    const load=async()=>{const r=await db.rpc('driver_get_orders',{p_token:token});const box=$('#driverBox');if(r.error){box.innerHTML=card(`<div class="text-center text-red-500">الرابط غير صالح أو المندوب متوقف.</div>`);return}const rows=r.data||[];box.innerHTML=rows.length?rows.map(o=>card(`<div><div class="flex justify-between gap-3"><b>طلب #${esc2(String(o.id).slice(0,8))}</b><span class="px-3 py-1 rounded-full bg-gray-100">${esc2(driverStatusNames[o.delivery_status]||o.delivery_status)}</span></div><div class="mt-3"><b>${esc2(o.customer_name||'عميل')}</b><div class="text-sm text-gray-500 mt-1">${esc2(o.customer_phone||'')}</div><div class="mt-2">${esc2(o.address||'')}</div><div class="font-extrabold mt-2">${fmtMoney(o.total)}</div></div><div class="flex flex-wrap gap-2 mt-4">${['accepted','picked_up','out_for_delivery','delivered'].map(s=>btn(driverStatusNames[s],`driverSetStatus('${token}','${o.id}','${s}')`,s==='delivered'?'bg-green-600 text-white':'bg-black text-white')).join('')}</div><button type="button" onclick="startDriverGps('${token}','${o.id}')" class="w-full mt-3 py-3 rounded-2xl border font-extrabold">📍 تشغيل GPS لهذا الطلب</button><div id="gpsState" class="text-xs text-gray-500 mt-2">${gps.orderId===o.id?'GPS يعمل':''}</div>${o.customer_lat?`<a class="block mt-3 text-center font-bold text-blue-600" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${o.customer_lat},${o.customer_lng}">فتح اتجاهات العميل</a>`:''}</div>`)).join(''):'<div class="text-center py-8 text-gray-500">لا توجد طلبات معينة لك.</div>';};
    await load(); window.__driverTimer=setInterval(load,5000);
  }
  window.startDriverGps=startGps;
  window.driverSetStatus=async function(token,orderId,status){const r=await db.rpc('driver_update_status',{p_token:token,p_order_id:orderId,p_status:status});if(r.error)return toast(r.error.message);if(status==='delivered')stopGps();toast('تم تحديث حالة الطلب');await renderDriver(token)};

  const baseRouter=window.renderRouter;
  window.renderRouter=function(){
    const h=location.hash||'#menu';
    if(h.startsWith('#track/'))return renderTrack(tokenFromHash('track'));
    if(h.startsWith('#driver/'))return renderDriver(tokenFromHash('driver'));
    if(window.__trackTimer){clearInterval(window.__trackTimer);window.__trackTimer=null} if(window.__driverTimer){clearInterval(window.__driverTimer);window.__driverTimer=null} stopGps();
    return baseRouter();
  };

  const baseAdmin=window.renderAdmin;
  window.renderAdmin=async function(){
    await baseAdmin();
    if(!document.getElementById('deliverySection')){const main=document.querySelector('#app main');if(main){const wrap=document.createElement('section');wrap.id='deliverySection';wrap.className='mt-5';main.appendChild(wrap)}}
    await renderDeliveryAdmin();
  };

  window.addEventListener('hashchange',window.renderRouter);
  window.addEventListener('beforeunload',stopGps);
})();
