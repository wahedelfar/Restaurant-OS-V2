(function(){
  'use strict';
  if(window.__ROS_DELIVERY_V7_FEATURES__) return;
  window.__ROS_DELIVERY_V7_FEATURES__=true;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const ready=()=>!!(window.db&&window.store?.restaurant?.id);
  const esc=v=>typeof window.esc==='function'?window.esc(v??''):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  const toast=m=>{try{window.toast?window.toast(m):console.log(m)}catch(_){} };
  const PREP=[5,15,30,45,60];
  let adminStarted=false,adminTimer=null,adminChannel=null,trackTimer=null,trackChannel=null,notifyEnabled=false;
  const STATUS={new:{label:'تم استلام الطلب',message:'تم استلام طلب حضرتك'},preparing:{label:'جاري التجهيز',message:'جاري تجهيز طلب حضرتك'},ready:{label:'طلبك جاهز',message:'تم التجهيز — طلبك جاهز'},delivered:{label:'شكرًا لاختيارنا',message:'شكرًا لاختيارنا'}};
  const statusInfo=s=>STATUS[s]||STATUS.new;

  async function enableNotifications(){
    if(!('Notification' in window)){toast('المتصفح لا يدعم إشعارات النظام');return false}
    try{const p=await Notification.requestPermission();notifyEnabled=p==='granted';toast(notifyEnabled?'تم تفعيل تنبيهات الطلب':'لم يتم السماح بالتنبيهات من المتصفح');return notifyEnabled}catch(e){console.warn(e);toast('تعذر تفعيل التنبيهات');return false}
  }

  async function sendNotification(title,body){
    if(!notifyEnabled&&(!('Notification'in window)||Notification.permission!=='granted'))return;
    notifyEnabled=true;
    try{
      if(navigator.serviceWorker?.ready){
        const reg=await navigator.serviceWorker.ready;
        if(reg?.showNotification){await reg.showNotification(title,{body,tag:'ros-order-status',renotify:true,icon:'favicon-192.png',badge:'favicon-192.png',dir:'rtl',lang:'ar',data:{url:location.href}});return}
      }
    }catch(e){console.warn('SW notification',e)}
    try{new Notification(title,{body,tag:'ros-order-status',renotify:true})}catch(e){console.warn('Notification',e)}
  }

  function itemsText(o){
    let a=o?.items;try{if(typeof a==='string')a=JSON.parse(a)}catch(_){a=[]}
    return Array.isArray(a)?a.map(x=>`${esc(x.name||x.product_name||'منتج')} × ${Number(x.quantity||x.qty||1)}`).join(' • '):'—';
  }

  async function adminQuery(){
    if(!ready())return[];
    const r=await db.from('orders').select('*').eq('restaurant_id',store.restaurant.id).order('created_at',{ascending:false}).limit(100);
    if(!r.error)store.orders=r.data||[];else console.warn('Dine-in admin query',r.error);
    return r.data||[];
  }

  async function updateOrder(id,patch){
    if(!ready())return false;
    const r=await db.from('orders').update(patch).eq('id',id).eq('restaurant_id',store.restaurant.id).select('id').maybeSingle();
    if(r.error){toast('تعذر تحديث الطلب: '+r.error.message);console.error(r.error);return false}
    return true;
  }

  function findAdminHost(){return document.querySelector('#deliveryControlPanel')||document.querySelector('#app main')||document.querySelector('#app')}

  function renderAdmin(){
    if(!ready()||!location.hash.startsWith('#admin'))return;
    const host=findAdminHost();if(!host)return;
    let box=document.querySelector('#rosPrepPanel');
    if(!box){box=document.createElement('section');box.id='rosPrepPanel';box.className='lux-card rounded-3xl p-5 mt-6';host.appendChild(box)}
    const rows=(store.orders||[]).filter(o=>o.order_type==='dine_in').slice(0,30);
    box.innerHTML=`
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><div class="eyebrow">إدارة طلبات الصالة</div><h3 class="text-2xl font-extrabold">متابعة طلبات الصالة</h3><p class="text-sm mt-1" style="color:var(--muted)">تحكم في وقت التجهيز وحالة كل طلب وأرسل التحديث للعميل فورًا.</p></div>
      </div>
      <div class="mt-5 grid gap-4">
        ${rows.length?rows.map(o=>{const currentPrep=Number(o.prep_minutes||0),current=statusInfo(o.status);return `<article class="rounded-3xl p-4 border" style="background:var(--surface2)">
          <div class="flex flex-col sm:flex-row justify-between gap-3"><div><div class="font-extrabold text-lg">الطاولة ${esc(o.table_number||'—')}</div><div class="text-sm mt-1" style="color:var(--muted)">${esc(o.customer_name||'عميل')} • ${itemsText(o)}</div></div><div class="font-extrabold">${money(o.total)}</div></div>
          <div class="mt-5"><div class="font-extrabold mb-3">وقت التجهيز</div><div class="grid grid-cols-2 sm:grid-cols-5 gap-2">${PREP.map(n=>`<button type="button" data-prep="${esc(o.id)}" data-min="${n}" class="ros-prep-btn rounded-2xl border px-3 py-3 font-extrabold transition ${currentPrep===n?'ring-2':''}" style="${currentPrep===n?'background:var(--brand);color:#111;border-color:var(--brand)':''}">${n} دقيقة</button>`).join('')}</div></div>
          <div class="mt-5"><div class="font-extrabold mb-3">حالة الطلب</div><div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button type="button" data-st="${esc(o.id)}" data-v="preparing" data-m="جاري تجهيز طلب حضرتك" class="ros-status-btn rounded-2xl border px-3 py-4 font-extrabold ${o.status==='preparing'?'ring-2':''}" style="${o.status==='preparing'?'background:var(--brand);color:#111;border-color:var(--brand)':''}">جاري التجهيز</button>
            <button type="button" data-st="${esc(o.id)}" data-v="ready" data-m="تم التجهيز — طلبك جاهز" class="ros-status-btn rounded-2xl border px-3 py-4 font-extrabold ${o.status==='ready'?'ring-2':''}" style="${o.status==='ready'?'background:var(--brand);color:#111;border-color:var(--brand)':''}">تم التجهيز / طلبك جاهز</button>
            <button type="button" data-st="${esc(o.id)}" data-v="delivered" data-m="شكرًا لاختيارنا" class="ros-status-btn rounded-2xl border px-3 py-4 font-extrabold ${o.status==='delivered'?'ring-2':''}" style="${o.status==='delivered'?'background:var(--brand);color:#111;border-color:var(--brand)':''}">شكرًا لاختيارنا</button>
          </div></div>
          <div class="mt-4 rounded-2xl p-4" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">الحالة المعروضة للعميل</div><div class="font-extrabold mt-1">${esc(o.admin_message||current.message)}</div>${currentPrep?`<div class="text-sm mt-1" style="color:var(--muted)">وقت التجهيز المحدد: ${currentPrep} دقيقة</div>`:''}</div>
        </article>`}).join(''):'<div class="py-10 text-center" style="color:var(--muted)">لا توجد طلبات داخلية حاليًا.</div>'}
      </div>`;
    box.querySelectorAll('[data-prep]').forEach(btn=>btn.addEventListener('click',async()=>{if(btn.disabled)return;btn.disabled=true;const ok=await updateOrder(btn.dataset.prep,{prep_minutes:Number(btn.dataset.min)});if(ok){await adminQuery();renderAdmin();toast('تم حفظ وقت التجهيز')}btn.disabled=false}));
    box.querySelectorAll('[data-st]').forEach(btn=>btn.addEventListener('click',async()=>{if(btn.disabled)return;btn.disabled=true;const ok=await updateOrder(btn.dataset.st,{status:btn.dataset.v,admin_message:btn.dataset.m});if(ok){await adminQuery();renderAdmin();toast('تم تحديث حالة الطلب')}btn.disabled=false}));
  }

  async function startAdmin(){
    if(adminStarted||!ready()||!location.hash.startsWith('#admin'))return;
    adminStarted=true;await adminQuery();renderAdmin();
    try{adminChannel=db.channel('ros-dine-admin-'+store.restaurant.id).on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:`restaurant_id=eq.${store.restaurant.id}`},()=>adminQuery().then(renderAdmin)).subscribe()}catch(e){console.warn('Admin realtime',e)}
    clearInterval(adminTimer);adminTimer=setInterval(async()=>{if(location.hash.startsWith('#admin')){await adminQuery();renderAdmin()}},5000);
  }

  function customerStatusCards(x){
    const rank={new:0,preparing:1,ready:2,delivered:3}[x.status||'new']??0;
    const steps=[{icon:'✓',label:'تم استلام الطلب'},{icon:'◌',label:'جاري التجهيز'},{icon:'✓',label:'طلبك جاهز'},{icon:'★',label:'شكرًا لاختيارنا'}];
    return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">${steps.map((s,i)=>`<div class="rounded-2xl p-4 border ${i===rank?'ring-2':''}" style="background:${i<=rank?'color-mix(in srgb,var(--brand) 14%,var(--surface2))':'var(--surface2)'};border-color:${i===rank?'var(--brand)':'color-mix(in srgb,var(--text) 9%,transparent)'}"><div class="w-10 h-10 rounded-full grid place-items-center font-extrabold mb-3" style="background:${i<=rank?'var(--brand)':'var(--surface)'};color:${i<=rank?'#111':'var(--muted)'}">${s.icon}</div><div class="font-extrabold text-sm">${s.label}</div></div>`).join('')}</div>`;
  }

  function renderTrackShell(){
    const app=document.querySelector('#app');if(!app)return null;
    app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-4 pb-10"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">حالة الطلب</div><h1 class="text-3xl font-extrabold">تتبع طلبك</h1></div><button type="button" id="rosBackMenu" class="rounded-xl border px-4 py-2 font-bold">القائمة</button></div><div id="rosTrackLive" class="mt-6">جارٍ تحميل حالة الطلب...</div></div></div></main>`;
    document.querySelector('#rosBackMenu')?.addEventListener('click',()=>{location.hash='menu'});
    return document.querySelector('#rosTrackLive');
  }

  async function renderTrack(token){
    if(!ready())return;
    const host=renderTrackShell();if(!host)return;
    let lastNoticeKey=null;
    const load=async(silent)=>{
      const r=await db.rpc('public_track_order',{p_token:token});
      if(r.error){host.innerHTML=`<div class="p-5 rounded-2xl bg-red-500/10">تعذر تحميل حالة الطلب.<div class="text-sm mt-2" style="color:var(--muted)">${esc(r.error.message)}</div></div>`;return}
      const x=r.data?.[0];if(!x){host.innerHTML='<div class="p-5 rounded-2xl bg-red-500/10">رابط متابعة الطلب غير صالح أو انتهت صلاحيته.</div>';return}
      const info=statusInfo(x.status),mins=Number(x.prep_minutes||0),noticeKey=`${x.status}|${x.admin_message||''}|${mins}`;
      if(!silent&&lastNoticeKey&&noticeKey!==lastNoticeKey)await sendNotification('تحديث طلبك',x.admin_message||info.message);
      lastNoticeKey=noticeKey;
      host.innerHTML=`<div class="rounded-3xl p-5" style="background:var(--surface2)">
        <div class="flex flex-col sm:flex-row justify-between gap-4"><div><div class="text-sm" style="color:var(--muted)">الطاولة</div><div class="text-3xl font-extrabold mt-1">${esc(x.table_number||'—')}</div></div><div class="text-right"><div class="text-sm" style="color:var(--muted)">الإجمالي</div><div class="text-2xl font-extrabold mt-1">${money(x.total)}</div></div></div>
        <div class="mt-6">${customerStatusCards(x)}</div>
        <div class="mt-5 rounded-3xl p-5 border" style="background:var(--surface);border-color:color-mix(in srgb,var(--brand) 24%,transparent)"><div class="text-sm font-bold" style="color:var(--muted)">حالة طلبك الآن</div><div class="text-2xl sm:text-3xl font-extrabold mt-2">${esc(x.admin_message||info.message)}</div>${x.status==='preparing'&&mins?`<div class="mt-4 rounded-2xl p-4" style="background:color-mix(in srgb,var(--brand) 10%,var(--surface2))"><div class="font-bold">وقت التجهيز</div><div class="text-3xl font-extrabold mt-1">أمامك ${mins} دقيقة</div></div>`:''}</div>
        <div class="mt-5 rounded-2xl p-4" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">العميل</div><div class="font-extrabold mt-1">${esc(x.customer_name||'عميل')}</div></div>
        <button type="button" id="rosCustomerNotify" class="mt-5 w-full py-4 rounded-2xl border font-extrabold" style="background:var(--brand);color:#111;border-color:var(--brand)">${notifyEnabled?'التنبيهات مفعّلة':'تفعيل تنبيهات حالة الطلب'}</button>
        <div class="text-xs text-center mt-2" style="color:var(--muted)">ستصلك رسالة تنبيه عند تغيير حالة الطلب.</div>
      </div>`;
      document.querySelector('#rosCustomerNotify')?.addEventListener('click',async()=>{const ok=await enableNotifications();if(ok){notifyEnabled=true;await sendNotification('تنبيهات طلبك','تم تفعيل التنبيهات بنجاح');load(true)}});
    };
    await load(false);clearInterval(trackTimer);trackTimer=setInterval(()=>load(true),3000);
    try{if(trackChannel)db.removeChannel(trackChannel);trackChannel=db.channel('ros-customer-order-'+token).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},p=>{if(p.new?.tracking_token===token)load(false)}).subscribe()}catch(e){console.warn('Customer realtime',e)}
  }

  async function submitDine(){
    const table=typeof tableFromUrl==='function'?tableFromUrl():null;if(!table||!ready())return false;if(!Array.isArray(window.cart)||!cart.length){toast('السلة فارغة');return true}
    const row=(store.tables||[]).find(t=>Number(t.table_number)===Number(table)&&t.active),total=cart.reduce((a,b)=>a+(Number(b.price)||0)*(Number(b.qty)||0),0),items=cart.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price})),token=crypto.randomUUID(),name=document.querySelector('#cust')?.value.trim()||'عميل';
    const r=await db.from('orders').insert({restaurant_id:store.restaurant.id,table_id:row?.id||null,table_number:Number(table),order_type:'dine_in',customer_name:name,customer_phone:null,address:null,payment_method:'cash',total,items,status:'new',tracking_token:token,prep_minutes:null,admin_message:'تم استلام طلب حضرتك'}).select('id').single();
    if(r.error){toast('تعذر إرسال الطلب: '+r.error.message);console.error(r.error);return true}
    cart=[];if(typeof updateCart==='function')updateCart();const modal=document.querySelector('#modal');if(!modal)return true;
    modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center"><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم إرسال طلبك للمطبخ</h2><p class="mt-2" style="color:var(--muted)">الطاولة رقم ${esc(table)}</p><div class="mt-4 rounded-2xl p-4 font-bold" style="background:var(--surface2)">أهلاً بحضرتك في مطعمنا — طلبك وصل للمطبخ.</div><button id="rosTrackOrderBtn" class="mt-5 w-full py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">حالة طلبك</button><button id="rosBackAfterOrder" class="mt-3 w-full py-3 rounded-2xl border font-bold">العودة للقائمة</button></div></div>`;
    document.querySelector('#rosTrackOrderBtn')?.addEventListener('click',()=>{location.hash='track/'+token});document.querySelector('#rosBackAfterOrder')?.addEventListener('click',()=>{if(typeof closeModal==='function')closeModal();else modal.innerHTML=''});return true;
  }

  const oldCheckout=window.checkout;
  window.checkout=function(){return typeof tableFromUrl==='function'&&tableFromUrl()?submitDine():(typeof oldCheckout==='function'?oldCheckout():undefined)};

  function cleanup(){
    if(!location.hash.startsWith('#track/')){clearInterval(trackTimer);trackTimer=null;try{if(trackChannel){db?.removeChannel(trackChannel);trackChannel=null}}catch(_){} }
    if(!location.hash.startsWith('#admin')){clearInterval(adminTimer);adminTimer=null;try{if(adminChannel){db?.removeChannel(adminChannel);adminChannel=null}}catch(_){}adminStarted=false}
  }

  function route(){cleanup();if(!ready())return;if(location.hash.startsWith('#admin'))startAdmin();if(location.hash.startsWith('#track/'))renderTrack(decodeURIComponent(location.hash.slice(7)))}
  window.addEventListener('hashchange',route);
  (async()=>{for(let i=0;i<100&&!ready();i++)await sleep(100);route()})();
})();