(function(){
  'use strict';
  if(window.__ROS_DELIVERY_HARDENING_V4__) return;
  window.__ROS_DELIVERY_HARDENING_V4__=true;

  const deliveryRouter=window.renderRouter;
  const deliveryAdmin=window.renderAdmin;
  const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}};
  const isSpecialRoute=()=>/^#(track|driver)\//.test(location.hash||'');
  const routeKind=()=>String(location.hash||'').startsWith('#track/')?'track':String(location.hash||'').startsWith('#driver/')?'driver':null;

  // 1) Make track/driver routes survive app.js async initialization.
  let routeBusy=false,routeTimer=0;
  async function forceRoute(){
    const kind=routeKind();
    if(!kind||routeBusy||typeof deliveryRouter!=='function')return;
    const app=document.querySelector('#app');
    const marker=kind==='track'?'#rosTrackBox':'#rosDriverBox';
    if(app&&app.querySelector(marker))return;
    routeBusy=true;
    try{await deliveryRouter();}catch(e){console.error('delivery route',e)}
    finally{routeBusy=false}
  }
  function scheduleRoute(){
    clearTimeout(routeTimer);
    routeTimer=setTimeout(forceRoute,60);
  }
  window.addEventListener('hashchange',scheduleRoute);
  const appObserver=new MutationObserver(()=>{if(isSpecialRoute())scheduleRoute()});
  appObserver.observe(document.body,{childList:true,subtree:true});
  let routeAttempts=0;
  const routeWatch=setInterval(()=>{
    if(!isSpecialRoute()){routeAttempts=0;return}
    const kind=routeKind(),marker=kind==='track'?'#rosTrackBox':'#rosDriverBox';
    if(document.querySelector(marker)){routeAttempts=0;return}
    scheduleRoute();
    if(++routeAttempts>80){clearInterval(routeWatch);routeAttempts=0}
  },100);
  setTimeout(scheduleRoute,100);
  setTimeout(scheduleRoute,1000);
  setTimeout(scheduleRoute,2500);
  setTimeout(scheduleRoute,5000);

  // 2) Keep the normal dashboard's "آخر الطلبات" synchronized after admin login.
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

  // 3) Fix assignment RPC contract: the DB function requires restaurant_id too.
  document.addEventListener('click',async function(e){
    const b=e.target?.closest?.('[data-assign]');
    if(!b||!window.db||!window.store?.restaurant?.id)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const orderId=b.getAttribute('data-assign');
    const panel=b.closest('#deliveryControlPanel');
    const sel=panel?.querySelector(`[data-sel="${CSS.escape(orderId)}"]`);
    const driverId=sel?.value||'';
    if(!driverId)return notify('اختر مندوبًا أولًا');
    b.disabled=true;
    try{
      const r=await db.rpc('admin_assign_delivery',{
        p_restaurant_id:store.restaurant.id,
        p_order_id:orderId,
        p_driver_id:driverId
      });
      if(r.error)throw r.error;
      notify('تم تعيين المندوب بنجاح');
      await window.renderAdmin();
    }catch(err){
      b.disabled=false;
      notify(err?.message||'تعذر تعيين المندوب');
    }
  },true);

  // 4) Make the order-success card polished, closable, and WhatsApp-friendly.
  function polishSuccessModal(){
    const modal=document.querySelector('#modal');
    if(!modal)return;
    const title=[...modal.querySelectorAll('h2')].find(x=>x.textContent.includes('تم استلام طلبك'));
    if(!title)return;
    const card=title.closest('.checkout-modal');
    if(!card||card.dataset.hardened==='1')return;
    card.dataset.hardened='1';
    card.classList.add('relative');
    const close=document.createElement('button');
    close.type='button';
    close.setAttribute('aria-label','إغلاق');
    close.textContent='×';
    close.className='absolute top-3 left-3 w-10 h-10 rounded-full border font-bold text-2xl flex items-center justify-center';
    close.onclick=()=>{if(typeof closeModal==='function')closeModal();else modal.innerHTML=''};
    card.prepend(close);

    const track=card.querySelector('a[href*="#track/"]');
    const wa=card.querySelector('a[href*="wa.me/"]');
    if(track&&wa){
      const trackHref=track.getAttribute('href');
      try{
        const u=new URL(wa.href);
        const old=u.searchParams.get('text')||'';
        if(!old.includes('متابعة الطلب')){
          u.searchParams.set('text',old+'\n\n🔗 متابعة الطلب:\n'+trackHref);
          wa.href=u.toString();
        }
      }catch(_){ }
      wa.className='mt-3 w-full py-3 rounded-2xl font-extrabold flex items-center justify-center gap-2';
      wa.style.cssText='background:#25D366;color:#fff;border:0;box-shadow:0 8px 22px #25D36633';
      wa.innerHTML='<span style="font-size:20px">◉</span><span>إرسال الطلب عبر WhatsApp</span>';
    }
    if(track){
      track.innerHTML='<span>متابعة الطلب</span>';
      track.className='block mt-5 w-full py-4 rounded-2xl text-white font-extrabold text-center';
    }
  }
  const modalObserver=new MutationObserver(polishSuccessModal);
  modalObserver.observe(document.body,{childList:true,subtree:true});
  setTimeout(polishSuccessModal,100);

  // 5) Normalize driver links so the button always carries a clean hash route.
  function normalizeDriverLinks(){
    document.querySelectorAll('a[href*="#driver/"]').forEach(a=>{
      const href=a.getAttribute('href')||'';
      const i=href.indexOf('#driver/');
      if(i<0)return;
      const hash=href.slice(i);
      const base=(window.APP_CONFIG?.publicAppUrl||location.origin).replace(/\/$/,'');
      a.setAttribute('href',base+hash);
      a.target='_blank';
      a.rel='noopener noreferrer';
    });
  }
  const linkObserver=new MutationObserver(normalizeDriverLinks);
  linkObserver.observe(document.body,{childList:true,subtree:true});
  normalizeDriverLinks();
})();
