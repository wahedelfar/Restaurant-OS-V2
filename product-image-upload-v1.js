(function(){
  'use strict';
  if(window.__ROS_PRODUCT_IMAGE_UPLOAD_V3__) return;
  window.__ROS_PRODUCT_IMAGE_UPLOAD_V3__=true;

  const MAX_WIDTH=1200;
  const QUALITY=.82;
  const BUCKET='product-images';
  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function restaurantId(){
    try{
      if(typeof store!=='undefined'){
        const id=String(store?.restaurant?.id||'').trim();
        if(UUID_RE.test(id))return id;
      }
    }catch(_){ }
    throw new Error('تعذر تحديد معرف المطعم الصحيح');
  }

  function getDb(){
    try{
      if(typeof db!=='undefined'&&db)return db;
    }catch(_){ }
    throw new Error('اتصال Supabase غير متاح');
  }

  function setStatus(text,busy){
    const el=document.querySelector('#productImageStatus');
    const btn=document.querySelector('#saveProductBtn');
    if(el){el.textContent=text||'';el.style.display=text?'block':'none'}
    if(btn){btn.disabled=!!busy;btn.style.opacity=busy?'.65':''}
  }

  function showPreview(src){
    const wrap=document.querySelector('#productImagePreview');
    if(!wrap)return;
    wrap.innerHTML=src?'<img src="'+String(src).replace(/"/g,'&quot;')+'" alt="معاينة الصورة" style="width:100%;height:180px;object-fit:cover;border-radius:16px;display:block">':'';
    wrap.style.display=src?'block':'none';
  }

  function previewLocal(file){
    if(!file||!file.type.startsWith('image/'))return;
    const reader=new FileReader();
    reader.onload=()=>showPreview(reader.result);
    reader.readAsDataURL(file);
  }

  function compressImage(file){
    return new Promise((resolve,reject)=>{
      if(!file||!file.type.startsWith('image/'))return reject(new Error('اختر صورة صالحة'));
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
          canvas.width=width;canvas.height=height;
          const ctx=canvas.getContext('2d');
          if(!ctx)return reject(new Error('المتصفح لا يدعم معالجة الصور'));
          ctx.drawImage(img,0,0,width,height);
          canvas.toBlob(blob=>{
            if(!blob)return reject(new Error('تعذر تجهيز الصورة'));
            resolve(blob);
          },'image/webp',QUALITY);
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadProductImage(file){
    const client=getDb();
    const id=restaurantId();
    const blob=await compressImage(file);
    const path=id+'/'+crypto.randomUUID()+'.webp';
    const result=await client.storage.from(BUCKET).upload(path,blob,{
      contentType:'image/webp',
      cacheControl:'31536000',
      upsert:false
    });
    if(result.error)throw result.error;
    const publicResult=client.storage.from(BUCKET).getPublicUrl(path);
    const url=publicResult?.data?.publicUrl;
    if(!url)throw new Error('تعذر الحصول على رابط الصورة بعد الرفع');
    return {url,path,size:blob.size};
  }

  function enhanceImageField(){
    const old=document.querySelector('#pi');
    if(!old)return;
    if(document.querySelector('#piFile')){
      if(old.type!=='hidden')old.type='hidden';
      return;
    }

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

    file.addEventListener('change',function(){
      const selected=this.files?.[0];
      if(!selected)return;
      if(!selected.type.startsWith('image/')){
        this.value='';
        setStatus('اختر صورة صالحة',false);
        return;
      }
      previewLocal(selected);
      setStatus('تم اختيار الصورة — اضغط حفظ لرفعها',false);
    });
  }

  function wrapProductForm(){
    if(typeof window.productForm!=='function'||window.__ROS_PRODUCT_FORM_UPLOAD_WRAPPED__)return;
    const original=window.productForm;
    window.productForm=function(id){
      const result=original.apply(this,arguments);
      setTimeout(enhanceImageField,0);
      return result;
    };
    window.__ROS_PRODUCT_FORM_UPLOAD_WRAPPED__=true;
  }

  function wrapSaveProduct(){
    try{
      if(typeof saveProduct!=='function'||window.__ROS_SAVE_PRODUCT_UPLOAD_WRAPPED__)return;
      const original=saveProduct;
      saveProduct=async function(id){
        const file=document.querySelector('#piFile')?.files?.[0]||null;
        if(file){
          const btn=document.querySelector('#saveProductBtn');
          if(btn){btn.disabled=true;btn.textContent='جاري رفع الصورة...';btn.style.opacity='.65'}
          setStatus('جاري ضغط ورفع الصورة...',true);
          try{
            const result=await uploadProductImage(file);
            const url=document.querySelector('#pi');
            if(url){url.value=result.url;url.setAttribute('data-image-path',result.path)}
            const input=document.querySelector('#piFile');
            if(input){input.dataset.uploadedUrl=result.url;try{input.value=''}catch(_){} }
            showPreview(result.url);
            setStatus('تم رفع الصورة بنجاح',false);
          }catch(err){
            console.error('product image upload before save',err);
            setStatus('تعذر رفع الصورة: '+(err?.message||'خطأ غير معروف'),false);
            const btn2=document.querySelector('#saveProductBtn');
            if(btn2){btn2.disabled=false;btn2.textContent=id?'حفظ التعديل':'حفظ';btn2.style.opacity=''}
            return;
          }
        }
        return original(id);
      };
      window.__ROS_SAVE_PRODUCT_UPLOAD_WRAPPED__=true;
    }catch(err){console.warn('saveProduct wrapper',err)}
  }

  function boot(){
    wrapProductForm();
    wrapSaveProduct();
    enhanceImageField();
  }

  boot();
  let tries=0;
  const timer=setInterval(()=>{
    boot();
    if(++tries>80)clearInterval(timer);
  },100);
  new MutationObserver(()=>boot()).observe(document.body,{childList:true,subtree:true});
})();