(function(){
  'use strict';
  if(window.__ROS_DINEIN_V9_FIX__) return;
  window.__ROS_DINEIN_V9_FIX__=true;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const ok=()=>!!(window.db&&window.store&&window.store.restaurant&&window.store.restaurant.id);
  const esc=v=>typeof window.esc==='function'?window.esc(v??''):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  const toast=m=>{try{window.toast?window.toast(m):console.log(m)}catch(_){}};
  const prep=[5,15,30,45,60];

  async function createDineOrder(){
    const table=typeof window.tableFromUrl==='function'?window.tableFromUrl():null;
    if(!table||!ok()) return false;
    if(!Array.isArray(window.cart)||!window.cart.length){toast('السلة فارغة');return true;}
    const name=document.querySelector('#cust')?.value.trim()||'عميل';
    const items=window.cart.map(x=>({product_id:x.id,quantity:Number(x.qty||1)}));
    const btn=document.querySelector('#rosDineSubmitBtn');
    if(btn){btn.disabled=true;btn.textContent='جارٍ إرسال الطلب...';}
    try{
      const r=await window.db.rpc('create_dine_in_order',{
        p_restaurant_id:window.store.restaurant.id,
        p_table_number:Number(table),
        p_customer_name:name,
        p_items:items
      });
      if(r.error) throw r.error;
      const row=Array.isArray(r.data)?r.data[0]:r.data;
      const token=row?.tracking_token;
      if(!token) throw new Error('لم يتم إنشاء رابط متابعة الطلب');
      window.cart=[];
      if(typeof window.updateCart==='function')window.updateCart();
      const modal=document.querySelector('#modal');
      if(modal){
        modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center">
          <div class="text-5xl mb-3">✓</div>
          <h2 class="text-2xl font-extrabold">تم إرسال طلبك للمطبخ</h2>
          <p class="mt-2" style="color:var(--muted)">الطاولة رقم ${esc(table)}</p>
          <div class="mt-4 rounded-2xl p-4 font-bold" style="background:var(--surface2)">أهلاً بحضرتك في مطعمنا — طلبك وصل للمطبخ.</div>
          <button id="rosTrackOrderBtn" type="button" class="mt-5 w-full py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">حالة طلبك</button>
          <button id="rosBackAfterOrder" type="button" class="mt-3 w-full py-3 rounded-2xl border font-bold">العودة للقائمة</button>
        </div></div>`;
        document.querySelector('#rosTrackOrderBtn')?.addEventListener('click',()=>{location.hash='track/'+encodeURIComponent(token)});
        document.querySelector('#rosBackAfterOrder')?.addEventListener('click',()=>{if(typeof window.closeModal==='function')window.closeModal();else modal.innerHTML='';});
      }
      return true;
    }catch(e){
      console.error('create_dine_in_order',e);
      toast('تعذر إرسال الطلب: '+(e?.message||'خطأ غير معروف'));
      return true;
    }finally{
      if(btn){btn.disabled=false;btn.textContent='إتمام الطلب';}
    }
  }

  function patchCheckout(){
    if(typeof window.checkout!=='function'||window.checkout.__rosV9)return;
    const original=window.checkout;
    const wrapped=function(){
      const table=typeof window.tableFromUrl==='function'?window.tableFromUrl():null;
      return table?showDineCheckout():original();
    };
    wrapped.__rosV9=true;
    window.checkout=wrapped;
  }

  function showDineCheckout(){
    if(!ok())return false;
    const table=window.tableFromUrl();
    if(!Array.isArray(window.cart)||!window.cart.length){toast('السلة فارغة');return true;}
    const modal=document.querySelector('#modal');
    if(!modal)return true;
    modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center" onclick="if(event.target===this)closeModal()"><div class="checkout-modal w-full max-w-lg rounded-3xl p-5 max-h-[92vh] overflow-auto">
      <div class="flex justify-between items-center"><h2 class="text-2xl font-extrabold">تأكيد الطلب</h2><button onclick="closeModal()" class="w-10 h-10 rounded-full border text-2xl" aria-label="إغلاق">×</button></div>
      <div class="checkout-note rounded-2xl p-4 my-4 font-bold">حضرتك شرفتنا على — الطاولة رقم ${esc(table)}</div>
      <input id="cust" class="w-full border rounded-2xl p-4" placeholder="اسم اختياري">
      <button id="rosDineSubmitBtn" type="button" class="w-full mt-5 py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">إتمام الطلب</button>
    </div></div>`;
    document.querySelector('#rosDineSubmitBtn')?.addEventListener('click',createDineOrder);
    return true;
  }

  async function deleteAllOrdersFixed(){
    if(!window.db||!window.store?.restaurant?.id){toast('بيانات المطعم غير متاحة');return;}
    const rid=window.store.restaurant.id;
    const btn=document.getElementById('deleteOrdersBtn');
    if(btn){btn.disabled=true;btn.textContent='جارٍ التحقق...';}
    try{
      const q=await window.db.from('orders').select('id').eq('restaurant_id',rid).limit(1);
      if(q.error)throw q.error;
      if(!q.data?.length){toast('لا توجد طلبات للحذف');return;}
      if(!confirm('سيتم حذف جميع الطلبات السابقة نهائيًا. هل أنت متأكد؟'))return;
      if(btn)btn.textContent='جارٍ الحذف...';
      const d=await window.db.from('orders').delete().eq('restaurant_id',rid);
      if(d.error)throw d.error;
      if(Array.isArray(window.store.orders))window.store.orders=[];
      toast('تم حذف الطلبات السابقة');
      if(typeof window.renderAdmin==='function')await window.renderAdmin();
    }catch(e){console.error('deleteAllOrdersFixed',e);toast('تعذر حذف الطلبات: '+(e?.message||'خطأ غير معروف'));}
    finally{if(btn){btn.disabled=false;btn.textContent='حذف الطلبات السابقة';}}
  }

  function patchDelete(){
    window.deleteAllOrders=deleteAllOrdersFixed;
    const btn=document.getElementById('deleteOrdersBtn');
    if(btn&&!btn.__rosV9){btn.__rosV9=true;btn.onclick=deleteAllOrdersFixed;}
  }

  async function renderPanel(){
    if(!ok()||!location.hash.startsWith('#admin'))return;
    const main=document.querySelector('#app main');
    if(!main)return;
    let panel=document.getElementById('rosV9DinePanel');
    if(!panel){panel=document.createElement('section');panel.id='rosV9DinePanel';panel.className='bg-white rounded-3xl p-5 mt-5';main.appendChild(panel);}
    const q=await window.db.from('orders').select('id,table_number,customer_name,total,status,prep_minutes,admin_message,created_at,order_type').eq('restaurant_id',window.store.restaurant.id).eq('order_type','dine_in').order('created_at',{ascending:false}).limit(30);
    if(q.error){console.warn('V9 dine panel query',q.error);return;}
    const rows=q.data||[];
    panel.innerHTML=`<div class="flex items-center justify-between gap-3"><div><div class="text-sm font-bold opacity-70">DINE-IN</div><h2 class="text-2xl font-extrabold">طلبات الصالة</h2></div><button id="rosV9Refresh" class="px-4 py-2 rounded-xl border font-bold">تحديث</button></div>
      <div class="grid gap-4 mt-5">${rows.length?rows.map(o=>`<article class="rounded-3xl border p-4" style="background:var(--surface2)"><div class="flex justify-between gap-3"><div><b class="text-lg">الطاولة ${esc(o.table_number||'—')}</b><div class="text-sm mt-1" style="color:var(--muted)">${esc(o.customer_name||'عميل')}</div></div><b>${money(o.total)}</b></div>
      <div class="mt-4"><div class="font-bold mb-2">وقت التجهيز</div><div class="grid grid-cols-5 gap-2">${prep.map(n=>`<button type="button" data-v9-prep="${esc(o.id)}" data-min="${n}" class="rounded-xl border p-3 font-extrabold ${Number(o.prep_minutes)===n?'ring-2':''}" style="${Number(o.prep_minutes)===n?'background:var(--brand);color:#111;border-color:var(--brand)':''}">${n} د</button>`).join('')}</div></div>
      <div class="mt-4"><div class="font-bold mb-2">حالة الطلب</div><div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><button type="button" data-v9-status="${esc(o.id)}" data-value="preparing" data-message="جاري تجهيز طلب حضرتك" class="rounded-xl border p-3 font-extrabold">جاري التجهيز</button><button type="button" data-v9-status="${esc(o.id)}" data-value="ready" data-message="تم التجهيز — طلبك جاهز" class="rounded-xl border p-3 font-extrabold">تم التجهيز / طلبك جاهز</button><button type="button" data-v9-status="${esc(o.id)}" data-value="delivered" data-message="شكرًا لاختيارنا" class="rounded-xl border p-3 font-extrabold">شكرًا لاختيارنا</button></div></div>
      <div class="mt-4 rounded-2xl p-3" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">الحالة الحالية</div><b>${esc(o.admin_message||o.status||'تم استلام الطلب')}</b></div></article>`).join(''):'<div class="text-center py-10" style="color:var(--muted)">لا توجد طلبات صالة حاليًا.</div>'}</div>`;

    document.getElementById('rosV9Refresh')?.addEventListener('click',renderPanel);
    panel.querySelectorAll('[data-v9-prep]').forEach(b=>b.addEventListener('click',async()=>{
      b.disabled=true;
      const r=await window.db.from('orders').update({prep_minutes:Number(b.dataset.min)}).eq('id',b.dataset.v9Prep).eq('restaurant_id',window.store.restaurant.id);
      if(r.error)toast('تعذر حفظ وقت التجهيز: '+r.error.message);else {toast('تم حفظ وقت التجهيز');await renderPanel();}
      b.disabled=false;
    }));
    panel.querySelectorAll('[data-v9-status]').forEach(b=>b.addEventListener('click',async()=>{
      b.disabled=true;
      const r=await window.db.from('orders').update({status:b.dataset.value,admin_message:b.dataset.message}).eq('id',b.dataset.v9Status).eq('restaurant_id',window.store.restaurant.id);
      if(r.error)toast('تعذر تحديث حالة الطلب: '+r.error.message);else {toast('تم تحديث حالة الطلب');await renderPanel();}
      b.disabled=false;
    }));
  }

  async function boot(){
    for(let i=0;i<150;i++){if(ok())break;await sleep(100);}
    patchCheckout();patchDelete();
    if(location.hash.startsWith('#admin'))await renderPanel();
    window.addEventListener('hashchange',async()=>{patchDelete();patchCheckout();if(location.hash.startsWith('#admin'))await renderPanel();});
    setInterval(()=>{patchDelete();patchCheckout();if(location.hash.startsWith('#admin'))renderPanel();},7000);
  }
  boot();
})();