(function(){
  'use strict';
  if(window.__ROS_DELIVERY_SUBMIT_FIX_V1__) return;
  window.__ROS_DELIVERY_SUBMIT_FIX_V1__=true;

  const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}};
  const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  const base=()=>String(window.APP_CONFIG?.publicAppUrl||location.origin).replace(/\/$/,'');
  const trackUrl=t=>base()+'/#track/'+encodeURIComponent(t);

  window.sendDeliveryOrder=async function(){
    const cart=Array.isArray(window.cart)?window.cart:[];
    if(!cart.length)return notify('السلة فارغة');
    const name=document.querySelector('#cust')?.value.trim()||'';
    const phone=document.querySelector('#customerPhone')?.value.trim()||'';
    const address=document.querySelector('#addr')?.value.trim()||'';
    const pay=document.querySelector('#pay')?.value||'cash';
    const transferPhone=document.querySelector('#transferPhone')?.value.trim()||null;
    const proofFile=document.querySelector('#proof')?.files?.[0]||null;
    if(!name||!phone||!address)return notify('اكتب الاسم ورقم الهاتف والعنوان');
    if(pay==='vodafone'&&(!transferPhone||!proofFile))return notify('أدخل رقم التليفون المحوّل منه وأرفق صورة التحويل');
    if(!window.store?.restaurant?.id)return notify('بيانات المطعم غير متاحة');
    if(!window.db||typeof window.db.rpc!=='function')return notify('محرك الطلبات غير جاهز، أعد تحميل الصفحة');

    const btn=document.querySelector('button[onclick="sendDeliveryOrder()"]');
    if(btn){btn.disabled=true;btn.dataset.oldText=btn.textContent;btn.textContent='جارٍ إرسال الطلب...';}
    try{
      let proofUrl=null;
      if(pay==='vodafone'&&typeof uploadPaymentProof==='function')proofUrl=await uploadPaymentProof(proofFile);
      const items=cart.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price,modifiers:Array.isArray(x.modifiers)?x.modifiers:[]}));
      const requestId=crypto.randomUUID();
      window.__ROS_PENDING_DELIVERY_REQUEST_ID__=requestId;
      const r=await db.rpc('create_delivery_order_v2',{
        p_restaurant_id:store.restaurant.id,
        p_customer_name:name,
        p_customer_phone:phone,
        p_address:address,
        p_payment_method:pay,
        p_items:items,
        p_customer_lat:window.__customerCoords?.lat??null,
        p_customer_lng:window.__customerCoords?.lng??null,
        p_transfer_phone:transferPhone,
        p_payment_proof_url:proofUrl,
        p_client_request_id:requestId
      });
      if(r.error)throw new Error(r.error.message||'تعذر إنشاء الطلب');
      const row=Array.isArray(r.data)?r.data[0]:r.data;
      const token=row?.tracking_token;
      if(!token)throw new Error('تم إنشاء الطلب لكن لم يتم إنشاء رابط التتبع');
      const total=cart.reduce((a,b)=>a+Number(b.price||0)*Number(b.qty||1),0);
      const restaurant=store.restaurant.name||'ذا بيتزا برجر كافيه';
      const msg=`🍕 طلب توصيل جديد\n\n${restaurant}\n\nالعميل: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\nالدفع: ${pay==='vodafone'?'Vodafone Cash':'عند الاستلام'}\n\n${cart.map(x=>`${x.name} × ${x.qty}`).join('\n')}\n\nالإجمالي: ${money(total)}`;
      const wa='https://wa.me/'+String(store.restaurant.whatsapp_number||'201026569682').replace(/\D/g,'')+'?text='+encodeURIComponent(msg);
      const url=trackUrl(token);
      window.__ROS_PENDING_DELIVERY_REQUEST_ID__=null;
      window.cart=[];
      if(typeof updateCart==='function')updateCart();
      const modal=document.querySelector('#modal');
      if(modal)modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center"><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم استلام طلبك</h2><p class="mt-2" style="color:var(--muted)">احتفظ برابط التتبع لمتابعة حالة الطلب وموقع المندوب.</p><a href="${esc(url)}" class="block mt-5 w-full py-4 rounded-2xl text-white font-extrabold text-center" style="background:var(--brand)">متابعة الطلب</a><a href="${esc(wa)}" target="_blank" rel="noopener noreferrer" class="mt-3 w-full py-3 rounded-2xl border font-extrabold flex items-center justify-center gap-2" style="color:#25D366;border-color:#25D366"><span style="font-size:20px">WhatsApp</span><span>إرسال تفاصيل الطلب للمطعم</span></a></div></div>`;
    }catch(e){
      window.__ROS_PENDING_DELIVERY_REQUEST_ID__=null;
      console.error('ROS delivery submit failed:',e);
      notify(e?.message||'تعذر إنشاء الطلب');
    }finally{
      if(btn){btn.disabled=false;btn.textContent=btn.dataset.oldText||'إرسال طلب التوصيل';}
    }
  };
})();
