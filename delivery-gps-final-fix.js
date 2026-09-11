(function(){
  'use strict';

  // ------------------------------------------------------------
  // 1) Initial #track / #driver routing race fix.
  // app.js starts async init() before this file loads. When init()
  // finishes it calls renderRouter() and can overwrite the delivery
  // page with the menu. Wait until Supabase/store are ready, then
  // replay the current hash so the delivery router wins.
  // ------------------------------------------------------------
  function replayDeliveryHashWhenReady(){
    const hash=location.hash||'';
    if(!/^#(track|driver)\//.test(hash))return;
    let tries=0;
    const tick=()=>{
      tries++;
      try{
        if(typeof db!=='undefined' && db && typeof store!=='undefined' && store?.restaurant){
          window.dispatchEvent(new HashChangeEvent('hashchange'));
          return;
        }
      }catch(_){ }
      if(tries<80)setTimeout(tick,250);
    };
    setTimeout(tick,100);
  }
  replayDeliveryHashWhenReady();

  // ------------------------------------------------------------
  // 2) Make the WhatsApp action a real user-gesture navigation.
  // The old success button uses an inline onclick. On some Android
  // browsers that can fail after the async order creation. Replace
  // it with a normal anchor while preserving the exact message.
  // ------------------------------------------------------------
  function fixWhatsAppButton(root){
    const buttons=(root||document).querySelectorAll?.('button')||[];
    buttons.forEach(btn=>{
      const text=(btn.textContent||'').trim();
      if(!text.includes('إرسال الطلب للمطعم عبر WhatsApp'))return;
      if(btn.dataset.waFixed==='1')return;
      const onclick=btn.getAttribute('onclick')||'';
      let message='طلب جديد';
      const marker='encodeURIComponent(';
      const i=onclick.indexOf(marker);
      if(i>=0){
        const start=i+marker.length;
        const end=onclick.lastIndexOf(')');
        if(end>start){
          const expr=onclick.slice(start,end).trim();
          try{ message=JSON.parse(expr); }catch(_){ }
        }
      }
      const a=document.createElement('a');
      a.href='https://wa.me/'+getWaNumber()+'?text='+encodeURIComponent(message);
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.className=btn.className;
      a.textContent=text;
      a.dataset.waFixed='1';
      btn.replaceWith(a);
    });
  }

  const modalObserver=new MutationObserver(()=>fixWhatsAppButton(document));
  const startObserver=()=>{
    const modal=document.querySelector('#modal');
    if(modal)modalObserver.observe(modal,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  else startObserver();
  fixWhatsAppButton(document);

  // ------------------------------------------------------------
  // 3) Robust admin login/session handling.
  // Do not bypass authentication. Refresh an existing session when
  // possible, then require a real authenticated Supabase session.
  // ------------------------------------------------------------
  const originalLogin=window.login;
  window.login=async function(e){
    if(e)e.preventDefault();
    try{
      if(!db)return toast('تعذر الاتصال بـ Supabase');
      const email=document.querySelector('#email')?.value.trim()||'';
      const password=document.querySelector('#password')?.value||'';
      if(!email||!password)return toast('اكتب البريد الإلكتروني وكلمة المرور');

      const r=await db.auth.signInWithPassword({email,password});
      if(r.error)return toast(r.error.message||'بيانات الدخول غير صحيحة');

      let session=r.data?.session||null;
      if(!session)session=(await db.auth.getSession())?.data?.session||null;
      if(!session){
        await new Promise(resolve=>setTimeout(resolve,350));
        session=(await db.auth.getSession())?.data?.session||null;
      }
      if(!session)return toast('تم تسجيل الدخول لكن لم يتم تثبيت جلسة الأدمن. حاول مرة أخرى.');

      await loadSupabase();
      location.hash='#admin';
      if(typeof window.renderRouter==='function')window.renderRouter();
    }catch(err){
      console.error('admin login',err);
      toast(err?.message||'تعذر تسجيل الدخول');
    }
  };

  const originalRenderAdmin=window.renderAdmin;
  window.renderAdmin=async function(){
    try{
      if(db){
        let session=(await db.auth.getSession())?.data?.session||null;
        if(!session){
          try{session=(await db.auth.refreshSession())?.data?.session||null;}catch(_){ }
        }
      }
    }catch(_){ }
    return typeof originalRenderAdmin==='function' ? originalRenderAdmin() : null;
  };

  // ------------------------------------------------------------
  // 4) Delivery admin writes: refresh an expired session first,
  // then call the secure owner-checked RPCs already installed in DB.
  // ------------------------------------------------------------
  async function requireAdminSession(){
    if(!db)return null;
    let session=(await db.auth.getSession())?.data?.session||null;
    if(!session){
      try{session=(await db.auth.refreshSession())?.data?.session||null;}catch(_){ }
    }
    return session;
  }

  window.addDriver=async function(){
    const name=document.querySelector('#newDriverName')?.value.trim()||'';
    const phone=document.querySelector('#newDriverPhone')?.value.trim()||null;
    if(!name)return toast('اكتب اسم المندوب');
    const session=await requireAdminSession();
    if(!session)return toast('جلسة الأدمن غير صالحة — سجّل الدخول مرة أخرى');
    if(!store?.restaurant?.id)return toast('بيانات المطعم غير متاحة');
    try{
      const r=await db.rpc('admin_create_driver',{p_restaurant_id:store.restaurant.id,p_name:name,p_phone:phone});
      if(r.error)throw r.error;
      const input=document.querySelector('#newDriverName');
      const phoneInput=document.querySelector('#newDriverPhone');
      if(input)input.value='';
      if(phoneInput)phoneInput.value='';
      toast('تمت إضافة المندوب');
      if(typeof refreshDeliveryPanel==='function')await refreshDeliveryPanel();
    }catch(e){console.error('addDriver',e);toast(e?.message||'تعذر إضافة المندوب');}
  };

  window.toggleDriver=async function(id,active){
    const session=await requireAdminSession();
    if(!session)return toast('جلسة الأدمن غير صالحة — سجّل الدخول مرة أخرى');
    try{
      const r=await db.rpc('admin_update_driver',{p_restaurant_id:store.restaurant.id,p_driver_id:id,p_active:active});
      if(r.error)throw r.error;
      if(typeof refreshDeliveryPanel==='function')await refreshDeliveryPanel();
    }catch(e){console.error('toggleDriver',e);toast(e?.message||'تعذر تعديل المندوب');}
  };

  window.assignDriver=async function(orderId){
    const driverId=document.querySelector('#assign-'+orderId)?.value||null;
    if(!driverId)return toast('اختر مندوبًا أولًا');
    const session=await requireAdminSession();
    if(!session)return toast('جلسة الأدمن غير صالحة — سجّل الدخول مرة أخرى');
    try{
      const r=await db.rpc('admin_assign_delivery',{p_restaurant_id:store.restaurant.id,p_order_id:orderId,p_driver_id:driverId});
      if(r.error)throw r.error;
      if(typeof refreshDeliveryPanel==='function')await refreshDeliveryPanel();
      toast('تم تعيين المندوب');
    }catch(e){console.error('assignDriver',e);toast(e?.message||'تعذر تعيين المندوب');}
  };
})();
