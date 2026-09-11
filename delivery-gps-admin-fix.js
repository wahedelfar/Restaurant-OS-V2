(function(){
  'use strict';

  window.addDriver = async function(){
    const name = document.querySelector('#newDriverName')?.value.trim();
    const phone = document.querySelector('#newDriverPhone')?.value.trim() || null;
    if(!name) return toast('اكتب اسم المندوب');

    const session = (await db?.auth.getSession())?.data?.session;
    if(!session) return toast('جلسة الأدمن غير صالحة — سجّل الدخول مرة أخرى');

    const r = await db.rpc('admin_create_driver', {
      p_restaurant_id: store.restaurant.id,
      p_name: name,
      p_phone: phone
    });
    if(r.error) return toast(r.error.message || 'تعذر إضافة المندوب');

    toast('تمت إضافة المندوب');
    if(typeof refreshDeliveryPanel === 'function') await refreshDeliveryPanel();
  };

  window.toggleDriver = async function(id, active){
    const session = (await db?.auth.getSession())?.data?.session;
    if(!session) return toast('جلسة الأدمن غير صالحة — سجّل الدخول مرة أخرى');

    const r = await db.rpc('admin_update_driver', {
      p_restaurant_id: store.restaurant.id,
      p_driver_id: id,
      p_active: active
    });
    if(r.error) return toast(r.error.message || 'تعذر تعديل المندوب');

    if(typeof refreshDeliveryPanel === 'function') await refreshDeliveryPanel();
  };

  window.assignDriver = async function(orderId){
    const driverId = document.querySelector('#assign-'+orderId)?.value || null;
    if(!driverId) return toast('اختر مندوبًا أولًا');

    const session = (await db?.auth.getSession())?.data?.session;
    if(!session) return toast('جلسة الأدمن غير صالحة — سجّل الدخول مرة أخرى');

    const r = await db.rpc('admin_assign_delivery', {
      p_restaurant_id: store.restaurant.id,
      p_order_id: orderId,
      p_driver_id: driverId
    });
    if(r.error) return toast(r.error.message || 'تعذر تعيين المندوب');

    if(typeof refreshDeliveryPanel === 'function') await refreshDeliveryPanel();
    toast('تم تعيين المندوب');
  };
})();
