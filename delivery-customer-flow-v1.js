(function(){
  'use strict';
  if(window.__ROS_CUSTOMER_FLOW_V1__) return;
  window.__ROS_CUSTOMER_FLOW_V1__=true;

  const escHtml=v=>{try{return esc(String(v??''));}catch(_){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}};

  async function uploadDriverPhoto(file){
    if(!file) return null;
    if(!window.db?.storage) throw new Error('خدمة رفع الصور غير متاحة');
    if(file.size>5*1024*1024) throw new Error('صورة المندوب يجب ألا تتجاوز 5MB');
    if(!String(file.type||'').startsWith('image/')) throw new Error('اختر ملف صورة صالح');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${window.store?.restaurant?.id||'restaurant'}/${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from('driver-images').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
    if(up.error) throw up.error;
    const pub=db.storage.from('driver-images').getPublicUrl(path);
    return pub?.data?.publicUrl||null;
  }

  function ensureDriverPhotoInput(){
    const panel=document.querySelector('#deliveryPanel');
    if(!panel||panel.querySelector('#newDriverPhoto')) return;
    const name=panel.querySelector('#newDriverName');
    const phone=panel.querySelector('#newDriverPhone');
    if(!name||!phone) return;
    const input=document.createElement('input');
    input.id='newDriverPhoto';
    input.type='file';
    input.accept='image/*';
    input.className='border rounded-2xl p-3';
    input.title='صورة المندوب اختيارية';
    const hint=document.createElement('div');
    hint.className='text-xs mt-1';
    hint.style.color='var(--muted)';
    hint.textContent='صورة المندوب اختيارية — حتى 5MB';
    const wrap=document.createElement('div');
    wrap.append(input,hint);
    phone.parentNode.insertBefore(wrap,phone.nextSibling);
    const grid=name.parentNode;
    if(grid?.classList?.contains('md:grid-cols-3')) grid.classList.remove('md:grid-cols-3'),grid.classList.add('md:grid-cols-4');
  }

  function wrapAddDriver(){
    if(typeof window.addDriver!=='function'||window.__ROS_ADD_DRIVER_PHOTO__) return;
    window.__ROS_ADD_DRIVER_PHOTO__=true;
    const original=window.addDriver;
    window.addDriver=async function(){
      const name=document.querySelector('#newDriverName')?.value.trim()||'';
      const phone=document.querySelector('#newDriverPhone')?.value.trim()||null;
      const file=document.querySelector('#newDriverPhoto')?.files?.[0]||null;
      if(!name){try{toast('اكتب اسم المندوب')}catch(_){alert('اكتب اسم المندوب')}return;}
      const button=document.querySelector('#deliveryPanel button[onclick*="addDriver"]');
      if(button){button.disabled=true;button.dataset.oldText=button.textContent;button.textContent='جارٍ الإضافة...';}
      try{
        let photo_url=null;
        if(file) photo_url=await uploadDriverPhoto(file);
        const r=await db.from('drivers').insert({restaurant_id:store.restaurant.id,name,phone,photo_url,active:true}).select('id,name,phone,photo_url,access_token').single();
        if(r.error) throw r.error;
        try{toast('تمت إضافة المندوب'+(photo_url?' مع الصورة':' بنجاح'));}catch(_){alert('تمت إضافة المندوب');}
        if(typeof refreshDeliveryPanel==='function') await refreshDeliveryPanel();
      }catch(e){
        console.error('driver photo add',e);
        try{toast(e?.message||'تعذر إضافة المندوب')}catch(_){alert(e?.message||'تعذر إضافة المندوب');}
      }finally{
        if(button){button.disabled=false;button.textContent=button.dataset.oldText||'إضافة مندوب';}
      }
    };
  }

  async function renderCustomerTracking(token){
    const app=document.querySelector('#app');
    if(!app||!window.db) return;
    app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-2xl mx-auto pt-8"><div class="lux-card rounded-3xl p-6"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">ORDER TRACKING</div><h1 class="text-3xl font-extrabold">تتبع طلبك</h1></div><button onclick="location.hash='menu'" class="rounded-xl border px-4 py-2">القائمة</button></div><div id="trackBox" class="mt-6">جارٍ تحميل الطلب...</div></div></div></main>`;
    let timer=null;
    let realtime=null;
    async function load(){
      const r=await db.rpc('public_track_order',{p_token:token});
      const box=document.querySelector('#trackBox');
      if(!box)return;
      if(r.error||!r.data?.length){box.innerHTML='<div class="p-5 rounded-2xl bg-red-500/10">رابط التتبع غير صالح أو الطلب غير موجود.</div>';if(timer)clearInterval(timer);return;}
      const x=r.data[0];
      if(x.order_type!=='delivery') return;
      const status=String(x.status||'new');
      if(!['assigned','accepted','picked_up','out_for_delivery','delivered'].includes(status)){
        box.innerHTML=`<div class="rounded-3xl p-6 text-center" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--brand) 24%,transparent)"><div class="text-5xl mb-3">✓</div><div class="text-xl font-extrabold">تم استلام طلبك</div><div class="mt-2 text-sm" style="color:var(--muted)">جاري تجهيز طلبك، وسيظهر لك المندوب فور تعيينه من الإدارة.</div></div>`;
        return;
      }
      let profile=null;
      const pr=await db.rpc('public_driver_profile',{p_token:token});
      if(!pr.error&&pr.data?.length) profile=pr.data[0];
      const name=profile?.driver_name||x.driver_name||'مندوب التوصيل';
      const phone=profile?.driver_phone||x.driver_phone||'';
      const photo=profile?.driver_photo_url||'';
      const initial=escHtml((name||'م').trim().charAt(0)||'م');
      const avatar=photo?`<img src="${escHtml(photo)}" alt="${escHtml(name)}" class="w-full h-full object-cover">`:`<div class="w-full h-full grid place-items-center text-3xl font-black" style="background:linear-gradient(145deg,var(--surface2),var(--surface));color:var(--brand)">${initial}</div>`;
      const gps=x.latitude!=null&&x.longitude!=null;
      const state={assigned:'تم تعيين المندوب',accepted:'المندوب قبل الطلب',picked_up:'المندوب استلم الطلب',out_for_delivery:'الطلب في الطريق إليك',delivered:'تم تسليم الطلب'}[status]||'تم تعيين المندوب';
      box.innerHTML=`<div class="space-y-4"><div class="rounded-3xl p-5" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--brand) 24%,transparent)"><div class="text-sm" style="color:var(--muted)">حالة الطلب</div><div class="text-2xl font-extrabold mt-1">${state}</div></div><div class="rounded-3xl p-5" style="background:var(--surface2)"><div class="flex items-center gap-4"><div class="w-20 h-20 rounded-2xl overflow-hidden border" style="border-color:color-mix(in srgb,var(--brand) 35%,transparent)">${avatar}</div><div class="min-w-0"><div class="text-sm" style="color:var(--muted)">مندوب التوصيل</div><div class="text-xl font-extrabold truncate">${escHtml(name)}</div>${phone?`<a href="tel:${escHtml(phone)}" class="inline-block mt-2 rounded-xl border px-3 py-2 font-bold">اتصال بالمندوب</a>`:''}</div></div>${gps?`<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${x.latitude},${x.longitude}" class="block mt-4 rounded-xl border p-3 text-center font-bold">عرض موقع المندوب على الخريطة</a>`:''}</div>${status==='delivered'?'<div class="text-center font-extrabold p-4">تم تسليم طلبك بنجاح</div>':'<div class="text-center text-sm" style="color:var(--muted)">تتحدث حالة التوصيل تلقائيًا من صفحة المندوب.</div>'}</div>`;
      if(status==='delivered'||status==='cancelled'){if(timer)clearInterval(timer);}
    }
    load();
    timer=setInterval(load,5000);
    try{
      if(window.db?.channel){
        realtime=window.db.channel('ros-customer-track-'+String(token))
          .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:'tracking_token=eq.'+token},()=>load())
          .on('postgres_changes',{event:'UPDATE',schema:'public',table:'delivery_orders'},()=>load())
          .on('postgres_changes',{event:'INSERT',schema:'public',table:'driver_locations',filter:'order_id=eq.'+token},()=>load())
          .subscribe();
      }
    }catch(e){console.warn('customer realtime unavailable',e)}
    const stopRealtime=()=>{
      if(realtime&&window.db?.removeChannel){try{window.db.removeChannel(realtime)}catch(_){}}
      realtime=null;
    };
    window.addEventListener('hashchange',function cleanupCustomerRealtime(){
      if(!location.hash.startsWith('#track/')){
        if(timer)clearInterval(timer);
        stopRealtime();
        window.removeEventListener('hashchange',cleanupCustomerRealtime);
      }
    },{once:true});
  }

  function handleRoute(){
    const hash=location.hash||'';
    if(!hash.startsWith('#track/')) return;
    const token=decodeURIComponent(hash.slice(7));
    if(!token)return;
    setTimeout(()=>renderCustomerTracking(token).catch(console.error),0);
  }

  const observer=new MutationObserver(()=>{ensureDriverPhotoInput();wrapAddDriver();});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{ensureDriverPhotoInput();wrapAddDriver();},250);
  window.addEventListener('hashchange',handleRoute,false);
  setTimeout(handleRoute,350);
})();
