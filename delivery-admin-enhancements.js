(function(){
  'use strict';
  if(window.__ROS_DELIVERY_ADMIN_ENHANCEMENTS__) return;
  window.__ROS_DELIVERY_ADMIN_ENHANCEMENTS__=true;

  async function enhance(){
    const panel=document.querySelector('#deliveryControlPanel');
    if(!panel||!window.db||!window.store?.restaurant?.id)return;
    const wrap=panel.querySelector('#rosDrivers');
    if(!wrap)return;
    const r=await db.from('drivers').select('id,name,phone,active,access_token').eq('restaurant_id',store.restaurant.id);
    if(r.error)return;
    const byToken=new Map((r.data||[]).map(d=>[String(d.access_token),d]));
    wrap.querySelectorAll('a[href*="#driver/"]').forEach(a=>{
      const token=decodeURIComponent((a.getAttribute('href')||'').split('#driver/')[1]||'');
      const d=byToken.get(token);
      if(!d)return;
      if(a.parentElement?.querySelector('[data-driver-toggle]'))return;

      const b=document.createElement('button');
      b.type='button';
      b.dataset.driverToggle=d.id;
      b.dataset.driverId=d.id;
      b.dataset.driverActive=String(d.active);
      b.textContent=d.active?'إيقاف المندوب':'تفعيل المندوب';
      b.className='rounded-xl border px-4 py-2 font-bold';
      b.setAttribute('data-driver-toggle','1');
      b.onclick=async function(){
        const active=this.dataset.driverActive!=='true';
        this.disabled=true;
        const rr=await db.rpc('admin_update_driver',{p_restaurant_id:store.restaurant.id,p_driver_id:this.dataset.driverId,p_active:active});
        if(rr.error){this.disabled=false;return typeof toast==='function'&&toast(rr.error.message||'تعذر تعديل حالة المندوب')}
        if(typeof toast==='function')toast(active?'تم تفعيل المندوب':'تم إيقاف المندوب');
        const refresh=panel.querySelector('#rosRefresh');
        if(refresh)refresh.click();
      };
      a.parentElement.appendChild(b);

      const del=document.createElement('button');
      del.type='button';
      del.dataset.driverDelete=d.id;
      del.textContent='حذف';
      del.className='rounded-xl border border-red-500/40 px-4 py-2 font-bold text-red-400';
      del.onclick=async function(){
        const driverName=d.name||'هذا المندوب';
        if(!confirm(`هل أنت متأكد من حذف ${driverName}؟\n\nلن يمكن التراجع عن هذا الإجراء.`))return;
        this.disabled=true;
        const rr=await db.rpc('admin_delete_driver',{p_driver_id:d.id});
        if(rr.error){
          this.disabled=false;
          const msg=rr.error.message||'تعذر حذف المندوب';
          return typeof toast==='function'&&toast(msg==='driver_has_active_delivery'?'لا يمكن حذف المندوب لأنه مرتبط بطلب دليفري نشط. أوقف الطلب أو أكمله أولاً.':msg);
        }
        if(typeof toast==='function')toast('تم حذف المندوب');
        const refresh=panel.querySelector('#rosRefresh');
        if(refresh)refresh.click();
      };
      a.parentElement.appendChild(del);
    });
  }
  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>enhance().catch(console.warn),120)};
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  schedule();
})();
