(function(){
  window.getCustomerLocation=function(){
    if(!navigator.geolocation)return toast('المتصفح لا يدعم GPS');
    if(!window.isSecureContext)return toast('GPS يحتاج HTTPS');
    const el=$('#customerGps'); if(el)el.textContent='جارٍ تحديد موقعك...';
    navigator.geolocation.getCurrentPosition(p=>{window.__customerCoords={lat:p.coords.latitude,lng:p.coords.longitude};if(el)el.textContent=`تم تحديد موقعك • دقة تقريبية ${Math.round(p.coords.accuracy||0)}م`;},e=>{if(el)el.textContent='تعذر تحديد الموقع: '+e.message},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  };
  window.sendDeliveryOrder=async function(){
    if(!cart.length)return toast('السلة فارغة');
    const name=$('#cust')?.value.trim()||'عميل';
    const phone=$('#customerPhone')?.value.trim()||'';
    const address=$('#addr')?.value.trim()||'';
    const pay=$('#pay')?.value||'cash';
    if(!name||!phone||!address)return toast('اكتب الاسم ورقم الهاتف والعنوان');
    const total=cart.reduce((a,b)=>a+b.price*b.qty,0);
    const items=cart.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price}));
    const r=await db.rpc('create_delivery_order',{p_restaurant_id:store.restaurant.id,p_customer_name:name,p_customer_phone:phone,p_address:address,p_payment_method:pay,p_items:items,p_customer_lat:window.__customerCoords?.lat||null,p_customer_lng:window.__customerCoords?.lng||null});
    if(r.error)return toast(r.error.message||'تعذر إنشاء الطلب');
    const result=r.data?.[0]||r.data; const tracking=result?.tracking_token;
    const trackUrl=location.origin+location.pathname+'#track/'+tracking;
    const msg=`طلب توصيل جديد من ${store.restaurant.name}\nالاسم: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\n\n${cart.map(x=>`${x.name} × ${x.qty}`).join('\n')}\n\nالإجمالي: ${fmtMoney(total)}\nتتبع الطلب: ${trackUrl}`;
    cart=[];updateCart();closeModal();
    const wa=getWaNumber(); window.location.href=`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  };
})();
