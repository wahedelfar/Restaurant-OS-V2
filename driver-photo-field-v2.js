(function(){
  'use strict';
  if(window.__ROS_DRIVER_PHOTO_FIELD_V3__) return;
  window.__ROS_DRIVER_PHOTO_FIELD_V3__=true;

  function notify(msg){try{typeof toast==='function'?toast(msg):alert(msg)}catch(_){alert(msg)}}

  async function uploadPhoto(file){
    if(!file)return null;
    if(file.size>5*1024*1024)throw new Error('صورة المندوب يجب ألا تتجاوز 5MB');
    if(!String(file.type||'').startsWith('image/'))throw new Error('اختر ملف صورة صالح');
    const restaurantId=window.store?.restaurant?.id;
    if(!restaurantId||!window.db?.storage)throw new Error('خدمة رفع الصور غير متاحة');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${restaurantId}/${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from('driver-images').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
    if(up.error)throw up.error;
    return db.storage.from('driver-images').getPublicUrl(path)?.data?.publicUrl||null;
  }

  function ensure(){
    try{
      const panel=document.querySelector('#deliveryControlPanel');
      if(!panel)return;
      if(panel.querySelector('#newDriverPhoto'))return;
      const name=panel.querySelector('#rosName');
      const phone=panel.querySelector('#rosPhone');
      if(!name||!phone)return;

      const wrap=document.createElement('div');
      wrap.id='rosDriverPhotoField';
      wrap.className='mt-1';
      wrap.style.cssText='width:100%;display:block;';

      const label=document.createElement('label');
      label.htmlFor='newDriverPhoto';
      label.textContent='صورة المندوب (اختياري)';
      label.className='block text-sm font-bold mb-2';

      const input=document.createElement('input');
      input.id='newDriverPhoto';
      input.name='newDriverPhoto';
      input.type='file';
      input.accept='image/*';
      input.className='w-full border p-3';
      input.style.cssText='display:block!important;width:100%;min-height:48px;';
      input.setAttribute('aria-label','صورة المندوب');

      const hint=document.createElement('div');
      hint.textContent='صورة المندوب اختيارية — JPG / PNG / WEBP — حتى 5MB';
      hint.className='text-xs mt-1';
      hint.style.color='var(--muted)';

      wrap.append(label,input,hint);
      phone.parentNode.insertBefore(wrap,phone.nextSibling);
    }catch(e){console.error('ROS driver photo field',e)}
  }

  function bindAdd(){
    const panel=document.querySelector('#deliveryControlPanel');
    const button=panel?.querySelector('#rosAdd');
    if(!panel||!button||button.dataset.rosPhotoBound==='1')return;
    button.dataset.rosPhotoBound='1';
    button.onclick=async function(){
      const name=panel.querySelector('#rosName')?.value.trim()||'';
      const phone=panel.querySelector('#rosPhone')?.value.trim()||null;
      const file=panel.querySelector('#newDriverPhoto')?.files?.[0]||null;
      if(!name)return notify('اكتب اسم المندوب');
      this.disabled=true;
      const oldText=this.textContent;
      this.textContent='جارٍ إضافة المندوب...';
      try{
        const photo_url=await uploadPhoto(file);
        const r=await db.rpc('admin_create_driver_with_photo',{p_restaurant_id:store.restaurant.id,p_name:name,p_phone:phone,p_photo_url:photo_url});
        if(r.error)throw r.error;
        panel.querySelector('#rosName').value='';
        panel.querySelector('#rosPhone').value='';
        const photoInput=panel.querySelector('#newDriverPhoto');
        if(photoInput)photoInput.value='';
        notify(photo_url?'تمت إضافة المندوب مع الصورة':'تمت إضافة المندوب بنجاح');
        panel.querySelector('#rosRefresh')?.click();
      }catch(e){
        console.error('driver photo add',e);
        notify(e?.message||'تعذر إضافة المندوب');
      }finally{
        this.disabled=false;
        this.textContent=oldText;
      }
    };
  }

  function ensureAll(){ensure();bindAdd()}
  ensureAll();
  const observer=new MutationObserver(ensureAll);
  observer.observe(document.body,{childList:true,subtree:true});
  setInterval(ensureAll,1000);
})();
