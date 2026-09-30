
/* ===== ROS LOCAL MODULE: app.js ===== */
const C=window.APP_CONFIG;let db=null,store={restaurant:null,categories:[],products:[],tables:[],orders:[]};let cart=[];let currentCat='all';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=n=>`${Number(n||0).toFixed(0)} ${C.currency}`;
function toast(x){$('#toast').innerHTML=`<div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] rounded-2xl bg-black text-white px-5 py-3 shadow-2xl">${esc(x)}</div>`;setTimeout(()=>$('#toast').innerHTML='',2500)}
function persist(){localStorage.setItem('ros_v2_demo',JSON.stringify(store))}
function seed(){store.restaurant={...C.demoRestaurant};store.categories=structuredClone(C.demoCategories);store.products=structuredClone(C.demoProducts);store.tables=Array.from({length:30},(_,i)=>({id:'demo-t'+(i+1),restaurant_id:store.restaurant.id,table_number:i+1,active:true}));store.orders=[]}
const THEMES={
  obsidian:{name:'Obsidian Gold',accent:'#D4AF37',bg:'#0D0E10',surface:'#17191D',surface2:'#202329',text:'#F6F1E7',muted:'#A9A39A'},
  emerald:{name:'Emerald Noir',accent:'#3BB78F',bg:'#071311',surface:'#101D1A',surface2:'#172824',text:'#F1F7F3',muted:'#A7B8B1'},
  burgundy:{name:'Burgundy Luxe',accent:'#C85C62',bg:'#160B0D',surface:'#241316',surface2:'#31191D',text:'#FFF2F1',muted:'#BDA8A9'},
  navy:{name:'Midnight Navy',accent:'#6D8CFF',bg:'#080D18',surface:'#121A2A',surface2:'#19233A',text:'#F1F4FF',muted:'#AAB4CC'},
  sand:{name:'Champagne Sand',accent:'#B58A52',bg:'#17130E',surface:'#231D15',surface2:'#30271B',text:'#FFF8EC',muted:'#C7B9A3'},
  plum:{name:'Royal Plum',accent:'#B07BE8',bg:'#110B18',surface:'#1D1428',surface2:'#281B38',text:'#FAF3FF',muted:'#BBAAC7'}
};
function theme(){
  const c=store.restaurant?.primary_color||C.defaultTheme;
  const palette=Object.values(THEMES).find(x=>x.accent.toLowerCase()===String(c).toLowerCase())||THEMES.obsidian;
  document.documentElement.style.setProperty('--brand',c);
  document.documentElement.style.setProperty('--bg',palette.bg);
  document.documentElement.style.setProperty('--surface',palette.surface);
  document.documentElement.style.setProperty('--surface2',palette.surface2);
  document.documentElement.style.setProperty('--text',palette.text);
  document.documentElement.style.setProperty('--muted',palette.muted);
  document.body.style.background=palette.bg;
  document.body.style.color=palette.text;
}
function applyThemeColor(v){
  store.restaurant.primary_color=v;
  theme();
  renderMenu();
}
async function loadSupabase(){
  const r=await db.from('restaurants').select('*').eq('slug',C.restaurantSlug).maybeSingle();
  if(r.error)throw r.error;
  if(!r.data){store={restaurant:null,categories:[],products:[],tables:[],orders:[]};return false}
  store.restaurant=r.data;
  const cats=await db.from('categories').select('*').eq('restaurant_id',r.data.id).order('sort_order');
  if(cats.error)throw cats.error;
  store.categories=cats.data||[];
  const products=await db.from('products_v2').select('*').eq('restaurant_id',r.data.id).order('created_at');
  if(products.error)throw products.error;
  store.products=(products.data||[]).map(p=>{const sizes=Array.isArray(p.sizes)?p.sizes:[];const first=sizes[0]||{};return {id:p.id,name:p.name,description:p.description||'',price:Number(first.price||0),image_url:p.image_url||'',available:p.is_available!==false,sort_order:p.sort_order||0,sizes,category_id:null,restaurant_id:p.restaurant_id};});
  const tables=await db.from('tables').select('*').eq('restaurant_id',r.data.id).order('table_number');
  if(tables.error)throw tables.error;
  store.tables=tables.data||[];
  const {data:{session}}=await db.auth.getSession();
  if(session){const o=await db.from('orders').select('*').eq('restaurant_id',r.data.id).order('created_at',{ascending:false}).limit(100);if(o.error)throw o.error;store.orders=o.data||[]}else store.orders=[];
  return true
}
function showFatal(message){
  const appEl=$('#app');
  if(appEl) appEl.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f6f3;font-family:Cairo,Arial,sans-serif"><div style="max-width:520px;background:#fff;border-radius:24px;padding:28px;text-align:center;box-shadow:0 10px 40px #0001"><h1 style="font-size:26px;font-weight:800;margin:0 0 10px">تعذر تشغيل الموقع</h1><p style="color:#666;line-height:1.8;margin:0">${esc(message)}</p><button onclick="location.reload()" style="margin-top:18px;background:#111;color:#fff;border:0;border-radius:14px;padding:12px 22px;font-weight:700">إعادة المحاولة</button></div></main>`;
}
async function init(){
  try{
    if(C.mode==='supabase'&&C.supabaseUrl&&C.supabaseAnonKey){
      if(!window.supabase||typeof window.supabase.createClient!=='function'){
        showFatal('مكتبة Supabase لم يتم تحميلها. افتح الموقع مرة أخرى أو جرّب Chrome.');
        return;
      }
      db=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
      try{const ok=await loadSupabase();if(!ok)toast('لم يتم إنشاء المطعم بعد — افتح لوحة الإدارة لإنشائه')}catch(e){console.error(e);seed();toast('تعذر الاتصال بـ Supabase — تم تشغيل نسخة العرض المحلية')}
    }else{seed()}
    renderRouter();
  }catch(e){console.error(e);showFatal('حدث خطأ غير متوقع أثناء تشغيل الموقع: '+(e?.message||e));}
}
function renderRouter(){theme();const p=location.hash||'#menu';if(p==='#admin'||p.startsWith('#admin/'))renderAdmin();else renderMenu()}
window.addEventListener('hashchange',renderRouter);
function tableFromUrl(){const t=new URLSearchParams(location.search).get('table');if(!t||!/^[0-9]+$/.test(t))return null;const n=Number(t);return store.tables.some(x=>Number(x.table_number)===n&&x.active)?String(n):null}
function renderMenu(){
 if(!store.restaurant){$('#app').innerHTML=`<main class="min-h-screen grid place-items-center p-6 luxury-page"><div class="lux-card rounded-3xl p-7 max-w-md text-center"><h1 class="text-2xl font-extrabold">المطعم غير مُنشأ بعد</h1><p class="mt-2" style="color:var(--muted)">بيانات المطعم غير متاحة حاليًا.</p></div></main>`;return}
 theme();
 const table=tableFromUrl();
 $('#app').innerHTML=`<div class="min-h-screen luxury-page"><header class="sticky top-0 z-30 luxury-header"><div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3"><div class="flex items-center gap-3 min-w-0"><div class="brand-logo">${esc(store.restaurant.logo||'🍽️')}</div><div class="min-w-0"><div class="font-extrabold text-lg truncate">${esc(store.restaurant.name)}</div><div class="text-xs" style="color:var(--muted)">${table?'حضرتك شرفتنا على — الطاولة '+esc(table):'قائمة رقمية • اطلب من مكانك'}</div></div></div><button onclick="openCart()" class="cart-btn">السلة <span id="cartCount">0</span></button></div></header><main class="max-w-6xl mx-auto px-4 py-5"><section class="lux-hero"><div class="hero-glow"></div><div class="relative z-10"><div class="eyebrow">${table?'DINE-IN EXPERIENCE':'DIGITAL MENU'}</div><h1>طعم يستحق التجربة.</h1><p>اختار طلبك بسهولة واستمتع بتجربة مطعم أكثر أناقة، أسرع، وبدون انتظار.</p><div class="hero-meta"><span>✦ جودة</span><span>✦ سرعة</span><span>✦ تجربة مميزة</span></div></div></section><div id="cats" class="flex gap-2 overflow-auto pb-4 pt-1 luxury-scroll"></div><div id="products" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"></div></main></div><div id="modal"></div>`;
 renderCategories();renderProducts();updateCart();
}
function renderCategories(){const cats=[{id:'all',name:'الكل'},...store.categories];$('#cats').innerHTML=cats.map(c=>`<button onclick="currentCat='${c.id}';renderCategories();renderProducts()" class="cat-pill ${currentCat===c.id?'active':''}">${esc(c.name)}</button>`).join('')}
function renderProducts(){const list=store.products.filter(p=>p.available&&(currentCat==='all'||p.category_id===currentCat));$('#products').innerHTML=list.length?list.map(p=>`<article class="product-card-lux"><div class="product-image-wrap"><img src="${esc(p.image_url||'')}" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'"><span class="price-chip">${money(p.price)}</span></div><div class="p-4"><div class="font-extrabold text-lg">${esc(p.name)}</div><div class="text-sm min-h-10 mt-1" style="color:var(--muted)">${esc(p.description)}</div><div class="flex items-center justify-between mt-4"><span class="text-xs" style="color:var(--muted)">جاهز للطلب</span><button onclick="add('${p.id}')" class="add-btn">أضف للسلة</button></div></div></article>`).join(''):'<div class="col-span-full text-center py-16" style="color:var(--muted)">لا توجد منتجات متاحة في هذا القسم حاليًا.</div>'}
function add(id){const p=store.products.find(x=>x.id===id);if(!p)return;let x=cart.find(x=>x.id===id);x?x.qty++:cart.push({id,name:p.name,price:p.price,qty:1});updateCart();toast('تمت إضافة المنتج')}
function updateCart(){const c=$('#cartCount');if(c)c.textContent=cart.reduce((a,b)=>a+b.qty,0)}
function openCart(){const total=cart.reduce((a,b)=>a+b.price*b.qty,0),table=tableFromUrl();$('#modal').innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center"><div class="bg-white w-full max-w-lg rounded-3xl p-5 max-h-[90vh] overflow-auto"><div class="flex justify-between"><h2 class="text-2xl font-extrabold">السلة</h2><button onclick="closeModal()">✕</button></div><div class="space-y-3 my-5">${cart.length?cart.map(x=>`<div class="flex items-center justify-between border rounded-2xl p-3"><div><b>${esc(x.name)}</b><div>${x.qty} × ${money(x.price)}</div></div><div class="flex gap-2"><button onclick="chg('${x.id}',-1)" class="w-9 h-9 rounded-lg border">−</button><button onclick="chg('${x.id}',1)" class="w-9 h-9 rounded-lg border">+</button></div></div>`).join(''):'<div class="text-center text-gray-500 py-10">السلة فارغة</div>'}</div>${cart.length?`<div class="font-extrabold text-xl mb-4">الإجمالي: ${money(total)}</div><button onclick="checkout()" class="w-full py-4 rounded-2xl text-white font-extrabold" style="background:var(--brand)">متابعة الطلب</button>`:''}</div></div>`}
function chg(id,d){const x=cart.find(x=>x.id===id);if(!x)return;x.qty+=d;if(x.qty<=0)cart=cart.filter(x=>x.id!==id);openCart();updateCart()};function closeModal(){$('#modal').innerHTML=''}
function buildDineInWaUrl(table, name='عميل'){
  const total=cart.reduce((a,b)=>a+b.price*b.qty,0);
  const itemsText=cart.map(x=>`${x.name} × ${x.qty} = ${money(x.price*x.qty)}`).join('\n');
  const msg=`طلب جديد من ${store.restaurant.name}\nالطاولة: ${table}\nالاسم: ${name||'عميل'}\n\n${itemsText}\n\nالإجمالي: ${money(total)}`;
  return `https://wa.me/${getWaNumber()}?text=${encodeURIComponent(msg)}`;
}
function prepareDineInWhatsApp(table){
  const a=$('#dineWaLink');
  const name=$('#cust')?.value.trim()||'عميل';
  if(a)a.href=buildDineInWaUrl(table,name);
  return true;
}
function checkout(){
  const table=tableFromUrl(),outside=!table;
  const dineHref=table?buildDineInWaUrl(table,'عميل'):'#';
  $('#modal').innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center" onclick="if(event.target===this)closeModal()"><div class="checkout-modal w-full max-w-lg rounded-3xl p-5 max-h-[92vh] overflow-auto"><div class="flex justify-between items-center"><h2 class="text-2xl font-extrabold">تأكيد الطلب</h2><button onclick="closeModal()" class="w-10 h-10 rounded-full border text-2xl" aria-label="إغلاق">×</button></div><div class="checkout-note rounded-2xl p-4 my-4 font-bold">${table?'حضرتك شرفتنا على — الطاولة رقم '+esc(table):'طلب خارجي / توصيل'}</div>${outside?`<div class="space-y-3"><input id="cust" class="w-full border rounded-2xl p-4" placeholder="الاسم"><input id="customerPhone" inputmode="tel" class="w-full border rounded-2xl p-4" placeholder="رقم الهاتف" required><textarea id="addr" class="w-full border rounded-2xl p-4" placeholder="العنوان"></textarea><select id="pay" onchange="toggleVodafoneFields()" class="w-full border rounded-2xl p-4"><option value="cash">دفع عند الاستلام</option><option value="vodafone">Vodafone Cash</option></select><div id="vodafoneBox" class="vodafone-box hidden rounded-2xl p-4 space-y-3"><div class="font-extrabold text-lg">الدفع عبر Vodafone Cash</div><div class="font-bold">يرجى التحويل على الرقم: <span dir="ltr">01063537686</span></div><p class="text-sm">بعد التحويل، يرجى إرفاق Screenshot لعملية التحويل.</p><input id="transferPhone" inputmode="tel" class="w-full border rounded-2xl p-4" placeholder="رقم التليفون المحوّل منه"><input id="proof" type="file" accept="image/*" onchange="$('#proofName').textContent=this.files[0]?.name||''" class="w-full border rounded-2xl p-3"><div id="proofName" class="text-xs" style="color:var(--muted)"></div></div></div>`:`<input id="cust" oninput="prepareDineInWhatsApp(${JSON.stringify(table)})" class="w-full border rounded-2xl p-4" placeholder="اسم اختياري">`} ${table?`<a id="dineWaLink" href="${esc(dineHref)}" onclick="prepareDineInWhatsApp(${JSON.stringify(table)})" class="w-full mt-5 py-4 rounded-2xl text-white font-extrabold flex items-center justify-center" style="background:var(--brand);color:#111;text-decoration:none">إرسال الطلب عبر WhatsApp</a>`:`<button onclick="sendOrder(null)" class="w-full mt-5 py-4 rounded-2xl text-white font-extrabold" style="background:var(--brand);color:#111">إرسال الطلب عبر WhatsApp</button>`}</div></div>`;
  if(outside)toggleVodafoneFields();
}
function toggleVodafoneFields(){const pay=$('#pay')?.value;const box=$('#vodafoneBox');if(!box)return;box.classList.toggle('hidden',pay!=='vodafone');const phone=$('#transferPhone'),proof=$('#proof');if(phone)phone.required=pay==='vodafone';if(proof)proof.required=pay==='vodafone'}
async function uploadPaymentProof(file){if(!file)return null;if(!file.type.startsWith('image/'))throw new Error('صورة التحويل يجب أن تكون صورة');if(file.size>5*1024*1024)throw new Error('حجم صورة التحويل يجب ألا يتجاوز 5MB');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=`${store.restaurant.id}/${crypto.randomUUID()}.${ext}`;const up=await db.storage.from('payment-proofs').upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;const pub=db.storage.from('payment-proofs').getPublicUrl(path);return pub.data.publicUrl}
function getWaNumber(){
  const candidates=[store.restaurant?.whatsapp_number,store.restaurant?.whatsapp,C.demoRestaurant.whatsapp,'201026569682'];
  for(const v of candidates){const raw=String(v||'').replace(/\D/g,'');if(raw.length>=10){return raw.startsWith('20')?raw:(raw.startsWith('0')?'20'+raw.slice(1):raw)}}
  return '201026569682';
}
function openWhatsApp(url){
  let opened=false;
  try{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.style.display='none';document.body.appendChild(a);a.click();a.remove();opened=true}catch(_){}
  if(!opened){try{window.open(url,'_blank','noopener,noreferrer');opened=true}catch(_){} }
  return opened;
}
async function sendOrder(table){
  if(!cart.length)return;
  const outside=!table;
  const name=$('#cust')?.value.trim()||'عميل';
  const customerPhone=$('#customerPhone')?.value.trim()||'';
  const addr=$('#addr')?.value.trim()||'';
  const pay=$('#pay')?.value||null;
  const transferPhone=$('#transferPhone')?.value.trim()||'';
  const proofFile=$('#proof')?.files?.[0]||null;
  if(outside&&!customerPhone)return toast('اكتب رقم الهاتف');
  if(outside&&!addr)return toast('اكتب العنوان');
  if(outside&&pay==='vodafone'&&(!transferPhone||!proofFile))return toast('أدخل رقم التليفون المحوّل منه وأرفق صورة التحويل');
  const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('إرسال الطلب عبر WhatsApp'));
  if(btn){btn.disabled=true;btn.textContent='جارٍ تجهيز الطلب...';btn.style.opacity='.7'}
  const total=cart.reduce((a,b)=>a+b.price*b.qty,0);
  const itemsText=cart.map(x=>`${x.name} × ${x.qty} = ${money(x.price*x.qty)}`).join('\n');
  const waNumber=getWaNumber();
  let proofUrl=null;
  const msgBase=()=>`طلب جديد من ${store.restaurant.name}\n${table?'الطاولة: '+table:'طلب خارجي / توصيل'}\nالاسم: ${name}\n${customerPhone?'رقم الهاتف: '+customerPhone+'\n':''}${addr?'العنوان: '+addr+'\n':''}${pay?'الدفع: '+(pay==='vodafone'?'Vodafone Cash':'دفع عند الاستلام')+'\n':''}${transferPhone?'رقم التليفون المحوّل منه: '+transferPhone+'\n':''}${proofUrl?'صورة التحويل: '+proofUrl+'\n':''}\n${itemsText}\n\nالإجمالي: ${money(total)}`;
  try{
    if(table){
      const url=`https://wa.me/${waNumber}?text=${encodeURIComponent(msgBase())}`;
      window.location.assign(url);
      return;
    }
    if(pay==='vodafone')proofUrl=await uploadPaymentProof(proofFile);
    const msg=msgBase();
    const tableRow=null;
    const order={restaurant_id:store.restaurant.id,table_id:null,table_number:null,order_type:'delivery',customer_name:name,customer_phone:customerPhone,address:addr,payment_method:pay,total,items:cart.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price})),status:'new'};
    if(transferPhone)order.transfer_phone=transferPhone;if(proofUrl)order.payment_proof_url=proofUrl;
    if(db){const r=await db.from('orders').insert(order);if(r.error)console.warn('External order save failed:',r.error)}else{store.orders.unshift({...order,id:'o'+Date.now(),created_at:new Date().toISOString()});persist()}
    window.location.assign(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`);
  }catch(e){console.error(e);toast(e?.message||'حدث خطأ أثناء إرسال الطلب')}
  finally{if(btn){btn.disabled=false;btn.textContent='إرسال الطلب عبر WhatsApp';btn.style.opacity=''}}
}

async function ensureDrinksCategory(){
  if(!db||!store.restaurant)return;
  if(store.categories.some(c=>String(c.name).trim()==='مشروبات'))return;
  const next=(store.categories.reduce((m,c)=>Math.max(m,Number(c.sort_order)||0),0)||0)+1;
  const r=await db.from('categories').insert({restaurant_id:store.restaurant.id,name:'مشروبات',sort_order:next});
  if(r.error)console.warn('Could not create drinks category:',r.error);else await loadSupabase();
}

async function renderAdmin(){theme();document.body.style.background='var(--bg)';const session=(await db?.auth.getSession())?.data?.session;window.__ROS_ADMIN_READY__=!!session;document.body.classList.toggle('ros-admin-authenticated',!!session);if(db&&!session){renderLogin();return}if(!store.restaurant){renderSetup();return}await ensureDrinksCategory();$('#app').innerHTML=`<div class="min-h-screen"><header class="bg-white border-b sticky top-0 z-30"><div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center"><div><b class="text-xl">Restaurant OS</b><div class="text-xs text-gray-500">Dashboard • Supabase Connected</div></div><div class="flex gap-2"><a href="#menu" class="px-4 py-2 rounded-xl bg-gray-100">فتح المنيو</a><button onclick="logout()" class="px-4 py-2 rounded-xl bg-gray-100">خروج</button></div></div></header><main class="max-w-7xl mx-auto p-4 md:p-6"><div class="grid md:grid-cols-4 gap-4 mb-5"><div class="bg-white p-5 rounded-3xl"><div class="text-gray-500">المنتجات</div><b class="text-3xl">${store.products.length}</b></div><div class="bg-white p-5 rounded-3xl"><div class="text-gray-500">الطاولات</div><b class="text-3xl">${store.tables.filter(t=>t.active).length}</b></div><div class="bg-white p-5 rounded-3xl"><div class="text-gray-500">الطلبات</div><b class="text-3xl">${store.orders.length}</b></div><div class="bg-white p-5 rounded-3xl"><div class="text-gray-500">الثيم</div><div class="flex flex-wrap gap-2 mt-2">${Object.entries(THEMES).map(([k,t])=>`<button title="${t.name}" onclick="setTheme('${store.restaurant.id}','${t.accent}')" class="w-8 h-8 rounded-full border-2" style="background:${t.accent}"></button>`).join('')}</div></div></div><div class="grid lg:grid-cols-3 gap-5"><section class="lg:col-span-2 bg-white rounded-3xl p-5"><div class="flex justify-between mb-4 items-center gap-3"><h2 class="text-xl font-extrabold">المنتجات</h2><button onclick="productForm()" class="px-4 py-2 rounded-xl bg-black text-white">+ إضافة منتج</button></div><div id="productEditor" class="hidden mb-5"></div><div class="overflow-auto"><table class="w-full text-right"><thead><tr class="border-b"><th class="p-3">المنتج</th><th>السعر</th><th>التصنيف</th><th>الحالة</th><th></th></tr></thead><tbody>${store.products.map(p=>`<tr class="border-b"><td class="p-3 font-bold">${esc(p.name)}</td><td>${money(p.price)}</td><td>${esc(store.categories.find(c=>c.id===p.category_id)?.name||'-')}</td><td>${p.available?'متاح':'مخفي'}</td><td><button onclick="productForm('${p.id}')" class="text-blue-600 ml-3">تعديل</button><button onclick="delProduct('${p.id}')" class="text-red-600">حذف</button></td></tr>`).join('')}</tbody></table></div></section><section class="bg-white rounded-3xl p-5"><h2 class="text-xl font-extrabold mb-4">الطاولات و QR</h2><p class="text-sm text-gray-500 mb-4">كل QR يفتح المنيو مع رقم الطاولة تلقائياً.</p><div class="grid grid-cols-3 gap-2">${store.tables.map(t=>`<button onclick="showQR(${t.table_number})" class="border rounded-xl p-3">طاولة ${t.table_number}</button>`).join('')}</div></section></div><section id="ros-admin-orders-section" class="bg-white rounded-3xl p-5 mt-5"><div class="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 class="text-xl font-extrabold">آخر الطلبات</h2><button id="deleteOrdersBtn" onclick="deleteAllOrders()" class="px-4 py-2 rounded-xl bg-red-600 text-white font-bold">حذف الطلبات السابقة</button></div><div class="space-y-2">${store.orders.slice(0,10).map(o=>`<div class="border rounded-2xl p-3"><div class="flex justify-between gap-3"><span class="font-bold">${o.order_type==='dine_in'?'طاولة '+o.table_number:'طلب خارجي'} — ${esc(o.customer_name||'عميل')}</span><b>${money(o.total)}</b></div><div class="text-sm text-gray-500 mt-2">${o.customer_phone?'هاتف: '+esc(o.customer_phone)+' — ':''}${o.payment_method==='vodafone'?'Vodafone Cash':''}</div></div>`).join('')||'<div class="text-gray-500">لا توجد طلبات بعد.</div>'}</div></section></main></div><div id="modal"></div>`}
window.__ROS_REFRESH_ADMIN_ORDERS__=async function(){
  if(!window.__ROS_ADMIN_READY__||!(location.hash==='#admin'||location.hash.startsWith('#admin/')))return;
  try{
    await loadSupabase();
    const host=document.getElementById('ros-admin-orders-section');
    if(!host)return;
    const old=host.innerHTML;
    const html=`<div class="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 class="text-xl font-extrabold">آخر الطلبات</h2><button id="deleteOrdersBtn" onclick="deleteAllOrders()" class="px-4 py-2 rounded-xl bg-red-600 text-white font-bold">حذف الطلبات السابقة</button></div><div class="space-y-2">${store.orders.slice(0,10).map(o=>`<div class="border rounded-2xl p-3"><div class="flex justify-between gap-3"><span class="font-bold">${o.order_type==='dine_in'?'طاولة '+o.table_number:'طلب خارجي'} — ${esc(o.customer_name||'عميل')}</span><b>${money(o.total)}</b></div><div class="text-sm text-gray-500 mt-2">${o.customer_phone?'هاتف: '+esc(o.customer_phone)+' — ':''}${o.payment_method==='vodafone'?'Vodafone Cash':''}</div></div>`).join('')||'<div class="text-gray-500">لا توجد طلبات بعد.</div>'}</div>`;
    if(old!==html)host.innerHTML=html;
  }catch(e){console.warn('[ROS admin refresh]',e);}
};
function renderLogin(){window.__ROS_ADMIN_READY__=false;document.body.classList.remove('ros-admin-authenticated');document.body.style.background='#f3f4f6';$('#app').innerHTML=`<main class="min-h-screen grid place-items-center p-5"><form onsubmit="login(event)" class="bg-white rounded-3xl shadow-xl p-6 w-full max-w-md"><h1 class="text-3xl font-extrabold">Restaurant OS</h1><p class="text-gray-500 mt-2">تسجيل دخول لوحة الإدارة</p><input id="email" type="email" required class="w-full border rounded-2xl p-4 mt-6" placeholder="البريد الإلكتروني"><input id="password" type="password" required class="w-full border rounded-2xl p-4 mt-3" placeholder="كلمة المرور"><button class="w-full mt-4 py-4 rounded-2xl bg-black text-white font-bold">دخول</button><a href="#menu" class="block text-center mt-4 text-gray-500">العودة للمنيو</a></form></main>`}
async function login(e){e.preventDefault();const r=await db.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(r.error)return toast(r.error.message);await loadSupabase();renderAdmin()}
async function logout(){await db.auth.signOut();location.hash='#menu'}
function renderSetup(){document.body.style.background='#f3f4f6';$('#app').innerHTML=`<main class="min-h-screen grid place-items-center p-5"><form onsubmit="createRestaurant(event)" class="bg-white rounded-3xl shadow-xl p-6 w-full max-w-lg"><h1 class="text-2xl font-extrabold">إنشاء المطعم</h1><p class="text-gray-500 mt-2">الحساب الحالي لم يتم ربطه بمطعم بعد.</p><input id="rn" required class="w-full border rounded-2xl p-4 mt-5" value="ذا بيتزا برجر كافيه" placeholder="اسم المطعم"><input id="rw" required class="w-full border rounded-2xl p-4 mt-3" value="201026569682" placeholder="رقم WhatsApp دولي بدون +"><input id="rs" required class="w-full border rounded-2xl p-4 mt-3" value="${esc(C.restaurantSlug)}" placeholder="Slug"><input id="rl" class="w-full border rounded-2xl p-4 mt-3" value="🍕" placeholder="Logo"><button class="w-full mt-4 py-4 rounded-2xl bg-black text-white font-bold">إنشاء وتشغيل المطعم</button></form></main>`}
async function createRestaurant(e){e.preventDefault();const {data:{user}}=await db.auth.getUser();if(!user)return toast('سجل الدخول أولاً');const r=await db.from('restaurants').insert({name:$('#rn').value.trim(),slug:$('#rs').value.trim(),logo:$('#rl').value.trim(),whatsapp_number:$('#rw').value.trim(),owner_id:user.id}).select().single();if(r.error)return toast(r.error.message);store.restaurant=r.data;const cats=[];for(let i=0;i<C.demoCategories.length;i++){const q=await db.from('categories').insert({restaurant_id:r.data.id,name:C.demoCategories[i].name,sort_order:i+1}).select().single();if(q.error)return toast(q.error.message);cats.push(q.data)}store.categories=cats;const ps=C.demoProducts.map((p,i)=>({restaurant_id:r.data.id,category_id:cats.find(c=>c.name===C.demoCategories.find(d=>d.id===p.category_id)?.name)?.id,name:p.name,description:p.description,price:p.price,image_url:p.image,available:p.available,sort_order:i+1}));const pr=await db.from('products').insert(ps);if(pr.error)return toast(pr.error.message);const ts=Array.from({length:30},(_,i)=>({restaurant_id:r.data.id,table_number:i+1,active:true}));const tr=await db.from('tables').insert(ts);if(tr.error)return toast(tr.error.message);await loadSupabase();toast('تم إنشاء المطعم');renderAdmin()}
async function setTheme(id,v){const r=await db.from('restaurants').update({primary_color:v}).eq('id',id).select('primary_color').maybeSingle();if(r.error)return toast(r.error.message);store.restaurant.primary_color=v;theme();toast('تم حفظ الثيم')}
function productForm(id){
  const host=$('#productEditor');
  if(!host)return;
  const p=id?store.products.find(x=>x.id===id):{name:'',description:'',price:0,image_url:'',available:true,category_id:store.categories[0]?.id};
  host.className='';
  host.innerHTML=`<div class="rounded-3xl border p-5" style="background:var(--surface2);border-color:#0001">
    <div class="flex justify-between items-center gap-3 mb-4">
      <div><div class="text-xs font-bold" style="color:var(--muted)">إدارة المنتجات</div><h3 class="text-xl font-extrabold">${id?'تعديل المنتج':'إضافة منتج'}</h3></div>
      <button type="button" onclick="closeProductEditor()" class="px-3 py-2 rounded-xl border">إلغاء</button>
    </div>
    <div class="grid md:grid-cols-2 gap-3">
      <input id="pn" value="${esc(p.name)}" class="w-full border rounded-2xl p-4" placeholder="اسم المنتج">
      <input id="pp" type="number" min="0" step="1" value="${p.price}" class="w-full border rounded-2xl p-4" placeholder="السعر">
      <textarea id="pd" class="w-full border rounded-2xl p-4 md:col-span-2" placeholder="الوصف">${esc(p.description)}</textarea>
      <input id="pi" value="${esc(p.image_url||'')}" class="w-full border rounded-2xl p-4 md:col-span-2" placeholder="رابط الصورة">
      <select id="pc" class="w-full border rounded-2xl p-4">${store.categories.map(c=>`<option value="${c.id}" ${c.id===p.category_id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
      <label class="flex gap-2 items-center p-3"><input id="pa" type="checkbox" ${p.available?'checked':''}> متاح للبيع</label>
    </div>
    <button type="button" id="saveProductBtn" data-product-id="${id?esc(id):''}" class="w-full mt-5 py-4 rounded-2xl bg-black text-white font-bold">${id?'حفظ التعديل':'إضافة المنتج'}</button>
  </div>`;
  host.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function closeProductEditor(){const host=$('#productEditor');if(host){host.className='hidden';host.innerHTML=''}}

document.addEventListener('click',function(e){
  const btn=e.target.closest && e.target.closest('#saveProductBtn');
  if(!btn)return;
  e.preventDefault();
  e.stopPropagation();
  const id=btn.dataset.productId || null;
  saveProduct(id);
},true);

async function saveProduct(id){
  const btn=$('#saveProductBtn');
  const existing=id?store.products.find(x=>x.id===id):null;
  if(!store.restaurant)return toast('بيانات المطعم غير متاحة');
  const data={name:$('#pn')?.value.trim()||'',description:$('#pd')?.value.trim()||'',price:Number($('#pp')?.value||0),image_url:$('#pi')?.value.trim()||'',category_id:$('#pc')?.value||null,available:$('#pa')?.checked!==false};
  if(!data.name||!Number.isFinite(data.price)||data.price<=0)return toast('أدخل الاسم والسعر بشكل صحيح');
  if(!db)return toast('لوحة الإدارة تحتاج اتصال Supabase');
  const {data:{session}}=await db.auth.getSession();
  if(!session)return toast('انتهت جلسة الإدارة — سجل الدخول مرة أخرى');
  if(!id)return toast('إضافة منتج جديد تحتاج اختيار قسم فرعي في الكتالوج الحالي');
  if(btn){btn.disabled=true;btn.textContent='جارٍ الحفظ...';btn.style.opacity='.65'}
  try{
    const sizes=Array.isArray(existing?.sizes)&&existing.sizes.length?existing.sizes.map(x=>({...x})):[{size:'واحد',price:data.price}];
    sizes[0]={...sizes[0],price:data.price};
    const r=await db.rpc('owner_update_product_v2',{p_id:id,p_restaurant_id:store.restaurant.id,p_name:data.name,p_description:data.description,p_price:data.price,p_image_url:data.image_url,p_category_id:data.category_id,p_available:data.available,p_sizes:sizes});
    if(r.error)throw r.error;
    await loadSupabase();
    const saved=store.products.find(x=>x.id===id);
    if(!saved||saved.name!==data.name||saved.image_url!==data.image_url)throw new Error('لم يتم تأكيد حفظ بيانات المنتج من قاعدة البيانات');
    closeProductEditor();
    renderAdmin();
    toast('تم حفظ المنتج بنجاح');
  }catch(e){console.error('saveProduct',e);toast('تعذر حفظ المنتج: '+(e?.message||'خطأ غير معروف'))}
  finally{if(btn){btn.disabled=false;btn.textContent='حفظ التعديل';btn.style.opacity=''}}
}
async function delProduct(id){
  if(!confirm('حذف المنتج؟'))return;
  const r=await db.from('products').delete().eq('id',id).eq('restaurant_id',store.restaurant.id);
  if(r.error)return toast(r.error.message);
  await loadSupabase();renderAdmin();toast('تم حذف المنتج');
}
async function deleteAllOrders(){
  if(!db||!store.restaurant)return toast('بيانات المطعم غير متاحة');
  if(!store.orders.length)return toast('لا توجد طلبات سابقة للحذف');
  if(!confirm('سيتم حذف جميع الطلبات السابقة نهائيًا. هل أنت متأكد؟'))return;
  const btn=document.getElementById('deleteOrdersBtn');
  if(btn){btn.disabled=true;btn.textContent='جارٍ الحذف...'}
  try{
    const r=await db.from('orders').delete().eq('restaurant_id',store.restaurant.id);
    if(r.error)throw r.error;
    store.orders=[];
    renderAdmin();
    toast('تم حذف الطلبات السابقة');
  }catch(e){console.error('deleteAllOrders',e);toast('تعذر حذف الطلبات: '+(e?.message||'خطأ غير معروف'))}
  finally{if(btn){btn.disabled=false;btn.textContent='حذف الطلبات السابقة'}}
}
function showQR(n){const url=new URL(location.href);url.hash='';url.search='';url.searchParams.set('table',n);const qrUrl=url.toString();$('#modal').innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center" onclick="if(event.target===this)closeModal()"><div class="relative bg-white rounded-3xl p-6 text-center w-full max-w-md"><button onclick="closeModal()" class="absolute top-3 left-3 w-11 h-11 rounded-full bg-gray-100 text-3xl leading-none" aria-label="إغلاق">×</button><h2 class="text-2xl font-extrabold">QR — طاولة ${n}</h2><div id="qr" class="my-5 flex justify-center"></div><input readonly value="${esc(qrUrl)}" class="w-full border rounded-xl p-3 text-xs text-left" dir="ltr"><button onclick="window.print()" class="mt-4 px-5 py-3 rounded-xl bg-black text-white">طباعة</button></div></div>`;const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';s.onload=()=>new QRCode(document.getElementById('qr'),{text:qrUrl,width:220,height:220});document.head.appendChild(s)}
init();



/* ===== ROS LOCAL MODULE: product-modifiers-v2.js ===== */
(function(){
  'use strict';
  if(window.__ROS_PRODUCT_MODIFIERS_V2__)return;
  window.__ROS_PRODUCT_MODIFIERS_V2__=true;
  const TABLE='product_modifiers';
  const map=new Map();
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const money=n=>typeof window.money==='function'?window.money(n):`${Number(n||0).toFixed(0)} جنيه`;
  function getDb(){try{return typeof db!=='undefined'&&db?db:window.db||null}catch(_){return window.db||null}}
  function getStore(){try{return typeof store!=='undefined'&&store?store:window.store||null}catch(_){return window.store||null}}
  async function load(){
    const client=getDb(),st=getStore();
    if(!client||!st?.products?.length)return false;
    const ids=st.products.map(p=>p.id).filter(Boolean);
    const r=await client.from(TABLE).select('id,product_id,name,price,is_required,created_at').in('product_id',ids).order('created_at',{ascending:true});
    if(r.error){console.warn('[ROS extras] load',r.error);return false}
    map.clear();(r.data||[]).forEach(x=>{const k=String(x.product_id);if(!map.has(k))map.set(k,[]);map.get(k).push({...x,price:Number(x.price)||0})});
    return true;
  }
  function productForButton(btn){
    const card=btn.closest('.product-card-lux');if(!card)return null;
    const name=card.querySelector('.font-extrabold.text-lg')?.textContent?.trim()||card.querySelector('img')?.alt||'';
    return (getStore()?.products||[]).find(p=>String(p.name).trim()===name)||null;
  }
  function add(product,mods){
    const base=Number(product.price)||0,extras=mods.reduce((a,m)=>a+(Number(m.price)||0),0),price=base+extras;
    const same=(a,b)=>JSON.stringify((a||[]).map(x=>String(x.id)).sort())===JSON.stringify((b||[]).map(x=>String(x.id)).sort());
    let item=Array.isArray(cart)?cart.find(x=>String(x.id)===String(product.id)&&same(x.modifiers,mods)):null;
    if(item){item.qty=(Number(item.qty)||0)+1;item.price=price;item.base_price=base;item.modifiers=mods}
    else if(Array.isArray(cart))cart.push({id:product.id,name:product.name,price,base_price:base,qty:1,modifiers:mods});
    if(typeof updateCart==='function')updateCart();
    if(typeof toast==='function')toast(mods.length?'تمت إضافة المنتج والإضافات':'تمت إضافة المنتج');
  }
  function open(product){
    const modal=$('#modal'),mods=map.get(String(product.id))||[];if(!modal)return;
    if(!mods.length){add(product,[]);return;}
    const base=Number(product.price)||0;
    modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center" id="rosModifierModal"><div class="checkout-modal w-full max-w-lg rounded-3xl p-5 max-h-[92vh] overflow-auto" role="dialog" aria-modal="true"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">إضافات الطلب</div><h2 class="text-2xl font-extrabold">${esc(product.name)}</h2></div><button type="button" id="rosModifierClose" class="w-10 h-10 rounded-full border text-2xl">×</button></div><div class="mt-5 space-y-3">${mods.map((m,i)=>`<label class="flex items-center justify-between gap-3 rounded-2xl border p-4 cursor-pointer" style="background:var(--surface2)"><span class="flex items-center gap-3"><input type="checkbox" class="ros-mod-check w-5 h-5" data-index="${i}" data-id="${esc(m.id)}" data-name="${esc(m.name)}" data-price="${m.price}"><span class="font-bold">${esc(m.name)}${m.is_required?' <span style="color:var(--brand)">* مطلوب</span>':''}</span></span><span class="font-extrabold">+${money(m.price)}</span></label>`).join('')}</div><div class="mt-5 rounded-2xl p-4 border" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">السعر الأساسي</div><div class="font-bold">${money(base)}</div><div class="text-sm mt-3" style="color:var(--muted)">الإضافات</div><div id="rosModifierExtrasTotal" class="font-bold">${money(0)}</div><div class="border-t mt-3 pt-3 flex justify-between"><span class="font-extrabold">الإجمالي</span><strong id="rosModifierTotal" class="text-2xl">${money(base)}</strong></div></div><button type="button" id="rosModifierAdd" class="w-full mt-5 py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">إضافة للسلة</button></div></div>`;
    const selected=()=>[...modal.querySelectorAll('.ros-mod-check:checked')].map(c=>({id:c.dataset.id,name:c.dataset.name,price:Number(c.dataset.price)||0}));
    const refresh=()=>{const x=selected().reduce((a,m)=>a+m.price,0);$('#rosModifierExtrasTotal').textContent=money(x);$('#rosModifierTotal').textContent=money(base+x)};
    modal.querySelectorAll('.ros-mod-check').forEach(c=>c.addEventListener('change',refresh));
    $('#rosModifierClose')?.addEventListener('click',()=>modal.innerHTML='');
    $('#rosModifierAdd')?.addEventListener('click',()=>{const chosen=selected();if(mods.some((m,i)=>m.is_required&&!modal.querySelector(`.ros-mod-check[data-index="${i}"]`)?.checked)){toast?.('يرجى اختيار الإضافات المطلوبة');return}add(product,chosen);modal.innerHTML=''})
  }
  function injectAdmin(){
    const modal=$('#modal'),save=$('#saveProductBtn'),price=$('#pp');
    if(!modal||!save||!price||$('#rosModifiersEditor'))return;
    const pid=save.dataset.productId||'';
    const section=document.createElement('section');section.id='rosModifiersEditor';section.className='rounded-2xl border p-4 mt-2';section.style.cssText='background:var(--surface2);border-color:color-mix(in srgb,var(--brand) 18%,transparent)';
    section.innerHTML=`<div class="flex items-center justify-between gap-3"><div><div class="font-extrabold text-lg">الإضافات</div><div class="text-xs mt-1" style="color:var(--muted)">${pid?'إضافات اختيارية أو مطلوبة لهذا المنتج':'احفظ المنتج أولًا ثم أضف الإضافات'}</div></div><button type="button" id="rosAddModifier" class="rounded-xl border px-4 py-2 font-extrabold" ${pid?'':'disabled'}>إضافة extra</button></div><div id="rosModifierRows" class="mt-4 space-y-2"></div>${pid?'<button type="button" id="rosSaveModifiers" class="w-full mt-4 py-3 rounded-xl font-extrabold" style="background:var(--brand);color:#111">حفظ الإضافات</button>':''}`;
    price.parentElement?.insertAdjacentElement('afterend',section);
    if(!pid)return;
    const rows=()=>[...section.querySelectorAll('.ros-mod-row')];
    const render=arr=>{$('#rosModifierRows').innerHTML=(arr||[]).map(m=>`<div class="ros-mod-row grid grid-cols-[1fr_110px_auto] gap-2 items-center" data-id="${esc(m.id||'')}"><input class="ros-mod-name border rounded-xl p-3" value="${esc(m.name)}" placeholder="اسم الإضافة"><input class="ros-mod-price border rounded-xl p-3" type="number" min="0" step="1" value="${Number(m.price)||0}" placeholder="السعر"><button type="button" class="ros-del rounded-xl border px-3 py-3 font-bold">حذف</button></div>`).join('')||'<div class="text-sm" style="color:var(--muted)">لا توجد إضافات لهذا المنتج.</div>'};
    render(map.get(String(pid))||[]);
    $('#rosAddModifier')?.addEventListener('click',()=>{const w=$('#rosModifierRows');if(w.querySelector('.text-sm'))w.innerHTML='';const r=document.createElement('div');r.className='ros-mod-row grid grid-cols-[1fr_110px_auto] gap-2 items-center';r.innerHTML='<input class="ros-mod-name border rounded-xl p-3" placeholder="اسم الإضافة"><input class="ros-mod-price border rounded-xl p-3" type="number" min="0" step="1" placeholder="السعر"><button type="button" class="ros-del rounded-xl border px-3 py-3 font-bold">حذف</button>';w.appendChild(r);r.querySelector('input')?.focus()});
    section.addEventListener('click',e=>{const b=e.target.closest('.ros-del');if(!b)return;b.closest('.ros-mod-row')?.remove();if(!rows().length)$('#rosModifierRows').innerHTML='<div class="text-sm" style="color:var(--muted)">لا توجد إضافات لهذا المنتج.</div>'});
    $('#rosSaveModifiers')?.addEventListener('click',async()=>{const client=getDb();if(!client)return;const data=rows().map(r=>({id:r.dataset.id||null,name:r.querySelector('.ros-mod-name')?.value.trim()||'',price:Number(r.querySelector('.ros-mod-price')?.value||0)}));if(data.some(x=>!x.name||!Number.isFinite(x.price)||x.price<0))return toast?.('أدخل اسم وسعر كل إضافة بشكل صحيح');const b=$('#rosSaveModifiers');b.disabled=true;try{const old=map.get(String(pid))||[];const keep=new Set(data.filter(x=>x.id).map(x=>String(x.id)));for(const m of old.filter(x=>!keep.has(String(x.id)))){const r=await client.from(TABLE).delete().eq('id',m.id).eq('product_id',pid);if(r.error)throw r.error}for(const x of data.filter(x=>x.id)){const r=await client.from(TABLE).update({name:x.name,price:x.price}).eq('id',x.id).eq('product_id',pid);if(r.error)throw r.error}const ins=data.filter(x=>!x.id).map(x=>({product_id:pid,name:x.name,price:x.price,is_required:false}));if(ins.length){const r=await client.from(TABLE).insert(ins);if(r.error)throw r.error}await load();render(map.get(String(pid))||[]);toast?.('تم حفظ الإضافات')}catch(e){console.error('[ROS extras] save',e);toast?.('تعذر حفظ الإضافات: '+(e?.message||'خطأ غير معروف'))}finally{b.disabled=false}})
  }
  window.addEventListener('click',e=>{const btn=e.target?.closest?.('.product-card-lux .add-btn');if(!btn)return;const p=productForButton(btn);if(!p)return;e.preventDefault();e.stopImmediatePropagation();open(p)},true);
  const obs=new MutationObserver(()=>injectAdmin());if(document.body)obs.observe(document.body,{childList:true,subtree:true});
  let n=0;const boot=async()=>{try{if(await load()){injectAdmin();return true}}catch(e){console.warn('[ROS extras] boot',e)}return false};const timer=setInterval(async()=>{if(await boot()||++n>120)clearInterval(timer)},250);boot();
})();



/* ===== ROS LOCAL MODULE: product-image-upload-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_PRODUCT_IMAGE_UPLOAD_V3__) return;
  window.__ROS_PRODUCT_IMAGE_UPLOAD_V3__=true;

  const MAX_WIDTH=1200;
  const QUALITY=.82;
  const BUCKET='product-images';
  const RESTAURANT_ID='02da399f-b12d-480b-bf53-5491bbe8f9e5';
  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function restaurantId(){
    if(UUID_RE.test(RESTAURANT_ID))return RESTAURANT_ID;
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


/* ===== ROS LOCAL MODULE: dine-in-admin-guard-v2.js ===== */
(function(){
'use strict';
if(window.__ROS_DINEIN_ADMIN_GUARD_V2__)return;
window.__ROS_DINEIN_ADMIN_GUARD_V2__=true;

// Dine-in admin controls must never appear on the login screen.
// Keep only the V10 implementation; V7's duplicate admin panel is removed.
let timer=0;
let checking=false;

function isAdminRoute(){return location.hash==='#admin'||location.hash.startsWith('#admin/');}
function removeV7(){document.querySelectorAll('#rosPrepPanel').forEach(el=>el.remove());}
function removeV10(){document.querySelectorAll('#rosV10DinePanel').forEach(el=>el.remove());}
function hideUntilAuth(){
  if(!document.getElementById('rosDineAdminGuardStyle')){
    const s=document.createElement('style');
    s.id='rosDineAdminGuardStyle';
    s.textContent='#rosPrepPanel,#rosV10DinePanel{display:none!important}body.ros-dine-admin-auth #rosV10DinePanel{display:block!important}';
    document.head.appendChild(s);
  }
}
async function sync(){
  if(checking||!isAdminRoute())return;
  checking=true;
  hideUntilAuth();
  try{
    let session=null;
    try{session=(await db?.auth?.getSession())?.data?.session||null}catch(_){session=null}
    // V7 can create its panel without checking Auth. Always remove that implementation.
    removeV7();
    if(!session){
      document.body.classList.remove('ros-dine-admin-auth');
      removeV10();
      return;
    }
    document.body.classList.add('ros-dine-admin-auth');
  }finally{checking=false}
}
function schedule(){clearTimeout(timer);timer=setTimeout(sync,60)}
window.addEventListener('hashchange',schedule,true);
window.addEventListener('load',schedule,{once:false});
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
setInterval(sync,700);
schedule();
})();



/* ===== ROS LOCAL MODULE: cart-bridge.js ===== */
(function(){
  'use strict';
  // app.js keeps these as global lexical bindings, not window properties.
  // Expose live getters so delivery/admin modules always use the same state.
  try{
    Object.defineProperty(window,'cart',{configurable:true,enumerable:false,get:function(){return cart},set:function(v){cart=v}});
    Object.defineProperty(window,'db',{configurable:true,enumerable:false,get:function(){return db}});
    Object.defineProperty(window,'store',{configurable:true,enumerable:false,get:function(){return store}});
  }catch(e){console.warn('app state bridge unavailable',e)}
})();



/* ===== ROS LOCAL MODULE: delivery-gps-clean-v2.js ===== */
(function(){
  'use strict';
  if(window.__ROS_DELIVERY_CLEAN_V2__) return;
  window.__ROS_DELIVERY_CLEAN_V2__=true;
  window.__rosOriginalCheckout = window.checkout;

  const originalRouter = window.renderRouter;
  const originalAdmin = window.renderAdmin;
  const publicBase = String((window.APP_CONFIG&&window.APP_CONFIG.publicAppUrl)||'').replace(/\/$/,'');
  function esc(v){return typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));}
  function money(v){return typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;}
  function notify(m){try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}}
  function base(){return publicBase||location.origin;}
  function trackUrl(t){return base()+'/#track/'+encodeURIComponent(t)}
  function driverUrl(t){return base()+'/#driver/'+encodeURIComponent(t)}
  function coords(a,b){return a==null||b==null?'غير متاح':`${Number(a).toFixed(6)}, ${Number(b).toFixed(6)}`}
  function label(s){return({new:'جديد',confirmed:'تم التأكيد',preparing:'قيد التحضير',ready:'جاهز',assigned:'تم التعيين',accepted:'تم القبول',picked_up:'تم الاستلام',out_for_delivery:'خرج للتوصيل',delivered:'تم التسليم',cancelled:'ملغي',unassigned:'بدون مندوب'})[s]||s||'—'}
  async function session(){try{let r=await db.auth.getSession();if(r?.data?.session)return r.data.session;r=await db.auth.refreshSession();return r?.data?.session||null}catch(_){return null}}

  window.getCustomerLocation=function(){
    if(!navigator.geolocation)return notify('المتصفح لا يدعم تحديد الموقع');
    if(!window.isSecureContext)return notify('تحديد الموقع يحتاج HTTPS');
    const el=document.querySelector('#customerGps');if(el)el.textContent='جارٍ تحديد موقعك بدقة...';
    navigator.geolocation.getCurrentPosition(p=>{window.__customerCoords={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};if(el)el.textContent=`تم تحديد الموقع ✓ • الدقة التقريبية ${Math.round(p.coords.accuracy||0)} متر`},e=>{if(el)el.textContent='تعذر تحديد الموقع: '+(e.message||'تم رفض الإذن')},{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  };

  window.checkout=function(){
    if(typeof tableFromUrl==='function'&&tableFromUrl())return typeof window.__rosOriginalCheckout==='function'?window.__rosOriginalCheckout():undefined;
    if(!Array.isArray(window.cart)||!cart.length)return notify('السلة فارغة');
    const total=cart.reduce((a,b)=>a+b.price*b.qty,0), modal=document.querySelector('#modal');if(!modal)return;
    modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center" onclick="if(event.target===this)closeModal()"><div class="checkout-modal w-full max-w-lg rounded-3xl p-5 max-h-[94vh] overflow-auto"><div class="flex justify-between items-center"><h2 class="text-2xl font-extrabold">طلب توصيل</h2><button type="button" onclick="closeModal()" class="w-10 h-10 rounded-full border">×</button></div><div class="checkout-note rounded-2xl p-4 my-4 font-bold">الإجمالي: ${money(total)}</div><div class="space-y-3"><input id="cust" class="w-full border rounded-2xl p-4" placeholder="الاسم"><input id="customerPhone" inputmode="tel" class="w-full border rounded-2xl p-4" placeholder="رقم الهاتف"><textarea id="addr" class="w-full border rounded-2xl p-4" placeholder="العنوان بالتفصيل"></textarea><button type="button" onclick="getCustomerLocation()" class="w-full py-3 rounded-2xl border font-extrabold">تحديد موقعي الحالي</button><div id="customerGps" class="text-xs" style="color:var(--muted)">لم يتم تحديد الموقع بعد</div><select id="pay" onchange="toggleVodafoneFields()" class="w-full border rounded-2xl p-4"><option value="cash">دفع عند الاستلام</option><option value="vodafone">Vodafone Cash</option></select><div id="vodafoneBox" class="vodafone-box hidden rounded-2xl p-4 space-y-3"><div class="font-extrabold">الدفع عبر Vodafone Cash</div><div class="font-bold">التحويل على الرقم: <span dir="ltr">01063537686</span></div><input id="transferPhone" inputmode="tel" class="w-full border rounded-2xl p-4" placeholder="رقم التليفون المحوّل منه"><input id="proof" type="file" accept="image/*" class="w-full border rounded-2xl p-3"><div id="proofName" class="text-xs"></div></div><div class="text-xs" style="color:var(--muted)">بعد إرسال الطلب سيظهر لك رابط تتبع الطلب.</div><button type="button" onclick="sendDeliveryOrder()" class="w-full py-4 rounded-2xl text-white font-extrabold" style="background:var(--brand)">إرسال طلب التوصيل</button></div></div></div>`;
    if(typeof toggleVodafoneFields==='function')toggleVodafoneFields();
  };

  window.sendDeliveryOrder=async function(){
    if(!Array.isArray(window.cart)||!cart.length)return notify('السلة فارغة');
    const name=document.querySelector('#cust')?.value.trim()||'',phone=document.querySelector('#customerPhone')?.value.trim()||'',address=document.querySelector('#addr')?.value.trim()||'',pay=document.querySelector('#pay')?.value||'cash',transferPhone=document.querySelector('#transferPhone')?.value.trim()||null,proofFile=document.querySelector('#proof')?.files?.[0]||null;
    if(!name||!phone||!address)return notify('اكتب الاسم ورقم الهاتف والعنوان');
    if(pay==='vodafone'&&(!transferPhone||!proofFile))return notify('أدخل رقم التليفون المحوّل منه وأرفق صورة التحويل');
    if(!window.store?.restaurant?.id)return notify('بيانات المطعم غير متاحة');
    const items=cart.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price}));let proofUrl=null;
    try{if(pay==='vodafone'&&typeof uploadPaymentProof==='function')proofUrl=await uploadPaymentProof(proofFile)}catch(e){return notify(e?.message||'تعذر رفع صورة التحويل')}
    const r=await db.rpc('create_delivery_order',{p_restaurant_id:store.restaurant.id,p_customer_name:name,p_customer_phone:phone,p_address:address,p_payment_method:pay,p_items:items,p_customer_lat:window.__customerCoords?.lat??null,p_customer_lng:window.__customerCoords?.lng??null,p_transfer_phone:transferPhone,p_payment_proof_url:proofUrl});
    if(r.error)return notify(r.error.message||'تعذر إنشاء الطلب');
    const token=(r.data?.[0]||r.data)?.tracking_token;if(!token)return notify('تم إنشاء الطلب لكن لم يتم إنشاء رابط التتبع');
    const total=cart.reduce((a,b)=>a+b.price*b.qty,0),restaurant=store.restaurant.name||'ذا بيتزا برجر كافيه';
    const msg=`🍕 طلب توصيل جديد\n\n${restaurant}\n\nالعميل: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\nالدفع: ${pay==='vodafone'?'Vodafone Cash':'عند الاستلام'}\n\n${cart.map(x=>`${x.name} × ${x.qty}`).join('\n')}\n\nالإجمالي: ${money(total)}`;
    const wa='https://wa.me/'+String(store.restaurant.whatsapp_number||'201026569682').replace(/\D/g,'')+'?text='+encodeURIComponent(msg),url=trackUrl(token);
    cart=[];if(typeof updateCart==='function')updateCart();
    document.querySelector('#modal').innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center"><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم استلام طلبك</h2><p class="mt-2" style="color:var(--muted)">احتفظ برابط التتبع لمتابعة حالة الطلب وموقع المندوب.</p><a href="${esc(url)}" class="block mt-5 w-full py-4 rounded-2xl text-white font-extrabold text-center" style="background:var(--brand)">متابعة الطلب</a><a href="${esc(wa)}" target="_blank" rel="noopener noreferrer" class="mt-3 w-full py-3 rounded-2xl border font-extrabold flex items-center justify-center gap-2" style="color:#25D366;border-color:#25D366"><span style="font-size:20px">WhatsApp</span><span>إرسال تفاصيل الطلب للمطعم</span></a></div></div>`;
  };

  async function loadTracking(token){
    const app=document.querySelector('#app');if(!app)return;
    app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-6"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">ORDER TRACKING</div><h1 class="text-3xl font-extrabold">تتبع طلبك</h1></div><button type="button" onclick="location.hash='menu'" class="rounded-xl border px-4 py-2">القائمة</button></div><div id="rosTrackBox" class="mt-6">جارٍ تحميل الطلب...</div></div></div></main>`;
    let timer=null,map=null,marker=null,alive=true;
    async function load(){
      if(!alive)return;const r=await db.rpc('public_track_order',{p_token:token}),box=document.querySelector('#rosTrackBox');if(!box)return;
      if(r.error||!r.data?.length){box.innerHTML='<div class="p-5 rounded-2xl bg-red-500/10">رابط التتبع غير صالح أو الطلب غير موجود.</div>';if(timer)clearInterval(timer);alive=false;return;}
      const x=r.data[0],stages=['new','confirmed','preparing','ready','assigned','accepted','picked_up','out_for_delivery','delivered'],idx=Math.max(0,stages.indexOf(x.status)),gps=x.latitude!=null&&x.longitude!=null;
      box.innerHTML=`<div class="space-y-4"><div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="text-sm" style="color:var(--muted)">المطعم</div><div class="font-extrabold text-xl">${esc(x.restaurant_name)}</div><div class="mt-3 text-sm" style="color:var(--muted)">العميل</div><div class="font-bold">${esc(x.customer_name||'عميل')}</div><div class="mt-3 text-sm" style="color:var(--muted)">الإجمالي</div><div class="font-extrabold text-xl">${money(x.total)}</div></div><div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${stages.map((s,i)=>`<div class="rounded-xl p-3 text-center text-xs font-bold" style="background:${i<=idx?'var(--brand)':'var(--surface2)'};color:${i<=idx?'#111':'var(--text)'}">${label(s)}</div>`).join('')}</div><div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="font-extrabold text-lg">المندوب</div><div class="mt-1">${esc(x.driver_name||'لم يتم تعيين مندوب بعد')}</div>${gps?`<div class="mt-3 text-sm" style="color:var(--muted)">آخر موقع: ${coords(x.latitude,x.longitude)}</div><div id="rosLiveMap" class="mt-4 rounded-2xl overflow-hidden" style="height:300px"></div><a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${x.latitude},${x.longitude}" class="inline-block mt-3 px-4 py-2 rounded-xl border font-bold">فتح الموقع على الخريطة</a>`:'<div class="mt-3 text-sm" style="color:var(--muted)">سيظهر موقع المندوب هنا بعد تشغيل GPS.</div>'}</div>${x.status==='delivered'?'<div class="text-center font-extrabold">تم تسليم الطلب بنجاح</div>':'<div class="text-center text-sm" style="color:var(--muted)">تتحدث الحالة وموقع المندوب تلقائيًا كل 5 ثوانٍ.</div>'}</div>`;
      if(gps&&window.L){const el=document.querySelector('#rosLiveMap');if(el&&!map){map=L.map(el).setView([+x.latitude,+x.longitude],15);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);marker=L.marker([+x.latitude,+x.longitude]).addTo(map)}else if(marker){marker.setLatLng([+x.latitude,+x.longitude]);map.panTo([+x.latitude,+x.longitude])}}
      if(x.status==='delivered'||x.status==='cancelled'){if(timer)clearInterval(timer)}
    }
    if(!window.L)try{const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(l);await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)})}catch(_){ }
    await load();timer=setInterval(load,5000);
  }

  async function loadDriver(token){
    // Canonical driver route: remove legacy duplicate containers before rendering.
    document.querySelectorAll('#driverBox').forEach(el=>el.remove());
    document.querySelectorAll('[data-ros-legacy-driver]').forEach(el=>el.remove());
    const app=document.querySelector('#app');if(!app)return;
    app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-6"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="eyebrow">DRIVER APP</div><h1 class="text-2xl font-extrabold">لوحة المندوب</h1></div><button type="button" onclick="location.hash='menu'" class="rounded-xl border px-4 py-2">خروج</button></div><div id="rosDriverBox" class="mt-5">جارٍ تحميل الطلبات...</div></div></div></main>`;
    let watch=null,active=null,last=0;
    const stop=()=>{if(watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watch);watch=null;active=null};
    async function load(){document.querySelectorAll('#driverBox').forEach(el=>el.remove());const r=await db.rpc('driver_get_orders',{p_token:token}),box=document.querySelector('#rosDriverBox');if(!box)return;if(r.error){box.innerHTML=`<div class="p-5 rounded-2xl bg-red-500/10">${esc(r.error.message||'رابط المندوب غير صالح')}</div>`;stop();return}const rows=r.data||[];if(!rows.length){box.innerHTML='<div class="text-center py-12" style="color:var(--muted)">لا توجد طلبات مسندة إليك حاليًا.</div>';stop();return}box.innerHTML=rows.map(o=>`<article class="rounded-2xl p-4 mb-4" style="background:var(--surface2)"><div class="flex justify-between gap-3"><div><div class="font-extrabold">طلب #${esc(o.id.slice(0,8))}</div><div class="mt-1">${esc(o.customer_name)} • ${esc(o.customer_phone)}</div></div><span class="px-3 py-1 rounded-full text-xs font-bold" style="background:var(--brand);color:#111">${label(o.delivery_status)}</span></div><div class="mt-3 text-sm">${esc(o.address)}</div><div class="mt-3 font-extrabold">${money(o.total)}</div><div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4"><button type="button" onclick="window.__rosDriverStatus('${esc(o.id)}','accepted')" class="rounded-xl border p-3 font-bold">قبول</button><button type="button" onclick="window.__rosDriverStatus('${esc(o.id)}','picked_up')" class="rounded-xl border p-3 font-bold">استلام</button><button type="button" onclick="window.__rosDriverStatus('${esc(o.id)}','out_for_delivery')" class="rounded-xl border p-3 font-bold">خرج للتوصيل</button><button type="button" onclick="window.__rosDriverStatus('${esc(o.id)}','delivered')" class="rounded-xl border p-3 font-bold">تم التسليم</button>${o.customer_lat!=null&&o.customer_lng!=null?`<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${o.customer_lat},${o.customer_lng}" class="rounded-xl border p-3 font-bold text-center">موقع العميل</a>`:''}<button type="button" onclick="window.__rosDriverGps('${esc(o.id)}')" class="rounded-xl border p-3 font-bold">تشغيل GPS</button></div><div class="mt-3 text-sm" style="color:var(--muted)">آخر موقع مرسل: ${coords(o.latitude,o.longitude)}</div></article>`).join('');window.__rosDriverStatus=async(id,status)=>{const rr=await db.rpc('driver_update_status',{p_token:token,p_order_id:id,p_status:status});if(rr.error)return notify(rr.error.message||'تعذر تحديث الحالة');notify('تم تحديث الحالة');await load()};window.__rosDriverGps=id=>{if(!navigator.geolocation)return notify('المتصفح لا يدعم GPS');if(active===id&&watch!==null){stop();notify('تم إيقاف GPS');return}stop();active=id;watch=navigator.geolocation.watchPosition(async p=>{if(Date.now()-last<4000)return;last=Date.now();await db.rpc('driver_update_location',{p_token:token,p_order_id:id,p_latitude:p.coords.latitude,p_longitude:p.coords.longitude,p_accuracy:p.coords.accuracy});await load()},e=>notify(e.message||'تعذر تشغيل GPS'),{enableHighAccuracy:true,maximumAge:3000,timeout:20000});notify('تم تشغيل GPS للمندوب')};}
    await load();
  }

  async function adminPanel(){
    const app=document.querySelector('#app');if(!app)return;document.querySelector('#deliveryControlPanel')?.remove();const s=await session();if(!s||!window.store?.restaurant?.id)return;const rid=store.restaurant.id,p=document.createElement('section');p.id='deliveryControlPanel';p.className='lux-card rounded-3xl p-5 mt-6';p.innerHTML=`<div class="flex justify-between items-center gap-3"><div><div class="eyebrow">DELIVERY CONTROL</div><h2 class="text-2xl font-extrabold">إدارة التوصيل و GPS</h2><p class="text-sm mt-1" style="color:var(--muted)">التعيين يدويًا فقط. حالات التوصيل يغيّرها المندوب.</p></div><button type="button" id="rosRefresh" class="rounded-xl border px-4 py-2">تحديث</button></div><div class="mt-5 grid gap-3"><input id="rosName" class="w-full border p-4" placeholder="اسم المندوب"><input id="rosPhone" class="w-full border p-4" placeholder="رقم الموبايل"><button type="button" id="rosAdd" class="w-full py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">إضافة مندوب</button></div><div class="mt-7"><div class="flex items-center justify-between gap-3"><h3 class="text-xl font-extrabold">المندوبون</h3><span class="text-xs" style="color:var(--muted)">إدارة مباشرة</span></div><div id="rosDrivers" class="mt-3"></div></div><div class="mt-7"><h3 class="text-xl font-extrabold">طلبات التوصيل</h3><div id="rosOrders" class="mt-3"></div></div>`;app.appendChild(p);
    async function load(){const [dr,doq,oq]=await Promise.all([db.from('drivers').select('*').eq('restaurant_id',rid).order('created_at',{ascending:false}),db.from('delivery_orders').select('*').eq('restaurant_id',rid).order('created_at',{ascending:false}).limit(50),db.from('orders').select('*').eq('restaurant_id',rid).order('created_at',{ascending:false}).limit(50)]);const drivers=dr.data||[],dos=doq.data||[],orders=oq.data||[],bo=new Map(orders.map(x=>[x.id,x])),bd=new Map(drivers.map(x=>[x.id,x]));const activeStatuses=new Set(['new','confirmed','preparing','ready','assigned','accepted','picked_up','out_for_delivery']);const driverOrders=new Map();dos.forEach(x=>{if(x.driver_id&&activeStatuses.has(x.status)&&!driverOrders.has(x.driver_id))driverOrders.set(x.driver_id,x)});p.querySelector('#rosDrivers').innerHTML=drivers.length?drivers.map(d=>{const latest=driverOrders.get(d.id),latestOrder=latest?bo.get(latest.order_id):null,track=latestOrder?.tracking_token?trackUrl(latestOrder.tracking_token):'';return`<div class="rounded-2xl p-4 mb-3" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--text) 10%,transparent)"><div class="flex items-start justify-between gap-3"><div><div class="font-extrabold text-lg">${esc(d.name)}</div><div class="text-sm mt-1" style="color:var(--muted)">${esc(d.phone||'بدون رقم')}</div></div><span class="px-3 py-1 rounded-full text-xs font-bold" style="background:${d.active?'#16a34a22':'#ffffff10'};color:${d.active?'#6ee7a0':'#aaa'}">${d.active?'نشط':'متوقف'}</span></div><div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4"><button type="button" data-driver-toggle="1" data-driver-id="${esc(d.id)}" data-driver-active="${String(d.active)}" class="rounded-xl border px-3 py-2 font-bold">${d.active?'إيقاف المندوب':'تفعيل المندوب'}</button><a href="${esc(driverUrl(d.access_token))}" target="_blank" rel="noopener" class="rounded-xl border px-3 py-2 font-bold text-center">رابط المندوب</a>${track?`<a href="${esc(track)}" target="_blank" rel="noopener" class="rounded-xl border px-3 py-2 font-bold text-center">تتبع العميل</a>`:'<button type="button" disabled class="rounded-xl border px-3 py-2 font-bold opacity-50">تتبع العميل</button>'}<button type="button" data-driver-delete="${esc(d.id)}" class="rounded-xl border border-red-500/40 px-3 py-2 font-bold text-red-400">حذف المندوب</button></div><div class="mt-3 text-xs" style="color:var(--muted)">${latestOrder?'آخر طلب نشط: #'+esc(String(latest.order_id).slice(0,8)):'لا يوجد طلب دليفري نشط حاليًا'}</div></div>`}).join(''):'<div class="py-5" style="color:var(--muted)">لا يوجد مندوبون بعد.</div>';p.querySelector('#rosOrders').innerHTML=dos.length?dos.map(d=>{const o=bo.get(d.order_id)||{},cur=bd.get(d.driver_id);return `<article class="rounded-2xl p-4 mb-3" style="background:var(--surface2)"><div class="flex justify-between gap-3"><div><div class="font-extrabold">طلب #${esc(String(d.order_id).slice(0,8))}</div><div>${esc(o.customer_name||'عميل')} • ${esc(o.customer_phone||'')}</div><div class="mt-1 text-sm">${esc(o.address||'')}</div></div><span class="px-3 py-1 rounded-full text-xs font-bold" style="background:var(--brand);color:#111">${label(d.status)}</span></div><div class="mt-3 font-extrabold">${money(o.total)}</div><div class="mt-2 text-sm">المندوب الحالي: <b>${esc(cur?.name||'بدون مندوب')}</b></div>${!d.driver_id?`<div class="mt-3 flex gap-2"><select data-sel="${esc(d.order_id)}" class="flex-1 border p-3"><option value="">اختر مندوبًا</option>${drivers.filter(x=>x.active).map(x=>`<option value="${esc(x.id)}">${esc(x.name)} — ${esc(x.phone||'')}</option>`).join('')}</select><button type="button" data-assign="${esc(d.order_id)}" class="rounded-xl px-5 font-extrabold" style="background:var(--brand);color:#111">تعيين</button></div>`:`<div class="mt-3 flex flex-wrap gap-2"><span class="rounded-xl px-4 py-2" style="background:var(--surface)">تم التعيين</span>${o.tracking_token?`<a href="${esc(trackUrl(o.tracking_token))}" target="_blank" rel="noopener" class="rounded-xl border px-4 py-2 font-bold">فتح تتبع العميل</a>`:''}</div>`}</article>`}).join(''):'<div class="py-5" style="color:var(--muted)">لا توجد طلبات توصيل.</div>';p.querySelectorAll('[data-driver-toggle]').forEach(b=>b.onclick=async()=>{const active=b.dataset.driverActive!=='true';b.disabled=true;const rr=await db.rpc('admin_update_driver',{p_restaurant_id:rid,p_driver_id:b.dataset.driverId,p_active:active});if(rr.error){b.disabled=false;return notify(rr.error.message||'تعذر تعديل حالة المندوب')}notify(active?'تم تفعيل المندوب':'تم إيقاف المندوب');await load()});p.querySelectorAll('[data-driver-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('هل أنت متأكد من حذف هذا المندوب؟\\n\\nلن يمكن التراجع عن هذا الإجراء.'))return;b.disabled=true;const rr=await db.rpc('admin_delete_driver',{p_driver_id:b.dataset.driverDelete});if(rr.error){b.disabled=false;return notify(rr.error.message==='driver_has_active_delivery'?'لا يمكن حذف المندوب لأنه مرتبط بطلب دليفري نشط. أوقف الطلب أو أكمله أولًا.':rr.error.message||'تعذر حذف المندوب')}notify('تم حذف المندوب');await load()});p.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(b.dataset.copy);notify('تم نسخ رابط المندوب')}catch(_){prompt('انسخ الرابط:',b.dataset.copy)}});p.querySelectorAll('[data-assign]').forEach(b=>b.onclick=async()=>{const sel=p.querySelector(`[data-sel="${b.dataset.assign}"]`);if(!sel?.value)return notify('اختر مندوبًا أولًا');const rr=await db.rpc('admin_assign_delivery',{p_order_id:b.dataset.assign,p_driver_id:sel.value});if(rr.error)return notify(rr.error.message||'تعذر تعيين المندوب');notify('تم تعيين المندوب');await load()});if(dr.error)notify(dr.error.message||'تعذر تحميل المندوبين');if(doq.error)notify(doq.error.message||'تعذر تحميل طلبات التوصيل');if(oq.error)notify(oq.error.message||'تعذر تحميل الطلبات')}
    p.querySelector('#rosAdd').onclick=async()=>{const n=p.querySelector('#rosName').value.trim(),ph=p.querySelector('#rosPhone').value.trim();if(!n)return notify('اكتب اسم المندوب');const r=await db.rpc('admin_create_driver',{p_restaurant_id:rid,p_name:n,p_phone:ph||null});if(r.error)return notify(r.error.message||'تعذر إضافة المندوب');p.querySelector('#rosName').value='';p.querySelector('#rosPhone').value='';notify('تمت إضافة المندوب');await load()};p.querySelector('#rosRefresh').onclick=load;await load();
  }

  async function adminWrapper(){if(typeof originalAdmin==='function')await originalAdmin();await adminPanel()}
  async function router(){const h=location.hash||'';if(/^#track\//.test(h))return loadTracking(decodeURIComponent(h.slice(7)));if(/^#driver\//.test(h))return loadDriver(decodeURIComponent(h.slice(8)));if(h==='#admin')return adminWrapper();return typeof originalRouter==='function'?originalRouter.apply(this,arguments):undefined}
  if(typeof originalRouter==='function')try{window.removeEventListener('hashchange',originalRouter)}catch(_){ }
  window.renderAdmin=adminWrapper;window.renderRouter=router;window.addEventListener('hashchange',router);
  setTimeout(()=>{if(/^#driver\//.test(location.hash||''))router()},250);
  setTimeout(()=>{if(/^#driver\//.test(location.hash||''))router()},1200);
})();


/* ===== ROS LOCAL MODULE: delivery-ui-polish-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_DELIVERY_UI_POLISH_V1__)return;
window.__ROS_DELIVERY_UI_POLISH_V1__=true;
const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const token=()=>{const h=String(location.hash||'');return /^#driver\//.test(h)?decodeURIComponent(h.slice(8)):null};
function css(){if(document.getElementById('ros-delivery-polish-style'))return;const s=document.createElement('style');s.id='ros-delivery-polish-style';s.textContent=`
#rosDriverBox .ros-driver-hero{display:flex;align-items:center;gap:15px;padding:17px;border-radius:24px;margin-bottom:15px;background:linear-gradient(135deg,color-mix(in srgb,var(--brand) 14%,var(--surface2)),var(--surface2));border:1px solid color-mix(in srgb,var(--brand) 25%,transparent);box-shadow:0 14px 35px rgba(0,0,0,.16)}#rosDriverBox .ros-driver-avatar{width:68px;height:68px;border-radius:20px;object-fit:cover;border:2px solid color-mix(in srgb,var(--brand) 55%,transparent);background:var(--surface);box-shadow:0 8px 24px rgba(0,0,0,.22)}#rosDriverBox .ros-driver-avatar-fallback{display:grid;place-items:center;font-size:25px;font-weight:900;color:#111;background:var(--brand)}#rosDriverBox .ros-driver-hero h3{margin:0;font-size:20px;font-weight:900}#rosDriverBox .ros-driver-hero p{margin:3px 0 0;font-size:12px;color:var(--muted)}#rosDriverBox article{border:1px solid color-mix(in srgb,var(--brand) 12%,transparent)!important;box-shadow:0 12px 30px rgba(0,0,0,.10);transition:transform .2s,box-shadow .2s}#rosDriverBox article:hover{transform:translateY(-2px);box-shadow:0 18px 38px rgba(0,0,0,.16)}#rosDriverBox article button,#rosDriverBox article a{transition:all .18s}#rosDriverBox article button:hover,#rosDriverBox article a:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--brand) 45%,transparent)}#rosTrackBox .ros-customer-driver{display:flex;align-items:center;gap:14px;padding:16px;border-radius:22px;background:linear-gradient(135deg,color-mix(in srgb,var(--brand) 12%,var(--surface2)),var(--surface2));border:1px solid color-mix(in srgb,var(--brand) 25%,transparent);margin-bottom:15px;box-shadow:0 12px 32px rgba(0,0,0,.10)}#rosTrackBox .ros-customer-driver img,#rosTrackBox .ros-customer-driver .avatar{width:64px;height:64px;border-radius:19px;object-fit:cover;border:2px solid color-mix(in srgb,var(--brand) 55%,transparent);background:var(--surface)}#rosTrackBox .ros-customer-driver .avatar{display:grid;place-items:center;font-size:24px;font-weight:900;color:#111;background:var(--brand)}#rosTrackBox .ros-customer-driver h3{margin:0;font-size:18px;font-weight:900}#rosTrackBox .ros-customer-driver p{margin:3px 0 0;font-size:12px;color:var(--muted)}#rosTrackBox .ros-customer-driver .ros-driver-call{margin-right:auto;border:1px solid color-mix(in srgb,var(--brand) 30%,transparent);border-radius:12px;padding:9px 12px;font-size:12px;font-weight:800;text-decoration:none;color:inherit}@media(max-width:560px){#rosDriverBox .ros-driver-hero{padding:14px}.ros-driver-avatar{width:58px!important;height:58px!important}#rosTrackBox .ros-customer-driver{align-items:flex-start}.ros-customer-driver .ros-driver-call{margin-right:0}}
`;document.head.appendChild(s)}
async function driverProfile(){const t=token();if(!t||!window.db)return null;try{const r=await db.rpc('public_driver_profile',{p_token:t});return !r.error&&r.data?.length?r.data[0]:null}catch(_){return null}}
async function addDriverHero(){const box=document.querySelector('#rosDriverBox');if(!box||box.dataset.rosHero==='1')return;box.dataset.rosHero='loading';const p=await driverProfile();if(!document.querySelector('#rosDriverBox'))return;const name=p?.driver_name||'مندوب التوصيل';const phone=p?.driver_phone||'';const photo=p?.driver_photo_url||p?.photo_url||'';const initial=esc(String(name).trim().charAt(0)||'م');const hero=document.createElement('div');hero.className='ros-driver-hero';hero.innerHTML=photo?`<img class="ros-driver-avatar" src="${esc(photo)}" alt="صورة المندوب" onerror="this.outerHTML='<div class=\"ros-driver-avatar ros-driver-avatar-fallback\">${initial}</div>'"><div><h3>${esc(name)}</h3><p>${phone?`<span dir="ltr">${esc(phone)}</span>`:''}</p></div>`:`<div class="ros-driver-avatar ros-driver-avatar-fallback">${initial}</div><div><h3>${esc(name)}</h3><p>${phone?`<span dir="ltr">${esc(phone)}</span>`:''}</p></div>`;box.prepend(hero);box.dataset.rosHero='1'}
async function polishCustomer(){const box=document.querySelector('#rosTrackBox');if(!box||box.dataset.rosDriverHero==='1')return;const t=String(location.hash||'').startsWith('#track/')?decodeURIComponent(location.hash.slice(7)):null;if(!t)return;const p=await (async()=>{try{const r=await db.rpc('public_driver_profile',{p_token:t});return !r.error&&r.data?.length?r.data[0]:null}catch(_){return null}})();if(!p?.driver_name)return;const photo=p.driver_photo_url||p.photo_url||'';const initial=esc(String(p.driver_name).trim().charAt(0)||'م');const hero=document.createElement('div');hero.className='ros-customer-driver';hero.innerHTML=photo?`<img src="${esc(photo)}" alt="صورة مندوب التوصيل" onerror="this.outerHTML='<div class=\"avatar\">${initial}</div>'"><div><h3>${esc(p.driver_name)}</h3><p>مندوب التوصيل • متابع لحظيًا</p></div>${p.driver_phone?`<a class="ros-driver-call" href="tel:${esc(p.driver_phone)}">اتصال</a>`:''}`:`<div class="avatar">${initial}</div><div><h3>${esc(p.driver_name)}</h3><p>مندوب التوصيل • متابع لحظيًا</p></div>${p.driver_phone?`<a class="ros-driver-call" href="tel:${esc(p.driver_phone)}">اتصال</a>`:''}`;box.prepend(hero);box.dataset.rosDriverHero='1'}
function run(){css();if(/^#driver\//.test(location.hash||''))setTimeout(addDriverHero,350);if(/^#track\//.test(location.hash||''))setTimeout(polishCustomer,650)}
new MutationObserver(()=>run()).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',()=>setTimeout(run,300));run();
})();



/* ===== ROS LOCAL MODULE: delivery-idempotency-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_DELIVERY_IDEMPOTENCY_V1__) return;
  window.__ROS_DELIVERY_IDEMPOTENCY_V1__=true;

  function patch(){
    const client=window.db;
    if(!client||typeof client.rpc!=='function'||client.__rosDeliveryRpcPatched)return false;

    const originalRpc=client.rpc.bind(client);
    client.rpc=async function(fn,args){
      if(fn==='create_delivery_order'){
        const pending=window.__ROS_PENDING_DELIVERY_REQUEST_ID__;
        const requestId=pending||crypto.randomUUID();
        window.__ROS_PENDING_DELIVERY_REQUEST_ID__=requestId;

        const nextArgs={...(args||{}),p_client_request_id:requestId};
        const result=await originalRpc('create_delivery_order_v2',nextArgs);

        if(!result?.error){
          window.__ROS_PENDING_DELIVERY_REQUEST_ID__=null;
        }
        return result;
      }
      return originalRpc(fn,args);
    };

    client.__rosDeliveryRpcPatched=true;
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    if(patch()||++tries>=120)clearInterval(timer);
  },250);
  patch();
})();


/* ===== ROS LOCAL MODULE: order-modifier-bridge-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_ORDER_MODIFIER_BRIDGE_V1__)return;
window.__ROS_ORDER_MODIFIER_BRIDGE_V1__=true;
function cartItems(){try{return Array.isArray(window.cart)?window.cart:[]}catch(_){return []}}
function enrich(items){
  const c=cartItems();
  if(!Array.isArray(items)||!c.length)return items;
  return items.map((item,i)=>{
    const source=c[i];
    if(!source||String(source.id)!==String(item.product_id))return item;
    const mods=Array.isArray(source.modifiers)?source.modifiers.map(m=>({id:m.id,name:m.name,price:m.price})):[];
    return {...item,modifiers:mods};
  });
}
function patch(){
  const client=window.db;
  if(!client||typeof client.rpc!=='function'||client.__rosModifierBridgePatched)return false;
  const original=client.rpc.bind(client);
  client.rpc=async function(fn,args){
    if(fn==='create_delivery_order'||fn==='create_delivery_order_v2'||fn==='create_dine_in_order'){
      const next={...(args||{})};
      next.p_items=enrich(next.p_items);
      return original(fn,next);
    }
    return original(fn,args);
  };
  client.__rosModifierBridgePatched=true;
  return true;
}
let tries=0;
const timer=setInterval(()=>{if(patch()||++tries>=120)clearInterval(timer)},250);
patch();
})();



/* ===== ROS LOCAL MODULE: delivery-admin-enhancements.js ===== */
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

  // Assignment is handled centrally by delivery-hardening-v4.js.
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
      if(a.parentElement?.querySelector('[data-driver-delete]'))continue;
      const del=document.createElement('button');del.type='button';del.dataset.driverDelete=d.id;del.textContent='حذف';del.className='rounded-xl border border-red-500/40 px-4 py-2 font-bold text-red-400';del.onclick=async function(){const driverName=d.name||'هذا المندوب';if(!confirm(`هل أنت متأكد من حذف ${driverName}؟\n\nلن يمكن التراجع عن هذا الإجراء.`))return;this.disabled=true;const rr=await db.rpc('admin_delete_driver',{p_driver_id:d.id});if(rr.error){this.disabled=false;const msg=rr.error.message||'تعذر حذف المندوب';return typeof toast==='function'&&toast(msg==='driver_has_active_delivery'?'لا يمكن حذف المندوب لأنه مرتبط بطلب دليفري نشط. أوقف الطلب أو أكمله أولاً.':msg)}if(typeof toast==='function')toast('تم حذف المندوب');panel.querySelector('#rosRefresh')?.click()};a.parentElement.appendChild(del);
    });
  }
  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>enhance().catch(console.warn),120)};new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule();
  if(!window.__ROS_ADMIN_UX_LOADER__){window.__ROS_ADMIN_UX_LOADER__=true;const s=document.createElement('script');s.src='admin-ux-notifications-v1.js?v=3';s.defer=true;document.head.appendChild(s)}
})();
