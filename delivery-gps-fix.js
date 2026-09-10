(function(){
  const deliveryAdminWithGuard=window.renderAdmin;
  window.renderAdmin=async function(){try{return await deliveryAdminWithGuard()}catch(e){if(!store?.restaurant){return}throw e}};
  window.checkout=function(){
    if(typeof tableFromUrl==='function' && tableFromUrl()) return;
    const total=cart.reduce((a,b)=>a+b.price*b.qty,0);
    $('#modal').innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center" onclick="if(event.target===this)closeModal()"><div class="checkout-modal w-full max-w-lg rounded-3xl p-5 max-h-[94vh] overflow-auto"><div class="flex justify-between items-center"><h2 class="text-2xl font-extrabold">طلب توصيل</h2><button onclick="closeModal()" class="w-10 h-10 rounded-full border">×</button></div><div class="checkout-note rounded-2xl p-4 my-4 font-bold">الإجمالي: ${fmtMoney(total)}</div><div class="space-y-3"><input id="cust" class="w-full border rounded-2xl p-4" placeholder="الاسم"><input id="customerPhone" inputmode="tel" class="w-full border rounded-2xl p-4" placeholder="رقم الهاتف"><textarea id="addr" class="w-full border rounded-2xl p-4" placeholder="العنوان بالتفصيل"></textarea><button type="button" onclick="getCustomerLocation()" class="w-full py-3 rounded-2xl border font-extrabold">📍 استخدام موقعي الحالي</button><div id="customerGps" class="text-xs text-gray-500"></div><select id="pay" onchange="toggleVodafoneFields()" class="w-full border rounded-2xl p-4"><option value="cash">دفع عند الاستلام</option><option value="vodafone">Vodafone Cash</option></select><div id="vodafoneBox" class="vodafone-box hidden rounded-2xl p-4 space-y-3"><div class="font-extrabold">الدفع عبر Vodafone Cash</div><div class="font-bold">التحويل على الرقم: <span dir="ltr">01063537686</span></div><input id="transferPhone" inputmode="tel" class="w-full border rounded-2xl p-4" placeholder="رقم التليفون المحوّل منه"><input id="proof" type="file" accept="image/*" class="w-full border rounded-2xl p-3"><div id="proofName" class="text-xs"></div></div><div class="text-xs text-gray-500">بعد إرسال الطلب سيظهر رابط التتبع، ويمكن للمطعم تعيين المندوب.</div><button onclick="sendDeliveryOrder()" class="w-full py-4 rounded-2xl text-white font-extrabold" style="background:var(--brand)">إرسال طلب التوصيل</button></div></div></div>`;
    if(typeof toggleVodafoneFields==='function')toggleVodafoneFields();
  };
  window.getCustomerLocation=function(){
    if(!navigator.geolocation)return toast('المتصفح لا يدعم GPS');
    if(!window.isSecureContext)return toast('GPS يحتاج HTTPS');
    const el=$('#customerGps');if(el)el.textContent='جارٍ تحديد موقعك...';
    navigator.geolocation.getCurrentPosition(p=>{window.__customerCoords={lat:p.coords.latitude,lng:p.coords.longitude};if(el)el.textContent=`تم تحديد موقعك • دقة تقريبية ${Math.round(p.coords.accuracy||0)}م`;},e=>{if(el)el.textContent='تعذر تحديد الموقع: '+e.message},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  };
  window.sendDeliveryOrder=async function(){
    if(!cart.length)return toast('السلة فارغة');
    const name=$('#cust')?.value.trim()||'عميل';
    const phone=$('#customerPhone')?.value.trim()||'';
    const address=$('#addr')?.value.trim()||'';
    const pay=$('#pay')?.value||'cash',transferPhone=$('#transferPhone')?.value.trim()||'',proofFile=$('#proof')?.files?.[0]||null;
    if(!name||!phone||!address)return toast('اكتب الاسم ورقم الهاتف والعنوان');
    if(pay==='vodafone'&&(!transferPhone||!proofFile))return toast('أدخل رقم التليفون المحوّل منه وأرفق صورة التحويل');
    const total=cart.reduce((a,b)=>a+b.price*b.qty,0);
    const items=cart.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price}));
    let proofUrl=null;
    try{if(pay==='vodafone'&&typeof uploadPaymentProof==='function')proofUrl=await uploadPaymentProof(proofFile)}catch(e){return toast(e?.message||'تعذر رفع صورة التحويل')}
    const r=await db.rpc('create_delivery_order',{p_restaurant_id:store.restaurant.id,p_customer_name:name,p_customer_phone:phone,p_address:address,p_payment_method:pay,p_items:items,p_customer_lat:window.__customerCoords?.lat||null,p_customer_lng:window.__customerCoords?.lng||null,p_transfer_phone:transferPhone||null,p_payment_proof_url:proofUrl});
    if(r.error)return toast(r.error.message||'تعذر إنشاء الطلب');
    const result=r.data?.[0]||r.data;const tracking=result?.tracking_token;const trackUrl=location.origin+location.pathname+'#track/'+tracking;
    const msg=`طلب توصيل جديد من ${store.restaurant.name}\nالاسم: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\n\n${cart.map(x=>`${x.name} × ${x.qty}`).join('\n')}\n\nالإجمالي: ${fmtMoney(total)}\nتتبع الطلب: ${trackUrl}`;
    cart=[];updateCart();closeModal();
    const wa=getWaNumber();window.location.href=`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
  };
})();
