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

  // Assignment button only. Driver selection itself is isolated below so no page/router
  // event can cancel or navigate away from the control.
  document.addEventListener('click',function(e){
    const button=e.target?.closest?.('#deliveryControlPanel [data-assign]');
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

  function isolateSelect(select){
    if(!select||select.dataset.rosIsolated==='1')return;
    const options=[...select.options].map(o=>({value:String(o.value||''),text:o.textContent||''}));
    const wrap=document.createElement('div');
    wrap.className='relative flex-1 min-w-0';
    wrap.dataset.rosDriverDropdown='1';
    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='w-full border p-3 rounded-xl text-right flex items-center justify-between gap-2';
    trigger.style.cssText='background:var(--surface)!important;color:var(--text)!important;border-color:color-mix(in srgb,var(--text) 14%,transparent)!important;min-height:48px;';
    trigger.dataset.rosDriverTrigger='1';
    const label=document.createElement('span');
    const arrow=document.createElement('span');
    arrow.textContent='⌄';
    arrow.setAttribute('aria-hidden','true');
    trigger.append(label,arrow);
    const menu=document.createElement('div');
    menu.className='absolute right-0 left-0 mt-2 rounded-xl border shadow-xl overflow-hidden';
    menu.style.cssText='display:none;z-index:80;background:var(--surface2);border-color:color-mix(in srgb,var(--text) 14%,transparent);';
    menu.dataset.rosDriverMenu='1';

    function sync(){
      const current=options.find(o=>o.value===String(select.value||''));
      label.textContent=current?.text||'اختر مندوبًا';
      trigger.disabled=!!select.disabled;
    }
    options.forEach(o=>{
      const item=document.createElement('button');
      item.type='button';
      item.className='block w-full p-3 text-right font-bold';
      item.textContent=o.text;
      item.dataset.value=o.value;
      item.onclick=function(ev){
        ev.preventDefault();ev.stopPropagation();
        select.value=o.value;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        menu.style.display='none';
        sync();
      };
      menu.appendChild(item);
    });
    trigger.onclick=function(ev){
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
      menu.style.display=menu.style.display==='none'?'block':'none';
    };
    wrap.append(trigger,menu);
    select.dataset.rosIsolated='1';
    select.style.display='none';
    select.setAttribute('aria-hidden','true');
    select.parentNode.insertBefore(wrap,select);
    sync();
  }

  document.addEventListener('click',function(e){
    document.querySelectorAll('[data-ros-driver-menu]').forEach(m=>{
      const w=m.closest('[data-ros-driver-dropdown]');
      if(w&&!w.contains(e.target))m.style.display='none';
    });
  },false);

  async function enhance(){
    if(typeof db==='undefined'||!db||!window.store?.restaurant?.id)return;
    const panel=document.querySelector('#deliveryControlPanel');
    if(!panel)return;
    const wrap=panel.querySelector('#rosDrivers');
    if(!wrap)return;
    wrap.querySelectorAll('select[data-sel]').forEach(isolateSelect);
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