(async function(){
  try {
    const url='https://raw.githubusercontent.com/wahedelfar/Restaurant-OS-V2/203bc4419814536338fec340f26826ff98bd1a14/app.js';
    const res=await fetch(url,{cache:'no-store'});
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
    (0,eval)(code);

    // The legacy storefront is only the base shell. These feature layers restore
    // the production Delivery/GPS/Driver/Customer flow that was added later.
    const featureScripts=[
      'delivery-gps-fix.js?v=restore1',
      'delivery-customer-flow-v1.js?v=restore1',
      'delivery-admin-dedupe-v1.js?v=restore1'
    ];
    await Promise.all(featureScripts.map(src=>new Promise((resolve,reject)=>{
      if(document.querySelector(`script[src^="${src.split('?')[0]}"]`)){resolve();return;}
      const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('تعذر تحميل '+src));document.body.appendChild(s);
    })));
  } catch(e) {
    console.error('ROS legacy app loader failed',e);
    const el=document.getElementById('app');
    if(el) el.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f6f3;font-family:Cairo,Arial,sans-serif;direction:rtl"><div style="max-width:520px;background:#fff;border-radius:24px;padding:28px;text-align:center;box-shadow:0 10px 40px #0001"><h1 style="font-size:26px;font-weight:800;margin:0 0 10px">تعذر تشغيل الموقع</h1><p style="color:#666;line-height:1.8;margin:0">تعذر تحميل ملفات الموقع الأساسية. أعد المحاولة.</p><button onclick="location.reload()" style="margin-top:18px;background:#111;color:#fff;border:0;border-radius:14px;padding:12px 22px;font-weight:700">إعادة المحاولة</button></div></main>';
  }
})();
