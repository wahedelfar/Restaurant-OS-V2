(function(){
  'use strict';
  if(window.__ROS_DELIVERY_FIXES_V5__) return;
  window.__ROS_DELIVERY_FIXES_V5__=true;

  const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}};
  const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  const base=()=>String((window.APP_CONFIG&&window.APP_CONFIG.publicAppUrl)||location.origin).replace(/\/$/,'');
  const trackUrl=t=>base()+'/#track/'+encodeURIComponent(t);

  async function ensureLeaflet(){
    if(window.L) return true;
    try{
      if(!document.querySelector('link[data-ros-leaflet]')){
        const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.dataset.rosLeaflet='1';document.head.appendChild(l);
      }
      await new Promise((resolve,reject)=>{
        const existing=document.querySelector('script[data-ros-leaflet]');
        if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
        const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.dataset.rosLeaflet='1';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
      });
      return !!window.L;
    }catch(e){console.warn('Leaflet load failed',e);return false;}
  }

  function stopDriverGps(){
    try{if(window.__ROS_DRIVER_WATCH_ID!=null&&navigator.geolocation)navigator.geolocation.clearWatch(window.__ROS_DRIVER_WATCH_ID)}catch(_){ }
    window.__ROS_DRIVER_WATCH_ID=null;
  }

  async function submitDineIn(){
    const table=typeof tableFromUrl==='function'?tableFromUrl():null;
    if(!table||!window.db||!window.store?.restaurant?.id)return false;
    if(!Array.isArray(window.cart)||!window.cart.length)return notify('السلة فارغة'),true;
    const tableRow=(window.store.tables||[]).find(t=>Number(t.table_number)===Number(table)&&t.active);
    const total=window.cart.reduce((a,b)=>a+(Number(b.price)||0)*(Number(b.qty)||0),0);
    const items=window.cart.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price}));
    const name=document.querySelector('#cust')?.value.trim()||'عميل';
    const btn=[...document.querySelectorAll('#modal button')].find(b=>b.textContent.includes('إرسال')||b.textContent.includes('تأكيد'));
    if(btn){btn.disabled=true;btn.textContent='جارٍ إرسال الطلب...'}
    try{
      const r=await db.from('orders').insert({
        restaurant_id:store.restaurant.id,
        table_id:tableRow?.id||null,
        table_number:Number(table),
        order_type:'dine_in',
        customer_name:name,
        customer_phone:null,
        address:null,
        payment_method:'cash',
        total,
        items,
        status:'new'
      }).select('id').single();
      if(r.error)throw r.error;
      window.cart=[];
      if(typeof updateCart==='function')updateCart();
      const modal=document.querySelector('#modal');
      if(modal)modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center"><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم إرسال طلبك للمطبخ</h2><p class="mt-2" style="color:var(--muted)">الطاولة رقم ${esc(table)} — تم تسجيل الطلب داخل النظام، ولا حاجة لإرسال WhatsApp.</p><button type="button" onclick="closeModal()" class="mt-5 w-full py-4 rounded-2xl text-white font-extrabold" style="background:var(--brand)">العودة للقائمة</button></div></div>`;
      return true;
    }catch(e){console.error('dine-in order',e);notify(e?.message||'تعذر إرسال الطلب للمطبخ');return true;}
    finally{if(btn){btn.disabled=false;btn.textContent='إرسال الطلب للمطبخ'}}
  }

  // Replace only the dine-in branch; delivery checkout remains untouched.
  const previousCheckout=window.checkout;
  window.checkout=function(){
    const table=typeof tableFromUrl==='function'?tableFromUrl():null;
    if(table)return submitDineIn();
    return typeof previousCheckout==='function'?previousCheckout():undefined;
  };

  async function loadTrackingV5(token){
    const app=document.querySelector('#app');if(!app)return;
    stopDriverGps();
    app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-6"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">ORDER TRACKING</div><h1 class="text-3xl font-extrabold">تتبع طلبك</h1></div><button type="button" onclick="location.hash='menu'" class="rounded-xl border px-4 py-2">القائمة</button></div><div id="rosTrackBox" class="mt-6">جارٍ تحميل الطلب...</div></div></div></main>`;
    const leaflet=await ensureLeaflet();
    let timer=null,map=null,marker=null;
    async function load(){
      const box=document.querySelector('#rosTrackBox');if(!box)return;
      const r=await db.rpc('public_track_order',{p_token:token});
      if(r.error){box.innerHTML=`<div class="p-5 rounded-2xl bg-red-500/10">${esc(r.error.message)}</div>`;return;}
      const x=r.data?.[0];
      if(!x){box.innerHTML='<div class="p-5 rounded-2xl bg-red-500/10">رابط التتبع غير صالح أو الطلب غير موجود.</div>';return;}
      const lat=x.driver_latitude ?? x.latitude ?? null;
      const lng=x.driver_longitude ?? x.longitude ?? null;
      const driverName=x.driver_name||'لم يتم تعيين مندوب بعد';
      const driverPhone=x.driver_phone||'';
      const hasGps=lat!=null&&lng!=null;
      box.innerHTML=`<div class="space-y-4"><div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="text-sm" style="color:var(--muted)">المطعم</div><div class="font-extrabold text-xl">${esc(x.restaurant_name||store?.restaurant?.name||'المطعم')}</div><div class="mt-3 text-sm" style="color:var(--muted)">العميل</div><div class="font-bold">${esc(x.customer_name||'عميل')}</div><div class="mt-3 text-sm" style="color:var(--muted)">الإجمالي</div><div class="font-extrabold text-xl">${money(x.total)}</div></div><div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="font-extrabold text-lg">المندوب</div><div class="mt-1 font-bold">${esc(driverName)}</div>${driverPhone?`<a href="tel:${esc(driverPhone)}" dir="ltr" class="inline-block mt-1 font-extrabold" style="color:var(--brand)">${esc(driverPhone)}</a>`:'<div class="mt-1 text-sm" style="color:var(--muted)">رقم الهاتف سيظهر بعد تعيين المندوب.</div>'}${hasGps?`<div class="mt-3 text-sm" style="color:var(--muted)">آخر موقع: ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}</div><div id="rosLiveMap" class="mt-4 rounded-2xl overflow-hidden" style="height:320px"></div><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(lat+','+lng)}" class="inline-block mt-3 px-4 py-2 rounded-xl border font-bold">فتح الموقع على Google Maps</a>`:'<div class="mt-3 text-sm" style="color:var(--muted)">سيظهر موقع المندوب هنا بعد تشغيل GPS.</div>'}</div><div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="font-extrabold">حالة الطلب</div><div class="mt-2 font-bold">${esc(x.status||'new')}</div></div></div>`;
      if(leaflet&&hasGps){
        const el=document.querySelector('#rosLiveMap');
        if(el&&!map){map=L.map(el).setView([+lat,+lng],15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);marker=L.marker([+lat,+lng]).addTo(map)}
        else if(marker){marker.setLatLng([+lat,+lng]);map.panTo([+lat,+lng])}
      }
      if(x.status==='delivered'||x.status==='cancelled'){if(timer)clearInterval(timer)}
    }
    await load();timer=setInterval(load,5000);
  }

  async function loadDriverV5(token){
    const app=document.querySelector('#app');if(!app)return;
    stopDriverGps();
    app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-6"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">DRIVER APP</div><h1 class="text-2xl font-extrabold">لوحة المندوب</h1></div><button type="button" onclick="location.hash='menu'" class="rounded-xl border px-4 py-2">خروج</button></div><div id="rosDriverBox" class="mt-6">جارٍ تحميل بيانات المندوب...</div></div></div></main>`;
    const leaflet=await ensureLeaflet();
    let map=null,marker=null,watchId=null,lastSent=0,currentOrder=null;
    async function load(){
      const box=document.querySelector('#rosDriverBox');if(!box)return;
      const r=await db.rpc('driver_get_orders',{p_token:token});
      if(r.error){box.innerHTML=`<div class="p-5 rounded-2xl bg-red-500/10">تعذر تحميل طلبات المندوب: ${esc(r.error.message)}</div>`;return;}
      const rows=r.data||[];
      currentOrder=rows.find(o=>['assigned','accepted','picked_up','out_for_delivery'].includes(o.delivery_status))||rows[0]||null;
      if(!currentOrder){box.innerHTML='<div class="p-5 rounded-2xl" style="background:var(--surface2)">لا توجد طلبات مسندة إليك حاليًا.</div>';return;}
      const lat=currentOrder.driver_latitude??null,lng=currentOrder.driver_longitude??null;
      box.innerHTML=`<div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="font-extrabold text-lg">الطلب المسند</div><div class="mt-2 font-bold">العميل: ${esc(currentOrder.customer_name||'—')}</div><div class="mt-1">الهاتف: ${esc(currentOrder.customer_phone||'—')}</div><div class="mt-1">العنوان: ${esc(currentOrder.address||'—')}</div><div class="mt-1 font-extrabold">${money(currentOrder.total)}</div><div class="mt-2 text-sm" style="color:var(--muted)">الحالة: ${esc(currentOrder.delivery_status||currentOrder.status||'—')}</div></div><div class="grid grid-cols-2 gap-2 mt-4">${['accepted','picked_up','out_for_delivery','delivered'].map(s=>`<button type="button" data-driver-status="${s}" class="py-3 rounded-xl border font-extrabold">${({accepted:'قبول',picked_up:'استلام',out_for_delivery:'خرج للتوصيل',delivered:'تم التسليم'})[s]}</button>`).join('')}</div><button type="button" id="rosStartGps" class="mt-3 w-full py-4 rounded-2xl text-white font-extrabold" style="background:var(--brand)">تشغيل GPS وتتبع موقعي</button><div id="rosGpsState" class="mt-2 text-sm" style="color:var(--muted)">${lat!=null?'آخر موقع مسجل: '+Number(lat).toFixed(6)+', '+Number(lng).toFixed(6):'لم يتم إرسال موقع بعد'}</div><div id="rosDriverMap" class="mt-4 rounded-2xl overflow-hidden" style="height:300px;${lat==null?'display:none':''}"></div>`;
      if(leaflet&&lat!=null&&lng!=null){const el=document.querySelector('#rosDriverMap');map=L.map(el).setView([+lat,+lng],15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);marker=L.marker([+lat,+lng]).addTo(map)}
      document.querySelectorAll('[data-driver-status]').forEach(b=>b.onclick=async()=>{
        b.disabled=true;try{const rr=await db.rpc('driver_update_status',{p_token:token,p_order_id:currentOrder.id,p_status:b.dataset.driverStatus});if(rr.error)throw rr.error;notify('تم تحديث حالة الطلب');await load()}catch(e){notify(e?.message||'تعذر تحديث الحالة')}finally{b.disabled=false}
      });
      document.querySelector('#rosStartGps')?.addEventListener('click',startGps,{once:true});
    }
    async function startGps(){
      const state=document.querySelector('#rosGpsState');
      if(!navigator.geolocation)return notify('المتصفح لا يدعم تحديد الموقع');
      if(!window.isSecureContext)return notify('GPS يحتاج HTTPS');
      if(!currentOrder)return notify('لا يوجد طلب مسند للمندوب');
      state.textContent='جارٍ تشغيل GPS... اسمح بالوصول إلى الموقع عند ظهور الطلب.';
      try{const p=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:20000,maximumAge:0}));await sendPos(p);state.textContent='GPS يعمل — يتم إرسال الموقع تلقائيًا.'}catch(e){state.textContent='تعذر تشغيل GPS: '+(e.message||'تم رفض الإذن');return}
      watchId=navigator.geolocation.watchPosition(sendPos,e=>{state.textContent='GPS يعمل لكن تعذر تحديث الموقع: '+(e.message||'');},{enableHighAccuracy:true,timeout:20000,maximumAge:5000});
      window.__ROS_DRIVER_WATCH_ID=watchId;
    }
    async function sendPos(p){
      if(!currentOrder)return;
      const now=Date.now();if(now-lastSent<4000)return;lastSent=now;
      const lat=p.coords.latitude,lng=p.coords.longitude,acc=p.coords.accuracy;
      const r=await db.rpc('driver_update_location',{p_token:token,p_order_id:currentOrder.id,p_latitude:lat,p_longitude:lng,p_accuracy:acc});
      if(r.error){console.error('driver gps',r.error);const s=document.querySelector('#rosGpsState');if(s)s.textContent='تعذر حفظ موقع GPS: '+r.error.message;return;}
      const s=document.querySelector('#rosGpsState');if(s)s.textContent='آخر موقع مرسل الآن: '+lat.toFixed(6)+', '+lng.toFixed(6)+' • دقة '+Math.round(acc||0)+'م';
      const el=document.querySelector('#rosDriverMap');if(leaflet&&el){el.style.display='block';if(!map){map=L.map(el).setView([lat,lng],15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);marker=L.marker([lat,lng]).addTo(map)}else if(marker){marker.setLatLng([lat,lng]);map.panTo([lat,lng])}}
    }
    await load();
  }

  function special(){
    const h=location.hash||'';
    if(h.startsWith('#track/')){loadTrackingV5(decodeURIComponent(h.slice(7)));return true;}
    if(h.startsWith('#driver/')){loadDriverV5(decodeURIComponent(h.slice(8)));return true;}
    return false;
  }
  window.addEventListener('hashchange',()=>setTimeout(special,0));
  window.addEventListener('load',()=>setTimeout(special,1200));
  setTimeout(special,0);
})();