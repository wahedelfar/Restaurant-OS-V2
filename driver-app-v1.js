(function(){
  'use strict';
  if(window.__ROS_DRIVER_APP_V1__) return;
  window.__ROS_DRIVER_APP_V1__=true;

  const KEY='ros_driver_access_token_v1';
  const BASE=String((window.APP_CONFIG&&window.APP_CONFIG.publicAppUrl)||location.origin).replace(/\/$/,'');
  const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}};
  const statusLabel=s=>({new:'جديد',confirmed:'تم التأكيد',preparing:'قيد التحضير',ready:'جاهز',assigned:'تم التعيين',accepted:'تم القبول',picked_up:'تم الاستلام',out_for_delivery:'خرج للتوصيل',delivered:'تم التسليم',cancelled:'ملغي'})[s]||s||'—';
  const orderId=x=>String(x?.delivery_order_id||x?.id||x?.order_id||'');
  const tokenFromHash=()=>{const m=String(location.hash||'').match(/^#driver\/(.+)$/);return m?decodeURIComponent(m[1]):''};
  const driverUrl=t=>BASE+'/#driver/'+encodeURIComponent(t);

  function installDriverManifest(){
    let link=document.querySelector('link[rel="manifest"]');
    if(!link)return;
    link.href=BASE+'/driver-manifest.json?v=1';
  }
  function saveToken(token){try{localStorage.setItem(KEY,token)}catch(_){} installDriverManifest();}
  function savedToken(){try{return localStorage.getItem(KEY)||''}catch(_){return ''}}

  async function rpcOrders(token){
    if(!window.db)return {error:new Error('قاعدة البيانات غير متاحة'),data:[]};
    return await db.rpc('driver_get_orders',{p_access_token:token});
  }
  async function updateStatus(token,id,status){
    return await db.rpc('driver_update_status',{p_access_token:token,p_delivery_order_id:id,p_status:status});
  }

  function installButton(){
    const btn=document.querySelector('[data-driver-install]');
    if(!btn||btn.__bound)return;
    btn.__bound=true;
    const can=()=>window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches;
    let deferred=window.__rosDriverInstallPrompt||null;
    btn.onclick=async()=>{
      if(can())return notify('التطبيق مثبت بالفعل على الجهاز');
      if(deferred){deferred.prompt();try{await deferred.userChoice}catch(_){}deferred=null;window.__rosDriverInstallPrompt=null;return}
      notify('من قائمة المتصفح اختر "إضافة إلى الشاشة الرئيسية" أو "تثبيت التطبيق".');
    };
  }
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();window.__rosDriverInstallPrompt=e;setTimeout(installButton,50)});

  let state={token:'',driverId:'',orders:[],seen:new Set(),initialised:false,timer:0,channel:null};

  function render(app,orders){
    const active=orders.filter(x=>!['delivered','cancelled'].includes(String(x.status)));
    const done=orders.filter(x=>['delivered','cancelled'].includes(String(x.status)));
    const driverName=orders[0]?.driver_name||orders[0]?.name||'المندوب';
    app.innerHTML=`<main class="min-h-screen luxury-page p-4" dir="rtl"><div class="max-w-3xl mx-auto pt-4 pb-10"><div class="lux-card rounded-3xl p-5"><div class="flex flex-wrap justify-between items-center gap-3"><div><div class="eyebrow">DRIVER APP</div><h1 class="text-2xl font-extrabold">${esc(window.store?.restaurant?.name||'ذا بيتزا برجر كافيه')}</h1><div class="text-sm mt-1" style="color:var(--muted)">لوحة المندوب • ${esc(driverName)}</div></div><div class="flex gap-2"><button data-driver-install type="button" class="rounded-xl border px-4 py-2 font-bold">تثبيت التطبيق</button><button data-driver-notify type="button" class="rounded-xl border px-4 py-2 font-bold">تفعيل التنبيهات</button></div></div><div class="mt-5 grid grid-cols-3 gap-2"><div class="rounded-2xl p-3 text-center" style="background:var(--surface2)"><div class="text-xs" style="color:var(--muted)">الحالية</div><div class="text-2xl font-extrabold">${active.length}</div></div><div class="rounded-2xl p-3 text-center" style="background:var(--surface2)"><div class="text-xs" style="color:var(--muted)">المكتملة</div><div class="text-2xl font-extrabold">${done.length}</div></div><div class="rounded-2xl p-3 text-center" style="background:var(--surface2)"><div class="text-xs" style="color:var(--muted)">الاتصال</div><div class="text-sm font-extrabold mt-2" style="color:#4ade80">متصل</div></div></div><div id="rosDriverBox" class="mt-5 space-y-4">${active.length?active.map(card).join(''):empty()}</div>${done.length?`<div class="mt-6"><h2 class="font-extrabold text-lg mb-3">سجل التوصيلات</h2><div class="space-y-3">${done.map(card).join('')}</div></div>`:''}<div class="mt-5 text-center text-xs" style="color:var(--muted)">يتم تحديث الطلبات تلقائيًا كل 3 ثوانٍ.</div></div></div></main>`;
    installButton();
    const nb=document.querySelector('[data-driver-notify]');
    if(nb&&!nb.__bound){nb.__bound=true;nb.onclick=async()=>{if(!('Notification'in window))return notify('المتصفح لا يدعم تنبيهات النظام');const p=await Notification.requestPermission();notify(p==='granted'?'تم تفعيل التنبيهات ✓':p==='denied'?'التنبيهات مرفوضة من إعدادات المتصفح':'لم يتم تفعيل التنبيهات')};}
    app.querySelectorAll('[data-driver-status]').forEach(b=>{b.onclick=async()=>{const id=b.dataset.id,status=b.dataset.driverStatus;b.disabled=true;try{const r=await updateStatus(state.token,id,status);if(r.error)throw r.error;await refresh(false)}catch(e){b.disabled=false;notify(e?.message||'تعذر تحديث حالة الطلب')}}});
  }
  function empty(){return `<div class="rounded-2xl p-5 text-center" style="background:var(--surface2)"><div class="text-3xl mb-2">✓</div><div class="font-extrabold">لا توجد توصيلات حالية</div><div class="text-sm mt-1" style="color:var(--muted)">عند تعيين طلب جديد لك سيظهر هنا تلقائيًا.</div></div>`}
  function card(x){
    const id=orderId(x),s=String(x.status||'assigned');
    const buttons=s==='assigned'?`<button data-driver-status="accepted" data-id="${esc(id)}" class="w-full py-3 rounded-xl font-extrabold text-white" style="background:var(--brand);color:#111">تم القبول</button>`:s==='accepted'?`<button data-driver-status="picked_up" data-id="${esc(id)}" class="w-full py-3 rounded-xl font-extrabold border">تم الاستلام</button>`:s==='picked_up'?`<button data-driver-status="out_for_delivery" data-id="${esc(id)}" class="w-full py-3 rounded-xl font-extrabold border">خرج للتوصيل</button>`:s==='out_for_delivery'?`<button data-driver-status="delivered" data-id="${esc(id)}" class="w-full py-3 rounded-xl font-extrabold text-white" style="background:var(--brand);color:#111">تم التسليم</button>`:'';
    const maps=x.latitude!=null&&x.longitude!=null?`<a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps?q=${Number(x.latitude)},${Number(x.longitude)}" class="inline-flex flex-1 items-center justify-center rounded-xl border px-3 py-3 font-bold">فتح الموقع</a>`:'';
    return `<article class="rounded-2xl p-4" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--text) 10%,transparent)"><div class="flex justify-between gap-3"><div><div class="text-xs" style="color:var(--muted)">طلب #${esc(id.slice(-8)||'—')}</div><h3 class="font-extrabold text-lg mt-1">${esc(x.customer_name||'عميل')}</h3></div><span class="rounded-full px-3 py-1 text-xs font-extrabold" style="background:color-mix(in srgb,var(--brand) 18%,transparent)">${esc(statusLabel(s))}</span></div><div class="mt-4 grid gap-2 text-sm"><div><b>الهاتف:</b> ${esc(x.customer_phone||'—')}</div><div><b>العنوان:</b> ${esc(x.address||'—')}</div><div><b>الإجمالي:</b> ${money(x.total)}</div></div><div class="mt-4 flex gap-2">${maps}<a href="tel:${esc(x.customer_phone||'')}" class="flex-1 inline-flex items-center justify-center rounded-xl border px-3 py-3 font-bold">اتصال</a></div>${buttons?`<div class="mt-3">${buttons}</div>`:''}</article>`;
  }

  function driverIdFromOrders(orders){
    return String(orders[0]?.driver_id||orders[0]?.driverId||'');
  }

  async function refresh(announce=true){
    const r=await rpcOrders(state.token);
    if(r.error){console.warn('driver orders',r.error);return false}
    const orders=Array.isArray(r.data)?r.data:[];
    const ids=new Set(orders.map(orderId).filter(Boolean));
    if(announce&&state.initialised){
      const fresh=orders.filter(x=>{const id=orderId(x);return id&&!state.seen.has(id)&&String(x.status)==='assigned'});
      if(fresh.length&&'Notification'in window&&Notification.permission==='granted')fresh.forEach(x=>new Notification('ذا بيتزا برجر — طلب جديد',{body:`تم تعيين طلب جديد لك • ${x.customer_name||'عميل'} • ${money(x.total)}`,tag:'ros-driver-'+orderId(x)}));
      if(fresh.length)notify(`🔔 تم تعيين ${fresh.length} طلب جديد لك`);
    }
    state.orders=orders;state.seen=ids;state.initialised=true;state.driverId=state.driverId||driverIdFromOrders(orders);
    const app=document.querySelector('#app');if(app)render(app,orders);
    return true;
  }

  function setupRealtime(){
    try{
      if(!window.db||!db.channel)return;
      if(state.channel)db.removeChannel(state.channel);
      state.channel=db.channel('ros-driver-'+state.driverId).on('postgres_changes',{event:'*',schema:'public',table:'delivery_orders'},()=>refresh(true)).subscribe();
    }catch(e){console.warn('driver realtime fallback',e)}
  }

  async function load(){
    const token=tokenFromHash()||savedToken();
    const app=document.querySelector('#app');if(!app||!token)return;
    saveToken(token);state.token=token;
    app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-12"><div class="lux-card rounded-3xl p-6 text-center"><div class="text-4xl mb-3">🚚</div><h1 class="text-2xl font-extrabold">جاري فتح لوحة المندوب...</h1><div class="mt-3 text-sm" style="color:var(--muted)">جارٍ التحقق من رابط المندوب.</div></div></div></main>`;
    const ok=await refresh(false);
    if(!ok){app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-md mx-auto pt-16"><div class="lux-card rounded-3xl p-6 text-center"><h1 class="text-2xl font-extrabold">تعذر فتح صفحة المندوب</h1><p class="mt-3" style="color:var(--muted)">الرابط غير صالح أو لا يمكن الوصول للبيانات.</p></div></div></main>`;return;}
    setupRealtime();
    clearInterval(state.timer);state.timer=setInterval(()=>refresh(true),3000);
  }

  function maybe(){
    const isDriver=String(location.hash||'').startsWith('#driver/');
    if(isDriver)return load();
    if(!location.hash&&savedToken()&&document.querySelector('#app'))location.hash='driver/'+encodeURIComponent(savedToken());
  }
  window.addEventListener('hashchange',maybe);
  window.addEventListener('load',maybe);
  setTimeout(maybe,250);
})();
