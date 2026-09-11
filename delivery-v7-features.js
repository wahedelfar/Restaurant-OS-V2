(function(){
  'use strict';
  if(window.__ROS_DELIVERY_V7_FEATURES__) return;
  window.__ROS_DELIVERY_V7_FEATURES__=true;
  try{if(!('db' in window))Object.defineProperty(window,'db',{configurable:true,get:()=>db});}catch(_){}
  try{if(!('store' in window))Object.defineProperty(window,'store',{configurable:true,get:()=>store});}catch(_){}
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  const notify=m=>{try{typeof window.toast==='function'?window.toast(m):console.log(m)}catch(_) {}};
  const prepOptions=[5,15,30,40,60];
  let adminTimer=null,adminChannel=null;
  let seenOrders=new Set();
  function ready(){return !!(window.db&&window.store&&window.store.restaurant&&window.store.restaurant.id)}
  function orderKind(o){return o&&o.order_type==='dine_in'?'داخلي':'خارجي'}
  function browserNotify(title,body,tag){try{if('Notification' in window&&Notification.permission==='granted')new Notification(title,{body,tag})}catch(_) {}}
  async function enableNotifications(){if(!('Notification' in window))return notify('المتصفح لا يدعم إشعارات النظام');const p=await Notification.requestPermission();notify(p==='granted'?'تم تفعيل التنبيهات':'لم يتم السماح بالإشعارات')}
  function seenKey(){return `ros_order_seen_${window.store&&window.store.restaurant?window.store.restaurant.id:'x'}`}
  function loadSeen(){try{return new Set(JSON.parse(localStorage.getItem(seenKey())||'[]'))}catch(_){return new Set()}}
  function saveSeen(s){try{localStorage.setItem(seenKey(),JSON.stringify([...s].slice(-300)))}catch(_) {}}
  function notifyOrder(o){if(!o||!o.id||seenOrders.has(o.id))return;seenOrders.add(o.id);saveSeen(seenOrders);const title=`طلب جديد ${orderKind(o)}`,body=`${o.customer_name||'عميل'}${o.table_number?' • طاولة '+o.table_number:''} • ${money(o.total)}`;notify(`${title}: ${body}`);browserNotify(title,body,'order-'+o.id)}
  async function adminQuery(){if(!ready())return[];const r=await window.db.from('orders').select('*').eq('restaurant_id',window.store.restaurant.id).order('created_at',{ascending:false}).limit(100);if(r.error){console.warn('ROS V7 admin query',r.error);return[]}window.store.orders=r.data||[];return r.data||[]}
  function itemsText(o){let a=o&&o.items;try{if(typeof a==='string')a=JSON.parse(a)}catch(_){a=[]}return Array.isArray(a)&&a.length?a.map(x=>`${esc(x.name||x.product_name||'منتج')} × ${Number(x.quantity||x.qty||1)}`).join(' • '):'—'}
  async function saveOrderFields(id,patch){if(!ready())return false;const r=await window.db.from('orders').update(patch).eq('id',id).eq('restaurant_id',window.store.restaurant.id);if(r.error){console.warn('ROS V7 order update',r.error);notify('تعذر حفظ التعديل');return false}return true}
  function renderPrepPanel(){
    if(!ready()||!location.hash.startsWith('#admin'))return;
    const panel=document.querySelector('#deliveryControlPanel');
    if(!panel)return;
    let box=document.querySelector('#rosPrepPanel');
    if(!box){box=document.createElement('section');box.id='rosPrepPanel';box.className='lux-card rounded-3xl p-5 mt-6';panel.parentElement&&panel.parentElement.appendChild(box)}
    const rows=(window.store.orders||[]).filter(o=>o.order_type==='dine_in').slice(0,20);
    box.innerHTML=`<div class="flex justify-between items-center gap-3"><div><div class="eyebrow">ORDER CONTROL</div><h3 class="text-2xl font-extrabold">التجهيز والرسائل</h3><p class="text-sm mt-1" style="color:var(--muted)">للطلبات الداخلية فقط • 5 / 15 / 30 / 40 / 60 دقيقة</p></div><button type="button" data-ros-notify class="rounded-xl border px-4 py-2 font-bold">تفعيل التنبيهات</button></div><div class="mt-5 grid gap-3">${rows.length?rows.map(o=>{const prep=Number(o.prep_minutes||0),msg=String(o.admin_message||'');return `<article class="rounded-2xl p-4" style="background:var(--surface2)"><div class="font-extrabold">داخلي — طاولة ${esc(o.table_number||'—')}</div><div class="text-sm mt-1">${itemsText(o)}</div><div class="mt-2 font-extrabold">${money(o.total)}</div><div class="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">${prepOptions.map(n=>`<button type="button" data-prep="${esc(o.id)}" data-min="${n}" class="rounded-xl border p-2 font-bold">${n} دقيقة</button>`).join('')}</div><div class="mt-3 flex flex-wrap gap-2">${[['new','تم استلام طلب حضرتك'],['preparing','جاري تجهيز طلبك'],['ready','طلبكم جاهز'],['delivered','شكرًا لزيارتكم']].map(s=>`<button type="button" data-status="${esc(o.id)}" data-status-value="${s[0]}" data-message="${esc(s[1])}" class="rounded-xl border px-3 py-2 font-bold">${s[1]}</button>`).join('')}</div><div class="mt-3 text-sm" style="color:var(--muted)">الرسالة: <b>${esc(msg||'حسب الحالة')}</b></div></article>`}).join(''):'<div class="py-6 text-center" style="color:var(--muted)">لا توجد طلبات داخلية حاليًا.</div>'}</div>`;
    const n=box.querySelector('[data-ros-notify]');if(n)n.onclick=enableNotifications;
    box.querySelectorAll('[data-prep]').forEach(b=>b.onclick=async()=>{b.disabled=true;await saveOrderFields(b.dataset.prep,{prep_minutes:Number(b.dataset.min)});b.disabled=false;renderPrepPanel()});
    box.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{b.disabled=true;await saveOrderFields(b.dataset.status,{status:b.dataset.statusValue,admin_message:b.dataset.message});b.disabled=false;renderPrepPanel()});
  }
  async function startAdmin(){
    if(!ready()||!location.hash.startsWith('#admin')||adminTimer)return;
    seenOrders=loadSeen();
    const rows=await adminQuery();
    rows.forEach(o=>seenOrders.add(o.id));
    saveSeen(seenOrders);
    try{adminChannel=window.db.channel('ros-v7-orders-'+window.store.restaurant.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'orders',filter:`restaurant_id=eq.${window.store.restaurant.id}`},p=>{const o=p.new||{};window.store.orders=[o,...(window.store.orders||[]).filter(x=>x.id!==o.id)].slice(0,100);notifyOrder(o);if(location.hash.startsWith('#admin'))renderPrepPanel()}).subscribe()}catch(e){console.warn('ROS V7 realtime',e)}
    adminTimer=setInterval(async()=>{const r=await adminQuery();r.slice().reverse().forEach(notifyOrder);renderPrepPanel()},120000);
    renderPrepPanel();
  }
  async function enhanceTracking(){
    const m=(location.hash||'').match(/^#track\/([^?#]+)/);if(!m||!ready())return;
    const box=document.querySelector('#rosTrackBox');if(!box||box.dataset.rosV7Enhanced==='1')return;
    const r=await window.db.rpc('public_track_order',{p_token:decodeURIComponent(m[1])});if(r.error||!r.data||!r.data[0])return;
    const x=r.data[0];box.dataset.rosV7Enhanced='1';
    if(x.order_type==='dine_in'){
      box.insertAdjacentHTML('beforeend',`<div class="mt-4 rounded-2xl p-4" style="background:var(--surface2)"><b>متابعة الطلب الداخلي</b><div class="text-xl font-extrabold mt-1">${esc(x.status||'new')}</div>${x.table_number?`<div class="mt-2">الطاولة: <b>${esc(x.table_number)}</b></div>`:''}${x.prep_minutes?`<div class="mt-2">وقت التجهيز: <b>${Number(x.prep_minutes)} دقيقة</b></div>`:''}${x.admin_message?`<div class="mt-2">${esc(x.admin_message)}</div>`:''}</div>`);
    }else if(x.driver_name||x.driver_phone){
      box.insertAdjacentHTML('beforeend',`<div class="mt-4 rounded-2xl p-4" style="background:var(--surface2)"><b>المندوب</b><div class="mt-1">${esc(x.driver_name||'—')}</div>${x.driver_phone?`<div class="mt-1">${esc(x.driver_phone)}</div>`:''}</div>`);
    }
  }
  function route(){if(!ready())return;if(location.hash.startsWith('#admin'))startAdmin();if(location.hash.startsWith('#track/'))setTimeout(enhanceTracking,700)}
  window.addEventListener('hashchange',route);
  (async function(){for(let i=0;i<100&&!ready();i++)await sleep(100);if(ready())route()})();
})();
