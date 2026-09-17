(async function(){
  try {
    // Load the known-good base runtime, but DO NOT let it initialize yet.
    // The V2 feature layer must be installed first because several feature
    // scripts patch router/checkout/admin/delivery behavior at load time.
    const baseRuntime='https://raw.githubusercontent.com/wahedelfar/Restaurant-OS-V2/f35da203aa2df8a47ce0aba17cc8b675e6d9caa3/app.js';
    const res=await fetch(baseRuntime,{cache:'no-store'});
    if(!res.ok) throw new Error('تعذر تحميل محرك الموقع');
    let code=await res.text();

    const start=code.indexOf('async function loadSupabase(){');
    const end=code.indexOf('\nasync function init(){',start);
    if(start<0 || end<0) throw new Error('تعذر تحديد محرك تحميل البيانات');

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
  store.products=(products.data||[]).map(p=>{
    const sub=subById.get(p.subcategory_id);
    const sizes=Array.isArray(p.sizes)?p.sizes:[];
    const first=sizes[0]||{};
    return {id:p.id,category_id:sub?.category_id||null,name:p.name,description:p.description||'',price:Number(first.price||0),image_url:p.image_url||p.image||'',available:p.is_available!==false,sort_order:p.sort_order||0,sizes:sizes};
  });
  const tables=await db.from('tables').select('*').order('table_number');
  if(tables.error)throw tables.error;
  store.tables=tables.data||[];
  const {data:{session}}=await db.auth.getSession();
  if(session){const o=await db.from('orders').select('*').eq('restaurant_id',r.data.id).order('created_at',{ascending:false}).limit(100);if(o.error)throw o.error;store.orders=o.data||[]}else store.orders=[];
  return true
}`;

    code=code.slice(0,start)+patchedLoad+code.slice(end);

    // The historical runtime ends with init();. Remove that eager call so
    // feature patches are installed before the first render/router pass.
    code=code.replace(/\ninit\(\);\s*$/,'\n');

    // Evaluate base runtime first so feature scripts can safely reference its
    // functions/globals, but it will remain dormant until all patches load.
    (0,eval)(code);

    const base='https://raw.githubusercontent.com/wahedelfar/Restaurant-OS-V2/7364c7fd05d6fe10ee096d9625b5357a8145618d/';
    const featureScripts=[
      'product-modifiers-v2.js','product-image-upload-v1.js','dine-in-admin-guard-v2.js','cart-bridge.js',
      'delivery-gps-clean-v2.js','customer-tracking-v2.js','delivery-ui-polish-v1.js','delivery-idempotency-v1.js',
      'order-modifier-bridge-v1.js','delivery-admin-enhancements.js','driver-photo-field-v2.js','admin-payment-proof-v1.js',
      'admin-tables-launcher-v1.js','admin-driver-launcher-v1.js','admin-driver-legacy-hide-v1.js','admin-products-launcher-v1.js',
      'admin-drivers-management-v1.js','admin-action-dock-v1.js','admin-ux-notifications-v1.js','delivery-hardening-v4.js',
      'driver-app-v1.js','delivery-map-persistence-v1.js','delivery-order-details-v1.js','driver-delivered-button-fix-v1.js',
      'pwa-install.js','dine-in-v10-fix.js','dine-in-track-router-v1.js','driver-gps-lifecycle-v1.js','kitchen-admin-v1.js',
      'delivery-gps-fix.js','delivery-customer-flow-v1.js','delivery-admin-dedupe-v1.js'
    ];
    for(const name of featureScripts){
      await new Promise((resolve,reject)=>{
        const s=document.createElement('script');
        s.src=base+name+'?v=7364c7';
        s.onload=resolve;
        s.onerror=()=>reject(new Error('تعذر تحميل ميزة '+name));
        document.body.appendChild(s);
      });
    }

    // All V2 patches are now installed. Start the application exactly once.
    if(typeof window.init==='function') await window.init();
    else if(typeof init==='function') await init();
    else throw new Error('محرك التشغيل لم يجهز دالة init');
  } catch(e) {
    console.error('ROS full V2 loader failed',e);
    const el=document.getElementById('app');
    if(el) el.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f6f3;font-family:Cairo,Arial,sans-serif;direction:rtl"><div style="max-width:520px;background:#fff;border-radius:24px;padding:28px;text-align:center;box-shadow:0 10px 40px #0001"><h1 style="font-size:26px;font-weight:800;margin:0 0 10px">تعذر تشغيل الموقع</h1><p style="color:#666;line-height:1.8;margin:0">تعذر تحميل ملفات الموقع الأساسية. أعد المحاولة.</p><button onclick="location.reload()" style="margin-top:18px;background:#111;color:#fff;border:0;border-radius:14px;padding:12px 22px;font-weight:700">إعادة المحاولة</button></div></main>';
  }
})();