(async function(){
  const app=document.getElementById('app');
  const fail=(e)=>{
    console.error('ROS V2 loader failed:',e);
    const msg=e&&e.message?e.message:String(e);
    if(app) app.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f6f3;font-family:Cairo,Arial,sans-serif;direction:rtl"><div style="max-width:620px;background:#fff;border-radius:24px;padding:28px;text-align:center;box-shadow:0 10px 40px #0001"><h1 style="font-size:26px;font-weight:800;margin:0 0 10px">تعذر تشغيل الموقع</h1><p style="color:#666;line-height:1.8;margin:0">'+String(msg).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))+'</p><button onclick="location.reload()" style="margin-top:18px;background:#111;color:#fff;border:0;border-radius:14px;padding:12px 22px;font-weight:700">إعادة المحاولة</button></div></main>';
  };
  try{
    const ts=Date.now();
    const baseRuntime='https://raw.githubusercontent.com/wahedelfar/Restaurant-OS-V2/main/app.js';
    const r=await fetch(baseRuntime+'?v='+ts,{cache:'no-store'});
    if(!r.ok) throw new Error('تعذر تحميل محرك الموقع الأساسي ('+r.status+')');
    let code=await r.text();
    const start=code.indexOf('async function loadSupabase(){');
    const end=code.indexOf('\nasync function init(){',start);
    if(start<0||end<0) throw new Error('نسخة محرك الموقع الأساسية غير متوافقة مع الإصلاح الحالي');
    const patchedLoad=`async function loadSupabase(){
  const r=await db.from('restaurants').select('*').eq('slug',C.restaurantSlug).maybeSingle();
  if(r.error)throw r.error;
  if(!r.data){store={restaurant:null,categories:[],products:[],tables:[],orders:[]};return false}
  store.restaurant=r.data;
  const cats=await db.from('categories').select('*').order('name');
  if(cats.error)throw cats.error;
  store.categories=cats.data||[];
  const subs=await db.from('subcategories').select('*');
  if(subs.error)throw subs.error;
  const subById=new Map((subs.data||[]).map(s=>[s.id,s]));
  const products=await db.from('products_v2').select('*').order('created_at');
  if(products.error)throw products.error;
  store.products=(products.data||[]).map(p=>{const sub=subById.get(p.subcategory_id);const sizes=Array.isArray(p.sizes)?p.sizes:[];const first=sizes[0]||{};return {id:p.id,category_id:sub?.category_id||null,name:p.name,description:p.description||'',price:Number(first.price||0),image_url:p.image_url||p.image||'',available:p.is_available!==false,sort_order:p.sort_order||0,sizes:sizes};});
  const tables=await db.from('tables').select('*').order('table_number');
  if(tables.error)throw tables.error;
  store.tables=tables.data||[];
  const {data:{session}}=await db.auth.getSession();
  if(session){const o=await db.from('orders').select('*').eq('restaurant_id',r.data.id).order('created_at',{ascending:false}).limit(100);if(o.error)throw o.error;store.orders=o.data||[]}else store.orders=[];
  return true;
}`;
    code=code.slice(0,start)+patchedLoad+code.slice(end);
    code=code.replace(/async function init\(\)\{/,'async function __rosInit(){');
    code=code.replace(/\ninit\(\);\s*$/,'\n');
    if(!/async function __rosInit\(\)/.test(code)) throw new Error('تعذر تجهيز دالة تشغيل ROS');
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.text=code;
      let settled=false;
      const onerr=(ev)=>{if(!settled){settled=true;window.removeEventListener('error',onerr);reject(new Error('خطأ داخل محرك الموقع: '+(ev.message||'JavaScript error')))}};
      window.addEventListener('error',onerr);
      document.body.appendChild(s);
      setTimeout(()=>{if(!settled){settled=true;window.removeEventListener('error',onerr);resolve();}},0);
    });
    const base='/';
    const features=['product-modifiers-v2.js','product-image-upload-v1.js','dine-in-admin-guard-v2.js','cart-bridge.js','delivery-gps-clean-v2.js','customer-tracking-v2.js','delivery-ui-polish-v1.js','delivery-idempotency-v1.js','order-modifier-bridge-v1.js','delivery-admin-enhancements.js','driver-photo-field-v2.js','admin-payment-proof-v1.js','admin-tables-launcher-v1.js','admin-driver-launcher-v1.js','admin-driver-legacy-hide-v1.js','admin-products-launcher-v1.js','admin-drivers-management-v1.js','admin-ux-notifications-v1.js','delivery-hardening-v4.js','driver-app-v1.js','delivery-map-persistence-v1.js','delivery-order-details-v1.js','driver-delivered-button-fix-v1.js','pwa-install.js','dine-in-v10-fix.js','dine-in-track-router-v1.js','driver-gps-lifecycle-v1.js','kitchen-admin-v1.js','delivery-gps-fix.js','delivery-customer-flow-v1.js','delivery-admin-dedupe-v1.js'];
    for(const name of features){
      try{
        const fr=await fetch(base+name+'?v='+ts,{cache:'no-store'});
        if(!fr.ok){
          console.warn('[ROS] Skipping missing feature:', name, fr.status);
          continue;
        }
        const text=await fr.text();
        await new Promise((resolve,reject)=>{
          const s=document.createElement('script');
          let settled=false;
          const onerr=(ev)=>{if(!settled){settled=true;window.removeEventListener('error',onerr);reject(new Error('خطأ في '+name+': '+(ev.message||'JavaScript error')))}};
          window.addEventListener('error',onerr);
          s.text=text;
          document.body.appendChild(s);
          setTimeout(()=>{if(!settled){settled=true;window.removeEventListener('error',onerr);resolve();}},0);
        });
      }catch(err){
        console.warn('[ROS] Failed to load feature, skipping:', name, err);
        continue;
      }
    }
    try{
      const fix=await fetch('/delivery-submit-fix-v1.js?v='+ts,{cache:'no-store'});
      if(fix.ok){
        const fixScript=document.createElement('script');fixScript.text=await fix.text();document.body.appendChild(fixScript);
      }
    }catch(e){ console.warn('fix file skipped', e); }
    if(typeof window.__rosInit!=='function') throw new Error('محرك ROS تم تحميله لكن دالة التشغيل غير متاحة');
    await window.__rosInit();
  }catch(e){fail(e)}
})();
