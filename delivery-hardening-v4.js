(function(){
  'use strict';
  if(window.__ROS_DELIVERY_HARDENING_V5__) return;
  window.__ROS_DELIVERY_HARDENING_V5__=true;

  const deliveryRouter=window.renderRouter;
  const deliveryAdmin=window.renderAdmin;
  const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}};
  const isSpecialRoute=()=>/^#(track|driver)\//.test(location.hash||'');
  const routeKind=()=>String(location.hash||'').startsWith('#track/')?'track':String(location.hash||'').startsWith('#driver/')?'driver':null;

  // Keep tracking/driver routes alive after the base app's async initialization.
  let routeBusy=false,routeTimer=0,routeAttempts=0;
  async function forceRoute(){
    const kind=routeKind();
    if(!kind||routeBusy||typeof deliveryRouter!=='function')return;
    const marker=kind==='track'?'#rosTrackBox':'#rosDriverBox';
    if(document.querySelector(marker))return;
    // Wait until the Supabase client and restaurant are initialized.
    if(!window.db||!window.store?.restaurant?.id){scheduleRoute(180);return}
    routeBusy=true;
    try{await deliveryRouter()}catch(e){console.error('delivery route',e)}
    finally{routeBusy=false}
  }
  function scheduleRoute(delay=80){clearTimeout(routeTimer);routeTimer=setTimeout(forceRoute,delay)}
  window.addEventListener('hashchange',()=>{routeAttempts=0;scheduleRoute(0)});
  const appObserver=new MutationObserver(()=>{if(isSpecialRoute())scheduleRoute(120)});
  appObserver.observe(document.body,{childList:true,subtree:true});
  const routeWatch=setInterval(()=>{
    if(!isSpecialRoute()){routeAttempts=0;return}
    const kind=routeKind(),marker=kind==='track'?'#rosTrackBox':'#rosDriverBox';
    if(document.querySelector(marker)){routeAttempts=0;return}
    scheduleRoute(120);
    if(++routeAttempts>150){clearInterval(routeWatch);routeAttempts=0}
  },100);
  [0,250,800,1500,3000,5000,8000].forEach(ms=>setTimeout(()=>{if(isSpecialRoute())scheduleRoute(0)},ms));

  // Intercept tracking links so Android Chrome does not hand the click back to the base menu router.
  document.addEventListener('click',function(e){
    const a=e.target?.closest?.('a[href*="#track/"]');
    if(!a)return;
    const href=a.getAttribute('href')||'',i=href.indexOf('#track/');
    if(i<0)return;
    const token=href.slice(i+7).split(/[?#]/)[0];
    if(!token)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const next='#track/'+token;
    if(location.hash===next){scheduleRoute(0)}else{location.hash=next}
  },true);

  // Refresh the normal dashboard order state after admin authentication.
  window.renderAdmin=async function(){
    if(window.db&&window.store?.restaurant?.id){
      try{
        const s=await db.auth.getSession();
        if(s?.data?.session){
          const q=await db.from('orders').select('*').eq('restaurant_id',store.restaurant.id).order('created_at',{ascending:false}).limit(100);
          if(!q.error)store.orders=q.data||[];
        }
      }catch(e){console.warn('admin orders refresh',e)}
    }
    if(typeof deliveryAdmin==='function')return deliveryAdmin();
  };

  // Correct RPC signature: admin_assign_delivery requires restaurant_id.
  document.addEventListener('click',async function(e){
    const b=e.target?.closest?.('[data-assign]');
    if(!b||!window.db||!window.store?.restaurant?.id)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const orderId=b.getAttribute('data-assign');
    const panel=b.closest('#deliveryControlPanel');
    const sel=panel?.querySelector(`[data-sel="${CSS.escape(orderId)}"]`);
    const driverId=sel?.value||'';
    if(!driverId)return notify('اختر مندوبًا أولًا');
    b.disabled=true;
    try{
      const r=await db.rpc('admin_assign_delivery',{p_restaurant_id:store.restaurant.id,p_order_id:orderId,p_driver_id:driverId});
      if(r.error)throw r.error;
      notify('تم تعيين المندوب بنجاح');
      await window.renderAdmin();
    }catch(err){b.disabled=false;notify(err?.message||'تعذر تعيين المندوب')}
  },true);

  // Capture the public proof URL produced by the existing upload helper without uploading twice.
  function hookPaymentProof(){
    const fn=window.uploadPaymentProof;
    if(typeof fn!=='function'||fn.__rosWrapped)return false;
    const wrapped=async function(file){
      const url=await fn(file);
      window.__rosLastPaymentProofUrl=url||null;
      return url;
    };
    wrapped.__rosWrapped=true;
    window.uploadPaymentProof=wrapped;
    return true;
  }
  let proofHookTries=0;
  const proofHookTimer=setInterval(()=>{if(hookPaymentProof()||++proofHookTries>100)clearInterval(proofHookTimer)},100);
  hookPaymentProof();

  // Polish success modal and make the WhatsApp payload contain both tracking and proof links.
  async function polishSuccessModal(){
    const modal=document.querySelector('#modal');if(!modal)return;
    const title=[...modal.querySelectorAll('h2')].find(x=>x.textContent.includes('تم استلام طلبك'));
    if(!title)return;
    const card=title.closest('.checkout-modal');if(!card)return;
    card.classList.add('relative');
    if(!card.querySelector('[data-ros-close]')){
      const close=document.createElement('button');
      close.type='button';close.setAttribute('aria-label','إغلاق');close.setAttribute('data-ros-close','1');close.textContent='×';
      close.className='absolute top-3 left-3 w-10 h-10 rounded-full border font-bold text-2xl flex items-center justify-center';
      close.onclick=()=>{if(typeof closeModal==='function')closeModal();else modal.innerHTML=''};
      card.prepend(close);
    }
    const track=card.querySelector('a[href*="#track/"]'),wa=card.querySelector('a[href*="wa.me/"]');
    if(!track||!wa)return;
    const trackHref=track.getAttribute('href')||'';
    let proofUrl=window.__rosLastPaymentProofUrl||'';
    const idx=trackHref.indexOf('#track/');
    const token=idx>=0?decodeURIComponent(trackHref.slice(idx+7).split(/[?#]/)[0]):'';
    const baseText=(()=>{try{const u=new URL(wa.href);return u.searchParams.get('text')||''}catch(_){return ''}})();
    let text=baseText;
    if(!text.includes('متابعة الطلب'))text+='\n\n🔗 متابعة الطلب:\n'+trackHref;
    if(proofUrl&&!text.includes('صورة التحويل'))text+='\n\n📎 صورة تحويل Vodafone Cash:\n'+proofUrl;
    try{const u=new URL(wa.href);u.searchParams.set('text',text.trim());wa.href=u.toString()}catch(_){ }
    wa.className='mt-3 w-full py-3 rounded-2xl font-extrabold flex items-center justify-center gap-2';
    wa.style.cssText='background:#25D366;color:#fff;border:0;box-shadow:0 8px 22px #25D36633';
    wa.innerHTML='<span style="font-size:20px">◉</span><span>إرسال الطلب عبر WhatsApp</span>';
    track.innerHTML='<span>متابعة الطلب</span>';
    track.className='block mt-5 w-full py-4 rounded-2xl text-white font-extrabold text-center';
  }
  const modalObserver=new MutationObserver(()=>{polishSuccessModal().catch(console.warn)});
  modalObserver.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>polishSuccessModal().catch(console.warn),100);
})();
