(function(){
'use strict';

let lastAdminRender=0;
let cleaning=false;

function adminSession(){
  if(typeof db==='undefined'||!db)return Promise.resolve(null);
  return (async()=>{
    let s=(await db.auth.getSession())?.data?.session||null;
    if(!s){try{s=(await db.auth.refreshSession())?.data?.session||null}catch(_){}}
    return s;
  })();
}

function dedupeDeliveryUI(){
  if(cleaning)return;
  cleaning=true;
  try{
    const app=document.querySelector('#app');
    if(!app)return;
    const candidates=[...app.querySelectorAll('#deliveryPanel,#deliverySection,[data-delivery-panel]')];
    if(candidates.length>1)candidates.slice(0,-1).forEach(x=>x.remove());

    const heads=[...app.querySelectorAll('h1,h2,h3,h4,div')].filter(x=>{
      const t=(x.textContent||'').trim();
      return t==='إدارة التوصيل' || t==='إدارة الدليفري' || t==='Delivery Management';
    });
    if(heads.length>1){
      heads.slice(0,-1).forEach(h=>{
        const p=h.closest('section')||h.closest('[data-delivery]')||h.parentElement;
        if(p && p!==app)p.remove();
      });
    }
  }finally{cleaning=false;}
}

// Keep the delivery admin panel from being duplicated by repeated router calls.
const observer=new MutationObserver(()=>{
  if(location.hash==='#admin'||location.hash.startsWith('#admin/')){
    clearTimeout(observer._t); observer._t=setTimeout(dedupeDeliveryUI,20);
  }
});
observer.observe(document.documentElement,{childList:true,subtree:true});

// Re-run the delivery route after app.js finishes its async initialization.
function replayDeliveryRoute(){
  const h=location.hash||'';
  if(!/^#(track|driver)\//.test(h))return;
  let n=0;
  const go=()=>{
    n++;
    if(window.__deliveryRouteBusy)return;
    if(typeof window.renderRouter==='function'){
      try{window.renderRouter();}catch(e){console.error(e)}
    }
    if(n<12)setTimeout(go,500);
  };
  setTimeout(go,150);
}
window.addEventListener('hashchange',()=>setTimeout(replayDeliveryRoute,50));
replayDeliveryRoute();

// Admin login: handle the actual form submit, regardless of the function name
// used by the legacy V8 admin markup.
document.addEventListener('submit',async function(e){
  const form=e.target;
  if(!form || location.hash!=='#admin')return;
  const email=form.querySelector('#email,#adminEmail,input[type=email]');
  const password=form.querySelector('#password,#adminPassword,input[type=password]');
  if(!email||!password)return;
  e.preventDefault(); e.stopImmediatePropagation();
  try{
    if(typeof db==='undefined'||!db)return toast('تعذر الاتصال بـ Supabase');
    const r=await db.auth.signInWithPassword({email:email.value.trim(),password:password.value});
    if(r.error)throw r.error;
    const s=(await db.auth.getSession())?.data?.session||r.data?.session;
    if(!s)throw new Error('لم يتم إنشاء جلسة دخول');
    if(typeof loadSupabase==='function')await loadSupabase();
    location.hash='#admin';
    setTimeout(()=>{try{window.renderRouter?.();dedupeDeliveryUI()}catch(_){ }},50);
  }catch(err){console.error('admin login',err);toast(err?.message||'تعذر تسجيل الدخول');}
},true);

// Also expose the common legacy login names so inline onclick handlers work.
async function doLogin(e){
  if(e)e.preventDefault();
  const email=document.querySelector('#email,#adminEmail,input[type=email]');
  const password=document.querySelector('#password,#adminPassword,input[type=password]');
  if(!email||!password)return toast('بيانات الدخول غير موجودة');
  try{
    const r=await db.auth.signInWithPassword({email:email.value.trim(),password:password.value});
    if(r.error)throw r.error;
    const s=(await db.auth.getSession())?.data?.session||r.data?.session;
    if(!s)throw new Error('لم يتم إنشاء جلسة دخول');
    if(typeof loadSupabase==='function')await loadSupabase();
    location.hash='#admin';
  }catch(err){toast(err?.message||'تعذر تسجيل الدخول');}
}
window.login=doLogin; window.adminLogin=doLogin; window.handleAdminLogin=doLogin;

// Secure delivery admin actions. These use the RPCs installed in Supabase.
window.addDriver=async function(){
  const name=document.querySelector('#newDriverName')?.value.trim()||'';
  const phone=document.querySelector('#newDriverPhone')?.value.trim()||null;
  if(!name)return toast('اكتب اسم المندوب');
  const s=await adminSession();
  if(!s)return toast('جلسة الأدمن غير صالحة — سجّل الدخول مرة أخرى');
  if(!store?.restaurant?.id)return toast('بيانات المطعم غير متاحة');
  const r=await db.rpc('admin_create_driver',{p_restaurant_id:store.restaurant.id,p_name:name,p_phone:phone});
  if(r.error)return toast(r.error.message||'تعذر إضافة المندوب');
  const a=document.querySelector('#newDriverName'),b=document.querySelector('#newDriverPhone');
  if(a)a.value='';if(b)b.value='';
  toast('تمت إضافة المندوب');
  setTimeout(dedupeDeliveryUI,30);
};
window.toggleDriver=async function(id,active){
  const s=await adminSession();if(!s)return toast('جلسة الأدمن غير صالحة — سجّل الدخول مرة أخرى');
  const r=await db.rpc('admin_update_driver',{p_restaurant_id:store.restaurant.id,p_driver_id:id,p_active:active});
  if(r.error)return toast(r.error.message||'تعذر تعديل المندوب');
  setTimeout(dedupeDeliveryUI,30);
};
window.assignDriver=async function(orderId){
  const driverId=document.querySelector('#assign-'+orderId)?.value||'';
  if(!driverId)return toast('اختر مندوبًا أولًا');
  const s=await adminSession();if(!s)return toast('جلسة الأدمن غير صالحة — سجّل الدخول مرة أخرى');
  const r=await db.rpc('admin_assign_delivery',{p_restaurant_id:store.restaurant.id,p_order_id:orderId,p_driver_id:driverId});
  if(r.error)return toast(r.error.message||'تعذر تعيين المندوب');
  toast('تم تعيين المندوب');setTimeout(dedupeDeliveryUI,30);
};

// Replace the fragile inline WhatsApp action after the success modal is rendered.
function fixWA(){
  document.querySelectorAll('button').forEach(b=>{
    if((b.textContent||'').includes('إرسال الطلب للمطعم عبر WhatsApp') && !b.dataset.fixedWa){
      const old=b.getAttribute('onclick')||'';
      const m=old.match(/encodeURIComponent\((.*)\)\)/);
      b.dataset.fixedWa='1';
      if(m){
        const expr=m[1];
        b.onclick=function(){try{window.location.href='https://wa.me/'+getWaNumber()+'?text='+encodeURIComponent(eval(expr))}catch(e){console.error(e)}};
      }
    }
  });
}
new MutationObserver(fixWA).observe(document.body,{childList:true,subtree:true});
fixWA();
})();
