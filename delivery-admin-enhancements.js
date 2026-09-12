(function(){
  'use strict';
  if(window.__ROS_DELIVERY_ADMIN_ENHANCEMENTS__) return;
  window.__ROS_DELIVERY_ADMIN_ENHANCEMENTS__=true;

  async function assignDelivery(orderId,driverId,button,select,panel){
    if(typeof db==='undefined'||!db||!window.store?.restaurant?.id)return;
    if(!driverId){if(typeof toast==='function')toast('اختر مندوبًا أولًا');return}
    button.disabled=true;
    select.disabled=true;
    const oldText=button.textContent;
    button.textContent='جارٍ التعيين...';
    try{
      const rr=await db.rpc('admin_assign_delivery',{
        p_restaurant_id:store.restaurant.id,
        p_order_id:orderId,
        p_driver_id:driverId
      });
      if(rr.error)throw rr.error;
      if(typeof toast==='function')toast('تم تعيين المندوب بنجاح');
      panel.querySelector('#rosRefresh')?.click();
    }catch(e){
      button.disabled=false;
      select.disabled=false;
      button.textContent=oldText;
      if(typeof toast==='function')toast(e?.message||'تعذر تعيين المندوب');
      console.error('admin_assign_delivery',e);
    }
  }

  // Keep the native <select> completely untouched for pointer/mouse activation.
  // Only stop the final click from reaching any parent navigation handler.
  document.addEventListener('click',function(e){
    const select=e.target?.closest?.('#deliveryControlPanel select[data-sel]');
    if(select){
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    const button=e.target?.closest?.('[data-assign]');
    if(!button)return;
    const panel=button.closest('#deliveryControlPanel');
    if(!panel)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const orderId=String(button.dataset.assign||'');
    const assignSelect=Array.from(panel.querySelectorAll('select[data-sel]')).find(x=>String(x.dataset.sel||'')===orderId);
    if(!assignSelect)return;
    assignDelivery(orderId,String(assignSelect.value||''),button,assignSelect,panel);
  },true);

  async function enhance(){
    if(typeof db==='undefined'||!db||!window.store?.restaurant?.id)return;
    const panel=document.querySelector('#deliveryControlPanel');
    if(!panel)return;
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
      const b=document.createElement('button');b.type='button';b.dataset.driverToggle=d.id;b.dataset.driverId=d.id;b.dataset.driverActive=String(d.active);b.textContent=d.active?'إيقاف المندوب':'تفعيل المندوب';b.className='rounded-xl border px-4 py-2 font-bold';b.setAttribute('data-driver-toggle','1');
      b.onclick=async function(){const active=this.dataset.driverActive!=='true';this.disabled=true;const rr=await db.rpc('admin_update_driver',{p_restaurant_id:store.restaurant.id,p_driver_id:this.dataset.driverId,p_active:active});if(rr.error){this.disabled=false;return typeof toast==='function'&&toast(rr.error.message||'تعذر تعديل حالة المندوب')}if(typeof toast==='function')toast(active?'تم تفعيل المندوب':'تم إيقاف المندوب');panel.querySelector('#rosRefresh')?.click()};a.parentElement.appendChild(b);
      const del=document.createElement('button');del.type='button';del.dataset.driverDelete=d.id;del.textContent='حذف';del.className='rounded-xl border border-red-500/40 px-4 py-2 font-bold text-red-400';del.onclick=async function(){const driverName=d.name||'هذا المندوب';if(!confirm(`هل أنت متأكد من حذف ${driverName}؟\n\nلن يمكن التراجع عن هذا الإجراء.`))return;this.disabled=true;const rr=await db.rpc('admin_delete_driver',{p_driver_id:d.id});if(rr.error){this.disabled=false;const msg=rr.error.message||'تعذر حذف المندوب';return typeof toast==='function'&&toast(msg==='driver_has_active_delivery'?'لا يمكن حذف المندوب لأنه مرتبط بطلب دليفري نشط. أوقف الطلب أو أكمله أولاً.':msg)}if(typeof toast==='function')toast('تم حذف المندوب');panel.querySelector('#rosRefresh')?.click()};a.parentElement.appendChild(del);
    });
  }
  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>enhance().catch(console.warn),120)};new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule();
  if(!window.__ROS_ADMIN_UX_LOADER__){window.__ROS_ADMIN_UX_LOADER__=true;const s=document.createElement('script');s.src='admin-ux-notifications-v1.js?v=3';s.defer=true;document.head.appendChild(s)}
})();