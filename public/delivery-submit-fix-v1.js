(function(){
  'use strict';
  if(window.__ROS_DELIVERY_SUBMIT_FIX_V1__) return;
  window.__ROS_DELIVERY_SUBMIT_FIX_V1__=true;

  const notify=(m)=>{try{if(typeof toast==='function')toast(m);else alert(m)}catch(_){alert(m)}};
  const esc=(v)=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const money=(v)=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  const base=()=>String((window.APP_CONFIG&&window.APP_CONFIG.publicAppUrl)||location.origin).replace(/\/$/,'');
  const track=(t)=>base()+'/#track/'+encodeURIComponent(t);

  window.sendDeliveryOrder=async function(){
    if(window.__ROS_DELIVERY_SENDING__) return;
    if(!Array.isArray(window.cart)||!cart.length) return notify('السلة فارغة');
    const name=document.querySelector('#cust')?.value.trim()||'';
    const phone=document.querySelector('#customerPhone')?.value.trim()||'';
    const address=document.querySelector('#addr')?.value.trim()||'';
    const pay=document.querySelector('#pay')?.value||'cash';
    const transferPhone=document.querySelector('#transferPhone')?.value.trim()||null;
    const proofFile=document.querySelector('#proof')?.files?.[0]||null;
    if(!name||!phone||!address) return notify('اكتب الاسم ورقم الهاتف والعنوان');
    if(pay==='vodafone'&&(!transferPhone||!proofFile)) return notify('أدخل رقم التليفون المحوّل منه وأرفق صورة التحويل');
    if(!window.db||!window.store?.restaurant?.id) return notify('بيانات المطعم غير متاحة');
    window.__ROS_DELIVERY_SENDING__=true;
    try{
      let proofUrl=null;
      if(pay==='vodafone'&&typeof uploadPaymentProof==='function') proofUrl=await uploadPaymentProof(proofFile);
      const items=cart.map(x=>({product_id:x.id,name:x.name,quantity:Math.max(1,Number(x.qty||x.quantity||1)),price:Number(x.price||0),modifiers:Array.isArray(x.modifiers)?x.modifiers.map(m=>({id:m.id,name:m.name,price:Number(m.price||0)})):[]}));
      const requestId=crypto.randomUUID();
      const r=await db.rpc('create_delivery_order_v2',{p_restaurant_id:store.restaurant.id,p_customer_name:name,p_customer_phone:phone,p_address:address,p_payment_method:pay,p_items:items,p_customer_lat:window.__customerCoords?.lat??null,p_customer_lng:window.__customerCoords?.lng??null,p_transfer_phone:transferPhone,p_payment_proof_url:proofUrl,p_client_request_id:requestId});
      if(r.error) throw new Error(r.error.message||'تعذر إنشاء الطلب');
      const row=Array.isArray(r.data)?r.data[0]:r.data;
      const token=row?.tracking_token;
      if(!token) throw new Error('تم إنشاء الطلب لكن لم يتم إنشاء رابط التتبع');
      try{localStorage.setItem('ros_last_tracking_token',String(token));}catch(_){}
      const total=Number(row?.total||cart.reduce((a,b)=>a+Number(b.price||0)*Number(b.qty||1),0));
      const restaurant=store.restaurant.name||'المطعم';
      const msg=`طلب توصيل جديد\n${restaurant}\nالعميل: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\nالإجمالي: ${money(total)}`;
      const wa='https://wa.me/'+String(store.restaurant.whatsapp_number||'201026569682').replace(/\D/g,'')+'?text='+encodeURIComponent(msg);
      const url=track(token);
      cart=[];
      if(typeof updateCart==='function') updateCart();
      const modal=document.querySelector('#modal');
      if(modal) modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center"><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم استلام طلبك</h2><p class="mt-2" style="color:var(--muted)">احتفظ برابط التتبع لمتابعة حالة الطلب وموقع المندوب.</p><a href="${esc(url)}" class="block mt-5 w-full py-4 rounded-2xl text-white font-extrabold text-center" style="background:var(--brand)">متابعة الطلب</a><a href="${esc(wa)}" target="_blank" rel="noopener noreferrer" class="mt-3 w-full py-3 rounded-2xl border font-extrabold flex items-center justify-center gap-2" style="color:#25D366;border-color:#25D366">WhatsApp للمطعم</a></div></div>`;
    }catch(e){
      console.error('ROS delivery submit failed',e);
      notify(e?.message||'تعذر إنشاء الطلب');
    }finally{window.__ROS_DELIVERY_SENDING__=false;}
  };

  // Tracking resilience: the order is already committed by the RPC, so the tracking
  // page must retry instead of declaring the token invalid on its first empty read.
  function installTrackingResilience(){
    if(window.__ROS_TRACKING_RESILIENCE_INLINE__)return;
    window.__ROS_TRACKING_RESILIENCE_INLINE__=true;
    let active=null,timer=null;
    const tokenFromHash=()=>{const h=location.hash||'';return h.startsWith('#track/')?decodeURIComponent(h.slice(7)):null;};
    const waitDb=async()=>{for(let i=0;i<40;i++){if(window.db?.rpc)return true;await new Promise(r=>setTimeout(r,100));}return false;};
    const load=async(token,attempt=0)=>{
      if(token!==tokenFromHash())return;
      const box=document.querySelector('#trackBox')||document.querySelector('#rosTrackBox');
      if(!box)return;
      if(!(await waitDb()))return;
      const r=await db.rpc('public_track_order',{p_token:token});
      if(token!==tokenFromHash())return;
      if(r.error){if(attempt<8){timer=setTimeout(()=>load(token,attempt+1),500);return;}box.innerHTML='<div class="p-5 rounded-2xl bg-red-500/10">تعذر تحميل حالة الطلب.</div>';return;}
      const x=Array.isArray(r.data)?r.data[0]:r.data;
      if(!x){
        if(attempt<12){box.innerHTML='<div class="p-5 rounded-2xl" style="background:var(--surface2)"><div class="text-4xl mb-2">✓</div><div class="font-extrabold text-xl">جارٍ تأكيد استلام الطلب...</div><div class="mt-2 text-sm" style="color:var(--muted)">لا تحتاج إلى تحديث الصفحة.</div></div>';timer=setTimeout(()=>load(token,attempt+1),500);return;}
      const status=String(x.status||'new');
      const labels={new:'تم استلام طلبك',confirmed:'تم تأكيد الطلب',preparing:'جاري تجهيز الطلب',ready:'الطلب جاهز',assigned:'تم تعيين المندوب',accepted:'المندوب قبل الطلب',picked_up:'المندوب استلم الطلب',out_for_delivery:'الطلب في الطريق إليك',delivered:'تم تسليم الطلب'};
      const state=labels[status]||'تم استلام طلبك';
      const gps=x.latitude!=null&&x.longitude!=null;
      box.innerHTML=`<div class="space-y-4"><div class="rounded-3xl p-6 text-center" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--brand) 24%,transparent)"><div class="text-5xl mb-3">✓</div><div class="text-2xl font-extrabold">${esc(state)}</div><div class="mt-2 text-sm" style="color:var(--muted)">${status==='new'?'جاري تجهيز طلبك وسيتم تحديث الحالة تلقائيًا.':'سيتم تحديث حالة الطلب والتوصيل تلقائيًا.'}</div></div><div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="text-sm" style="color:var(--muted)">العميل</div><div class="font-bold">${esc(x.customer_name||'عميل')}</div><div class="mt-3 text-sm" style="color:var(--muted)">الإجمالي</div><div class="font-extrabold text-xl">${money(x.total)}</div>${x.driver_name?`<div class="mt-3 text-sm" style="color:var(--muted)">المندوب</div><div class="font-bold">${esc(x.driver_name)}</div>`:''}${x.driver_phone?`<a href="tel:${esc(x.driver_phone)}" class="inline-block mt-2 font-bold" style="color:var(--brand)">${esc(x.driver_phone)}</a>`:''}${gps?`<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(x.latitude+','+x.longitude)}" class="inline-block mt-3 px-4 py-2 rounded-xl border font-bold">فتح موقع المندوب</a>`:''}</div></div>`;
      if(timer)clearTimeout(timer);
      if(!['delivered','cancelled'].includes(status))timer=setTimeout(()=>load(token,0),5000);
    };
    const run=()=>{const token=tokenFromHash();if(!token||token===active)return;active=token;if(timer)clearTimeout(timer);setTimeout(()=>load(token,0),100);};
    window.addEventListener('hashchange',()=>{active=null;run();});
    setTimeout(run,800);
  }
  installTrackingResilience();
})();
