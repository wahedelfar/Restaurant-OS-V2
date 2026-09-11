(function(){
  'use strict';
  if(window.__ROS_PRODUCT_IMAGE_UPLOAD_V1__) return;
  window.__ROS_PRODUCT_IMAGE_UPLOAD_V1__=true;

  const MAX_WIDTH=800;
  const QUALITY=.7;
  const BUCKET='product-images';
  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function localRestaurantId(){
    try{
      if(typeof store!=='undefined'){
        const id=store?.restaurant?.id;
        if(id && UUID_RE.test(String(id))) return String(id);
      }
    }catch(_){ }
    return null;
  }

  async function getRestaurantId(){
    const localId=localRestaurantId();
    if(localId)return localId;

    if(typeof db==='undefined' || !db)throw new Error('اتصال Supabase غير متاح');
    const slug=String((window.APP_CONFIG&&APP_CONFIG.restaurantSlug)||'').trim();
    if(slug){
      const q=await db.from('restaurants').select('id').eq('slug',slug).maybeSingle();
      if(q.error)throw q.error;
      if(q.data?.id && UUID_RE.test(String(q.data.id)))return String(q.data.id);
    }

    const name=typeof store!=='undefined'?String(store?.restaurant?.name||'').trim():'';
    if(name){
      const q=await db.from('restaurants').select('id').eq('name',name).maybeSingle();
      if(q.error)throw q.error;
      if(q.data?.id && UUID_RE.test(String(q.data.id)))return String(q.data.id);
    }

    throw new Error('تعذر تحديد معرف المطعم الصحيح');
  }

  function setStatus(text, busy){
    const el=document.querySelector('#productImageStatus');
    const btn=document.querySelector('#saveProductBtn');
    if(el){
      el.textContent=text||'';
      el.style.display=text?'block':'none';
    }
    if(btn){
      btn.disabled=!!busy;
      btn.style.opacity=busy?'.65':'';
    }
  }

  function showPreview(src){
    const wrap=document.querySelector('#productImagePreview');
    if(!wrap)return;
    wrap.innerHTML=src
      ? '<img src="'+String(src).replace(/"/g,'&quot;')+'" alt="معاينة الصورة" style="width:100%;height:180px;object-fit:cover;border-radius:16px;display:block">'
      : '';
    wrap.style.display=src?'block':'none';
  }

  function compressImage(file){
    return new Promise((resolve,reject)=>{
      if(!file || !file.type.startsWith('image/'))return reject(new Error('اختر صورة صالحة'));
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('تعذر قراءة الصورة'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('تعذر فتح الصورة'));
        img.onload=()=>{
          const scale=Math.min(1,MAX_WIDTH/img.width);
          const width=Math.max(1,Math.round(img.width*scale));
          const height=Math.max(1,Math.round(img.height*scale));
          const canvas=document.createElement('canvas');
          canvas.width=width;
          canvas.height=height;
          const ctx=canvas.getContext('2d',{alpha:true});
          if(!ctx)return reject(new Error('المتصفح لا يدعم ضغط الصور'));
          ctx.drawImage(img,0,0,width,height);
          canvas.toBlob(blob=>{
            if(!blob)return reject(new Error('تعذر ضغط الصورة'));
            resolve(blob);
          },'image/webp',QUALITY);
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadProductImage(file){
    if(typeof db==='undefined' || !db)throw new Error('اتصال Supabase غير متاح');
    const restaurantId=await getRestaurantId();
    if(!UUID_RE.test(restaurantId))throw new Error('معرف المطعم غير صالح');
    const compressed=await compressImage(file);
    const path=restaurantId+'/'+crypto.randomUUID()+'.webp';
    const up=await db.storage.from(BUCKET).upload(path,compressed,{
      contentType:'image/webp',
      cacheControl:'31536000',
      upsert:false
    });
    if(up.error)throw up.error;
    const pub=db.storage.from(BUCKET).getPublicUrl(path);
    const url=pub?.data?.publicUrl;
    if(!url)throw new Error('تعذر الحصول على رابط الصورة');
    return {url,size:compressed.size,path};
  }

  function enhanceImageField(){
    const old=document.querySelector('#pi');
    if(!old)return;
    if(document.querySelector('#piFile'))return;

    const currentUrl=old.value||'';
    old.type='hidden';
    old.setAttribute('data-image-url','1');

    const file=document.createElement('input');
    file.type='file';
    file.id='piFile';
    file.accept='image/*';
    file.className=old.className;
    file.setAttribute('aria-label','صورة المنتج');
    old.parentNode.insertBefore(file,old);

    const preview=document.createElement('div');
    preview.id='productImagePreview';
    preview.style.cssText='display:none;margin-top:10px;overflow:hidden;border-radius:16px;border:1px solid color-mix(in srgb,var(--text) 12%,transparent);background:var(--surface2)';
    file.parentNode.insertBefore(preview,file.nextSibling);

    const status=document.createElement('div');
    status.id='productImageStatus';
    status.style.cssText='display:none;margin-top:8px;font-size:13px;font-weight:800;color:var(--muted)';
    file.parentNode.insertBefore(status,preview.nextSibling);

    if(currentUrl)showPreview(currentUrl);

    file.addEventListener('change',async function(){
      const selected=this.files?.[0];
      if(!selected)return;
      if(!selected.type.startsWith('image/')){
        this.value='';
        setStatus('اختر صورة صالحة',false);
        return;
      }
      setStatus('جاري ضغط ورفع الصورة...',true);
      try{
        const result=await uploadProductImage(selected);
        old.value=result.url;
        showPreview(result.url);
        setStatus('',false);
      }catch(err){
        console.error('product image upload',err);
        old.value=currentUrl;
        this.value='';
        showPreview(old.value);
        setStatus('تعذر رفع الصورة: '+(err?.message||'خطأ غير معروف'),false);
      }
    });
  }

  const originalProductForm=window.productForm;
  if(typeof originalProductForm==='function'){
    window.productForm=function(id){
      const result=originalProductForm.apply(this,arguments);
      setTimeout(enhanceImageField,0);
      return result;
    };
  }

  new MutationObserver(()=>enhanceImageField()).observe(document.body,{childList:true,subtree:true});
  setTimeout(enhanceImageField,50);
})();