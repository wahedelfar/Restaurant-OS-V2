(function(){
  'use strict';
  if(window.__ROS_REALTIME_NOTIFICATIONS_V1__)return;
  window.__ROS_REALTIME_NOTIFICATIONS_V1__=true;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let client=null,restaurantId=null,role='',audioCtx=null,lastEvents=new Map(),booted=false;
  const seenKey=e=>String(e?.eventType||'')+':'+String(e?.table||'')+':'+String(e?.id||'')+':'+String(e?.status||'');

  function routeRole(){
    const h=location.hash||'';
    if(h.startsWith('#driver/'))return'driver';
    if(h.startsWith('#admin'))return'admin';
    if(h.startsWith('#track/')||h.startsWith('#dine-track'))return'customer';
    if(h.startsWith('#kitchen')||location.pathname.startsWith('/kds'))return'kitchen';
    return'customer';
  }

  function unlockAudio(){
    try{
      if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==='suspended')audioCtx.resume();
      window.__ROS_AUDIO_UNLOCKED__=true;
      const b=document.querySelector('#rosAudioUnlock');if(b)b.remove();
    }catch(e){console.warn('audio unlock',e)}
  }

  function ensureAudioButton(){
    if(document.querySelector('#rosAudioUnlock')||window.__ROS_AUDIO_UNLOCKED__)return;
    const b=document.createElement('button');
    b.id='rosAudioUnlock';b.type='button';b.textContent='تفعيل صوت الإشعارات';
    b.style.cssText='position:fixed;z-index:2147483647;bottom:18px;right:18px;border:0;border-radius:999px;padding:11px 16px;background:var(--brand,#D4AF37);color:#111;font:800 13px Cairo,Arial,sans-serif;box-shadow:0 10px 30px #0008;cursor:pointer';
    b.addEventListener('click',unlockAudio,{once:true});
    document.body.appendChild(b);
  }

  function beep(kind){
    try{
      if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==='suspended')audioCtx.resume();
      const now=audioCtx.currentTime;
      const notes=kind==='new'?[660,880,1046]:kind==='success'?[784,988,1174]:[520,660,520];
      notes.forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,now+i*.11);g.gain.exponentialRampToValueAtTime(.16,now+i*.11+.02);g.gain.exponentialRampToValueAtTime(.0001,now+i*.11+.09);o.connect(g);g.connect(audioCtx.destination);o.start(now+i*.11);o.stop(now+i*.11+.1)});
    }catch(e){console.warn('notification sound',e)}
  }

  function notify(title,text,kind){
    beep(kind);
    try{if('Notification'in window&&Notification.permission==='granted')new Notification(title,{body:text,tag:'ros-'+Date.now()})}catch(_){ }
    const old=document.querySelector('#rosRealtimeToast');if(old)old.remove();
    const box=document.createElement('div');box.id='rosRealtimeToast';box.dir='rtl';box.innerHTML='<div style="font-weight:900">'+esc(title)+'</div><div style="margin-top:3px;opacity:.85">'+esc(text)+'</div>';
    box.style.cssText='position:fixed;z-index:2147483646;top:18px;right:18px;max-width:330px;padding:14px 16px;border-radius:18px;background:var(--surface,#17191D);color:var(--text,#fff);border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 35%,transparent);box-shadow:0 18px 50px #0009;font:700 13px Cairo,Arial,sans-serif;cursor:pointer';
    box.onclick=()=>box.remove();document.body.appendChild(box);setTimeout(()=>box.remove(),6500);
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  function eventForOrder(payload){
    const n=payload?.new||{},o=payload?.old||{};
    const type=String(n.order_type||o.order_type||'delivery');
    const status=String(n.status||'');
    const kitchen=String(n.kitchen_status||'');
    const oldStatus=String(o.status||'');
    const oldKitchen=String(o.kitchen_status||'');
    const id=n.id||o.id;
    if(!id)return null;
    if(oldStatus!==status&&status)return{eventType:'order-status',table:'orders',id,status,title:'تحديث طلب',text:'تم تحديث حالة طلب '+(n.customer_name||'العميل'),kind:status==='delivered'?'success':'update'};
    if(oldKitchen!==kitchen&&kitchen)return{eventType:'kitchen-status',table:'orders',id,status:kitchen,title:'تحديث المطبخ',text:'حالة الطلب: '+({received:'تم استلام الطلب',preparing:'جاري التجهيز',ready:'تم تجهيز الطلب'}[kitchen]||kitchen),kind:kitchen==='ready'?'success':'update'};
    if(!o.id)return{eventType:'new-order',table:'orders',id,status:'new',title:'طلب جديد',text:type==='dine_in'?'طلب جديد من داخل المطعم':'طلب توصيل جديد',kind:'new'};
    return null;
  }

  function allowed(ev){
    if(!ev)return false;
    if(role==='kitchen')return ev.eventType==='new-order';
    if(role==='admin')return true;
    if(role==='driver')return ev.eventType==='driver-status'||ev.eventType==='assignment'||ev.eventType==='new-order';
    if(role==='customer')return ev.eventType==='kitchen-status'||ev.eventType==='assignment'||ev.eventType==='driver-status'||ev.eventType==='order-status';
    return false;
  }

  function handle(ev){
    if(!allowed(ev))return;
    const k=seenKey(ev);if(lastEvents.has(k))return;lastEvents.set(k,Date.now());
    for(const [key,t]of lastEvents)if(Date.now()-t>60000)lastEvents.delete(key);
    notify(ev.title,ev.text,ev.kind);
  }

  async function subscribe(){
    if(!client||!restaurantId)return;
    const channel=client.channel('ros-realtime-'+restaurantId+'-'+role+'-'+Math.random().toString(36).slice(2));
    channel.on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},p=>{if(String(p.new?.restaurant_id)===String(restaurantId))handle(eventForOrder(p));});
    channel.on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},p=>{if(String(p.new?.restaurant_id||p.old?.restaurant_id)===String(restaurantId))handle(eventForOrder(p));});
    channel.on('postgres_changes',{event:'UPDATE',schema:'public',table:'delivery_orders'},p=>{
      const n=p.new||{},o=p.old||{};
      if(n.id&&n.status!==o.status)handle({eventType:'driver-status',table:'delivery_orders',id:n.id,status:n.status,title:'تحديث التوصيل',text:'حالة التوصيل: '+({assigned:'تم تعيين المندوب',accepted:'المندوب قبل الطلب',picked_up:'المندوب استلم الطلب',out_for_delivery:'الطلب في الطريق',delivered:'تم التسليم'}[n.status]||n.status),kind:n.status==='delivered'?'success':'update'});
      if(n.id&&n.driver_id!==o.driver_id)handle({eventType:'assignment',table:'delivery_orders',id:n.id,status:'assigned',title:'تعيين مندوب',text:'تم تعيين مندوب للطلب',kind:'success'});
    });
    const r=await channel.subscribe();
    if(r!=='SUBSCRIBED')console.warn('ROS realtime subscription state',r);
  }

  async function boot(){
    if(booted)return;booted=true;
    role=routeRole();ensureAudioButton();
    document.addEventListener('pointerdown',unlockAudio,{once:true,capture:true});
    if('Notification'in window&&Notification.permission==='default'){try{Notification.requestPermission()}catch(_){}}
    for(let i=0;i<60;i++){
      if(window.db&&window.APP_CONFIG){client=window.db;restaurantId=window.APP_CONFIG.restaurantId||window.APP_CONFIG.restaurant?.id||null;if(!restaurantId&&window.store?.restaurant?.id)restaurantId=window.store.restaurant.id;if(restaurantId)break;}
      await sleep(250);
    }
    if(!client||!restaurantId){console.warn('ROS realtime notifications: Supabase client/restaurant unavailable');return;}
    await subscribe();
  }
  window.addEventListener('hashchange',()=>{role=routeRole();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();