(function(){
  'use strict';
  if(window.__ROS_CUSTOMER_FLOW_V1__) return;
  window.__ROS_CUSTOMER_FLOW_V1__=true;

  const escHtml=v=>{try{return esc(String(v??''));}catch(_){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}};

  async function uploadDriverPhoto(file){
    if(!file) return null;
    if(!window.db?.storage) throw new Error('خدمة رفع الصور غير متاحة');
    if(file.size>5*1024*1024) throw new Error('صورة المندوب يجب ألا تتجاوز 5MB');
    if(!String(file.type||'').startsWith('image/')) throw new Error('اختر ملف صورة صالح');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${window.store?.restaurant?.id||'restaurant'}/${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from('driver-images').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
    if(up.error) throw up.error;
    const pub=db.storage.from('driver-images').getPublicUrl(path);
    return pub?.data?.publicUrl||null;
  }

  function ensureDriverPhotoInput(){
    const panel=document.querySelector('#deliveryPanel');
    if(!panel||panel.querySelector('#newDriverPhoto')) return;
    const name=panel.querySelector('#newDriverName');
    const phone=panel.querySelector('#newDriverPhone');
    if(!name||!phone) return;
    const input=document.createElement('input');
    input.id='newDriverPhoto';
    input.type='file';
    input.accept='image/*';
    input.className='border rounded-2xl p-3';
    input.title='صورة المندوب اختيارية';
    const hint=document.createElement('div');
    hint.className='text-xs mt-1';
    hint.style.color='var(--muted)';
    hint.textContent='صورة المندوب اختيارية — حتى 5MB';
    const wrap=document.createElement('div');
    wrap.append(input,hint);
    phone.parentNode.insertBefore(wrap,phone.nextSibling);
    const grid=name.parentNode;
    if(grid?.classList?.contains('md:grid-cols-3')) grid.classList.remove('md:grid-cols-3'),grid.classList.add('md:grid-cols-4');
  }

  function wrapAddDriver(){
    if(typeof window.addDriver!=='function'||window.__ROS_ADD_DRIVER_PHOTO__) return;
    window.__ROS_ADD_DRIVER_PHOTO__=true;
    const original=window.addDriver;
    window.addDriver=async function(){
      const name=document.querySelector('#newDriverName')?.value.trim()||'';
      const phone=document.querySelector('#newDriverPhone')?.value.trim()||null;
      const file=document.querySelector('#newDriverPhoto')?.files?.[0]||null;
      if(!name){try{toast('اكتب اسم المندوب')}catch(_){alert('اكتب اسم المندوب')}return;}
      const button=document.querySelector('#deliveryPanel button[onclick*="addDriver"]');
      if(button){button.disabled=true;button.dataset.oldText=button.textContent;button.textContent='جارٍ الإضافة...';}
      try{
        let photo_url=null;
        if(file) photo_url=await uploadDriverPhoto(file);
        const r=await db.from('drivers').insert({restaurant_id:store.restaurant.id,name,phone,photo_url,active:true}).select('id,name,phone,photo_url,access_token').single();
        if(r.error) throw r.error;
        try{toast('تمت إضافة المندوب'+(photo_url?' مع الصورة':' بنجاح'));}catch(_){alert('تمت إضافة المندوب');}
        if(typeof refreshDeliveryPanel==='function') await refreshDeliveryPanel();
      }catch(e){
        console.error('driver photo add',e);
        try{toast(e?.message||'تعذر إضافة المندوب')}catch(_){alert(e?.message||'تعذر إضافة المندوب');}
      }finally{
        if(button){button.disabled=false;button.textContent=button.dataset.oldText||'إضافة مندوب';}
      }
    };
  }

  // Customer tracking is owned exclusively by customer-tracking-v2.js.
  // This legacy layer remains responsible only for driver/admin helpers.
  const observer=new MutationObserver(()=>{ensureDriverPhotoInput();wrapAddDriver();});
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{ensureDriverPhotoInput();wrapAddDriver();},250);
  window.addEventListener('hashchange',handleRoute,false);
  setTimeout(handleRoute,350);
})();
