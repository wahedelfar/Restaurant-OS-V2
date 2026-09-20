(function(){
  'use strict';
  if(window.__ROS_DELIVERY_HARDENING_V6__) return;
  window.__ROS_DELIVERY_HARDENING_V6__=true;

  const deliveryRouter=window.renderRouter;
  const deliveryAdmin=window.renderAdmin;
  const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}};
  const publicBase=String((window.APP_CONFIG&&window.APP_CONFIG.publicAppUrl)||location.origin).replace(/\/$/,'');
  const isSpecialRoute=()=>false; // route rendering is owned by the dedicated tracking/driver layers.
  const routeKind=()=>String(location.hash||'').startsWith('#track/')?'track':String(location.hash||'').startsWith('#driver/')?'driver':null;
  const specialUrl=(kind,token)=>publicBase+'/#'+kind+'/'+encodeURIComponent(token);
  const timeout=(promise,ms,message)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);

  // Keep tracking/driver routes alive after the base app's async initialization.
  let routeBusy=false,routeTimer=0,routeAttempts=0;
  async function forceRoute(){
    const kind=routeKind();
    if(!kind||routeBusy||typeof deliveryRouter!=='function')return;
    const marker=kind==='track'?'#rosTrackBox':'#rosDriverBox';
    if(document.querySelector(marker))return;
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

  // Keep BOTH public special links inside the delivery router instead of letting the base menu router win.
  document.addEventListener('click',function(e){
    const a=e.target?.closest?.('a[href*="#track/"],a[href*="#driver/"]');
    if(!a)return;
    const href=a.getAttribute('href')||'';
    const m=href.match(/#(track|driver)\/([^?#]+)/);
    if(!m)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const kind=m[1],token=decodeURIComponent(m[2]);
    const next='#'+kind+'/'+encodeURIComponent(token);
    if(location.hash===next){scheduleRoute(0)}else{location.hash=next}
  },true);

  // Refresh normal dashboard orders after admin authentication.
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
      const r=await timeout(db.rpc('admin_assign_delivery',{p_restaurant_id:store.restaurant.id,p_order_id:orderId,p_driver_id:driverId}),20000,'انتهت مهلة تعيين المندوب، حاول مرة أخرى');
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

  // Replace the fragile delivery submit flow with an explicit, bounded transaction.
  window.sendDeliveryOrder=async function(){
    const cartRef=window.cart;
    if(!Array.isArray(cartRef)||!cartRef.length)return notify('السلة فارغة');
    const name=document.querySelector('#cust')?.value.trim()||'';
    const phone=document.querySelector('#customerPhone')?.value.trim()||'';
    const address=document.querySelector('#addr')?.value.trim()||'';
    const pay=document.querySelector('#pay')?.value||'cash';
    const transferPhone=document.querySelector('#transferPhone')?.value.trim()||null;
    const proofFile=document.querySelector('#proof')?.files?.[0]||null;
    if(!name||!phone||!address)return notify('اكتب الاسم ورقم الهاتف والعنوان');
    if(pay==='vodafone'&&(!transferPhone||!proofFile))return notify('أدخل رقم التليفون المحوّل منه وأرفق صورة التحويل');
    if(!window.db||!window.store?.restaurant?.id)return notify('بيانات المطعم غير متاحة');

    const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('إرسال طلب التوصيل'));
    const originalText=btn?.textContent||'إرسال طلب التوصيل';
    if(btn){btn.disabled=true;btn.textContent='جارٍ رفع البيانات وإنشاء الطلب...';btn.style.opacity='.65'}
    try{
      const items=cartRef.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price}));
      let proofUrl=null;
      if(pay==='vodafone'){
        proofUrl=await timeout(uploadPaymentProof(proofFile),25000,'رفع صورة التحويل استغرق وقتًا طويلًا. تأكد من الإنترنت ثم حاول مرة أخرى');
        window.__rosLastPaymentProofUrl=proofUrl||null;
      }
      const r=await timeout(db.rpc('create_delivery_order',{
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
      }),25000,'إنشاء الطلب استغرق وقتًا طويلًا. لم يتم تجميد الصفحة؛ حاول مرة أخرى.');
      if(r.error)throw r.error;
      const row=Array.isArray(r.data)?r.data[0]:r.data;
      const token=row?.tracking_token;
      if(!token)throw new Error('تم إنشاء الطلب لكن لم يتم إنشاء رابط التتبع');
      const total=cartRef.reduce((a,b)=>a+b.price*b.qty,0);
      const restaurant=store.restaurant.name||'ذا بيتزا برجر كافيه';
      const track=specialUrl('track',token);
      let msg=`🍕 طلب توصيل جديد\n\n${restaurant}\n\nالعميل: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\nالدفع: ${pay==='vodafone'?'Vodafone Cash':'عند الاستلام'}\n`;
      if(pay==='vodafone'&&transferPhone)msg+=`رقم التليفون المحوّل منه: ${transferPhone}\n`;
      msg+=`\n${cartRef.map(x=>`${x.name} × ${x.qty}`).join('\n')}\n\nالإجمالي: ${money(total)}\n\n🔗 متابعة الطلب:\n${track}`;
      if(proofUrl)msg+=`\n\n📎 صورة تحويل Vodafone Cash:\n${proofUrl}`;
      const wa='https://wa.me/'+String(store.restaurant.whatsapp_number||'201026569682').replace(/\D/g,'')+'?text='+encodeURIComponent(msg);
      window.cart=[];
      if(typeof updateCart==='function')updateCart();
      const modal=document.querySelector('#modal');
      if(!modal)return;
      modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal relative w-full max-w-md rounded-3xl p-6 text-center"><button type="button" data-ros-close="1" aria-label="إغلاق" class="absolute top-3 left-3 w-10 h-10 rounded-full border font-bold text-2xl">×</button><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم استلام طلبك</h2><p class="mt-2" style="color:var(--muted)">احتفظ برابط التتبع لمتابعة حالة الطلب وموقع المندوب.</p><a href="${esc(track)}" class="block mt-5 w-full py-4 rounded-2xl text-white font-extrabold text-center" style="background:var(--brand)">متابعة الطلب</a><a href="${esc(wa)}" target="_blank" rel="noopener noreferrer" class="mt-3 w-full py-3 rounded-2xl font-extrabold flex items-center justify-center gap-2" style="background:#25D366;color:#fff"><span>◉</span><span>إرسال الطلب عبر WhatsApp</span></a></div></div>`;
      const close=modal.querySelector('[data-ros-close]');if(close)close.onclick=()=>{if(typeof closeModal==='function')closeModal();else modal.innerHTML=''};
    }catch(e){
      console.error('delivery submit',e);
      notify(e?.message||'تعذر إرسال طلب التوصيل');
    }finally{
      if(btn){btn.disabled=false;btn.textContent=originalText;btn.style.opacity=''}
    }
  };

  const modalObserver=new MutationObserver(()=>{
    const close=document.querySelector('#modal [data-ros-close]');
    if(close&&!close.__rosBound){close.__rosBound=true;close.onclick=()=>{if(typeof closeModal==='function')closeModal();else document.querySelector('#modal').innerHTML=''}}
  });
  modalObserver.observe(document.body,{childList:true,subtree:true});
})();
