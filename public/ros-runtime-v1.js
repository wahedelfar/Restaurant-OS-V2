
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
async function __rosInit(){
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
      if(a.parentElement?.querySelector('[data-driver-delete]'))return;
      const del=document.createElement('button');del.type='button';del.dataset.driverDelete=d.id;del.textContent='حذف';del.className='rounded-xl border border-red-500/40 px-4 py-2 font-bold text-red-400';del.onclick=async function(){const driverName=d.name||'هذا المندوب';if(!confirm(`هل أنت متأكد من حذف ${driverName}؟\n\nلن يمكن التراجع عن هذا الإجراء.`))return;this.disabled=true;const rr=await db.rpc('admin_delete_driver',{p_driver_id:d.id});if(rr.error){this.disabled=false;const msg=rr.error.message||'تعذر حذف المندوب';return typeof toast==='function'&&toast(msg==='driver_has_active_delivery'?'لا يمكن حذف المندوب لأنه مرتبط بطلب دليفري نشط. أوقف الطلب أو أكمله أولاً.':msg)}if(typeof toast==='function')toast('تم حذف المندوب');panel.querySelector('#rosRefresh')?.click()};a.parentElement.appendChild(del);
    });
  }
  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>enhance().catch(console.warn),120)};new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule();
  if(!window.__ROS_ADMIN_UX_LOADER__){window.__ROS_ADMIN_UX_LOADER__=true;const s=document.createElement('script');s.src='admin-ux-notifications-v1.js?v=3';s.defer=true;document.head.appendChild(s)}
})();


/* ===== ROS LOCAL MODULE: driver-photo-field-v2.js ===== */
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



/* ===== ROS LOCAL MODULE: admin-payment-proof-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_ADMIN_PAYMENT_PROOF_V4__)return;
window.__ROS_ADMIN_PAYMENT_PROOF_V4__=true;
const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
let timer=0;
const hiddenKey='ros_vodafone_hidden_v1';
const hidden=()=>{try{return new Set(JSON.parse(sessionStorage.getItem(hiddenKey)||'[]'))}catch(_){return new Set()}};
const saveHidden=s=>{try{sessionStorage.setItem(hiddenKey,JSON.stringify([...s].slice(-100)))}catch(_){} };
function style(){if(document.getElementById('ros-vodafone-style'))return;const s=document.createElement('style');s.id='ros-vodafone-style';s.textContent=`#ros-vodafone-launcher{position:fixed;right:18px;bottom:134px;z-index:9988;border:1px solid #ffffff20;background:#17191df5;color:#f6f1e7;border-radius:18px;padding:13px 17px;min-width:118px;height:46px;font:800 14px Cairo,Arial;box-shadow:0 15px 45px #0008;cursor:pointer;backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;gap:7px}#ros-vodafone-launcher .rv-dot{width:8px;height:8px;border-radius:50%;background:#25d366;box-shadow:0 0 12px #25d366}#ros-vodafone-launcher .rv-count{min-width:21px;padding:2px 6px;border-radius:999px;background:#25d366;color:#07130a;text-align:center;font-size:10px}#ros-vodafone-panel{position:fixed;inset:0;z-index:9987;background:rgba(8,9,11,.94);backdrop-filter:blur(14px);display:none;overflow:auto;font-family:Cairo,Arial,sans-serif;color:#f7f2e8}#ros-vodafone-panel.open{display:block}.rv-wrap{max-width:1050px;margin:auto;padding:22px}.rv-head{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:18px}.rv-title h2{margin:0;font-size:28px;font-weight:900}.rv-title p{margin:3px 0 0;color:#aaa39a;font-size:12px}.rv-close{width:44px;height:44px;border-radius:14px;border:1px solid #ffffff18;background:#202329;color:#fff;font-size:24px;line-height:1;cursor:pointer}.rv-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}.rv-stat{background:#17191d;border:1px solid #ffffff10;border-radius:17px;padding:14px}.rv-stat b{font-size:23px}.rv-stat span{display:block;color:#aaa39a;font-size:11px;margin-top:2px}.rv-list{display:grid;gap:13px}.rv-card{position:relative;background:linear-gradient(145deg,#191b20,#14161a);border:1px solid #ffffff12;border-radius:22px;padding:16px;box-shadow:0 14px 40px #0004;overflow:hidden}.rv-card:before{content:'';position:absolute;inset:0 auto 0 0;width:3px;background:#25d366}.rv-card-top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-left:34px}.rv-meta{color:#aaa39a;font-size:11px;margin-top:4px;line-height:1.7}.rv-total{font-size:17px;font-weight:900;white-space:nowrap}.rv-close-card{position:absolute;top:12px;left:12px;width:30px;height:30px;border-radius:10px;border:1px solid #ffffff12;background:#22252a;color:#bdb7ae;cursor:pointer;font-size:18px;line-height:1}.rv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:14px}.rv-info{background:#202329;border-radius:13px;padding:10px}.rv-info span{display:block;color:#999;font-size:10px;margin-bottom:3px}.rv-info b{font-size:12px;word-break:break-word}.rv-items{margin-top:9px;background:#202329;border-radius:13px;padding:10px}.rv-items span{display:block;color:#999;font-size:10px;margin-bottom:5px}.rv-items ul{margin:0;padding-right:18px;font-size:12px;line-height:1.9}.rv-proof{display:block;margin-top:13px;border-radius:17px;overflow:hidden;border:1px solid #ffffff12;background:#0f1114}.rv-proof img{display:block;width:100%;max-height:360px;object-fit:contain}.rv-actions{display:flex;gap:8px;margin-top:10px}.rv-action{display:inline-flex;align-items:center;justify-content:center;flex:1;border:1px solid #ffffff15;background:#202329;color:#f7f2e8;border-radius:12px;padding:10px;text-decoration:none;font-size:12px;font-weight:800}.rv-empty{padding:38px 20px;text-align:center;border:1px dashed #ffffff16;border-radius:20px;color:#aaa39a;background:#15171b}.rv-refresh{color:#aaa39a;font-size:11px;margin-top:12px;text-align:center}@media(max-width:700px){#ros-vodafone-launcher{right:18px;bottom:134px}.rv-wrap{padding:13px}.rv-title h2{font-size:23px}.rv-summary{grid-template-columns:1fr 1fr}.rv-summary .rv-stat:last-child{grid-column:1/-1}.rv-grid{grid-template-columns:1fr}.rv-total{font-size:15px}}`;document.head.appendChild(s)}
function ensure(){if(location.hash!=='#admin'&&!location.hash.startsWith('#admin/'))return;if(window.__ROS_ADMIN_READY__!==true){document.getElementById('ros-vodafone-launcher')?.remove();document.getElementById('ros-vodafone-panel')?.remove();return}style();if(!document.getElementById('ros-vodafone-launcher')){const b=document.createElement('button');b.id='ros-vodafone-launcher';b.innerHTML='<span class="rv-dot"></span><span>فودافون</span><span id="ros-vodafone-count" class="rv-count">0</span>';b.onclick=openPanel;document.body.appendChild(b)}if(!document.getElementById('ros-vodafone-panel')){const p=document.createElement('div');p.id='ros-vodafone-panel';p.innerHTML='<div class="rv-wrap"><div class="rv-head"><div class="rv-title"><h2>فودافون</h2><p>مراجعة إثباتات التحويل</p></div><button type="button" class="rv-close" aria-label="إغلاق">×</button></div><div id="ros-vodafone-content"></div></div>';p.querySelector('.rv-close').onclick=closePanel;p.addEventListener('click',e=>{if(e.target===p)closePanel()});document.body.appendChild(p)}}
function itemLines(v){try{const a=Array.isArray(v)?v:JSON.parse(v||'[]');return a.map(x=>`${x.name||x.product_name||'منتج'} × ${x.quantity||x.qty||1}${x.price!=null?' — '+money(x.price):''}`)}catch(_){return v?[String(v)]:[]}}
async function render(){ensure();const content=document.getElementById('ros-vodafone-content');if(!content||!window.db||!window.store?.restaurant?.id)return;const q=await db.from('orders').select('id,order_type,customer_name,customer_phone,address,payment_method,transfer_phone,payment_proof_url,total,items,created_at,status,table_number').eq('restaurant_id',store.restaurant.id).eq('payment_method','vodafone').not('payment_proof_url','is',null).order('created_at',{ascending:false}).limit(50);if(q.error){content.innerHTML='<div class="rv-empty">تعذر تحميل إثباتات التحويل حاليًا.</div>';return}const hs=hidden(),rows=(q.data||[]).filter(x=>!hs.has(String(x.id)));const count=document.getElementById('ros-vodafone-count');if(count)count.textContent=rows.length;const total=rows.reduce((a,x)=>a+Number(x.total||0),0);content.innerHTML=`<div class="rv-summary"><div class="rv-stat"><b>${rows.length}</b><span>إثبات ظاهر</span></div><div class="rv-stat"><b>${money(total)}</b><span>إجمالي التحويلات</span></div><div class="rv-stat"><b>● مباشر</b><span>تحديث تلقائي</span></div></div><div class="rv-list">${rows.length?rows.map(x=>{const id=String(x.id||''),short=id.slice(0,8),date=x.created_at?new Date(x.created_at).toLocaleString('ar-EG'):'';const items=itemLines(x.items);const type=x.order_type==='delivery'?'طلب توصيل':x.order_type==='dine_in'?'طلب طاولة':'طلب '+(x.order_type||'غير محدد');return `<article class="rv-card" data-proof-card="${esc(id)}"><button type="button" class="rv-close-card" data-proof-close="${esc(id)}" aria-label="إخفاء الكارت">×</button><div class="rv-card-top"><div><div class="rv-meta"><b style="color:#f7f2e8">${esc(type)}</b> • طلب #${esc(short)}<br>${date?esc(date):''}</div></div><div class="rv-total">${money(x.total)}</div></div><div class="rv-grid"><div class="rv-info"><span>العميل</span><b>${esc(x.customer_name||'—')}</b></div><div class="rv-info"><span>رقم الهاتف</span><b dir="ltr">${esc(x.customer_phone||'—')}</b></div><div class="rv-info"><span>العنوان</span><b>${esc(x.address||'—')}</b></div><div class="rv-info"><span>رقم التحويل</span><b dir="ltr">${esc(x.transfer_phone||'—')}</b></div><div class="rv-info"><span>طريقة الدفع</span><b>${esc(x.payment_method||'Vodafone Cash')}</b></div><div class="rv-info"><span>حالة الطلب</span><b>${esc(x.status||'—')}</b></div>${x.table_number!=null?`<div class="rv-info"><span>رقم الطاولة</span><b>${esc(x.table_number)}</b></div>`:''}<div class="rv-info"><span>نوع الطلب</span><b>${esc(type)}</b></div></div>${items.length?`<div class="rv-items"><span>تفاصيل المنتجات</span><ul>${items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div>`:''}<a class="rv-proof" href="${esc(x.payment_proof_url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(x.payment_proof_url)}" alt="إثبات تحويل" loading="lazy" onerror="this.parentElement.style.display='none'"></a><div class="rv-actions"><a class="rv-action" href="${esc(x.payment_proof_url)}" target="_blank" rel="noopener noreferrer">فتح صورة التحويل</a></div></article>`}).join(''):'<div class="rv-empty">لا توجد إثباتات تحويل ظاهرة حاليًا.</div>'}</div><div class="rv-refresh">تحديث تلقائي كل 15 ثانية</div>`;content.querySelectorAll('[data-proof-close]').forEach(b=>b.onclick=()=>{const s=hidden();s.add(String(b.dataset.proofClose));saveHidden(s);b.closest('[data-proof-card]')?.remove();const n=document.getElementById('ros-vodafone-count');if(n)n.textContent=Math.max(0,Number(n.textContent||0)-1)})}
function openPanel(){ensure();document.getElementById('ros-vodafone-panel')?.classList.add('open');render().catch(()=>{})}function closePanel(){document.getElementById('ros-vodafone-panel')?.classList.remove('open')}function schedule(){clearTimeout(timer);timer=setTimeout(()=>render().catch(()=>{}),180)}new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',()=>{if(location.hash!=='#admin'&&!location.hash.startsWith('#admin/'))closePanel();schedule()});setInterval(()=>{if(document.getElementById('ros-vodafone-panel')?.classList.contains('open'))render().catch(()=>{})},15000);schedule();
})();



/* ===== ROS LOCAL MODULE: admin-tables-launcher-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_ADMIN_TABLES_LAUNCHER_V1__)return;window.__ROS_ADMIN_TABLES_LAUNCHER_V1__=true;
const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
let timer=0;
function getDb(){try{if(window.__ROS_TABLES_DB__)return window.__ROS_TABLES_DB__;const c=window.APP_CONFIG||{};if(window.supabase?.createClient&&c.supabaseUrl&&c.supabaseAnonKey)return window.__ROS_TABLES_DB__=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);return window.db||null}catch(_){return null}}
function css(){if(document.getElementById('ros-tables-style'))return;const s=document.createElement('style');s.id='ros-tables-style';s.textContent=`#ros-tables-launcher{position:fixed;right:18px;bottom:76px;z-index:9988;border:1px solid #ffffff20;background:#17191df5;color:#f6f1e7;border-radius:18px;padding:13px 17px;min-width:118px;height:46px;font:800 14px Cairo,Arial;box-shadow:0 15px 45px #0008;cursor:pointer;backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;gap:7px}#ros-tables-launcher .rt-icon{font-size:15px}#ros-tables-panel{position:fixed;inset:0;z-index:9986;background:#0d0e10f7;backdrop-filter:blur(14px);display:none;overflow:auto;font-family:Cairo,Arial;color:var(--text)}#ros-tables-panel.open{display:block}.rt-wrap{max-width:1150px;margin:auto;padding:24px}.rt-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}.rt-head h2{margin:0;font-size:30px;font-weight:900}.rt-head p{margin:4px 0 0;color:var(--muted);font-size:12px}.rt-close{width:44px;height:44px;border-radius:14px;border:1px solid #ffffff18;background:var(--surface2);color:#fff;font-size:24px;cursor:pointer}.rt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.rt-table{min-height:300px;display:flex;flex-direction:column;align-items:stretch;justify-content:space-between;gap:13px;padding:16px;border-radius:20px;background:linear-gradient(145deg,var(--surface),var(--surface2));border:1px solid #ffffff12;box-shadow:0 12px 32px #0004}.rt-table-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.rt-num{font-weight:900;font-size:16px}.rt-index{font-size:10px;color:var(--muted)}.rt-qr{width:148px;height:148px;margin:0 auto;display:grid;place-items:center;background:#fff;border-radius:12px;padding:7px;cursor:pointer;transition:transform .18s,box-shadow .18s}.rt-qr:hover{transform:scale(1.03);box-shadow:0 10px 28px #0006}.rt-qr:focus-visible{outline:3px solid var(--brand);outline-offset:3px}.rt-qr canvas,.rt-qr img{max-width:100%;max-height:100%;display:block}.rt-save-hint{text-align:center;font-size:10px;color:var(--muted);margin-top:-5px}.rt-url{font:500 10px Arial,sans-serif;color:var(--muted);direction:ltr;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid #ffffff12;background:#0003;border-radius:10px;padding:8px}.rt-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.rt-action{border:1px solid #ffffff16;border-radius:11px;padding:9px 5px;background:#ffffff08;color:var(--text);font:800 10px Cairo;cursor:pointer;text-align:center}.rt-action.primary{background:var(--brand);color:#111;border-color:transparent}.rt-action:hover{filter:brightness(1.08)}.rt-empty{text-align:center;padding:45px 20px;border:1px dashed #ffffff18;border-radius:20px;color:var(--muted)}.rt-loading{text-align:center;padding:45px 20px;color:var(--muted)}@media(max-width:900px){.rt-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.rt-grid{grid-template-columns:1fr}#ros-tables-launcher{right:18px;bottom:76px}.rt-wrap{padding:14px}.rt-head h2{font-size:24px}.rt-table{min-height:290px}.rt-actions{grid-template-columns:repeat(2,1fr)}}`;document.head.appendChild(s)}
function ensure(){if(location.hash!=='#admin'&&!location.hash.startsWith('#admin/'))return;if(window.__ROS_ADMIN_READY__!==true){document.getElementById('ros-tables-launcher')?.remove();document.getElementById('ros-tables-panel')?.remove();return;}css();if(!document.getElementById('ros-tables-launcher')){const b=document.createElement('button');b.id='ros-tables-launcher';b.innerHTML='<span class="rt-icon">▦</span><span>الطاولات</span>';b.onclick=open;b.type='button';document.body.appendChild(b)}if(!document.getElementById('ros-tables-panel')){const p=document.createElement('div');p.id='ros-tables-panel';p.innerHTML='<div class="rt-wrap"><div class="rt-head"><div><h2>الطاولات</h2><p>إدارة QR والرابط والطباعة لكل طاولة</p></div><button class="rt-close" type="button">×</button></div><div id="ros-tables-content"><div class="rt-loading">جارٍ تحميل الطاولات...</div></div></div>';p.querySelector('.rt-close').onclick=close;p.addEventListener('click',e=>{if(e.target===p)close()});document.body.appendChild(p)}}
function rowsFromStore(){const a=window.store?.tables;if(!Array.isArray(a))return null;return a.filter(t=>t&&t.active!==false).map(t=>({id:t.id,number:t.number??t.table_number,name:t.name}))}
function tableUrl(n){return location.origin+location.pathname+'?table='+encodeURIComponent(n)}
function renderQr(el,url){el.innerHTML='';try{if(window.QRCode){new window.QRCode(el,{text:url,width:134,height:134,colorDark:'#111',colorLight:'#fff',correctLevel:window.QRCode.CorrectLevel?.M||1});return}}catch(e){console.warn('QR render',e)}el.innerHTML='<div style="color:#777;font:700 10px Arial;text-align:center">QR غير متاح</div>'}
function downloadQr(n){const card=document.querySelector(`[data-print-table="${CSS.escape(String(n))}"]`);const box=card?.querySelector('.rt-qr');if(!box)return;const canvas=box.querySelector('canvas');const img=box.querySelector('img');let href='';if(canvas){try{href=canvas.toDataURL('image/png')}catch(e){console.warn('QR download',e)}}else if(img?.src)href=img.src;if(!href){toast?.('تعذر حفظ رمز QR');return}const a=document.createElement('a');a.href=href;a.download=`table-${String(n).replace(/[^a-zA-Z0-9_-]/g,'_')}-qr.png`;document.body.appendChild(a);a.click();a.remove();toast?.('تم حفظ رمز QR')}
function printTable(n,url){const card=document.querySelector(`[data-print-table="${CSS.escape(String(n))}"]`);const qr=card?.querySelector('.rt-qr')?.innerHTML||'';const w=window.open('','_blank','noopener,noreferrer,width=520,height=700');if(!w){toast?.('اسمح بالنوافذ المنبثقة للطباعة');return}w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>طاولة ${esc(n)}</title><style>body{font-family:Cairo,Arial,sans-serif;text-align:center;padding:35px;color:#111}.qr{margin:25px auto;width:148px;height:148px;display:grid;place-items:center}.qr img,.qr canvas{max-width:100%;max-height:100%}.url{direction:ltr;font:12px Arial;word-break:break-all;margin:18px 0}.btn{border:0;background:#111;color:#fff;padding:12px 20px;border-radius:10px;font-weight:800}@media print{.btn{display:none}}</style></head><body><h1>طاولة ${esc(n)}</h1><div class="qr">${qr}</div><div class="url">${esc(url)}</div><p>امسح رمز QR لفتح قائمة الطلب للطاولة</p><button class="btn" onclick="window.print()">طباعة</button><script>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close()}
async function copyUrl(url){try{await navigator.clipboard.writeText(url);toast?.('تم نسخ رابط الطاولة')}catch(_){const i=document.createElement('input');i.value=url;document.body.appendChild(i);i.select();document.execCommand('copy');i.remove();toast?.('تم نسخ رابط الطاولة')}}
async function render(){ensure();const c=document.getElementById('ros-tables-content');if(!c)return;const restaurant=window.store?.restaurant;if(!restaurant?.id){c.innerHTML='<div class="rt-loading">جارٍ تجهيز بيانات المطعم…</div>';return}try{let rows=rowsFromStore();if(rows===null){const db=getDb();if(!db){c.innerHTML='<div class="rt-empty">بيانات الطاولات غير متاحة حاليًا.</div>';return}const r=await db.from('tables').select('id,number,name,table_number,active').eq('restaurant_id',restaurant.id).order('number',{ascending:true});if(r.error)throw r.error;rows=(r.data||[]).filter(t=>t.active!==false).map(t=>({id:t.id,number:t.number??t.table_number,name:t.name}))}rows=rows||[];c.innerHTML=rows.length?`<div class="rt-grid">${rows.map((t,i)=>{const n=t.number??t.name??'—';const u=tableUrl(n);return `<article class="rt-table" data-print-table="${esc(n)}"><div class="rt-table-top"><span class="rt-num">طاولة ${esc(n)}</span><span class="rt-index">#${i+1}</span></div><div class="rt-qr" data-qr="${esc(n)}" role="button" tabindex="0" title="اضغط لحفظ رمز QR" aria-label="حفظ QR للطاولة ${esc(n)}"></div><div class="rt-save-hint">اضغط على صورة QR لحفظها</div><div class="rt-url" title="${esc(u)}">${esc(u)}</div><div class="rt-actions"><button type="button" class="rt-action primary" data-open-table="${esc(n)}">فتح</button><button type="button" class="rt-action" data-copy-table="${esc(n)}">نسخ الرابط</button><button type="button" class="rt-action" data-save-table="${esc(n)}">حفظ QR</button><button type="button" class="rt-action" data-print-table-btn="${esc(n)}">طباعة</button></div></article>`}).join('')}</div>`:'<div class="rt-empty">لا توجد طاولات مسجلة لهذا المطعم.</div>';
c.querySelectorAll('[data-qr]').forEach(el=>{renderQr(el,tableUrl(el.dataset.qr));el.addEventListener('click',()=>downloadQr(el.dataset.qr));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();downloadQr(el.dataset.qr)}})});c.querySelectorAll('[data-open-table]').forEach(b=>b.onclick=()=>window.open(tableUrl(b.dataset.openTable),'_blank','noopener'));c.querySelectorAll('[data-copy-table]').forEach(b=>b.onclick=()=>copyUrl(tableUrl(b.dataset.copyTable)));c.querySelectorAll('[data-save-table]').forEach(b=>b.onclick=()=>downloadQr(b.dataset.saveTable));c.querySelectorAll('[data-print-table-btn]').forEach(b=>b.onclick=()=>printTable(b.dataset.printTableBtn,tableUrl(b.dataset.printTableBtn)))}catch(e){console.error('ROS tables',e);c.innerHTML='<div class="rt-empty">تعذر تحميل الطاولات حاليًا. حاول مرة أخرى.</div>'}}
function open(){ensure();document.getElementById('ros-tables-panel')?.classList.add('open');render().catch(()=>{})}function close(){document.getElementById('ros-tables-panel')?.classList.remove('open')}function schedule(){clearTimeout(timer);timer=setTimeout(()=>render().catch(()=>{}),300)}new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#admin'))close();schedule()});schedule();
})();



/* ===== ROS LOCAL MODULE: admin-driver-launcher-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_ADMIN_DRIVER_LAUNCHER_V1__)return;
  window.__ROS_ADMIN_DRIVER_LAUNCHER_V1__=true;
  function esc(v){return typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));}
  function notify(msg){try{typeof toast==='function'?toast(msg):alert(msg)}catch(_){alert(msg)}}
  function getDb(){try{if(window.__ROS_DRIVER_DB__)return window.__ROS_DRIVER_DB__;const c=window.APP_CONFIG||{};if(window.supabase?.createClient&&c.supabaseUrl&&c.supabaseAnonKey)return window.__ROS_DRIVER_DB__=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);return window.db||null}catch(_){return null}}
  function css(){if(document.getElementById('ros-driver-launcher-style'))return;const s=document.createElement('style');s.id='ros-driver-launcher-style';s.textContent=`#ros-driver-launcher{position:fixed;right:150px;bottom:76px;z-index:9988;border:1px solid #ffffff20;background:#17191df5;color:#f6f1e7;border-radius:18px;padding:13px 17px;min-width:118px;height:46px;font:800 14px Cairo,Arial;box-shadow:0 15px 45px #0008;cursor:pointer;backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;gap:7px}#ros-driver-panel{position:fixed;inset:0;z-index:9992;background:#0d0e10f7;backdrop-filter:blur(14px);display:none;overflow:auto;font-family:Cairo,Arial;color:var(--text)}#ros-driver-panel.open{display:block}.rd-wrap{max-width:560px;margin:0 auto;padding:24px}.rd-card{background:linear-gradient(145deg,var(--surface),var(--surface2));border:1px solid color-mix(in srgb,var(--brand) 20%,transparent);border-radius:24px;padding:22px;box-shadow:0 24px 70px #0008}.rd-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}.rd-head h2{margin:0;font-size:26px;font-weight:900}.rd-close{width:44px;height:44px;border-radius:14px;border:1px solid #ffffff18;background:var(--surface2);color:var(--text);font-size:24px;cursor:pointer}.rd-label{display:block;font-size:13px;font-weight:800;margin:0 0 7px}.rd-field{width:100%;min-height:50px;border-radius:15px!important}.rd-photo{border:1px dashed #ffffff25;padding:12px!important;background:var(--surface)!important}.rd-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.rd-btn{min-height:48px;border-radius:14px;border:1px solid #ffffff18;font:800 14px Cairo;cursor:pointer}.rd-btn.primary{background:var(--brand);color:#111;border-color:transparent}.rd-hint{font-size:11px;color:var(--muted);margin-top:7px}@media(max-width:600px){#ros-driver-launcher{right:150px;bottom:76px;min-width:112px}.rd-wrap{padding:14px}.rd-actions{grid-template-columns:1fr}.rd-head h2{font-size:22px}}`;document.head.appendChild(s)}
  function hideLegacyTables(){document.querySelectorAll('#app section').forEach(sec=>{const h=sec.querySelector('h2');if(h&&h.textContent.trim()==='الطاولات و QR'){sec.dataset.rosLegacyTables='1';sec.style.display='none'}})}
  function hideLegacyDriverAdd(){document.querySelectorAll('#app input#newDriverName').forEach(input=>{const row=input.closest('.grid');if(row&&row.querySelector('#newDriverPhone')){row.dataset.rosLegacyDriverAdd='1';row.style.display='none'}})}
  function ensure(){if(!(location.hash==='#admin'||location.hash.startsWith('#admin/')))return;if(window.__ROS_ADMIN_READY__!==true){document.getElementById('ros-driver-launcher')?.remove();document.getElementById('ros-driver-panel')?.remove();return;}css();hideLegacyTables();hideLegacyDriverAdd();if(!document.getElementById('ros-driver-launcher')){const b=document.createElement('button');b.id='ros-driver-launcher';b.type='button';b.innerHTML='<span>🚚</span><span>إضافة مندوب</span>';b.onclick=openPanel;document.body.appendChild(b)}if(!document.getElementById('ros-driver-panel')){const p=document.createElement('div');p.id='ros-driver-panel';p.innerHTML=`<div class="rd-wrap"><div class="rd-card"><div class="rd-head"><div><h2>إضافة مندوب</h2><div class="rd-hint">أضف بيانات المندوب وصورته من مكان واحد.</div></div><button type="button" class="rd-close" aria-label="إغلاق">×</button></div><div class="space-y-4"><div><label class="rd-label" for="rd-name">اسم المندوب</label><input id="rd-name" class="rd-field w-full border p-4" placeholder="اسم المندوب"></div><div><label class="rd-label" for="rd-phone">رقم الموبايل</label><input id="rd-phone" class="rd-field w-full border p-4" inputmode="tel" placeholder="رقم الموبايل"></div><div><label class="rd-label" for="rd-photo">صورة المندوب <span style="color:var(--muted)">(اختياري)</span></label><input id="rd-photo" class="rd-field rd-photo w-full border" type="file" accept="image/*"><div class="rd-hint">JPG / PNG / WEBP — حتى 5MB</div></div></div><div class="rd-actions"><button type="button" id="rd-save" class="rd-btn primary">إضافة المندوب</button><button type="button" id="rd-cancel" class="rd-btn">إلغاء</button></div></div></div>`;p.querySelector('.rd-close').onclick=closePanel;p.querySelector('#rd-cancel').onclick=closePanel;p.addEventListener('click',e=>{if(e.target===p)closePanel()});p.querySelector('#rd-save').onclick=saveDriver;document.body.appendChild(p)}}
  async function uploadPhoto(db,file){if(!file)return null;if(file.size>5*1024*1024)throw new Error('صورة المندوب يجب ألا تتجاوز 5MB');if(!String(file.type||'').startsWith('image/'))throw new Error('اختر ملف صورة صالح');const restaurantId=window.store?.restaurant?.id;if(!restaurantId)throw new Error('بيانات المطعم غير متاحة');const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const path=`${restaurantId}/${crypto.randomUUID()}.${ext}`;const up=await db.storage.from('driver-images').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});if(up.error)throw up.error;return db.storage.from('driver-images').getPublicUrl(path)?.data?.publicUrl||null}
  async function saveDriver(){const btn=document.getElementById('rd-save');if(!btn)return;const name=document.getElementById('rd-name')?.value.trim()||'';const phone=document.getElementById('rd-phone')?.value.trim()||null;const file=document.getElementById('rd-photo')?.files?.[0]||null;if(!name)return notify('اكتب اسم المندوب');const db=getDb();if(!db)return notify('خدمة Supabase غير متاحة');btn.disabled=true;const old=btn.textContent;btn.textContent='جارٍ إضافة المندوب...';try{const photo_url=await uploadPhoto(db,file);const r=await db.rpc('admin_create_driver_with_photo',{p_restaurant_id:window.store?.restaurant?.id,p_name:name,p_phone:phone,p_photo_url:photo_url});if(r.error)throw r.error;document.getElementById('rd-name').value='';document.getElementById('rd-phone').value='';document.getElementById('rd-photo').value='';closePanel();notify(photo_url?'تمت إضافة المندوب مع الصورة':'تمت إضافة المندوب بنجاح');if(typeof window.renderAdmin==='function')setTimeout(()=>window.renderAdmin(),200)}catch(e){console.error('admin driver add',e);notify(e?.message||'تعذر إضافة المندوب')}finally{btn.disabled=false;btn.textContent=old}}
  function openPanel(){ensure();document.getElementById('ros-driver-panel')?.classList.add('open');document.getElementById('rd-name')?.focus()}
  function closePanel(){document.getElementById('ros-driver-panel')?.classList.remove('open')}
  const observer=new MutationObserver(()=>{if(location.hash==='#admin'||location.hash.startsWith('#admin/'))ensure()});observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#admin')){closePanel();return}ensure()});ensure();
})();



/* ===== ROS LOCAL MODULE: admin-driver-legacy-hide-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_ADMIN_DRIVER_LEGACY_HIDE_V2__)return;
  window.__ROS_ADMIN_DRIVER_LEGACY_HIDE_V2__=true;
  function isAdmin(){return location.hash==='#admin'||location.hash.startsWith('#admin/');}
  function hideLegacy(){
    if(!isAdmin())return;
    ['#newDriverName','#rosName'].forEach(function(nameSel){
      document.querySelectorAll('#app '+nameSel).forEach(function(input){
        var row=input.closest('.grid');
        if(!row)row=input.parentElement;
        if(!row)return;
        var phone=row.querySelector('#newDriverPhone,#rosPhone');
        if(phone){
          row.style.setProperty('display','none','important');
          row.setAttribute('data-ros-legacy-driver-add-hidden','1');
        }
      });
    });
  }
  function run(){hideLegacy();setTimeout(hideLegacy,50);setTimeout(hideLegacy,250);setTimeout(hideLegacy,1000);}
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  addEventListener('hashchange',run);
  run();
})();



/* ===== ROS LOCAL MODULE: admin-products-launcher-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_ADMIN_PRODUCTS_LAUNCHER_V5__)return;
window.__ROS_ADMIN_PRODUCTS_LAUNCHER_V5__=true;
function isAdmin(){return location.hash==='#admin'||location.hash.startsWith('#admin/')}
function css(){if(document.getElementById('ros-products-launcher-style'))return;const s=document.createElement('style');s.id='ros-products-launcher-style';s.textContent=`#ros-products-launcher{position:fixed!important;right:150px!important;bottom:18px!important;z-index:2147483000!important;border:1px solid #ffffff20!important;background:#17191df5!important;color:#f6f1e7!important;border-radius:18px!important;padding:13px 17px!important;min-width:118px!important;height:46px!important;font:800 14px Cairo,Arial!important;box-shadow:0 15px 45px #0008!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important}#ros-products-panel{position:fixed;inset:0;z-index:2147483001;background:#0d0e10f7;backdrop-filter:blur(14px);display:none;overflow:auto;font-family:Cairo,Arial;color:var(--text);padding:18px}#ros-products-panel.open{display:block}#ros-products-host>section{display:block!important;margin:0!important}#deliveryPanel{border-radius:28px!important;border:1px solid #ffffff18!important;background:linear-gradient(145deg,var(--surface),var(--surface2))!important;box-shadow:0 24px 70px #0008!important;padding:20px!important}#deliveryPanel h2,#deliveryPanel h3{letter-spacing:-.02em}#deliveryPanel .space-y-2>div{border:1px solid #ffffff12!important;border-radius:20px!important;padding:15px!important;background:#ffffff04!important}#ros-inline-admin-map{position:fixed;inset:0;z-index:2147483005;background:#0d0e10ee;display:none;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(10px)}#ros-inline-admin-map.open{display:flex}#ros-inline-admin-map-card{width:min(900px,96vw);height:min(720px,90vh);background:var(--surface);border:1px solid #ffffff18;border-radius:26px;overflow:hidden;box-shadow:0 30px 90px #000b;display:flex;flex-direction:column}#ros-inline-admin-map-canvas{flex:1;min-height:360px}`;document.head.appendChild(s)}
function getSection(){return [...document.querySelectorAll('#app section')].find(sec=>{const h=sec.querySelector('h2');return h&&h.textContent.trim()==='المنتجات'})||null}
function ensure(){if(!isAdmin()||window.__ROS_ADMIN_READY__!==true){document.getElementById('ros-products-launcher')?.remove();document.getElementById('ros-products-panel')?.remove();return}css();let b=document.getElementById('ros-products-launcher');if(!b){b=document.createElement('button');b.id='ros-products-launcher';b.type='button';b.innerHTML='<span>🍔</span><span>المنتجات</span>';b.setAttribute('aria-label','إدارة المنتجات');b.onclick=openProducts;document.body.appendChild(b)}const source=getSection();if(source){source.dataset.rosOriginalParent=source.parentElement?.id||'';source.dataset.rosOriginalNext=source.nextElementSibling?.id||'';source.style.setProperty('display','none','important')}if(!document.getElementById('ros-products-panel')){const p=document.createElement('div');p.id='ros-products-panel';p.innerHTML='<div style="max-width:1180px;margin:0 auto;padding:18px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px"><div style="font-size:24px;font-weight:900">إدارة المنتجات</div><button type="button" id="ros-products-close" style="width:44px;height:44px;border-radius:14px;border:1px solid #ffffff18;background:var(--surface2);color:var(--text);font-size:24px;cursor:pointer">×</button></div><div id="ros-products-host"></div></div>';p.querySelector('#ros-products-close').onclick=closeProducts;p.onclick=e=>{if(e.target===p)closeProducts()};document.body.appendChild(p)}}
function openProducts(){ensure();const panel=document.getElementById('ros-products-panel'),host=document.getElementById('ros-products-host'),source=getSection();if(!panel||!host)return;if(!source){host.innerHTML='<div style="padding:24px;border-radius:18px;background:var(--surface2);text-align:center;color:var(--muted)">لوحة المنتجات غير جاهزة الآن. أغلق اللوحة وأعد فتحها.</div>';panel.classList.add('open');return}host.innerHTML='';host.appendChild(source);source.style.setProperty('display','block','important');panel.classList.add('open')}
function closeProducts(){const panel=document.getElementById('ros-products-panel'),host=document.getElementById('ros-products-host'),source=host?.querySelector('section');if(source){const app=document.querySelector('#app');if(app)app.appendChild(source);source.style.setProperty('display','none','important')}panel?.classList.remove('open')}
async function ensureLeaflet(){if(window.L)return true;try{if(!document.querySelector('link[data-ros-admin-leaflet]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';l.dataset.rosAdminLeaflet='1';document.head.appendChild(l)}await new Promise((resolve,reject)=>{const old=document.querySelector('script[data-ros-admin-leaflet]');if(old){if(window.L)return resolve();old.addEventListener('load',resolve,{once:true});old.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.dataset.rosAdminLeaflet='1';s.onload=resolve;s.onerror=reject;document.body.appendChild(s)});return !!window.L}catch(e){return false}}
function closeMap(){document.getElementById('ros-inline-admin-map')?.classList.remove('open')}
async function openMap(lat,lng,address){let root=document.getElementById('ros-inline-admin-map');if(!root){root=document.createElement('div');root.id='ros-inline-admin-map';root.innerHTML='<div id="ros-inline-admin-map-card"><div style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px"><div><div style="font-size:18px;font-weight:900">موقع العميل</div><div id="ros-inline-admin-map-address" style="font-size:12px;color:var(--muted);margin-top:3px"></div></div><button type="button" id="ros-inline-admin-map-close" style="width:42px;height:42px;border-radius:14px;border:1px solid #ffffff18;background:var(--surface2);color:var(--text);font-size:23px">×</button></div><div id="ros-inline-admin-map-state" style="padding:0 16px 10px;color:var(--muted);font-size:12px"></div><div id="ros-inline-admin-map-canvas"></div></div>';root.querySelector('#ros-inline-admin-map-close').onclick=closeMap;root.onclick=e=>{if(e.target===root)closeMap()};document.body.appendChild(root)}root.querySelector('#ros-inline-admin-map-address').textContent=address||'';root.querySelector('#ros-inline-admin-map-state').textContent='جارٍ تحميل الخريطة...';root.classList.add('open');const ok=await ensureLeaflet();if(!ok){root.querySelector('#ros-inline-admin-map-state').textContent='تعذر تحميل الخريطة داخل الصفحة.';return}const el=root.querySelector('#ros-inline-admin-map-canvas');el.innerHTML='';const map=L.map(el).setView([lat,lng],16);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);L.marker([lat,lng]).addTo(map).bindPopup('<b>موقع العميل</b>').openPopup();setTimeout(()=>map.invalidateSize(),100)}
function interceptMaps(e){const a=e.target?.closest?.('a[href*="google.com/maps"],a[href*="maps.google.com"]');if(!a)return;const m=a.href.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);if(!m)return;e.preventDefault();e.stopPropagation();const address=(a.closest('article,.rounded-2xl,.rounded-3xl')?.innerText||'').split('\n').find(x=>/شارع|محافظة|العنوان|مدينة|منطقة/.test(x))||'';openMap(Number(m[1]),Number(m[2]),address)}
document.addEventListener('click',interceptMaps,true);
window.addEventListener('hashchange',()=>setTimeout(ensure,0));
new MutationObserver(()=>{if(isAdmin()){if(!document.getElementById('ros-products-launcher'))ensure();const source=getSection();if(source&&!document.getElementById('ros-products-panel')?.classList.contains('open'))source.style.setProperty('display','none','important')}}).observe(document.body,{childList:true,subtree:true});
ensure();
})();


/* ===== ROS LOCAL MODULE: admin-drivers-management-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_ADMIN_DRIVERS_MANAGEMENT_V1__)return;window.__ROS_ADMIN_DRIVERS_MANAGEMENT_V1__=true;
const SUPABASE_URL='https://znnnkoujfuweydvbkejh.supabase.co';
const KEY='sb_publishable_gjYA4-E-BL0X1hc3yugqyQ_1VaOo_se';
let client=null, open=false, restaurantId=null;
function db(){if(!client)client=supabase.createClient(SUPABASE_URL,KEY);return client}
function admin(){return location.hash==='#admin'||location.hash.startsWith('#admin/')}
function toastMsg(m){if(typeof toast==='function')toast(m);else alert(m)}
function css(){if(document.getElementById('ros-drivers-management-style'))return;const s=document.createElement('style');s.id='ros-drivers-management-style';s.textContent=`#ros-drivers-management-modal{position:fixed;inset:0;z-index:2147483639;background:#000b;backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;padding:18px;font-family:Cairo,Arial,sans-serif}#ros-drivers-management-modal.open{display:flex}.ros-dm-box{width:min(920px,100%);max-height:min(88vh,820px);overflow:auto;background:linear-gradient(145deg,var(--surface,#17191d),var(--surface2,#202329));border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 25%,transparent);border-radius:28px;box-shadow:0 30px 100px #000c;color:var(--text,#f6f1e7)}.ros-dm-head{position:sticky;top:0;z-index:2;padding:18px 20px;background:color-mix(in srgb,var(--surface,#17191d) 92%,transparent);backdrop-filter:blur(14px);border-bottom:1px solid #fff1;display:flex;align-items:center;justify-content:space-between;gap:12px}.ros-dm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px;padding:18px}.ros-dm-card{border:1px solid #fff1;background:#ffffff06;border-radius:22px;padding:15px}.ros-dm-profile{display:flex;align-items:center;gap:12px}.ros-dm-photo{width:58px;height:58px;border-radius:18px;object-fit:cover;background:#ffffff0d;border:1px solid #fff2}.ros-dm-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.ros-dm-actions button{min-height:42px;border-radius:13px;border:1px solid #fff2;background:#ffffff08;color:inherit;font-weight:800;cursor:pointer}.ros-dm-actions .danger{color:#ff7777;border-color:#ff777733}.ros-dm-actions .primary{border-color:#D4AF3766}.ros-dm-empty{padding:45px 20px;text-align:center;color:var(--muted,#aaa)}.ros-dm-close{width:42px;height:42px;border-radius:13px;border:1px solid #fff2;background:#ffffff08;color:inherit;font-size:20px;cursor:pointer}`;document.head.appendChild(s)}
function ensure(){if(!admin()||window.__ROS_ADMIN_READY__!==true){document.getElementById('ros-drivers-management-modal')?.remove();return null}css();let m=document.getElementById('ros-drivers-management-modal');if(m)return m;m=document.createElement('div');m.id='ros-drivers-management-modal';m.innerHTML='<div class="ros-dm-box"><div class="ros-dm-head"><div><div style="font-size:21px;font-weight:900">إدارة المندوبين</div><div style="font-size:12px;color:var(--muted)">لوحة مستقلة لإدارة المندوبين بدون مغادرة لوحة الإدارة</div></div><button class="ros-dm-close" type="button" aria-label="إغلاق">×</button></div><div id="ros-dm-grid" class="ros-dm-grid"></div></div>';document.body.appendChild(m);m.querySelector('.ros-dm-close').onclick=close;m.addEventListener('click',e=>{if(e.target===m)close()});return m}
function driverUrl(token){return location.origin+'/#driver/'+encodeURIComponent(token)}
async function getRestaurantId(){if(restaurantId)return restaurantId;const slug=window.APP_CONFIG?.restaurantSlug||'pizza-burger';const r=await db().from('restaurants').select('id').eq('slug',slug).maybeSingle();if(r.error)throw r.error;if(!r.data?.id)throw new Error('restaurant_not_found');restaurantId=r.data.id;return restaurantId}
async function load(){const grid=ensure().querySelector('#ros-dm-grid');grid.innerHTML='<div class="ros-dm-empty">جارٍ تحميل المندوبين...</div>';try{const rid=await getRestaurantId();const r=await db().rpc('admin_list_drivers',{p_restaurant_id:rid});if(r.error)throw r.error;const rows=r.data||[];if(!rows.length){grid.innerHTML='<div class="ros-dm-empty">لا يوجد مندوبون حاليًا.</div>';return}grid.innerHTML='';rows.forEach(d=>{const card=document.createElement('div');card.className='ros-dm-card';const photo=d.photo_url?`<img class="ros-dm-photo" src="${d.photo_url}" alt="">`:'<div class="ros-dm-photo" style="display:grid;place-items:center;font-size:24px">🏍️</div>';card.innerHTML=`<div class="ros-dm-profile">${photo}<div style="min-width:0"><div style="font-weight:900;font-size:17px">${esc(d.name||'مندوب')}</div><div style="color:var(--muted);font-size:13px">${esc(d.phone||'بدون رقم')}</div><div style="margin-top:4px;font-size:12px;color:${d.active?'#55d88a':'#ff7777'}">● ${d.active?'نشط':'متوقف'}</div></div></div><div class="ros-dm-actions"><button class="primary" data-action="page">لوحة المندوب</button><button data-action="copy">نسخ الرابط</button><button data-action="toggle">${d.active?'إيقاف المندوب':'تفعيل المندوب'}</button><button class="danger" data-action="delete">حذف المندوب</button></div>`;card.querySelector('[data-action="page"]').onclick=()=>window.open(driverUrl(d.access_token),'_blank','noopener');card.querySelector('[data-action="copy"]').onclick=async()=>{try{await navigator.clipboard.writeText(driverUrl(d.access_token));toastMsg('تم نسخ رابط لوحة المندوب')}catch{toastMsg(driverUrl(d.access_token))}};card.querySelector('[data-action="toggle"]').onclick=()=>toggle(d);card.querySelector('[data-action="delete"]').onclick=()=>remove(d);grid.appendChild(card)})}catch(e){console.error('[ROS drivers]',e);grid.innerHTML='<div class="ros-dm-empty">تعذر تحميل المندوبين. تحقق من جلسة الإدارة ثم أعد المحاولة.</div>'}}
async function toggle(d){const active=!d.active;if(!confirm(active?'هل تريد تفعيل هذا المندوب؟':'هل تريد إيقاف هذا المندوب؟'))return;try{const rid=await getRestaurantId();const r=await db().rpc('admin_update_driver',{p_restaurant_id:rid,p_driver_id:d.id,p_active:active});if(r.error)throw r.error;toastMsg(active?'تم تفعيل المندوب':'تم إيقاف المندوب');load()}catch(e){console.error('[ROS driver toggle]',e);toastMsg(e?.message||'تعذر تعديل حالة المندوب')}}
async function remove(d){if(!confirm(`هل أنت متأكد من حذف ${d.name||'هذا المندوب'}؟\n\nلن يمكن التراجع عن هذا الإجراء.`))return;const r=await db().rpc('admin_delete_driver',{p_driver_id:d.id});if(r.error)return toastMsg(r.error.message==='driver_has_active_delivery'?'لا يمكن حذف المندوب لأنه مرتبط بطلب دليفري نشط. أوقف الطلب أو أكمله أولاً.':(r.error.message||'تعذر حذف المندوب'));toastMsg('تم حذف المندوب');load()}
function esc(v){return String(v).replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
window.openDriversManagement=async function(){if(!admin())return;open=true;ensure().classList.add('open');await load()};function close(){open=false;document.getElementById('ros-drivers-management-modal')?.classList.remove('open')}
window.addEventListener('hashchange',()=>{if(!admin())close()});
})();



/* ===== ROS LOCAL MODULE: admin-action-dock-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_ADMIN_ACTION_DOCK_V4__)return;window.__ROS_ADMIN_ACTION_DOCK_V4__=true;
const items=[
{id:'ros-vodafone-launcher',label:'فودافون كاش',icon:'<svg viewBox="0 0 24 24"><path d="M6 7.5A2.5 2.5 0 0 1 8.5 5h7A2.5 2.5 0 0 1 18 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 16.5v-9Z"/><path d="M9 9h6M9 12h6M9 15h3"/></svg>'},
{id:'ros-tables-launcher',label:'الطاولات و QR',icon:'<svg viewBox="0 0 24 24"><path d="M5 9h14M7 9v8M17 9v8M4 17h16M9 5h6v4H9z"/></svg>'},
{id:'ros-drivers-management',label:'المندوبون',icon:'<svg viewBox="0 0 24 24"><circle cx="8" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M8 16h7l2-7h-5l-2 4H7l-2-2M13 9h3"/></svg>'},
{id:'ros-driver-launcher',label:'إضافة مندوب',icon:'<svg viewBox="0 0 24 24"><circle cx="8" cy="16" r="3"/><circle cx="18" cy="16" r="3"/><path d="M8 16h7l2-7h-5l-2 4H7l-2-2M13 9h3"/><path d="M19 5v4M17 7h4"/></svg>'},
{id:'ros-products-launcher',label:'المنتجات',icon:'<svg viewBox="0 0 24 24"><path d="M5 9h14l-1 10H6L5 9Z"/><path d="M8 9a4 4 0 0 1 8 0M9 13h6"/></svg>'},
{id:'ka-launcher',label:'المطبخ',icon:'<svg viewBox="0 0 24 24"><path d="M8 10h8v9H8zM6 10h12M9 7a3 3 0 0 1 6 0v3H9V7Z"/><path d="M10 19v2M14 19v2"/></svg>'},
{id:'ros-admin-orders-nav',label:'الطلبات',icon:'<svg viewBox="0 0 24 24"><path d="M5 6h14v14H5z"/><path d="M8 10h8M8 14h6"/></svg>'},
{id:'ros-admin-delivery-nav',label:'الدليفري و GPS',icon:'<svg viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>'},
{id:'ros-admin-dine-nav',label:'طلبات الصالة',icon:'<svg viewBox="0 0 24 24"><path d="M4 10h16M6 10v8M18 10v8M8 6h8v4H8z"/></svg>'},
{id:'ros-admin-offer-nav',label:'العرض اليومي',icon:'<svg viewBox="0 0 24 24"><path d="M4 7h16v12H4z"/><path d="M8 7a4 4 0 0 1 8 0M7 12h10"/></svg>'},
{id:'ros-admin-menu-nav',label:'فتح المنيو',icon:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h6"/></svg>'},
{id:'ros-admin-logout-nav',label:'تسجيل الخروج',icon:'<svg viewBox="0 0 24 24"><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9"/></svg>'}
];
function admin(){return (location.hash==='#admin'||location.hash.startsWith('#admin/'))&&window.__ROS_ADMIN_READY__===true}
function style(){if(document.getElementById('ros-admin-dock-style'))return;const s=document.createElement('style');s.id='ros-admin-dock-style';s.textContent=`
#ros-admin-action-dock{position:fixed;right:0;top:78px;bottom:14px;width:270px;z-index:2147483640;display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:14px 12px;font-family:Cairo,Arial,sans-serif;pointer-events:none;background:linear-gradient(180deg,#17191df8,#111216f8);border:1px solid #ffffff12;border-right:0;border-radius:22px 0 0 22px;box-shadow:0 18px 55px #0009;backdrop-filter:blur(18px);transform:translate3d(calc(100% - 52px),0,0);transition:transform .22s ease;will-change:transform}
#ros-admin-action-dock.open{transform:translate3d(0,0,0)}
#ros-admin-dock-toggle{pointer-events:auto;width:44px;height:44px;min-width:44px;border-radius:13px;border:1px solid #ffffff18;background:#ffffff08;color:#f6f1e7;cursor:pointer;font-size:19px;display:grid;place-items:center;transition:.2s}
.ros-admin-dock-item{pointer-events:auto;width:100%;height:46px;border-radius:13px;border:1px solid #ffffff10;background:#ffffff06;color:#f6f1e7;cursor:pointer;display:flex;align-items:center;justify-content:flex-start;gap:11px;padding:0 13px;overflow:hidden;white-space:nowrap;transition:.2s}
.ros-admin-dock-item svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}.ros-admin-dock-item span{display:inline;font-size:13px;font-weight:800}.ros-admin-dock-item:hover{background:#ffffff10}
@media(max-width:700px){#ros-admin-action-dock{left:10px;right:10px;top:auto;bottom:10px;width:auto;min-width:0;height:auto;max-height:58vh;transform:translate3d(0,calc(100% - 52px),0);border:1px solid #ffffff12;border-radius:20px;padding:8px;overflow:auto}.ros-admin-dock-item{height:44px}.ros-admin-dock-item span{display:inline}#ros-admin-action-dock.open{transform:translate3d(0,0,0)}}
#ros-drivers-modal{position:fixed;inset:0;z-index:2147483641;background:#000b;backdrop-filter:blur(7px);display:grid;place-items:center;padding:18px;font-family:Cairo,Arial,sans-serif}
#ros-drivers-modal .ros-dm-card{width:min(760px,100%);max-height:88vh;overflow:auto;background:linear-gradient(145deg,var(--surface,#17191d),var(--surface2,#202329));color:var(--text,#f6f1e7);border:1px solid #ffffff16;border-radius:26px;padding:20px;box-shadow:0 30px 100px #000b}
`;document.head.appendChild(s)}
function hideOriginal(id){const e=document.getElementById(id);if(e&&!e.closest('#ros-admin-action-dock'))e.style.setProperty('display','none','important')}
function client(){if(window.supabase&&window.APP_CONFIG?.SUPABASE_URL&&window.APP_CONFIG?.SUPABASE_ANON_KEY){if(!window.__ROS_DOCK_DB__)window.__ROS_DOCK_DB__=supabase.createClient(APP_CONFIG.SUPABASE_URL,APP_CONFIG.SUPABASE_ANON_KEY);return window.__ROS_DOCK_DB__}return window.db||null}
function closeDrivers(){document.getElementById('ros-drivers-modal')?.remove()}
function openDrivers(){
 if(document.getElementById('ros-drivers-modal'))return;
 const m=document.createElement('div');m.id='ros-drivers-modal';m.innerHTML='<div class="ros-dm-card" role="dialog" aria-modal="true"><div class="ros-dm-head"><div><div style="font-size:12px;color:#aaa">DELIVERY TEAM</div><div style="font-size:26px;font-weight:900">المندوبون</div></div><div class="ros-dm-actions"><button class="ros-dm-btn primary" id="ros-dm-add">+ إضافة مندوب</button><button class="ros-dm-btn" id="ros-dm-close">إغلاق</button></div></div><div id="ros-dm-list"><div class="ros-dm-empty">جارٍ تحميل المندوبين...</div></div></div>';
 document.body.appendChild(m);m.addEventListener('click',e=>{if(e.target===m)closeDrivers()});m.querySelector('#ros-dm-close').onclick=closeDrivers;m.querySelector('#ros-dm-add').onclick=()=>document.getElementById('ros-driver-launcher')?.click();
 const db=client();const rid=window.store?.restaurant?.id||window.store?.restaurant_id;
 if(!db||!rid){m.querySelector('#ros-dm-list').innerHTML='<div class="ros-dm-empty">تعذر الوصول لبيانات المطعم حاليًا.</div>';return}
 db.from('drivers').select('id,name,phone,active,photo_url').eq('restaurant_id',rid).order('name').then(({data,error})=>{
   const list=m.querySelector('#ros-dm-list');if(error){list.innerHTML='<div class="ros-dm-empty">تعذر تحميل المندوبين.</div>';return}
   if(!data?.length){list.innerHTML='<div class="ros-dm-empty">لا يوجد مندوبون حاليًا.</div>';return}
   list.innerHTML=data.map(d=>`<div class="ros-driver-card"><div class="ros-driver-photo">${d.photo_url?`<img src="${String(d.photo_url).replace(/"/g,'&quot;')}" alt="" class="ros-driver-photo">`:'🏍️'}</div><div class="ros-driver-info"><div class="ros-driver-name">${String(d.name||'مندوب').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</div><div class="ros-driver-meta">${String(d.phone||'بدون رقم').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</div></div><span class="ros-driver-state" style="background:${d.active?'#16a34a22':'#ffffff0d'};color:${d.active?'#6ee7a0':'#aaa'}">${d.active?'نشط':'غير نشط'}</span></div>`).join('');
 });
}
async function sync(){if(!admin()){document.getElementById('ros-admin-action-dock')?.remove();closeDrivers();return}if(!window.db?.auth?.getSession)return;const session=(await window.db.auth.getSession()).data?.session;if(!session){document.getElementById('ros-admin-action-dock')?.remove();closeDrivers();return}style();let d=document.getElementById('ros-admin-action-dock');if(!d){d=document.createElement('div');d.id='ros-admin-action-dock';d.innerHTML='<button id="ros-admin-dock-toggle" type="button" aria-label="أدوات الإدارة" aria-expanded="false">☰</button>'+items.map(x=>`<button type="button" class="ros-admin-dock-item" data-target="${x.id}" title="${x.label}" aria-label="${x.label}">${x.icon}<span>${x.label}</span></button>`).join('');document.body.appendChild(d);d.classList.remove('open');d.querySelector('#ros-admin-dock-toggle').setAttribute('aria-expanded','false');d.querySelector('#ros-admin-dock-toggle').onclick=()=>{const open=d.classList.toggle('open');d.querySelector('#ros-admin-dock-toggle').setAttribute('aria-expanded',String(open))};d.querySelectorAll('[data-target]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.target;if(id==='ros-drivers-management'){openDrivers();return}if(id==='ros-admin-menu-nav'){location.hash='#menu';return}if(id==='ros-admin-logout-nav'){if(typeof window.logout==='function')window.logout();return}const targetMap={'ros-admin-orders-nav':'#deleteOrdersBtn','ros-admin-delivery-nav':'#deliveryControlPanel','ros-admin-dine-nav':'#rosV10DinePanel','ros-admin-offer-nav':'#ros-daily-offer-admin'};const selector=targetMap[id];if(selector){const target=document.querySelector(selector);if(target){target.scrollIntoView({behavior:'smooth',block:'start'});target.style.outline='2px solid var(--brand)';setTimeout(()=>target.style.outline='',1200);if(id==='ros-admin-offer-nav'&&typeof window.__ROS_SHOW_DAILY_OFFER__==='function'&&target.id==='ros-daily-offer-admin'){window.__ROS_SHOW_DAILY_OFFER__();}return}if(id==='ros-admin-offer-nav'&&typeof window.__ROS_SHOW_DAILY_OFFER__==='function'){window.__ROS_SHOW_DAILY_OFFER__();return}}document.getElementById(id)?.click()})}items.forEach(x=>{if(!['ros-drivers-management','ros-admin-orders-nav','ros-admin-delivery-nav','ros-admin-dine-nav','ros-admin-offer-nav','ros-admin-menu-nav','ros-admin-logout-nav'].includes(x.id))hideOriginal(x.id)})}
new MutationObserver(()=>{if(admin())sync()}).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',sync);window.addEventListener('ros:admin-ready',sync);sync();
})();



/* ===== ROS LOCAL MODULE: admin-ux-notifications-v1.js ===== */
(function(){'use strict';if(window.__ROS_ADMIN_UX_NOTIFICATIONS_V2__)return;window.__ROS_ADMIN_UX_NOTIFICATIONS_V2__=true;
const txt=e=>String(e?.textContent||'').replace(/\s+/g,' ').trim();
function layout(){if(!location.hash.startsWith('#admin'))return;const app=document.querySelector('#app'),main=app?.querySelector('main.max-w-7xl');if(!main)return;const stats=main.firstElementChild;if(stats&&!stats.dataset.rosStats){stats.dataset.rosStats='1';const cards=[...stats.children];stats.className='grid grid-cols-3 gap-4 mb-5';if(cards[3]){const theme=document.createElement('section');theme.id='rosThemePanel';theme.className='bg-white p-5 rounded-3xl mb-5';theme.innerHTML='<h2 class="text-xl font-extrabold mb-3">الثيمات</h2>';const controls=cards[3].querySelector('.flex')||cards[3].lastElementChild;if(controls)theme.appendChild(controls);cards[3].remove();main.insertBefore(theme,stats.nextSibling)}}const dine=main.querySelector('#rosV10DinePanel'),delivery=document.querySelector('#deliveryControlPanel'),recent=main.querySelector('#deleteOrdersBtn')?.closest('section'),prodTables=[...main.children].find(e=>e!==stats&&e.querySelector?.('h2')&&txt(e).includes('المنتجات')&&txt(e).includes('الطاولات'));if(dine&&dine.parentElement!==main)main.appendChild(dine);if(delivery&&delivery.parentElement!==main)main.appendChild(delivery);if(delivery&&!delivery.dataset.rosOrder){delivery.dataset.rosOrder='2';const add=delivery.querySelector('#rosAdd')?.closest('.mt-5'),drivers=delivery.querySelector('#rosDrivers')?.closest('.mt-7'),orders=delivery.querySelector('#rosOrders')?.closest('.mt-7');if(add){const h=document.createElement('div');h.className='font-extrabold text-xl mb-3';h.textContent='إضافة مندوب';add.insertBefore(h,add.firstChild)}if(orders)delivery.appendChild(orders);if(drivers)delivery.appendChild(drivers);if(add)delivery.appendChild(add)}if(recent&&!recent.dataset.rosDelete){recent.dataset.rosDelete='1';const b=recent.querySelector('#deleteOrdersBtn');recent.innerHTML='<div class="flex items-center justify-between gap-3"><h2 class="text-xl font-extrabold">حذف الطلبات السابقة</h2></div>';if(b){b.onclick=window.deleteAllOrders||b.onclick;recent.firstElementChild.appendChild(b)}}const desired=[stats,main.querySelector('#rosThemePanel'),dine,delivery,recent,prodTables].filter(Boolean);for(let i=0;i<desired.length;i++){if(main.children[i]!==desired[i])main.insertBefore(desired[i],main.children[i]||null)}}
function goMenu(e){const a=e?.target?.closest?.('a[href="#menu"],a[href="#menu/"]');if(!a)return;if(!location.hash.startsWith('#admin'))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();location.hash='#menu';setTimeout(()=>{try{if(typeof window.renderMenu==='function')window.renderMenu();else if(typeof window.renderRouter==='function')window.renderRouter()}catch(_){ }},0)}
function menu(){document.addEventListener('click',goMenu,true)}
let lt=0;const run=()=>{clearTimeout(lt);lt=setTimeout(()=>{try{layout()}catch(e){console.warn(e)}},100)};new MutationObserver(run).observe(document.body,{childList:true,subtree:true});run();menu();
const MS=15000;let timer=0,adminBase=null,adminDeliveryBase=null,custBase=null,driverBase=null;
const labels={assigned:'تم تعيين المندوب',accepted:'المندوب قبل الطلب',picked_up:'المندوب استلم الطلب من المطعم',out_for_delivery:'المندوب خرج للتوصيل',delivered:'تم تسليم الطلب',cancelled:'تم إلغاء الطلب'};
const adminLabels={assigned:'تم تعيين المندوب للطلب',accepted:'المندوب قبل الطلب',picked_up:'المندوب استلم الطلب من المطعم',out_for_delivery:'المندوب خرج للتوصيل',delivered:'تم تسليم الطلب',cancelled:'تم إلغاء طلب التوصيل'};
async function permission(){if(!('Notification'in window))return false;if(Notification.permission==='granted')return true;if(Notification.permission==='denied')return false;try{return(await Notification.requestPermission())==='granted'}catch(_){return false}}
async function notice(t,b,tag){if(!(await permission())){if(typeof toast==='function')toast(t+': '+b);return}try{const r=await navigator.serviceWorker?.ready;if(r?.showNotification){await r.showNotification(t,{body:b,tag,renotify:true,dir:'rtl',lang:'ar'});return}new Notification(t,{body:b,tag})}catch(_){} }
function adminOn(){return location.hash==='#admin'||location.hash.startsWith('#admin/')}
function driverToken(){const h=String(location.hash||'');if(/^#driver\//i.test(h))return decodeURIComponent(h.slice(h.indexOf('/')+1).split(/[?#]/)[0]);return null}
async function adminPoll(){if(!adminOn()||!window.db||!window.store?.restaurant?.id)return;const rid=store.restaurant.id;const q=await db.from('orders').select('id,customer_name,order_type,total,created_at').eq('restaurant_id',rid).order('created_at',{ascending:false}).limit(30);if(!q.error){const rows=q.data||[],latest=rows[0];if(adminBase===null)adminBase=latest?.created_at||'';else{const fresh=rows.filter(x=>x.created_at&&x.created_at>adminBase);if(fresh.length){adminBase=fresh[0].created_at;const x=fresh[0];await notice('طلب جديد للإدارة',`${x.order_type==='delivery'?'طلب توصيل':'طلب صالة'} • ${x.customer_name||'عميل'} • ${money(x.total)}`,'ros-admin-new-order')}}}
const d=await db.from('delivery_orders').select('order_id,status,driver_id,updated_at').eq('restaurant_id',rid).order('updated_at',{ascending:false}).limit(50);if(!d.error){const rows=d.data||[];if(adminDeliveryBase===null){adminDeliveryBase=new Map(rows.map(x=>[x.order_id,x.status]))}else{for(const x of rows){const old=adminDeliveryBase.get(x.order_id);if(old!==undefined&&old!==x.status&&adminLabels[x.status]){const o=store.orders?.find(z=>z.id===x.order_id);await notice('تحديث توصيل للإدارة',`طلب #${String(x.order_id).slice(0,8)} • ${adminLabels[x.status]}${o?.customer_name?' • '+o.customer_name:''}`,'ros-admin-status-'+x.order_id+'-'+x.status)}}adminDeliveryBase=new Map(rows.map(x=>[x.order_id,x.status]))}}}
async function customerPoll(){const h=String(location.hash||'');if(!/^#track\//i.test(h)||!window.db)return;const raw=h.slice(h.indexOf('/')+1).split(/[?#]/)[0];if(!raw)return;const t=decodeURIComponent(raw);const q=await db.rpc('public_track_order_v2',{p_token:t});if(q.error||!q.data?.length)return;const x=q.data[0];if(x.order_type!=='delivery')return;if(custBase===null){custBase=x.status||'';return}if(x.status&&x.status!==custBase){const old=custBase;custBase=x.status;if(labels[x.status]&&x.status!==old)await notice('تحديث طلبك',labels[x.status],'ros-customer-'+x.status)}}
async function driverPoll(){const t=driverToken();if(!t||!window.db)return;const q=await db.rpc('driver_get_orders',{p_token:t});if(q.error)return;const rows=q.data||[];if(driverBase===null){driverBase=new Map(rows.map(x=>[x.id,x.delivery_status]));return}const next=new Map(rows.map(x=>[x.id,x.delivery_status]));for(const x of rows){if(!driverBase.has(x.id)){await notice('طلب جديد للمندوب',`تم تعيين طلب لك • ${x.customer_name||'عميل'} • ${x.address||'العنوان غير متاح'} • ${money(x.total)}`,'ros-driver-assigned-'+x.id)}else if(driverBase.get(x.id)==='assigned'&&x.delivery_status==='cancelled'){await notice('تحديث للمندوب',`تم إلغاء الطلب #${String(x.id).slice(0,8)}`,'ros-driver-cancel-'+x.id)}}for(const [id] of driverBase){if(!next.has(id))await notice('تحديث للمندوب',`تم سحب الطلب #${String(id).slice(0,8)} من قائمة طلباتك`,'ros-driver-removed-'+id)}driverBase=next}
function reset(){adminBase=null;adminDeliveryBase=null;custBase=null;driverBase=null}
function loop(){clearInterval(timer);timer=setInterval(()=>{adminPoll().catch(()=>{});customerPoll().catch(()=>{});driverPoll().catch(()=>{})},MS);adminPoll().catch(()=>{});customerPoll().catch(()=>{});driverPoll().catch(()=>{})}
loop();window.addEventListener('hashchange',()=>{reset();loop();run()});document.addEventListener('click',()=>{if('Notification'in window&&Notification.permission==='default')permission().catch(()=>{})},{once:true,capture:true});})();


/* ===== ROS LOCAL MODULE: delivery-hardening-v4.js ===== */
(function(){
  'use strict';
  if(window.__ROS_DELIVERY_HARDENING_V6__) return;
  window.__ROS_DELIVERY_HARDENING_V6__=true;

  const deliveryRouter=window.renderRouter;
  const deliveryAdmin=window.renderAdmin;
  const notify=m=>{try{typeof toast==='function'?toast(m):alert(m)}catch(_){alert(m)}};
  const publicBase=String((window.APP_CONFIG&&window.APP_CONFIG.publicAppUrl)||location.origin).replace(/\/$/,'');
  const isSpecialRoute=()=>false; // route rendering is owned by the dedicated tracking/driver layers.
  const routeKind=()=>String(location.hash||'').startsWith('#track/')?'track':String(location.hash||'').startsWith('#driver/')?'driver':null;
  const specialUrl=(kind,token)=>publicBase+'/#'+kind+'/'+encodeURIComponent(token);
  const timeout=(promise,ms,message)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);

  // Keep tracking/driver routes alive after the base app's async initialization.
  let routeBusy=false,routeTimer=0,routeAttempts=0;
  async function forceRoute(){
    const kind=routeKind();
    if(!kind||routeBusy||typeof deliveryRouter!=='function')return;
    const marker=kind==='track'?'#rosTrackBox':'#rosDriverBox';
    if(document.querySelector(marker))return;
    if(!window.db||!window.store?.restaurant?.id){scheduleRoute(180);return}
    routeBusy=true;
    try{await deliveryRouter()}catch(e){console.error('delivery route',e)}
    finally{routeBusy=false}
  }
  function scheduleRoute(delay=80){clearTimeout(routeTimer);routeTimer=setTimeout(forceRoute,delay)}
  window.addEventListener('hashchange',()=>{routeAttempts=0;scheduleRoute(0)});
  const appObserver=new MutationObserver(()=>{if(isSpecialRoute())scheduleRoute(120)});
  appObserver.observe(document.body,{childList:true,subtree:true});
  const routeWatch=setInterval(()=>{
    if(!isSpecialRoute()){routeAttempts=0;return}
    const kind=routeKind(),marker=kind==='track'?'#rosTrackBox':'#rosDriverBox';
    if(document.querySelector(marker)){routeAttempts=0;return}
    scheduleRoute(120);
    if(++routeAttempts>150){clearInterval(routeWatch);routeAttempts=0}
  },100);
  [0,250,800,1500,3000,5000,8000].forEach(ms=>setTimeout(()=>{if(isSpecialRoute())scheduleRoute(0)},ms));

  // Keep BOTH public special links inside the delivery router instead of letting the base menu router win.
  document.addEventListener('click',function(e){
    const a=e.target?.closest?.('a[href*="#track/"],a[href*="#driver/"]');
    if(!a)return;
    const href=a.getAttribute('href')||'';
    const m=href.match(/#(track|driver)\/([^?#]+)/);
    if(!m)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const kind=m[1],token=decodeURIComponent(m[2]);
    const next='#'+kind+'/'+encodeURIComponent(token);
    if(location.hash===next){scheduleRoute(0)}else{location.hash=next}
  },true);

  // Refresh normal dashboard orders after admin authentication.
  window.renderAdmin=async function(){
    if(window.db&&window.store?.restaurant?.id){
      try{
        const s=await db.auth.getSession();
        if(s?.data?.session){
          const q=await db.from('orders').select('*').eq('restaurant_id',store.restaurant.id).order('created_at',{ascending:false}).limit(100);
          if(!q.error)store.orders=q.data||[];
        }
      }catch(e){console.warn('admin orders refresh',e)}
    }
    if(typeof deliveryAdmin==='function')return deliveryAdmin();
  };

  // Correct RPC signature: admin_assign_delivery requires restaurant_id.
  document.addEventListener('click',async function(e){
    const b=e.target?.closest?.('[data-assign]');
    if(!b||!window.db||!window.store?.restaurant?.id)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const orderId=b.getAttribute('data-assign');
    const panel=b.closest('#deliveryControlPanel');
    const sel=panel?.querySelector(`[data-sel="${CSS.escape(orderId)}"]`);
    const driverId=sel?.value||'';
    if(!driverId)return notify('اختر مندوبًا أولًا');
    b.disabled=true;
    try{
      const r=await timeout(db.rpc('admin_assign_delivery',{p_restaurant_id:store.restaurant.id,p_order_id:orderId,p_driver_id:driverId}),20000,'انتهت مهلة تعيين المندوب، حاول مرة أخرى');
      if(r.error)throw r.error;
      notify('تم تعيين المندوب بنجاح');
      await window.renderAdmin();
    }catch(err){b.disabled=false;notify(err?.message||'تعذر تعيين المندوب')}
  },true);

  // Capture the public proof URL produced by the existing upload helper without uploading twice.
  function hookPaymentProof(){
    const fn=window.uploadPaymentProof;
    if(typeof fn!=='function'||fn.__rosWrapped)return false;
    const wrapped=async function(file){
      const url=await fn(file);
      window.__rosLastPaymentProofUrl=url||null;
      return url;
    };
    wrapped.__rosWrapped=true;
    window.uploadPaymentProof=wrapped;
    return true;
  }
  let proofHookTries=0;
  const proofHookTimer=setInterval(()=>{if(hookPaymentProof()||++proofHookTries>100)clearInterval(proofHookTimer)},100);
  hookPaymentProof();

  // Replace the fragile delivery submit flow with an explicit, bounded transaction.
  window.sendDeliveryOrder=async function(){
    const cartRef=window.cart;
    if(!Array.isArray(cartRef)||!cartRef.length)return notify('السلة فارغة');
    const name=document.querySelector('#cust')?.value.trim()||'';
    const phone=document.querySelector('#customerPhone')?.value.trim()||'';
    const address=document.querySelector('#addr')?.value.trim()||'';
    const pay=document.querySelector('#pay')?.value||'cash';
    const transferPhone=document.querySelector('#transferPhone')?.value.trim()||null;
    const proofFile=document.querySelector('#proof')?.files?.[0]||null;
    if(!name||!phone||!address)return notify('اكتب الاسم ورقم الهاتف والعنوان');
    if(pay==='vodafone'&&(!transferPhone||!proofFile))return notify('أدخل رقم التليفون المحوّل منه وأرفق صورة التحويل');
    if(!window.db||!window.store?.restaurant?.id)return notify('بيانات المطعم غير متاحة');

    const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('إرسال طلب التوصيل'));
    const originalText=btn?.textContent||'إرسال طلب التوصيل';
    if(btn){btn.disabled=true;btn.textContent='جارٍ رفع البيانات وإنشاء الطلب...';btn.style.opacity='.65'}
    try{
      const items=cartRef.map(x=>({product_id:x.id,name:x.name,quantity:x.qty,price:x.price}));
      let proofUrl=null;
      if(pay==='vodafone'){
        proofUrl=await timeout(uploadPaymentProof(proofFile),25000,'رفع صورة التحويل استغرق وقتًا طويلًا. تأكد من الإنترنت ثم حاول مرة أخرى');
        window.__rosLastPaymentProofUrl=proofUrl||null;
      }
      const r=await timeout(db.rpc('create_delivery_order',{
        p_restaurant_id:store.restaurant.id,
        p_customer_name:name,
        p_customer_phone:phone,
        p_address:address,
        p_payment_method:pay,
        p_items:items,
        p_customer_lat:window.__customerCoords?.lat??null,
        p_customer_lng:window.__customerCoords?.lng??null,
        p_transfer_phone:transferPhone,
        p_payment_proof_url:proofUrl
      }),25000,'إنشاء الطلب استغرق وقتًا طويلًا. لم يتم تجميد الصفحة؛ حاول مرة أخرى.');
      if(r.error)throw r.error;
      const row=Array.isArray(r.data)?r.data[0]:r.data;
      const token=row?.tracking_token;
      if(!token)throw new Error('تم إنشاء الطلب لكن لم يتم إنشاء رابط التتبع');
      const total=cartRef.reduce((a,b)=>a+b.price*b.qty,0);
      const restaurant=store.restaurant.name||'ذا بيتزا برجر كافيه';
      const track=specialUrl('track',token);
      let msg=`🍕 طلب توصيل جديد\n\n${restaurant}\n\nالعميل: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\nالدفع: ${pay==='vodafone'?'Vodafone Cash':'عند الاستلام'}\n`;
      if(pay==='vodafone'&&transferPhone)msg+=`رقم التليفون المحوّل منه: ${transferPhone}\n`;
      msg+=`\n${cartRef.map(x=>`${x.name} × ${x.qty}`).join('\n')}\n\nالإجمالي: ${money(total)}\n\n🔗 متابعة الطلب:\n${track}`;
      if(proofUrl)msg+=`\n\n📎 صورة تحويل Vodafone Cash:\n${proofUrl}`;
      const wa='https://wa.me/'+String(store.restaurant.whatsapp_number||'201026569682').replace(/\D/g,'')+'?text='+encodeURIComponent(msg);
      window.cart=[];
      if(typeof updateCart==='function')updateCart();
      const modal=document.querySelector('#modal');
      if(!modal)return;
      modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal relative w-full max-w-md rounded-3xl p-6 text-center"><button type="button" data-ros-close="1" aria-label="إغلاق" class="absolute top-3 left-3 w-10 h-10 rounded-full border font-bold text-2xl">×</button><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم استلام طلبك</h2><p class="mt-2" style="color:var(--muted)">احتفظ برابط التتبع لمتابعة حالة الطلب وموقع المندوب.</p><a href="${esc(track)}" class="block mt-5 w-full py-4 rounded-2xl text-white font-extrabold text-center" style="background:var(--brand)">متابعة الطلب</a><a href="${esc(wa)}" target="_blank" rel="noopener noreferrer" class="mt-3 w-full py-3 rounded-2xl font-extrabold flex items-center justify-center gap-2" style="background:#25D366;color:#fff"><span>◉</span><span>إرسال الطلب عبر WhatsApp</span></a></div></div>`;
      const close=modal.querySelector('[data-ros-close]');if(close)close.onclick=()=>{if(typeof closeModal==='function')closeModal();else modal.innerHTML=''};
    }catch(e){
      console.error('delivery submit',e);
      notify(e?.message||'تعذر إرسال طلب التوصيل');
    }finally{
      if(btn){btn.disabled=false;btn.textContent=originalText;btn.style.opacity=''}
    }
  };

  const modalObserver=new MutationObserver(()=>{
    const close=document.querySelector('#modal [data-ros-close]');
    if(close&&!close.__rosBound){close.__rosBound=true;close.onclick=()=>{if(typeof closeModal==='function')closeModal();else document.querySelector('#modal').innerHTML=''}}
  });
  modalObserver.observe(document.body,{childList:true,subtree:true});
})();



/* ===== ROS LOCAL MODULE: driver-app-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_DRIVER_APP_SHIM__)return;
  window.__ROS_DRIVER_APP_SHIM__=true;
  function isDriver(){const h=location.hash||'';const q=new URLSearchParams(location.search||'');return h.startsWith('#driver/')||location.pathname==='/driver'||location.pathname==='/driver/';}
  function loadInlineMap(){
    if(!isDriver()||window.__ROS_DRIVER_INLINE_MAP_LOADED__)return;
    window.__ROS_DRIVER_INLINE_MAP_LOADED__=true;
    const s=document.createElement('script');
    s.src='driver-inline-map-v1.js?v=3';s.async=true;
    s.onerror=()=>{console.warn('Driver inline map failed to load');window.__ROS_DRIVER_INLINE_MAP_LOADED__=false};
    document.body.appendChild(s);
  }
  function dedupeDriverUi(){
    if(!isDriver())return;
    const canonical=document.querySelector('#rosDriverBox');
    if(canonical){
      document.querySelectorAll('#driverBox').forEach(el=>el.remove());
      const boxes=[...document.querySelectorAll('#rosDriverBox')];
      boxes.slice(1).forEach(el=>el.remove());
    }
    // The old profile-polish layer is decorative only and could be injected repeatedly
    // by legacy cached runtimes. Remove it from the canonical driver route.
    document.querySelectorAll('#ros-driver-profile').forEach(el=>el.remove());
    const root=document.querySelector('#rosDriverBox')||document.querySelector('#app');if(!root)return;
    let kept=false;
    [...root.querySelectorAll('*')].forEach(el=>{
      const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!['مندوب التوصيل','لوحة المندوب','','لوحة المندوب • متابعة وتسليم الطلبات'].includes(text))return;
      if(!kept){kept=true;return;}
      el.style.setProperty('display','none','important');
      el.setAttribute('aria-hidden','true');
    });
  }
  function boot(){setTimeout(loadInlineMap,100);setTimeout(dedupeDriverUi,120);setTimeout(dedupeDriverUi,400);setTimeout(dedupeDriverUi,1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('hashchange',()=>{setTimeout(loadInlineMap,100);setTimeout(dedupeDriverUi,150);setTimeout(dedupeDriverUi,500);setTimeout(dedupeDriverUi,1200)});
  new MutationObserver(()=>{if(isDriver()){dedupeDriverUi();loadInlineMap()}}).observe(document.body,{childList:true,subtree:true});
})();


/* ===== ROS LOCAL MODULE: delivery-map-persistence-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_DELIVERY_MAP_PERSISTENCE_V1__)return;
window.__ROS_DELIVERY_MAP_PERSISTENCE_V1__=true;
const ids=['rosLiveMap','rosLiveMapV2','rosInlineMap'];
const detached=new Set();
function scan(){
  document.querySelectorAll('.leaflet-container').forEach(el=>detached.add(el));
  ids.forEach(id=>{
    const target=document.getElementById(id);
    if(!target||target.querySelector('.leaflet-container'))return;
    let mapEl=null;
    for(const el of detached){if(!document.documentElement.contains(el)){mapEl=el;break}}
    if(!mapEl)return;
    try{
      mapEl.id=id;
      mapEl.style.height=target.style.height||mapEl.style.height||'300px';
      target.className.split(/\s+/).filter(Boolean).forEach(c=>mapEl.classList.add(c));
      target.replaceWith(mapEl);
      detached.delete(mapEl);
      setTimeout(()=>{try{window.dispatchEvent(new Event('resize'))}catch(_){ }},100);
    }catch(_){ }
  });
}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
scan();
})();



/* ===== ROS LOCAL MODULE: delivery-order-details-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_DELIVERY_ORDER_DETAILS_V2__)return;
window.__ROS_DELIVERY_ORDER_DETAILS_V2__=true;
const POLL_MS=30000;
let timer=0,token=null,lastRoute='';
const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
const status=s=>({new:'جديد',confirmed:'تم التأكيد',preparing:'قيد التحضير',ready:'جاهز',assigned:'تم التعيين',accepted:'تم القبول',picked_up:'تم الاستلام',out_for_delivery:'في الطريق إليك',delivered:'تم التسليم',cancelled:'ملغي'})[s]||s||'—';
function itemsHtml(items){let arr=items;if(typeof arr==='string')try{arr=JSON.parse(arr)}catch(_){arr=[]}if(!Array.isArray(arr)||!arr.length)return '<div class="text-sm" style="color:var(--muted)">لا توجد تفاصيل منتجات.</div>';return `<div class="space-y-2">${arr.map(x=>{const q=Number(x.quantity??x.qty??1),p=Number(x.price||0),n=esc(x.name||'منتج');return `<div class="flex items-center justify-between gap-3 rounded-xl p-3" style="background:var(--surface)"><div class="min-w-0"><div class="font-extrabold truncate">${n}</div><div class="text-xs mt-1" style="color:var(--muted)">${q} × ${money(p)}</div></div><div class="font-extrabold whitespace-nowrap">${money(q*p)}</div></div>`}).join('')}</div>`}
function customerMapButton(x){const lat=Number(x.customer_lat),lng=Number(x.customer_lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))return '<div class="mt-3 text-xs" style="color:var(--muted)">موقع العميل غير محدد لهذا الطلب.</div>';return '<button type="button" data-ros-customer-location class="mt-3 w-full py-3 rounded-xl border font-extrabold">موقع العميل</button>'}
function card(x,mode){
  if(mode==='customer')return `<div data-ros-order-details="customer" class="rounded-3xl p-5 mb-4" dir="rtl" style="background:linear-gradient(145deg,var(--surface2),var(--surface));border:1px solid color-mix(in srgb,var(--brand) 24%,transparent)"><div class="flex justify-between items-center gap-3 mb-4"><div><div class="text-xs font-bold" style="color:var(--muted)">YOUR ORDER</div><div class="text-xl font-extrabold">تفاصيل طلبك</div></div><div class="text-sm font-extrabold">${money(x.total)}</div></div>${itemsHtml(x.items)}<div class="mt-4 pt-4" style="border-top:1px solid color-mix(in srgb,var(--text) 10%,transparent)"><div class="flex justify-between gap-3 text-sm"><span style="color:var(--muted)">الحالة</span><span class="font-extrabold">${esc(status(x.status))}</span></div></div></div>`;
  return `<div data-ros-order-details="driver" data-order-id="${esc(x.id)}" class="rounded-3xl p-5 mb-4" dir="rtl" style="background:linear-gradient(145deg,var(--surface2),var(--surface));border:1px solid color-mix(in srgb,var(--brand) 24%,transparent)"><div class="flex justify-between items-center gap-3 mb-4"><div><div class="text-xs font-bold" style="color:var(--muted)">DELIVERY ORDER</div><div class="text-xl font-extrabold">تفاصيل طلب العميل</div></div><div class="text-sm font-extrabold">${money(x.total)}</div></div><div class="grid gap-2 mb-4"><div><span class="text-xs" style="color:var(--muted)">العميل</span><div class="font-extrabold">${esc(x.customer_name||'—')}</div></div><div><span class="text-xs" style="color:var(--muted)">الهاتف</span><div class="font-bold" dir="ltr">${esc(x.customer_phone||'—')}</div></div><div><span class="text-xs" style="color:var(--muted)">العنوان</span><div class="font-bold">${esc(x.address||'—')}</div></div></div>${customerMapButton(x)}<div class="font-extrabold mb-3 mt-4">الطلب</div>${itemsHtml(x.items)}</div>`;
}
async function customer(){return;}
async function driver(){if(!/^#driver\//.test(location.hash||''))return;const t=decodeURIComponent((location.hash||'').slice(8));if(!t||!window.db)return;token=t;try{const r=await window.db.rpc('driver_get_orders',{p_token:t});if(r.error)return;const rows=Array.isArray(r.data)?r.data:[];const box=document.querySelector('#rosDriverBox');if(!box)return;box.querySelectorAll('[data-ros-order-details]').forEach(el=>el.remove());if(!rows.length)return;const active=rows.filter(x=>!['delivered','cancelled'].includes(x.delivery_status||''));const list=active.length?active:rows;box.insertAdjacentHTML('afterbegin',list.map(x=>card(x,'driver')).join(''))}catch(_){}}
async function run(){
  const h=location.hash||'',q=new URLSearchParams(location.search||'');
  const route=/^#driver\//.test(h)||location.pathname==='/driver'||location.pathname==='/driver/'||q.has('token')?'driver':'';
  if(route!==lastRoute){lastRoute=route;clearInterval(timer);timer=0}
  if(!route)return;
  await driver();
  if(!timer)timer=setInterval(driver,POLL_MS);
}
window.addEventListener('hashchange',run);setTimeout(run,1000);let lastRouteHash='';setInterval(()=>{const h=location.hash||'';if(h!==lastRouteHash){lastRouteHash=h;run()}},1500);
})();


/* ===== ROS LOCAL MODULE: driver-delivered-button-fix-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_DRIVER_DELIVERED_BUTTON_FIX_V2__) return;
  window.__ROS_DRIVER_DELIVERED_BUTTON_FIX_V2__=true;

  function isDriver(){return location.hash.startsWith('#driver/');}

  function getStatus(article){
    const badge=article?.querySelector('span.px-3.py-1');
    return String(badge?.textContent||'').trim();
  }

  function enhance(){
    if(!isDriver()) return;
    document.querySelectorAll('#rosDriverBox article').forEach(article=>{
      const state=getStatus(article);
      const button=[...article.querySelectorAll('button')].find(btn=>String(btn.textContent||'').trim().startsWith('تم التسليم'));
      if(!button)return;

      const terminal=state==='تم التسليم'||state==='ملغي';
      const ready=state==='خرج للتوصيل';
      const locked=terminal||!ready;

      button.disabled=locked;
      button.setAttribute('aria-disabled',String(locked));
      button.style.opacity=locked?'0.55':'';
      button.style.cursor=locked?'not-allowed':'';

      if(terminal){
        button.removeAttribute('onclick');
        button.textContent='تم التسليم ✓';
        button.title='تم تسليم الطلب بالفعل';
      }else if(!ready){
        button.title='يصبح زر التسليم متاحًا بعد اختيار «خرج للتوصيل»';
      }else{
        button.removeAttribute('title');
      }
    });
  }

  const observer=new MutationObserver(()=>setTimeout(enhance,0));
  function start(){
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    enhance();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('hashchange',()=>setTimeout(enhance,50));
})();



/* ===== ROS LOCAL MODULE: dine-in-v10-fix.js ===== */
(function(){
'use strict';
if(window.__ROS_DINEIN_V10_FIX__)return;window.__ROS_DINEIN_V10_FIX__=true;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ready=()=>!!(db&&store?.restaurant?.id);
const esc=v=>typeof window.esc==='function'?window.esc(v??''):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
const toast=m=>{try{window.toast?window.toast(m):console.log(m)}catch(_) {}};
const PREP=[5,15,30,45,60];
const STATUS={new:'تم استلام الطلب',preparing:'جاري التجهيز',ready:'طلبك جاهز',delivered:'شكرًا لاختيارنا'};
let trackTimer=null,lastTrackKey=null,notifyEnabled=false;
async function createDineOrder(){
 const table=typeof tableFromUrl==='function'?tableFromUrl():null;if(!table||!ready())return false;if(!Array.isArray(cart)||!cart.length){toast('السلة فارغة');return true}
 const name=document.querySelector('#cust')?.value.trim()||'عميل',items=cart.map(x=>({product_id:x.id,quantity:Number(x.qty||1)})),btn=document.querySelector('#rosDineSubmitBtn');if(btn){btn.disabled=true;btn.textContent='جارٍ إرسال الطلب...'}
 try{let ensure=window.__ROS_ENSURE_TABLE_SESSION__;for(let i=0;typeof ensure!=='function'&&i<80;i++){await new Promise(r=>setTimeout(r,100));ensure=window.__ROS_ENSURE_TABLE_SESSION__}if(typeof ensure!=='function')throw new Error('تعذر تجهيز جلسة الطاولة، أعد المحاولة بعد لحظات');const session=await (window.__ROS_TABLE_SESSION_TIMEOUT__?window.__ROS_TABLE_SESSION_TIMEOUT__(table):ensure(table));if(!session)return false;if(!['single','separate'].includes(session.billing_mode))throw new Error('اختار طريقة الحساب أولًا');if(!session.guest_token)throw new Error('تعذر إنشاء جلسة العميل');const r=await db.rpc('create_dine_in_order_with_session',{p_restaurant_id:store.restaurant.id,p_table_number:Number(table),p_customer_name:name,p_items:items,p_guest_token:session.guest_token});if(r.error)throw r.error;const row=Array.isArray(r.data)?r.data[0]:r.data,token=row?.tracking_token;if(!token)throw new Error('لم يتم إنشاء رابط متابعة الطلب');cart=[];if(typeof updateCart==='function')updateCart();const modal=document.querySelector('#modal');if(modal){modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center"><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم إرسال طلبك للمطبخ</h2><p class="mt-2" style="color:var(--muted)">الطاولة رقم ${esc(table)}</p><div class="mt-4 rounded-2xl p-4 font-bold" style="background:var(--surface2)">أهلاً بحضرتك في مطعمنا — طلبك وصل للمطبخ.</div><button id="rosTrackOrderBtn" type="button" class="mt-5 w-full py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">حالة طلبك</button><button id="rosBackAfterOrder" type="button" class="mt-3 w-full py-3 rounded-2xl border font-bold">العودة للقائمة</button></div></div>`;document.querySelector('#rosTrackOrderBtn')?.addEventListener('click',()=>{location.hash='dine-track/'+encodeURIComponent(token)});document.querySelector('#rosBackAfterOrder')?.addEventListener('click',()=>typeof closeModal==='function'?closeModal():modal.innerHTML='')}return true}catch(e){console.error('create_dine_in_order',e);toast('تعذر إرسال الطلب: '+(e?.message||'خطأ غير معروف'));return true}finally{if(btn){btn.disabled=false;btn.textContent='إتمام الطلب'}}
}
function patchCheckout(){if(typeof window.checkout!=='function'||window.checkout.__rosV10)return;const original=window.checkout;const wrapped=function(){const table=typeof tableFromUrl==='function'?tableFromUrl():null;return table?showDineCheckout():original()};wrapped.__rosV10=true;window.checkout=wrapped}
function showDineCheckout(){if(!ready())return false;const table=tableFromUrl();if(!Array.isArray(cart)||!cart.length){toast('السلة فارغة');return true}const modal=document.querySelector('#modal');if(!modal)return true;modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center" onclick="if(event.target===this)closeModal()"><div class="checkout-modal w-full max-w-lg rounded-3xl p-5 max-h-[92vh] overflow-auto"><div class="flex justify-between items-center"><h2 class="text-2xl font-extrabold">تأكيد الطلب</h2><button onclick="closeModal()" class="w-10 h-10 rounded-full border text-2xl">×</button></div><div class="checkout-note rounded-2xl p-4 my-4 font-bold">حضرتك شرفتنا على — الطاولة رقم ${esc(table)}</div><input id="cust" class="w-full border rounded-2xl p-4" placeholder="اسم اختياري"><button id="rosDineSubmitBtn" type="button" class="w-full mt-5 py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">إتمام الطلب</button></div></div>`;document.querySelector('#rosDineSubmitBtn')?.addEventListener('click',createDineOrder);return true}
async function deleteAllOrdersFixed(){if(!db||!store?.restaurant?.id){toast('بيانات المطعم غير متاحة');return}const rid=store.restaurant.id,btn=document.getElementById('deleteOrdersBtn');if(btn){btn.disabled=true;btn.textContent='جارٍ التحقق...'}try{const q=await db.from('orders').select('id').eq('restaurant_id',rid).limit(1);if(q.error)throw q.error;if(!q.data?.length){toast('لا توجد طلبات للحذف');return}if(!confirm('سيتم حذف جميع الطلبات السابقة نهائيًا. هل أنت متأكد؟'))return;if(btn)btn.textContent='جارٍ الحذف...';const d=await db.from('orders').delete().eq('restaurant_id',rid);if(d.error)throw d.error;store.orders=[];toast('تم حذف الطلبات السابقة');if(typeof renderAdmin==='function')await renderAdmin()}catch(e){console.error('deleteAllOrdersFixed',e);toast('تعذر حذف الطلبات: '+(e?.message||'خطأ غير معروف'))}finally{if(btn){btn.disabled=false;btn.textContent='حذف الطلبات السابقة'}}}
function patchDelete(){window.deleteAllOrders=deleteAllOrdersFixed;const btn=document.getElementById('deleteOrdersBtn');if(btn&&!btn.__rosV10){btn.__rosV10=true;btn.onclick=deleteAllOrdersFixed}}
async function renderPanel(){if(!ready()||!location.hash.startsWith('#admin'))return;const main=document.querySelector('#app main');if(!main)return;let panel=document.getElementById('rosV10DinePanel');if(!panel){panel=document.createElement('section');panel.id='rosV10DinePanel';panel.className='bg-white rounded-3xl p-5 mt-5';main.appendChild(panel)}const q=await db.from('orders').select('id,table_number,customer_name,total,status,prep_minutes,admin_message,created_at,order_type').eq('restaurant_id',store.restaurant.id).eq('order_type','dine_in').order('created_at',{ascending:false}).limit(30);if(q.error){console.warn('V10 panel query',q.error);return}const rows=q.data||[];panel.innerHTML=`<div class="flex items-center justify-between gap-3"><div><div class="text-sm font-bold opacity-70">DINE-IN</div><h2 class="text-2xl font-extrabold">طلبات الصالة</h2></div><button id="rosV10Refresh" class="px-4 py-2 rounded-xl border font-bold">تحديث</button></div><div class="grid gap-4 mt-5">${rows.length?rows.map(o=>`<article class="rounded-3xl border p-4" style="background:var(--surface2)"><div class="flex justify-between gap-3"><div><b class="text-lg">الطاولة ${esc(o.table_number||'—')}</b><div class="text-sm mt-1" style="color:var(--muted)">${esc(o.customer_name||'عميل')}</div></div><b>${money(o.total)}</b></div><div class="mt-4"><div class="font-bold mb-2">وقت التجهيز</div><div class="grid grid-cols-5 gap-2">${PREP.map(n=>`<button type="button" data-v10-prep="${esc(o.id)}" data-min="${n}" class="rounded-xl border p-3 font-extrabold ${Number(o.prep_minutes)===n?'ring-2':''}" style="${Number(o.prep_minutes)===n?'background:var(--brand);color:#111;border-color:var(--brand)':''}">${n} د</button>`).join('')}</div></div><div class="mt-4"><div class="font-bold mb-2">حالة الطلب</div><div class="grid grid-cols-1 sm:grid-cols-3 gap-2"><button type="button" data-v10-status="${esc(o.id)}" data-value="preparing" data-message="جاري تجهيز طلب حضرتك" class="rounded-xl border p-3 font-extrabold">جاري التجهيز</button><button type="button" data-v10-status="${esc(o.id)}" data-value="ready" data-message="تم التجهيز — طلبك جاهز" class="rounded-xl border p-3 font-extrabold">تم التجهيز / طلبك جاهز</button><button type="button" data-v10-status="${esc(o.id)}" data-value="delivered" data-message="شكرًا لاختيارنا" class="rounded-xl border p-3 font-extrabold">شكرًا لاختيارنا</button></div></div><div class="mt-4 rounded-2xl p-3" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">الحالة الحالية</div><b>${esc(o.admin_message||STATUS[o.status]||'تم استلام الطلب')}</b></div></article>`).join(''):'<div class="text-center py-10" style="color:var(--muted)">لا توجد طلبات صالة حاليًا.</div>'}</div>`;document.getElementById('rosV10Refresh')?.addEventListener('click',renderPanel);panel.querySelectorAll('[data-v10-prep]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;const r=await db.from('orders').update({prep_minutes:Number(b.dataset.min)}).eq('id',b.dataset.v10Prep).eq('restaurant_id',store.restaurant.id);if(r.error)toast('تعذر حفظ وقت التجهيز: '+r.error.message);else{toast('تم حفظ وقت التجهيز');await renderPanel()}b.disabled=false}));panel.querySelectorAll('[data-v10-status]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;const r=await db.from('orders').update({status:b.dataset.value,admin_message:b.dataset.message}).eq('id',b.dataset.v10Status).eq('restaurant_id',store.restaurant.id);if(r.error)toast('تعذر تحديث حالة الطلب: '+r.error.message);else{toast('تم تحديث حالة الطلب');await renderPanel()}b.disabled=false}))}
async function enableNotifications(){if(!('Notification'in window)){toast('المتصفح لا يدعم الإشعارات');return false}try{const p=await Notification.requestPermission();notifyEnabled=p==='granted';toast(notifyEnabled?'تم تفعيل تنبيهات الطلب':'لم يتم السماح بالتنبيهات');return notifyEnabled}catch(e){toast('تعذر تفعيل التنبيهات');return false}}
async function notify(title,body){if(!('Notification'in window)||Notification.permission!=='granted')return;try{if(navigator.serviceWorker){const reg=await navigator.serviceWorker.ready;if(reg?.showNotification){await reg.showNotification(title,{body,tag:'ros-dine-status',renotify:true,dir:'rtl',lang:'ar'});return}}new Notification(title,{body,tag:'ros-dine-status',renotify:true})}catch(e){console.warn(e)}}
async function renderTrack(token){if(!ready())return;const app=document.querySelector('#app');if(!app)return;app.innerHTML=`<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-4 pb-10"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="text-sm font-bold" style="color:var(--muted)">حالة الطلب</div><h1 class="text-3xl font-extrabold">تتبع طلبك</h1></div><button id="rosTrackBack" class="rounded-xl border px-4 py-2 font-bold">القائمة</button></div><div id="rosTrackBody" class="mt-6">جارٍ تحميل حالة الطلب...</div></div></div></main>`;document.getElementById('rosTrackBack')?.addEventListener('click',()=>location.hash='menu');const host=document.getElementById('rosTrackBody');lastTrackKey=null;clearInterval(trackTimer);const load=async silent=>{const r=await db.rpc('public_track_order',{p_token:token});if(r.error){host.innerHTML=`<div class="rounded-2xl p-5 bg-red-500/10">تعذر تحميل حالة الطلب.</div>`;return}const x=r.data?.[0];if(!x){host.innerHTML=`<div class="rounded-2xl p-5 bg-red-500/10">رابط متابعة الطلب غير صالح.</div>`;return}const key=`${x.status}|${x.admin_message||''}|${x.prep_minutes||''}`;if(!silent&&lastTrackKey&&key!==lastTrackKey)notify('تحديث طلبك',x.admin_message||STATUS[x.status]||'تم تحديث حالة الطلب');lastTrackKey=key;const rank={new:0,preparing:1,ready:2,delivered:3}[x.status]??0;const steps=['تم استلام الطلب','جاري التجهيز','طلبك جاهز','شكرًا لاختيارنا'];host.innerHTML=`<div class="rounded-3xl p-5" style="background:var(--surface2)"><div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${steps.map((s,i)=>`<div class="rounded-2xl p-4 border ${i===rank?'ring-2':''}" style="background:${i<=rank?'color-mix(in srgb,var(--brand) 14%,var(--surface2))':'var(--surface2)'};border-color:${i===rank?'var(--brand)':'color-mix(in srgb,var(--text) 9%,transparent)'}"><div class="w-9 h-9 rounded-full grid place-items-center font-extrabold mb-2" style="background:${i<=rank?'var(--brand)':'var(--surface)'};color:${i<=rank?'#111':'var(--muted)'}">${i<rank?'✓':i===rank?'●':'○'}</div><div class="font-extrabold text-sm">${s}</div></div>`).join('')}</div><div class="mt-5 rounded-3xl p-5 border" style="background:var(--surface);border-color:color-mix(in srgb,var(--brand) 24%,transparent)"><div class="text-sm font-bold" style="color:var(--muted)">حالة طلبك الآن</div><div class="text-2xl sm:text-3xl font-extrabold mt-2">${esc(x.admin_message||STATUS[x.status]||'تم استلام الطلب')}</div>${x.status==='preparing'&&x.prep_minutes?`<div class="mt-4 rounded-2xl p-4" style="background:color-mix(in srgb,var(--brand) 10%,var(--surface2))"><div class="font-bold">وقت التجهيز</div><div class="text-3xl font-extrabold mt-1">أمامك ${Number(x.prep_minutes)} دقيقة</div></div>`:''}</div><div class="mt-5 rounded-2xl p-4" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">الطاولة</div><div class="text-2xl font-extrabold mt-1">${esc(x.table_number||'—')}</div></div><button id="rosNotifyBtn" type="button" class="mt-5 w-full py-4 rounded-2xl border font-extrabold" style="background:var(--brand);color:#111;border-color:var(--brand)">${notifyEnabled?'التنبيهات مفعّلة':'تفعيل تنبيهات حالة الطلب'}</button><div class="text-xs text-center mt-2" style="color:var(--muted)">سيظهر تنبيه عند تغيير حالة الطلب.</div></div>`;document.getElementById('rosNotifyBtn')?.addEventListener('click',enableNotifications)};await load(false);trackTimer=setInterval(()=>{if(location.hash.startsWith('#track/'))load(true)},3000)}
function patchRoute(){patchCheckout();patchDelete();if(location.hash.startsWith('#track/'))renderTrack(decodeURIComponent(location.hash.slice(7)));else if(location.hash.startsWith('#admin'))renderPanel()}
async function boot(){for(let i=0;i<150;i++){if(ready())break;await sleep(100)}patchRoute();window.addEventListener('hashchange',patchRoute);setInterval(()=>{patchCheckout();patchDelete()},500);setInterval(()=>{if(location.hash.startsWith('#admin'))renderPanel()},5000)}
boot();
})();


/* ===== ROS LOCAL MODULE: dine-in-track-router-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_DINEIN_TRACK_ROUTER_V1__)return;
window.__ROS_DINEIN_TRACK_ROUTER_V1__=true;
let timer=null;
const esc=v=>typeof window.esc==='function'?window.esc(v??''):String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
const statusText={new:'تم استلام الطلب',preparing:'جاري التجهيز',ready:'طلبك جاهز',delivered:'شكرًا لاختيارنا'};
function clear(){if(timer){clearInterval(timer);timer=null}}
function dineToken(){const h=String(location.hash||'');if(!/^#dine-track\//i.test(h))return null;const v=h.slice(h.indexOf('/')+1).split(/[?#]/)[0].trim();return v?decodeURIComponent(v):null}
async function waitDb(){for(let i=0;i<150;i++){if(window.db)return true;await new Promise(r=>setTimeout(r,100))}return false}
function rpcTimeout(promise,label,ms=20000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' استغرق وقتًا أطول من المتوقع')),ms))])}
async function showTableBill(table,trackingToken){
  if(!window.db||!table||!trackingToken)return;
  const app=document.querySelector('#app');if(!app)return;
  app.innerHTML='<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-4 pb-10"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="text-sm font-bold" style="color:var(--muted)">TABLE BILL</div><h1 class="text-3xl font-extrabold">حساب الطاولة</h1></div><button id="rosBillBack" class="rounded-xl border px-4 py-2 font-bold">رجوع</button></div><div id="rosBillBody" class="mt-6">جارٍ تحميل الحساب...</div></div></div></main>';
  document.getElementById('rosBillBack')?.addEventListener('click',()=>location.hash='menu');
  const host=document.getElementById('rosBillBody');
  try{
    const r=await db.rpc('get_table_bill_by_tracking_token',{p_restaurant_id:window.store?.restaurant?.id,p_tracking_token:trackingToken});
    if(r.error)throw r.error;
    const b=Array.isArray(r.data)?r.data[0]:r.data;
    if(!b)throw new Error('لا توجد فاتورة مفتوحة للطاولة');
    const single=b.billing_mode==='single';
    const orders=Array.isArray(b.orders)?b.orders:[];
    host.innerHTML=`<div class="rounded-3xl p-5" style="background:var(--surface2)">
      <div class="flex items-center justify-between gap-3"><div><div class="text-sm" style="color:var(--muted)">الطاولة</div><div class="text-2xl font-extrabold mt-1">${esc(table)}</div></div>
      <div class="text-right"><div class="text-sm" style="color:var(--muted)">نوع الحساب</div><div class="font-extrabold mt-1">${single?'الطاولة كلها فاتورة واحدة':'كل فرد لوحده'}</div></div></div>
      <div class="mt-5 rounded-3xl p-5 border" style="background:var(--surface);border-color:color-mix(in srgb,var(--brand) 30%,transparent)">
        <div class="text-sm" style="color:var(--muted)">${single?'إجمالي حساب الطاولة':'إجمالي طلباتك'}</div>
        <div class="text-4xl font-extrabold mt-2">${money(b.total)}</div>
      </div>
      <div class="mt-5 space-y-3">${orders.map((o,i)=>`<div class="rounded-2xl p-4 border" style="background:var(--surface)">
        <div class="flex justify-between gap-3"><span class="font-bold">طلب ${i+1}</span><b>${money(o.total)}</b></div>
        <div class="text-sm mt-2" style="color:var(--muted)">${Array.isArray(o.items)?o.items.map(it=>esc((it.name||it.title||'صنف')+' × '+(it.quantity||it.qty||1))).join('، '):''}</div>
      </div>`).join('')||'<div class="text-center p-5" style="color:var(--muted)">لسه مفيش طلبات محسوبة.</div>'}</div>
      <button id="rosRequestBill" class="w-full mt-5 py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">${b.bill_requested_at?'تم طلب الحساب — الموظف هيجيلك':'اطلب الحساب من الموظف'}</button>
      <div class="mt-3 text-center text-xs" style="color:var(--muted)">الفاتورة بتتحسب من الطلبات المسجلة على الطاولة.</div>
    </div>`;
    document.getElementById('rosRequestBill')?.addEventListener('click',async()=>{
      const btn=document.getElementById('rosRequestBill');if(!btn||b.bill_requested_at)return;
      btn.disabled=true;btn.textContent='جارٍ إرسال الطلب...';
      try{const q=await db.rpc('request_table_bill_by_tracking_token',{p_restaurant_id:window.store?.restaurant?.id,p_tracking_token:trackingToken});if(q.error)throw q.error;btn.textContent='تم طلب الحساب — الموظف هيجيلك';}
      catch(e){btn.disabled=false;btn.textContent='اطلب الحساب من الموظف';if(window.toast)window.toast(e.message||'تعذر طلب الحساب');}
    });
  }catch(e){host.innerHTML='<div class="rounded-2xl p-5 bg-red-500/10">'+esc(e.message||'تعذر تحميل الحساب')+'</div>'}
}

async function render(token){clear();if(!(await waitDb()))return;const app=document.querySelector('#app');if(!app)return;app.innerHTML='<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-4 pb-10"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="text-sm font-bold" style="color:var(--muted)">DINE-IN ORDER</div><h1 class="text-3xl font-extrabold">تتبع طلبك</h1></div><button id="rosDineTrackBack" class="rounded-xl border px-4 py-2 font-bold">القائمة</button></div><div id="rosDineTrackBody" class="mt-6">جارٍ تحميل حالة الطلب...</div></div></div></main>';document.getElementById('rosDineTrackBack')?.addEventListener('click',()=>location.hash='menu');const host=document.getElementById('rosDineTrackBody');let currentTableNumber=null;const load=async()=>{const r=await db.rpc('public_track_order_v2',{p_token:token});if(r.error){host.innerHTML='<div class="rounded-2xl p-5 bg-red-500/10">تعذر تحميل حالة الطلب.</div>';return}const x=r.data?.[0];if(!x){host.innerHTML='<div class="rounded-2xl p-5 bg-red-500/10">رابط متابعة الطلب غير صالح.</div>';return}currentTableNumber=x.table_number;if(x.order_type&&x.order_type!=='dine_in'){location.hash='track/'+encodeURIComponent(token);return}const rank={new:0,preparing:1,ready:2,delivered:3}[x.status]??0;const steps=['تم استلام الطلب','جاري التجهيز','طلبك جاهز','شكرًا لاختيارنا'];host.innerHTML=`<div class="rounded-3xl p-5" style="background:var(--surface2)"><div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${steps.map((s,i)=>`<div class="rounded-2xl p-4 border ${i===rank?'ring-2':''}" style="background:${i<=rank?'color-mix(in srgb,var(--brand) 14%,var(--surface2))':'var(--surface2)'};border-color:${i===rank?'var(--brand)':'color-mix(in srgb,var(--text) 9%,transparent)'}"><div class="w-9 h-9 rounded-full grid place-items-center font-extrabold mb-2" style="background:${i<=rank?'var(--brand)':'var(--surface)'};color:${i<=rank?'#111':'var(--muted)'}">${i<rank?'✓':i===rank?'●':'○'}</div><div class="font-extrabold text-sm">${s}</div></div>`).join('')}</div><div class="mt-5 rounded-3xl p-5 border" style="background:var(--surface);border-color:color-mix(in srgb,var(--brand) 24%,transparent)"><div class="text-sm font-bold" style="color:var(--muted)">حالة طلبك الآن</div><div class="text-2xl sm:text-3xl font-extrabold mt-2">${esc(x.admin_message||statusText[x.status]||'تم استلام الطلب')}</div>${x.status==='preparing'&&x.prep_minutes?`<div class="mt-4 rounded-2xl p-4" style="background:color-mix(in srgb,var(--brand) 10%,var(--surface2))"><div class="font-bold">وقت التجهيز</div><div class="text-3xl font-extrabold mt-1">أمامك ${Number(x.prep_minutes)} دقيقة</div></div>`:''}</div><div class="mt-5 grid grid-cols-2 gap-3"><div class="rounded-2xl p-4" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">الطاولة</div><div class="text-2xl font-extrabold mt-1">${esc(x.table_number||'—')}</div></div><div class="rounded-2xl p-4" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">الإجمالي</div><div class="text-2xl font-extrabold mt-1">${money(x.total)}</div></div></div><div class="mt-5 rounded-2xl p-4 text-center text-sm" style="background:var(--surface2);color:var(--muted)">سيتم تحديث حالة طلب الصالة تلقائيًا.</div><button id="rosShowTableBill" class="w-full mt-4 py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">عرض حساب الطاولة</button></div>`};await load();document.getElementById('rosShowTableBill')?.addEventListener('click',()=>showTableBill(currentTableNumber,token));timer=setInterval(load,3000)}
window.__ROS_DINE_TRACK_RENDER__=function(){const t=dineToken();if(t)return render(t);clear()};
function boot(){window.__ROS_DINE_TRACK_RENDER__()}
async function ensureTableSession(table){
  for(let i=0;(!window.db||!window.store?.restaurant?.id)&&i<80;i++)await new Promise(r=>setTimeout(r,100));
  const rid=window.store?.restaurant?.id;
  if(!rid||!window.db)throw new Error('بيانات الطاولة غير متاحة');
  const key='ros_table_guest_'+rid+'_'+String(table);
  let guestToken=localStorage.getItem(key);
  if(!guestToken||!/^[0-9a-f-]{36}$/i.test(guestToken)){
    guestToken=crypto.randomUUID();
  }
  const join=async mode=>{
    const r=await window.db.rpc('join_table_session',{
      p_restaurant_id:rid,
      p_table_number:Number(table),
      p_guest_token:guestToken,
      p_billing_mode:mode||null
    });
    if(r.error)throw r.error;
    const row=Array.isArray(r.data)?r.data[0]:r.data;
    if(!row)return null;
    if(row.guest_token)localStorage.setItem(key,row.guest_token);
    return row;
  };
  const existing=await join(null);
  if(existing&&!existing.requires_choice){
    if(existing.guest_token)localStorage.setItem(key,existing.guest_token);
    return existing;
  }
  const modal=document.querySelector('#modal');
  if(!modal)throw new Error('تعذر فتح اختيار حساب الطاولة');
  const previous=modal.innerHTML;
  return await new Promise((resolve,reject)=>{
    modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center"><div class="text-4xl mb-3">🍽️</div><h2 class="text-2xl font-extrabold">اختيار حساب الطاولة</h2><p class="mt-3 leading-8" style="color:var(--muted)">هل الطاولة كلها فاتورة واحدة ولا كل فرد لوحده؟</p><div class="grid gap-3 mt-6"><button type="button" data-table-billing="single" class="w-full py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">الطاولة كلها فاتورة واحدة</button><button type="button" data-table-billing="separate" class="w-full py-4 rounded-2xl border font-extrabold">كل فرد لوحده</button></div><p class="text-xs mt-4" style="color:var(--muted)"></p><button type="button" id="rosTableBillingCancel" class="mt-3 w-full py-3 rounded-2xl text-sm" style="color:var(--muted)">رجوع</button></div></div>`;
    const finish=async mode=>{
      try{
        const row=await join(mode);
        if(!row||row.requires_choice)throw new Error('اختار طريقة الحساب');
        modal.innerHTML=previous;
        resolve(row);
      }catch(e){reject(e)}
    };
    modal.querySelectorAll('[data-table-billing]').forEach(b=>b.addEventListener('click',()=>finish(b.dataset.tableBilling)));
    modal.querySelector('#rosTableBillingCancel')?.addEventListener('click',()=>{modal.innerHTML=previous;resolve(null)});
  });
}

window.__ROS_TABLE_SESSION_TIMEOUT__=function(table){return rpcTimeout(ensureTableSession(table),'اختيار حساب الطاولة',20000)};
window.__ROS_ENSURE_TABLE_SESSION__=ensureTableSession;


window.addEventListener('hashchange',function(e){if(dineToken()){e.stopImmediatePropagation();render(dineToken())}else clear()},true);
const original=window.renderRouter;window.renderRouter=function(){const t=dineToken();if(t)return render(t);return typeof original==='function'?original.apply(this,arguments):undefined};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


/* ===== ROS LOCAL MODULE: driver-gps-lifecycle-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_DRIVER_GPS_LIFECYCLE_V1__) return;
  window.__ROS_DRIVER_GPS_LIFECYCLE_V1__=true;

  const geo=navigator.geolocation;
  if(!geo||typeof geo.watchPosition!=='function'||typeof geo.clearWatch!=='function')return;

  const originalWatch=geo.watchPosition.bind(geo);
  const originalClear=geo.clearWatch.bind(geo);
  const active=new Set();

  function isDriver(){return location.hash.startsWith('#driver/');}

  function stopAll(){
    for(const id of active){
      try{originalClear(id)}catch(_){ }
    }
    active.clear();
    window.__ROS_DRIVER_GPS_ACTIVE__=false;
  }

  geo.watchPosition=function(success,error,options){
    const id=originalWatch(function(position){
      window.__ROS_DRIVER_GPS_ACTIVE__=true;
      if(typeof success==='function')success(position);
    },error,options);
    if(isDriver())active.add(id);
    return id;
  };

  geo.clearWatch=function(id){
    active.delete(id);
    return originalClear(id);
  };

  window.__rosStopDriverGps=stopAll;

  window.addEventListener('hashchange',()=>{
    if(!isDriver())stopAll();
  },{passive:true});

  window.addEventListener('pagehide',stopAll,{passive:true});
  window.addEventListener('beforeunload',stopAll,{passive:true});
})();


/* ===== ROS LOCAL MODULE: kitchen-admin-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_KITCHEN_ADMIN_V1__) return;
  window.__ROS_KITCHEN_ADMIN_V1__=true;

  const PIN='1234';
  let orders=[];
  let pollTimer=0;
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const money=n=>`${Number(n||0).toFixed(0)} ${window.APP_CONFIG?.currency||'جنيه'}`;
  const kitchenStatus=o=>{const s=String(o?.kitchen_status||'').toLowerCase();if(s==='cooking')return'preparing';if(s==='new'||!s)return'new';return['received','preparing','ready'].includes(s)?s:'new';};
  const statusMeta={new:{label:'طلب جديد',desc:'وصل الطلب — في انتظار تأكيد المطبخ',cls:'ka-new'},received:{label:'تم الاستلام',desc:'المطبخ أكد استلام الطلب',cls:'ka-received'},preparing:{label:'جاري التجهيز',desc:'المطبخ يعمل على الطلب الآن',cls:'ka-preparing'},ready:{label:'جاهز',desc:'المطبخ أكد أن الطلب جاهز',cls:'ka-ready'}};

  function apiBase(){const url=String(window.APP_CONFIG?.supabaseUrl||'').replace(/\/$/,'');return url+'/functions/v1/kitchen-api';}
  async function load(){
    if(!window.APP_CONFIG?.supabaseUrl||!window.APP_CONFIG?.supabaseAnonKey)return;
    try{const key=window.APP_CONFIG.supabaseAnonKey;const r=await fetch(apiBase(),{headers:{'apikey':key,'Authorization':`Bearer ${key}`,'x-kitchen-pin':PIN},cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok||data?.error)throw new Error(data?.error||data?.message||`HTTP ${r.status}`);orders=Array.isArray(data)?data:(data.orders||data.data||[]);renderBoard();}
    catch(e){console.error('kitchen admin load',e);const el=document.getElementById('ka-board');if(el)el.innerHTML=`<div class="ka-error">تعذر تحميل أوامر المطبخ حاليًا. ${esc(e.message||'خطأ غير معروف')}</div>`;}
  }
  function normalizeItems(o){let x=o?.items;if(typeof x==='string'){try{x=JSON.parse(x)}catch(_){x=[]}}if(!Array.isArray(x))x=o?.order_items||o?.orderItems||[];return Array.isArray(x)?x:[];}
  function itemText(i){const name=i?.name||i?.product_name||i?.title||'صنف';const qty=i?.quantity??i?.qty??1;const mods=i?.modifiers||i?.options;let extra='';if(Array.isArray(mods)&&mods.length)extra=' • '+mods.map(m=>m?.name||m).join('، ');return `${esc(name)}${extra} <b>× ${esc(qty)}</b>`;}
  function orderCard(o){
    const s=kitchenStatus(o),m=statusMeta[s]||statusMeta.new,items=normalizeItems(o),id=String(o.id||''),created=o.created_at?new Date(o.created_at):null,time=created&&!isNaN(created)?created.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}):'—';
    const type=String(o.order_type||o.type||'').toLowerCase();const external=type.includes('delivery')||!!o.address;const typeLabel=external?'خارجي — دليفري':'داخلي — داخل المطعم';const customer=o.customer_name||o.name||'عميل';const table=o.table_number||o.table||'';const total=o.total??o.total_amount??o.amount??0;
    const readyAction=s==='ready'&&external?`<div class="ka-dispatch"><b>الخطوة التالية للإدارة</b><span>الطلب جاهز — قم بتعيين مندوب من قسم التوصيل.</span></div>`:s==='ready'?`<div class="ka-complete"><b>تم التجهيز</b><span>الطلب الداخلي جاهز للتسليم للعميل داخل المطعم.</span></div>`:'';
    return `<article class="ka-card ${m.cls}"><div class="ka-card-head"><div><div class="ka-order-no">طلب #${esc(id.slice(0,8))}</div><div class="ka-time">${time}</div></div><span class="ka-badge">${m.label}</span></div><div class="ka-customer"><b>${esc(customer)}</b><span>${esc(typeLabel)}${table?' • طاولة '+esc(table):''}</span></div><div class="ka-items">${items.length?items.map(itemText).map(x=>`<div class="ka-item">${x}</div>`).join(''):'<div class="ka-item">تفاصيل الأصناف غير متاحة</div>'}</div>${o.notes||o.customer_note||o.notes_text?`<div class="ka-note"><b>ملاحظة:</b> ${esc(o.notes||o.customer_note||o.notes_text)}</div>`:''}<div class="ka-card-foot"><strong>${money(total)}</strong></div>${readyAction}</article>`;
  }
  function renderBoard(){const board=document.getElementById('ka-board');if(!board)return;const active=orders.filter(o=>{const s=String(o.status||'').toLowerCase();return !['cancelled','canceled','delivered'].includes(s)});const groups={new:[],received:[],preparing:[],ready:[]};active.forEach(o=>groups[kitchenStatus(o)].push(o));document.getElementById('ka-count').textContent=active.length;Object.keys(groups).forEach(s=>{const el=document.getElementById('ka-'+s+'-count');if(el)el.textContent=groups[s].length});board.innerHTML=['new','received','preparing','ready'].map(s=>`<section class="ka-column"><div class="ka-column-head"><div><h3>${statusMeta[s].label}</h3><small>${statusMeta[s].desc}</small></div><span>${groups[s].length}</span></div>${groups[s].length?groups[s].map(orderCard).join(''):`<div class="ka-empty">لا توجد طلبات</div>`}</section>`).join('');}
  function inject(){if(window.__ROS_ADMIN_READY__!==true){document.getElementById('ka-launcher')?.remove();document.getElementById('ka-panel')?.remove();return}if(document.getElementById('ka-launcher'))return;const style=document.createElement('style');style.id='ka-style';style.textContent=`
#ka-launcher{position:fixed;right:18px;bottom:18px;z-index:9990;border:1px solid #ffffff20;background:#17191df5;color:#f6f1e7;border-radius:18px;padding:13px 17px;font:800 14px Cairo,Arial;box-shadow:0 15px 45px #0008;cursor:pointer;backdrop-filter:blur(12px)}#ka-launcher .ka-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#D4AF37;margin-left:7px;box-shadow:0 0 12px #D4AF37}#ka-panel{position:fixed;inset:0;z-index:9989;background:#0d0e10f7;color:#f6f1e7;display:none;overflow:auto;font-family:Cairo,Arial,sans-serif}#ka-panel.open{display:block}.ka-wrap{max-width:1550px;margin:auto;padding:24px}.ka-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}.ka-title h2{margin:0;font-size:30px;font-weight:900}.ka-title p{margin:4px 0 0;color:#aaa39a}.ka-close{border:1px solid #ffffff20;background:#202329;color:#fff;border-radius:14px;padding:10px 15px;font-weight:800;cursor:pointer}.ka-flow{margin-bottom:20px;padding:13px 16px;border:1px solid #ffffff12;background:#17191d;border-radius:16px;color:#c9c4bb;font-size:13px}.ka-flow b{color:#f6f1e7}.ka-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}.ka-stat{background:#17191d;border:1px solid #ffffff12;border-radius:18px;padding:15px}.ka-stat b{font-size:25px}.ka-stat span{display:block;color:#aaa39a;font-size:12px}.ka-board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;align-items:start}.ka-column{background:#121418;border:1px solid #ffffff12;border-radius:22px;padding:13px;min-height:220px}.ka-column-head{display:flex;justify-content:space-between;align-items:center;padding:5px 5px 13px}.ka-column-head h3{margin:0;font-size:17px;font-weight:900}.ka-column-head small{color:#999;font-size:10px;line-height:1.5;display:block;max-width:220px}.ka-column-head>span{min-width:32px;text-align:center;border-radius:10px;padding:5px 8px;background:#202329;font-weight:900}.ka-card{background:#17191d;border:1px solid #ffffff12;border-radius:18px;padding:15px;margin-bottom:12px;box-shadow:0 10px 30px #0003}.ka-card-head,.ka-customer,.ka-card-foot{display:flex;justify-content:space-between;gap:10px;align-items:center}.ka-order-no{font-weight:900;font-size:17px}.ka-time{color:#999;font-size:11px;margin-top:2px}.ka-badge{padding:6px 10px;border-radius:999px;background:#202329;font-size:11px;font-weight:900}.ka-customer{margin-top:13px;padding:10px;border-radius:12px;background:#202329}.ka-customer span{color:#aaa39a;font-size:11px}.ka-items{margin:12px 0}.ka-item{padding:8px 0;border-bottom:1px solid #ffffff0d;font-size:13px;line-height:1.7}.ka-note{margin:10px 0;padding:10px;border-radius:12px;background:#241d0e;color:#e5d4a0;font-size:12px}.ka-card-foot{margin-top:14px}.ka-card-foot strong{font-size:16px}.ka-dispatch{margin-top:13px;padding:11px 12px;border-radius:13px;background:#173322;border:1px solid #4ade8040;color:#b9f6c8}.ka-dispatch b,.ka-complete b{display:block;font-size:12px}.ka-dispatch span,.ka-complete span{display:block;margin-top:3px;font-size:11px;color:#aab4ad}.ka-complete{margin-top:13px;padding:11px 12px;border-radius:13px;background:#202329;color:#d7d3ca}.ka-empty{color:#777;text-align:center;padding:35px 10px}.ka-error{background:#3a1515;border:1px solid #7d2a2a;padding:16px;border-radius:16px;color:#ffd5d5}.ka-new{border-top:3px solid #ef4444}.ka-received{border-top:3px solid #d4af37}.ka-preparing{border-top:3px solid #f59e0b}.ka-ready{border-top:3px solid #4ade80}@media(max-width:1100px){.ka-board{grid-template-columns:repeat(2,minmax(0,1fr))}.ka-stats{grid-template-columns:repeat(4,1fr)}}@media(max-width:700px){.ka-board{grid-template-columns:1fr}.ka-stats{grid-template-columns:repeat(2,1fr)}.ka-wrap{padding:14px}.ka-title h2{font-size:24px}}
`;document.head.appendChild(style);const launcher=document.createElement('button');launcher.id='ka-launcher';launcher.innerHTML='<span class="ka-dot"></span>المطبخ <span id="ka-count">0</span>';launcher.onclick=()=>open();document.body.appendChild(launcher);const panel=document.createElement('div');panel.id='ka-panel';panel.innerHTML=`<div class="ka-wrap"><div class="ka-top"><div class="ka-title"><h2>متابعة المطبخ</h2><p>لوحة مراقبة للإدارة — الإدارة لا ترسل أوامر للمطبخ</p></div><button class="ka-close" onclick="window.ROS_KITCHEN_ADMIN.close()">إغلاق</button></div><div class="ka-flow"><b>مسار الطلب:</b> العميل ← المطبخ ← تأكيد الجاهزية ← الإدارة تعيّن المندوب للطلبات الخارجية</div><div class="ka-stats"><div class="ka-stat"><b id="ka-new-count">0</b><span>طلبات جديدة</span></div><div class="ka-stat"><b id="ka-received-count">0</b><span>تم الاستلام</span></div><div class="ka-stat"><b id="ka-preparing-count">0</b><span>جاري التجهيز</span></div><div class="ka-stat"><b id="ka-ready-count">0</b><span>جاهز</span></div></div><div id="ka-board" class="ka-board"></div></div>`;document.body.appendChild(panel);}
  function open(){inject();document.getElementById('ka-panel').classList.add('open');load();clearInterval(pollTimer);pollTimer=setInterval(load,15000)}
  function close(){document.getElementById('ka-panel')?.classList.remove('open');clearInterval(pollTimer);pollTimer=0}
  window.ROS_KITCHEN_ADMIN={open,close,load};
  const original=window.renderAdmin;window.renderAdmin=async function(){let r;try{if(typeof original==='function')r=await original()}catch(e){console.error(e);throw e}inject();return r;};
  window.addEventListener('hashchange',()=>{if(location.hash==='#admin'||location.hash.startsWith('#admin/'))setTimeout(inject,100);else{document.getElementById('ka-launcher')?.remove();document.getElementById('ka-panel')?.remove()}});window.addEventListener('ros:admin-ready',()=>setTimeout(inject,50));if(location.hash==='#admin'||location.hash.startsWith('#admin/'))setTimeout(inject,200);
})();


/* ===== ROS LOCAL MODULE: daily-offer-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_DAILY_OFFER_V1__)return;
  window.__ROS_DAILY_OFFER_V1__=true;
  const TABLE='restaurant_daily_offers';
  const RESTAURANT_ID='02da399f-b12d-480b-bf53-5491bbe8f9e5';
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const money=n=>typeof window.money==='function'?window.money(n):`${Number(n||0).toFixed(0)} جنيه`;
  const getDb=()=>{try{return typeof db!=='undefined'&&db?db:null}catch(_){return null}};
  const getStore=()=>{try{return typeof store!=='undefined'&&store?store:null}catch(_){return null}};
  const getCart=()=>{try{return typeof cart!=='undefined'&&Array.isArray(cart)?cart:null}catch(_){return null}};
  const isAdmin=location.hash==='#admin'||location.hash.startsWith('#admin/');

  function style(){
    if(document.getElementById('ros-daily-offer-style'))return;
    const s=document.createElement('style');s.id='ros-daily-offer-style';
    s.textContent=`
      #ros-daily-offer-modal{position:fixed;inset:0;z-index:140;display:none;align-items:center;justify-content:center;padding:18px;background:#000b;backdrop-filter:blur(10px)}
      #ros-daily-offer-modal.show{display:flex}
      #ros-daily-offer-modal .ros-offer-box{width:min(560px,100%);max-height:90vh;overflow:auto;background:linear-gradient(145deg,var(--surface,#17191D),var(--surface2,#202329));color:var(--text,#F6F1E7);border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 35%,transparent);border-radius:28px;padding:20px;box-shadow:0 30px 100px #000b}
      #ros-daily-offer-modal .ros-offer-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      #ros-daily-offer-modal .ros-offer-badge{display:inline-flex;padding:6px 10px;border-radius:999px;background:color-mix(in srgb,var(--brand,#D4AF37) 14%,transparent);border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 25%,transparent);color:var(--brand,#D4AF37);font-weight:900;font-size:12px}
      #ros-daily-offer-modal .ros-offer-text{margin:14px 0;padding:14px;border-radius:18px;background:color-mix(in srgb,var(--brand,#D4AF37) 8%,var(--surface2,#202329));border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 15%,transparent);font-weight:800;line-height:1.9}
      #ros-daily-offer-modal .ros-offer-product{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;margin-top:9px;border-radius:17px;background:var(--surface2,#202329);border:1px solid color-mix(in srgb,var(--text,#F6F1E7) 10%,transparent)}
      #ros-daily-offer-modal .ros-offer-product .price{color:var(--brand,#D4AF37);font-weight:900;white-space:nowrap}
      #ros-daily-offer-modal .ros-offer-add{width:100%;margin-top:16px;padding:14px;border:0;border-radius:17px;background:var(--brand,#D4AF37);color:#111;font-weight:900;cursor:pointer}
      #ros-daily-offer-modal .ros-offer-close{width:38px;height:38px;border-radius:50%;border:1px solid #fff2;background:transparent;color:inherit;font-size:23px;cursor:pointer}
      #ros-daily-offer-admin{margin:18px 0;padding:20px;border-radius:24px;background:linear-gradient(145deg,var(--surface,#17191D),var(--surface2,#202329));border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 25%,transparent);box-shadow:0 15px 45px #0005}
      #ros-daily-offer-admin select,#ros-daily-offer-admin textarea{width:100%;border-radius:15px;padding:12px;border:1px solid #ffffff20;background:var(--surface2,#202329);color:var(--text,#F6F1E7)}
      #ros-daily-offer-admin .ros-offer-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}
      #ros-daily-offer-admin button{border:0;border-radius:13px;padding:11px 16px;font-weight:900;cursor:pointer}
      #ros-daily-offer-save{background:var(--brand,#D4AF37);color:#111}
      #ros-daily-offer-disable{background:#ffffff10;color:var(--text,#F6F1E7);border:1px solid #ffffff20!important}
      #ros-daily-offer-status{margin-top:10px;font-size:12px;color:var(--muted,#A9A39A)}
    `;
    document.head.appendChild(s);
  }

  async function waitReady(){
    for(let i=0;i<120;i++){
      if(getDb()&&getStore()?.products?.length)return true;
      await new Promise(r=>setTimeout(r,250));
    }
    return !!getDb();
  }

  async function loadOffer(){
    const client=getDb();if(!client)return null;
    const r=await client.from(TABLE).select('restaurant_id,product_ids,offer_text,active,updated_at').eq('restaurant_id',RESTAURANT_ID).maybeSingle();
    if(r.error){console.warn('[ROS daily offer] load',r.error);return null}
    return r.data||null;
  }

  function productList(ids){
    const ps=getStore()?.products||[];const set=new Set((ids||[]).map(String));
    return ps.filter(p=>set.has(String(p.id))&&p.available!==false);
  }

  function hideOffersCategory(){
    const scan=()=>document.querySelectorAll('.cat-pill').forEach(el=>{if((el.textContent||'').trim()==='العروض'){el.style.display='none';el.setAttribute('aria-hidden','true')}});
    scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  }

  function closeModal(){document.getElementById('ros-daily-offer-modal')?.classList.remove('show')}

  function addOfferToCart(products){
    const cartRef=getCart();
    if(!cartRef){toast?.('تعذر الوصول إلى سلة التسوق');return}
    const added=[];
    for(const p of products){
      const base=Number(p.price)||0;
      const sizes=Array.isArray(p.sizes)?p.sizes:[];
      const size=sizes[0]?.size||null;
      const required=(p.modifiers||[]).filter(m=>m.is_required);
      if(required.length)continue;
      const item=cartRef.find(x=>String(x.id)===String(p.id)&&(!x.modifiers||!x.modifiers.length));
      if(item){item.qty=(Number(item.qty)||0)+1}
      else cartRef.push({id:p.id,name:p.name,price:base,base_price:base,qty:1,modifiers:[],size:size});
      added.push(p.name);
    }
    if(typeof updateCart==='function')updateCart();
    if(added.length){toast?.('تم إضافة العرض لسلة التسوق — رجاءً أكمل الطلب');closeModal();}
    else toast?.('لم يتم إضافة العرض لأن أحد المنتجات يحتاج اختيارات إضافية');
  }

  function showCustomerOffer(offer){
    if(isAdmin||!offer?.active||!String(offer.offer_text||'').trim())return;
    if(sessionStorage.getItem('ros_daily_offer_seen_v1')==='1')return;
    const products=productList(offer.product_ids);if(!products.length)return;
    sessionStorage.setItem('ros_daily_offer_seen_v1','1');
    const old=document.getElementById('ros-daily-offer-modal');old?.remove();
    const modal=document.createElement('div');modal.id='ros-daily-offer-modal';
    modal.innerHTML=`<div class="ros-offer-box" role="dialog" aria-modal="true" aria-labelledby="rosOfferTitle"><div class="ros-offer-head"><div><span class="ros-offer-badge">عرض اليوم</span><h2 id="rosOfferTitle" style="font-size:25px;font-weight:900;margin:9px 0 0">عرض خاص لك</h2></div><button type="button" class="ros-offer-close" aria-label="إغلاق">×</button></div><div class="ros-offer-text">${esc(offer.offer_text)}</div><div>${products.map(p=>`<div class="ros-offer-product"><div><div style="font-weight:900">${esc(p.name)}</div><div style="font-size:12px;color:var(--muted,#A9A39A);margin-top:3px">متاح الآن</div></div><span class="price">${money(p.price)}</span></div>`).join('')}</div><button type="button" class="ros-offer-add">إضافة العرض للسلة</button></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.ros-offer-close').addEventListener('click',closeModal);
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
    modal.querySelector('.ros-offer-add').addEventListener('click',()=>addOfferToCart(products));
    requestAnimationFrame(()=>modal.classList.add('show'));
  }

  function adminCard(offer){
    if(!isAdmin||document.getElementById('ros-daily-offer-admin'))return;
    const app=document.getElementById('app');if(!app)return;
    const host=document.createElement('section');host.id='ros-daily-offer-admin';
    host.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><div style="font-size:21px;font-weight:900">عرض اليوم</div><div style="font-size:12px;color:var(--muted,#A9A39A);margin-top:4px">اختر منتجًا أو أكثر واكتب نص العرض الذي سيظهر للعميل مرة واحدة عند فتح الموقع.</div></div><div style="display:flex;align-items:center;gap:8px"><span id="ros-daily-offer-status"></span><button id="ros-daily-offer-close" type="button" aria-label="إغلاق عرض اليوم" title="إغلاق" style="width:38px;height:38px;border-radius:50%;border:1px solid #fff2;background:transparent;color:inherit;font-size:23px;line-height:1;cursor:pointer">×</button></div></div><div style="margin-top:15px"><label style="display:block;font-weight:800;margin-bottom:7px">المنتجات</label><select id="ros-daily-offer-products" multiple size="7"></select></div><div style="margin-top:13px"><label style="display:block;font-weight:800;margin-bottom:7px">نص العرض</label><textarea id="ros-daily-offer-text" rows="3" placeholder="مثال: خصم 50% أو اشتري واحدة واحصل على الأخرى بنصف الثمن"></textarea></div><div class="ros-offer-actions"><button id="ros-daily-offer-save" type="button">حفظ عرض اليوم</button><button id="ros-daily-offer-disable" type="button">إخفاء العرض</button></div>`;
    app.insertBefore(host,app.firstChild);
    const select=host.querySelector('#ros-daily-offer-products');
    (getStore()?.products||[]).filter(p=>p.available!==false).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar')).forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=`${p.name} — ${money(p.price)}`;if((offer?.product_ids||[]).some(id=>String(id)===String(p.id)))o.selected=true;select.appendChild(o)});
    host.querySelector('#ros-daily-offer-text').value=offer?.offer_text||'';
    const status=host.querySelector('#ros-daily-offer-status');status.textContent=offer?.active?'العرض ظاهر للعملاء':'العرض مخفي';
    host.querySelector('#ros-daily-offer-close').addEventListener('click',()=>host.remove());
    host.querySelector('#ros-daily-offer-save').addEventListener('click',async()=>{const ids=[...select.selectedOptions].map(o=>o.value);const text=host.querySelector('#ros-daily-offer-text').value.trim();if(!ids.length)return toast?.('اختر منتجًا واحدًا على الأقل');if(!text)return toast?.('اكتب نص العرض أولًا');const b=host.querySelector('#ros-daily-offer-save');b.disabled=true;try{const client=getDb();const r=await client.from(TABLE).upsert({restaurant_id:RESTAURANT_ID,product_ids:ids,offer_text:text,active:true,updated_at:new Date().toISOString()},{onConflict:'restaurant_id'});if(r.error)throw r.error;sessionStorage.removeItem('ros_daily_offer_seen_v1');host.remove();toast?.('تم حفظ عرض اليوم');}catch(e){console.error('[ROS daily offer] save',e);toast?.('تعذر حفظ العرض: '+(e?.message||'خطأ'))}finally{b.disabled=false}});
    host.querySelector('#ros-daily-offer-disable').addEventListener('click',async()=>{const client=getDb();if(!client)return;const r=await client.from(TABLE).upsert({restaurant_id:RESTAURANT_ID,product_ids:[],offer_text:'',active:false,updated_at:new Date().toISOString()},{onConflict:'restaurant_id'});if(r.error)return toast?.('تعذر إخفاء العرض');status.textContent='العرض مخفي';toast?.('تم إخفاء عرض اليوم')});
  }

  window.__ROS_SHOW_DAILY_OFFER__=async function(){
    if(!isAdmin)return;
    style();
    if(!(await waitReady()))return;
    const offer=await loadOffer();
    adminCard(offer);
    document.getElementById('ros-daily-offer-admin')?.scrollIntoView({behavior:'smooth',block:'start'});
  };
  window.__ROS_HIDE_DAILY_OFFER__=function(){document.getElementById('ros-daily-offer-admin')?.remove()};

  async function boot(){
    style();
    if(!(await waitReady()))return;
    if(isAdmin){
      // لا تُظهر كارت عرض اليوم تلقائيًا؛ القائمة الجانبية تتحكم في ظهوره وإخفائه.
      return;
    }else{
      hideOffersCategory();
      const offer=await loadOffer();
      showCustomerOffer(offer);
    }
  }
  boot().catch(e=>console.warn('[ROS daily offer] boot',e));
})();



/* ===== ROS LOCAL MODULE: delivery-customer-flow-v1.js ===== */
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



/* ===== ROS LOCAL MODULE: delivery-admin-dedupe-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_DINEIN_ADMIN_DEDUPE_V1__)return;
window.__ROS_DINEIN_ADMIN_DEDUPE_V1__=true;
let timer=0;
function cleanup(){
  if(!location.hash.startsWith('#admin'))return;
  const deliveryPanel=document.querySelector('#deliveryControlPanel');
  const panels=[...document.querySelectorAll('#rosPrepPanel')];
  if(!deliveryPanel){panels.forEach(x=>x.remove());return}
  panels.slice(1).forEach(x=>x.remove());
  const panel=document.querySelector('#rosPrepPanel');
  if(panel){
    const seen=new Set();
    [...panel.querySelectorAll('[data-ros-order-id]')].forEach(card=>{
      const id=String(card.getAttribute('data-ros-order-id')||'');
      if(id&&seen.has(id))card.remove();else if(id)seen.add(id);
    });
  }
  const loginNodes=[...document.querySelectorAll('*')].filter(el=>el.children.length===0&&el.textContent.trim()==='تسجيل دخول الإدارة');
  loginNodes.slice(1).forEach(el=>el.remove());
}
function boot(){clearTimeout(timer);timer=setTimeout(cleanup,150)}
window.addEventListener('hashchange',boot);
new MutationObserver(boot).observe(document.body,{childList:true,subtree:true});
boot();
})();


/* ===== ROS LOCAL MODULE: table-billing-admin-v1.js ===== */
(function(){
'use strict';
if(window.__ROS_TABLE_BILLING_ADMIN_V1__)return;
window.__ROS_TABLE_BILLING_ADMIN_V1__=true;
let timer=0;
const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=v=>typeof window.money==='function'?window.money(v):Number(v||0).toFixed(0)+' جنيه';
function admin(){return location.hash.startsWith('#admin')&&window.__ROS_ADMIN_READY__===true}
function panel(){return document.getElementById('rosTableBillingAdmin')}
async function load(){
  if(!admin()||!window.db||!window.store?.restaurant?.id)return;
  const r=await window.db.rpc('admin_table_billing_sessions',{p_restaurant_id:window.store.restaurant.id});
  if(r.error)return;
  const rows=Array.isArray(r.data)?r.data:[];
  let host=panel();
  if(!host){
    host=document.createElement('section');host.id='rosTableBillingAdmin';host.className='bg-white rounded-3xl p-5 mt-5';
    const app=document.getElementById('app');if(!app)return;app.appendChild(host);
  }
  host.innerHTML=`<div class="flex flex-wrap items-center justify-between gap-3 mb-4"><div><h2 class="text-xl font-extrabold">حسابات الطاولات</h2><p class="text-sm mt-1" style="color:var(--muted)">الجلسات المفتوحة وطلبات الحساب</p></div><span class="px-3 py-2 rounded-xl text-sm font-bold" style="background:#f3f4f6">${rows.length} طاولة مفتوحة</span></div><div class="space-y-3">${rows.length?rows.map(x=>`<div class="border rounded-2xl p-4"><div class="flex flex-wrap justify-between gap-3"><div><div class="font-extrabold text-lg">طاولة ${esc(x.table_number)}</div><div class="text-sm mt-1" style="color:var(--muted)">${x.billing_mode==='single'?'الطاولة كلها فاتورة واحدة':'كل فرد لوحده'} — ${Number(x.order_count||0)} طلب</div></div><div class="text-right"><div class="text-xl font-extrabold">${money(x.total)}</div>${x.bill_requested_at?'<div class="text-sm font-bold mt-1" style="color:#b45309">طلب الحساب</div>':''}</div></div><div class="flex gap-2 mt-4"><button data-table-bill-close="${esc(x.session_id)}" class="px-4 py-2 rounded-xl font-bold" style="background:var(--brand);color:#111">إغلاق الحساب</button></div></div>`).join(''):'<div class="text-center py-8" style="color:var(--muted)">لا توجد حسابات طاولات مفتوحة حاليًا.</div>'}</div>`;
  host.querySelectorAll('[data-table-bill-close]').forEach(btn=>btn.onclick=async()=>{
    if(!confirm('إغلاق حساب الطاولة؟ بعد الإغلاق سيبدأ QR جلسة جديدة للطاولة.'))return;
    btn.disabled=true;
    const q=await window.db.rpc('admin_close_table_session',{p_restaurant_id:window.store.restaurant.id,p_session_id:btn.dataset.tableBillClose});
    if(q.error){btn.disabled=false;if(window.toast)window.toast(q.error.message);return}
    load();
  });
}
function boot(){clearTimeout(timer);timer=setTimeout(load,300)}
window.addEventListener('hashchange',boot);
new MutationObserver(boot).observe(document.body,{childList:true,subtree:true});
boot();
})();


/* ===== ROS LOCAL MODULE: ui-cleanups-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_UI_CLEANUPS_V1__)return;
  window.__ROS_UI_CLEANUPS_V1__=true;
  const normalize=s=>String(s||'').replace(/[\u064B-\u065F\u0670]/g,'').replace(/\s+/g,' ').trim().replace(/ة/g,'ه');
  function dedupe(){
    const seen=new Set();
    document.querySelectorAll('button,a,.cat-pill').forEach(el=>{
      const text=normalize(el.textContent);
      if(text!=='مكرونه سبيشيال'&&text!=='مكرونه سبيشال')return;
      if(seen.has(text)){el.style.display='none';el.setAttribute('aria-hidden','true');}
      else seen.add(text);
    });
  }
  dedupe();
  new MutationObserver(dedupe).observe(document.body,{childList:true,subtree:true});
})();



/* ===== ROS LOCAL MODULE: ros-realtime-notifications-v1.js ===== */
(function(){'use strict';if(window.__ROS_REALTIME_NOTIFICATIONS_V4__)return;window.__ROS_REALTIME_NOTIFICATIONS_V4__=true;const sleep=ms=>new Promise(r=>setTimeout(r,ms));let client=null,restaurantId=null,role='',audioCtx=null,lastEvents=new Map(),booted=false;const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));const key=e=>[e?.eventType,e?.table,e?.id,e?.status,e?.text].join(':');function routeRole(){const h=location.hash||'',p=location.pathname||'';if(h.startsWith('#driver/'))return'driver';if(h.startsWith('#admin'))return'admin';if(h.startsWith('#track/')||h.startsWith('#dine-track'))return'customer';if(h.startsWith('#kitchen')||p.startsWith('/kitchen')||p.startsWith('/kds'))return'kitchen';return'customer'}function unlockAudio(){try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();window.__ROS_AUDIO_UNLOCKED__=true;document.querySelector('#rosAudioUnlock')?.remove()}catch(e){}}function ensureAudioButton(){if(document.querySelector('#rosAudioUnlock')||window.__ROS_AUDIO_UNLOCKED__)return;const b=document.createElement('button');b.id='rosAudioUnlock';b.type='button';b.textContent='تفعيل صوت الإشعارات';b.style.cssText='position:fixed;z-index:2147483647;bottom:18px;right:18px;border:0;border-radius:999px;padding:11px 16px;background:var(--brand,#D4AF37);color:#111;font:800 13px Cairo,Arial,sans-serif;box-shadow:0 10px 30px #0008;cursor:pointer';b.onclick=unlockAudio;document.body.appendChild(b)}function beep(kind){try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const now=audioCtx.currentTime,notes=kind==='new'?[660,880,1046]:kind==='success'?[784,988,1174]:[520,660,520];notes.forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,now+i*.11);g.gain.exponentialRampToValueAtTime(.16,now+i*.11+.02);g.gain.exponentialRampToValueAtTime(.0001,now+i*.11+.09);o.connect(g);g.connect(audioCtx.destination);o.start(now+i*.11);o.stop(now+i*.11+.1)})}catch(e){}}function notify(title,text,kind){beep(kind);try{if('Notification'in window&&Notification.permission==='granted')new Notification(title,{body:text,tag:'ros-'+Date.now()})}catch(_){}const old=document.querySelector('#rosRealtimeToast');old?.remove();const box=document.createElement('div');box.id='rosRealtimeToast';box.dir='rtl';box.innerHTML='<div style="font-weight:900">'+esc(title)+'</div><div style="margin-top:3px;opacity:.85">'+esc(text)+'</div>';box.style.cssText='position:fixed;z-index:2147483646;top:18px;right:18px;max-width:330px;padding:14px 16px;border-radius:18px;background:var(--surface,#17191D);color:var(--text,#fff);border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 35%,transparent);box-shadow:0 18px 50px #0009;font:700 13px Cairo,Arial,sans-serif;cursor:pointer';box.onclick=()=>box.remove();document.body.appendChild(box);setTimeout(()=>box.remove(),6500)}function orderEvent(p){const n=p?.new||{},o=p?.old||{},id=n.id||o.id;if(!id)return null;const type=String(n.order_type||o.order_type||'delivery'),status=String(n.status||''),k=String(n.kitchen_status||''),oldStatus=String(o.status||''),oldK=String(o.kitchen_status||''),prep=n.prep_minutes,oldPrep=o.prep_minutes,msg=String(n.admin_message||''),oldMsg=String(o.admin_message||'');if(!o.id)return{eventType:'new-order',table:'orders',id,status:'new',title:'طلب جديد',text:type==='dine_in'?'طلب جديد من داخل المطعم':'طلب توصيل جديد',kind:'new'};if(oldPrep!==prep&&prep!=null&&type==='dine_in')return{eventType:'kitchen-prep',table:'orders',id,status:'prep-'+prep,title:'تحديث المطبخ',text:`وقت التجهيز المحدد: ${prep} دقيقة`,kind:'update'};if(oldK!==k&&k)return{eventType:'kitchen-status',table:'orders',id,status:k,title:'تحديث المطبخ',text:({received:'تم استلام الطلب',preparing:'جاري التجهيز',ready:'تم تجهيز الطلب'}[k]||k),kind:k==='ready'?'success':'update'};if(oldMsg!==msg&&msg&&type==='dine_in'&&['شرفتنا يا فندم','نتمنى أن ننال رضاكم'].includes(msg))return{eventType:'kitchen-message',table:'orders',id,status:msg,title:'رسالة من المطبخ',text:msg,kind:'success'};if(oldStatus!==status&&status&&type!=='dine_in')return{eventType:'order-status',table:'orders',id,status,title:'تحديث الطلب',text:'تم تحديث حالة طلب '+(n.customer_name||'العميل'),kind:status==='delivered'?'success':'update'};return null}function allowed(ev){if(!ev)return false;if(role==='kitchen')return ev.eventType==='new-order';if(role==='admin')return true;if(role==='driver')return ev.eventType==='assignment'||ev.eventType==='driver-status'||ev.eventType==='new-order';if(role==='customer')return ev.eventType==='kitchen-status'||ev.eventType==='kitchen-prep'||ev.eventType==='kitchen-message'||ev.eventType==='assignment'||ev.eventType==='driver-status'||ev.eventType==='order-status';return false}function handle(ev){if(!allowed(ev))return;const k=key(ev);if(lastEvents.has(k))return;lastEvents.set(k,Date.now());for(const[x,t]of lastEvents)if(Date.now()-t>60000)lastEvents.delete(x);notify(ev.title,ev.text,ev.kind)}async function subscribe(){if(!client||!restaurantId)return;const ch=client.channel('ros-notify-'+restaurantId+'-'+Math.random().toString(36).slice(2));ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},p=>{if(String(p.new?.restaurant_id)===String(restaurantId))handle(orderEvent(p))});ch.on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders'},p=>{if(String(p.new?.restaurant_id||p.old?.restaurant_id)===String(restaurantId))handle(orderEvent(p))});ch.on('postgres_changes',{event:'UPDATE',schema:'public',table:'delivery_orders'},p=>{const n=p.new||{},o=p.old||{};if(n.id&&n.status!==o.status)handle({eventType:'driver-status',table:'delivery_orders',id:n.id,status:n.status,title:'تحديث التوصيل',text:({assigned:'تم تعيين المندوب',accepted:'المندوب قبل الطلب',picked_up:'المندوب استلم الطلب',out_for_delivery:'الطلب في الطريق إليك',delivered:'تم تسليم الطلب'}[n.status]||n.status),kind:n.status==='delivered'?'success':'update'});if(n.id&&n.driver_id!==o.driver_id)handle({eventType:'assignment',table:'delivery_orders',id:n.id,status:'assigned',title:'تعيين مندوب',text:'تم تعيين مندوب للطلب',kind:'success'})});const state=await ch.subscribe();if(state!=='SUBSCRIBED')console.warn('ROS realtime subscription',state)}let adminRefreshTimer=null;
function startAdminFallbackRefresh(){
  clearInterval(adminRefreshTimer);
  adminRefreshTimer=setInterval(()=>{
    if(routeRole()==='admin'&&typeof window.__ROS_REFRESH_ADMIN_ORDERS__==='function')window.__ROS_REFRESH_ADMIN_ORDERS__();
  },30000);
}
async function boot(){if(booted)return;booted=true;role=routeRole();ensureAudioButton();document.addEventListener('pointerdown',unlockAudio,{once:true,capture:true});if('Notification'in window&&Notification.permission==='default'){try{Notification.requestPermission()}catch(_){} }for(let i=0;i<80;i++){try{client=typeof db!=='undefined'?db:null}catch(_){}try{restaurantId=typeof store!=='undefined'&&store.restaurant?.id?store.restaurant.id:null}catch(_){}if(client&&restaurantId)break;await sleep(250)}if(!client||!restaurantId){console.warn('ROS realtime notifications: client/restaurant unavailable');return}await subscribe();startAdminFallbackRefresh()}window.addEventListener('hashchange',()=>{role=routeRole();ensureAudioButton()});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()})();


/* ===== ROS LOCAL MODULE: customer-tracking-v2.js ===== */
(function(){
'use strict';
if(window.__ROS_CUSTOMER_TRACKING_V4__)return;
window.__ROS_CUSTOMER_TRACKING_V4__=true;
const POLL=12000;
let active=null,timer=null,busy=false,last=null,failures=0;
const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function db(){try{if(window.__ROS_TRACK_DB__)return window.__ROS_TRACK_DB__;const c=window.APP_CONFIG||{};if(window.supabase?.createClient&&c.supabaseUrl&&c.supabaseAnonKey)return window.__ROS_TRACK_DB__=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);return window.db||null}catch(_){return null}}
async function waitDb(){for(let i=0;i<80;i++){if(db())return db();await new Promise(r=>setTimeout(r,100))}return null}
function token(){const h=String(location.hash||'');if(/^#track\//i.test(h)){const v=h.slice(h.indexOf('/')+1).split(/[?#]/)[0].trim();try{return decodeURIComponent(v)}catch(_){return v}}const q=new URLSearchParams(location.search||'');return q.get('tracking_token')||q.get('trackingToken')||q.get('track')||q.get('token')||null}
function isTrack(){return /^#track\//i.test(location.hash||'')||!!token()}
function stop(){if(timer){clearInterval(timer);timer=null}active=null;last=null;failures=0}
const delivery=s=>['assigned','accepted','picked_up','out_for_delivery'].includes(s);
const status=s=>({new:'تم استلام طلبك',confirmed:'تم استلام طلبك',preparing:'جاري تجهيز طلبك',ready:'تم تجهيز طلبك',assigned:'تم تعيين مندوب التوصيل',accepted:'المندوب قبل الطلب',picked_up:'المندوب استلم الطلب',out_for_delivery:'الطلب في الطريق إليك',delivered:'تم التسليم',cancelled:'تم إلغاء الطلب'})[s]||'تم استلام طلبك';
function shell(){const a=document.querySelector('#app');if(!a)return;a.innerHTML=`<main class="min-h-screen luxury-page p-4" dir="rtl"><div class="max-w-3xl mx-auto pt-6 pb-10"><div class="lux-card rounded-[30px] overflow-hidden"><header class="p-6" style="background:linear-gradient(135deg,var(--surface),var(--surface2));border-bottom:1px solid color-mix(in srgb,var(--text) 10%,transparent)"><div class="text-[10px] tracking-[.18em] font-black" style="color:var(--brand)">ORDER TRACKING</div><h1 class="text-3xl font-black mt-1">تتبع طلبك</h1><p class="text-sm mt-2" style="color:var(--muted)"></p></header><div id="rosTrackBox" class="p-5 sm:p-7"></div></div></div></main>`}
function mapBlock(x){const lat=Number(x.latitude),lng=Number(x.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng))return '';const src=`https://www.google.com/maps?q=${encodeURIComponent(lat+','+lng)}&z=15&output=embed`;return `<section class="rounded-[30px] overflow-hidden" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--brand) 18%,transparent);box-shadow:0 14px 40px #0004"><div class="p-5 pb-3 flex justify-between items-center gap-3"><div><div class="font-black text-lg">موقع المندوب</div><div class="text-xs mt-1" style="color:var(--muted)">آخر موقع مسجل — يتم تحديثه تلقائيًا</div></div><span class="text-[10px] font-black rounded-full px-3 py-1" style="background:color-mix(in srgb,var(--brand) 12%,var(--surface));color:var(--brand)">LIVE</span></div><div style="height:320px;background:var(--surface);"><iframe title="خريطة موقع المندوب" src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%;height:100%;border:0;display:block"></iframe></div></section>`}
function render(x,p){const isDine=String(x.order_type||'')==='dine_in',a=delivery(x.status),name=(p?.driver_name||x.driver_name||'').trim(),phone=p?.driver_phone||x.driver_phone||'',photo=p?.driver_photo_url||p?.photo_url||'';const prep=Number(x.prep_minutes);const prepText=Number.isFinite(prep)&&prep>=5&&prep<=30?`وقت التجهيز المتوقع: ${prep} دقيقة`:'المطبخ سيحدد وقت التجهيز قريبًا';const kitchenMsg=(x.admin_message||'').trim();const dineClosing=['شرفتنا يا فندم','نتمنى أن ننال رضاكم'].includes(kitchenMsg)?kitchenMsg:'';let b=document.querySelector('#rosTrackBox');if(!b)return;const steps=['تم تعيين المندوب','تم قبول الطلب','تم استلام الطلب','الطلب في الطريق','تم التسليم'],rank={assigned:0,accepted:1,picked_up:2,out_for_delivery:3,delivered:4}[x.status];let body=`<div class="space-y-4"><section class="rounded-[30px] p-5 sm:p-6" style="background:linear-gradient(145deg,var(--surface2),var(--surface));border:1px solid color-mix(in srgb,var(--brand) 25%,transparent);box-shadow:0 18px 55px #0006"><div class="text-xs" style="color:var(--muted)">الحالة الحالية</div><div class="text-2xl sm:text-3xl font-black mt-1">${isDine?(dineClosing||status(x.status)):status(x.status)}</div>${isDine?`<div class="mt-5 rounded-2xl p-4" style="background:color-mix(in srgb,var(--brand) 8%,var(--surface))"><b>${esc(prepText)}</b><div class="text-sm mt-1" style="color:var(--muted)">${esc(kitchenMsg||'المطبخ يعمل على طلبك الآن.')}</div></div>`:(!a&&x.status!=='delivered'&&x.status!=='cancelled'?'<div class="mt-5 rounded-2xl p-4" style="background:color-mix(in srgb,var(--brand) 8%,var(--surface))"><b>تم استلام طلبك بنجاح</b><div class="text-sm mt-1" style="color:var(--muted)">المطعم يتابع طلبك، وستظهر بيانات المندوب فور تعيينه.</div></div>':'')}${a&&name?`<div class="mt-5 rounded-3xl p-4 flex items-center gap-4" style="background:var(--surface);border:1px solid color-mix(in srgb,var(--brand) 18%,transparent)">${photo?`<img src="${esc(photo)}" alt="صورة المندوب" class="w-16 h-16 rounded-2xl object-cover border" style="border-color:var(--brand)">`:'<div class="w-16 h-16 rounded-2xl grid place-items-center text-2xl font-black" style="background:var(--surface2)">م</div>'}<div class="min-w-0"><div class="text-xs" style="color:var(--muted)">مندوب التوصيل</div><div class="text-lg font-black truncate">${esc(name)}</div>${phone?`<a href="tel:${esc(phone)}" class="text-sm font-bold" style="color:var(--brand)">اتصال بالمندوب</a>`:''}</div></div>`:''}</section>`;if(a)body+=`<section class="rounded-[30px] p-5" style="background:var(--surface2)"><div class="font-black text-lg mb-4">رحلة التوصيل</div>${steps.map((s,i)=>`<div class="flex items-center gap-3 mb-3"><span class="w-8 h-8 rounded-full grid place-items-center text-xs font-black" style="background:${rank!=null&&i<=rank?'var(--brand)':'var(--surface)'};color:${rank!=null&&i<=rank?'#111':'var(--muted)'}">${rank!=null&&i<rank?'✓':i+1}</span><span class="font-extrabold">${s}</span></div>`).join('')}</section>`;if(a)body+=mapBlock(x);if(x.status==='delivered')body+=`<div class="rounded-3xl p-5 text-center font-black" style="background:color-mix(in srgb,#22c55e 12%,var(--surface2))">تم تسليم الطلب بنجاح</div>`;body+=`<div class="text-center text-xs" style="color:var(--muted)">${isDine?'تحديثات المطبخ تظهر تلقائيًا على هذه الصفحة.':'يتم تحديث الحالة تلقائيًا.'}</div></div>`;b.innerHTML=body}
async function fetchData(){if(!active||busy)return;const c=await waitDb();if(!c){failures++;return}busy=true;try{let r=await c.rpc('public_track_order_v2',{p_token:active});if(r.error||!r.data?.length)r=await c.rpc('public_track_order',{p_token:active});if(r.error||!r.data?.length){failures++;if(!last&&failures>=3){const b=document.querySelector('#rosTrackBox');if(b)b.innerHTML='<div class="rounded-3xl p-6 text-center" style="background:color-mix(in srgb,#ef4444 10%,var(--surface2))"><b>تعذر تحميل حالة الطلب حاليًا.</b><div class="text-xs mt-2">سيتم إعادة المحاولة تلقائيًا.</div></div>'}return}failures=0;last=r.data[0];let p=null;if(last.driver_name&&last.status!=='cancelled'){const q=await c.rpc('public_driver_profile',{p_token:active});if(!q.error&&q.data?.length)p=q.data[0]}render(last,p);if(['delivered','cancelled'].includes(last.status)&&timer){clearInterval(timer);timer=null}}catch(e){console.error('ROS customer tracking',e);failures++}finally{busy=false}}
async function load(){if(!isTrack())return;const t=token(),a=document.querySelector('#app');if(!t||!a)return;if(active===t&&document.querySelector('#rosTrackBox')){fetchData();return}if(timer){clearInterval(timer);timer=null}active=t;last=null;failures=0;shell();await fetchData();if(active===t&&!timer)timer=setInterval(fetchData,POLL)}
const originalRouter=window.renderRouter;window.renderRouter=function(){if(isTrack())return load();return typeof originalRouter==='function'?originalRouter.apply(this,arguments):undefined};
window.addEventListener('hashchange',e=>{if(/^#track\//i.test(location.hash||'')){e.stopImmediatePropagation();load()}else stop()},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
setTimeout(load,1000);
})();



/* ===== ROS LOCAL MODULE: delivery-submit-fix-v1.js ===== */
(function(){
  'use strict';
  if(window.__ROS_DELIVERY_SUBMIT_FIX_V1__) return;
  window.__ROS_DELIVERY_SUBMIT_FIX_V1__=true;

  const notify=(m)=>{try{if(typeof toast==='function')toast(m);else alert(m)}catch(_){alert(m)}};
  const esc=(v)=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const money=(v)=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  const base=()=>String((window.APP_CONFIG&&window.APP_CONFIG.publicAppUrl)||location.origin).replace(/\/$/,'');
  const track=(t)=>base()+'/#track/'+encodeURIComponent(t);

  window.sendDeliveryOrder=async function(){
    if(window.__ROS_DELIVERY_SENDING__) return;
    if(!Array.isArray(window.cart)||!cart.length) return notify('السلة فارغة');
    const name=document.querySelector('#cust')?.value.trim()||'';
    const phone=document.querySelector('#customerPhone')?.value.trim()||'';
    const address=document.querySelector('#addr')?.value.trim()||'';
    const pay=document.querySelector('#pay')?.value||'cash';
    const transferPhone=document.querySelector('#transferPhone')?.value.trim()||null;
    const proofFile=document.querySelector('#proof')?.files?.[0]||null;
    if(!name||!phone||!address) return notify('اكتب الاسم ورقم الهاتف والعنوان');
    if(pay==='vodafone'&&(!transferPhone||!proofFile)) return notify('أدخل رقم التليفون المحوّل منه وأرفق صورة التحويل');
    if(!window.db||!window.store?.restaurant?.id) return notify('بيانات المطعم غير متاحة');
    window.__ROS_DELIVERY_SENDING__=true;
    try{
      let proofUrl=null;
      if(pay==='vodafone'&&typeof uploadPaymentProof==='function') proofUrl=await uploadPaymentProof(proofFile);
      const items=cart.map(x=>({product_id:x.id,name:x.name,quantity:Math.max(1,Number(x.qty||x.quantity||1)),price:Number(x.price||0),modifiers:Array.isArray(x.modifiers)?x.modifiers.map(m=>({id:m.id,name:m.name,price:Number(m.price||0)})):[]}));
      const requestId=crypto.randomUUID();
      const r=await db.rpc('create_delivery_order_v2',{p_restaurant_id:store.restaurant.id,p_customer_name:name,p_customer_phone:phone,p_address:address,p_payment_method:pay,p_items:items,p_customer_lat:window.__customerCoords?.lat??null,p_customer_lng:window.__customerCoords?.lng??null,p_transfer_phone:transferPhone,p_payment_proof_url:proofUrl,p_client_request_id:requestId});
      if(r.error) throw new Error(r.error.message||'تعذر إنشاء الطلب');
      const row=Array.isArray(r.data)?r.data[0]:r.data;
      const token=row?.tracking_token;
      if(!token) throw new Error('تم إنشاء الطلب لكن لم يتم إنشاء رابط التتبع');
      try{localStorage.setItem('ros_last_tracking_token',String(token));}catch(_){}
      const total=Number(row?.total||cart.reduce((a,b)=>a+Number(b.price||0)*Number(b.qty||1),0));
      const restaurant=store.restaurant.name||'المطعم';
      const msg=`طلب توصيل جديد\n${restaurant}\nالعميل: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\nالإجمالي: ${money(total)}`;
      const wa='https://wa.me/'+String(store.restaurant.whatsapp_number||'201026569682').replace(/\D/g,'')+'?text='+encodeURIComponent(msg);
      const url=track(token);
      cart=[];
      if(typeof updateCart==='function') updateCart();
      const modal=document.querySelector('#modal');
      if(modal) modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center"><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم استلام طلبك</h2><p class="mt-2" style="color:var(--muted)">احتفظ برابط التتبع لمتابعة حالة الطلب وموقع المندوب.</p><a href="${esc(url)}" class="block mt-5 w-full py-4 rounded-2xl text-white font-extrabold text-center" style="background:var(--brand)">متابعة الطلب</a><a href="${esc(wa)}" target="_blank" rel="noopener noreferrer" class="mt-3 w-full py-3 rounded-2xl border font-extrabold flex items-center justify-center gap-2" style="color:#25D366;border-color:#25D366">WhatsApp للمطعم</a></div></div>`;
    }catch(e){
      console.error('ROS delivery submit failed',e);
      notify(e?.message||'تعذر إنشاء الطلب');
    }finally{window.__ROS_DELIVERY_SENDING__=false;}
  };

  // Tracking resilience: the order is already committed by the RPC, so the tracking
  // page must retry instead of declaring the token invalid on its first empty read.
  function installTrackingResilience(){
    if(window.__ROS_TRACKING_RESILIENCE_INLINE__)return;
    window.__ROS_TRACKING_RESILIENCE_INLINE__=true;
    let active=null,timer=null;
    const tokenFromHash=()=>{const h=location.hash||'';return h.startsWith('#track/')?decodeURIComponent(h.slice(7)):null;};
    const waitDb=async()=>{for(let i=0;i<40;i++){if(window.db?.rpc)return true;await new Promise(r=>setTimeout(r,100));}return false;};
    const load=async(token,attempt=0)=>{
      if(token!==tokenFromHash())return;
      const box=document.querySelector('#trackBox')||document.querySelector('#rosTrackBox');
      if(!box)return;
      if(!(await waitDb()))return;
      const r=await db.rpc('public_track_order',{p_token:token});
      if(token!==tokenFromHash())return;
      if(r.error){if(attempt<8){timer=setTimeout(()=>load(token,attempt+1),500);return;}box.innerHTML='<div class="p-5 rounded-2xl bg-red-500/10">تعذر تحميل حالة الطلب.</div>';return;}
      const x=Array.isArray(r.data)?r.data[0]:r.data;
      if(!x){
        if(attempt<12){box.innerHTML='<div class="p-5 rounded-2xl" style="background:var(--surface2)"><div class="text-4xl mb-2">✓</div><div class="font-extrabold text-xl">جارٍ تأكيد استلام الطلب...</div><div class="mt-2 text-sm" style="color:var(--muted)">لا تحتاج إلى تحديث الصفحة.</div></div>';timer=setTimeout(()=>load(token,attempt+1),500);return;}
      }
      const status=String(x.status||'new');
      const labels={new:'تم استلام طلبك',confirmed:'تم تأكيد الطلب',preparing:'جاري تجهيز الطلب',ready:'الطلب جاهز',assigned:'تم تعيين المندوب',accepted:'المندوب قبل الطلب',picked_up:'المندوب استلم الطلب',out_for_delivery:'الطلب في الطريق إليك',delivered:'تم تسليم الطلب'};
      const state=labels[status]||'تم استلام طلبك';
      const gps=x.latitude!=null&&x.longitude!=null;
      box.innerHTML=`<div class="space-y-4"><div class="rounded-3xl p-6 text-center" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--brand) 24%,transparent)"><div class="text-5xl mb-3">✓</div><div class="text-2xl font-extrabold">${esc(state)}</div><div class="mt-2 text-sm" style="color:var(--muted)">${status==='new'?'جاري تجهيز طلبك وسيتم تحديث الحالة تلقائيًا.':'سيتم تحديث حالة الطلب والتوصيل تلقائيًا.'}</div></div><div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="text-sm" style="color:var(--muted)">العميل</div><div class="font-bold">${esc(x.customer_name||'عميل')}</div><div class="mt-3 text-sm" style="color:var(--muted)">الإجمالي</div><div class="font-extrabold text-xl">${money(x.total)}</div>${x.driver_name?`<div class="mt-3 text-sm" style="color:var(--muted)">المندوب</div><div class="font-bold">${esc(x.driver_name)}</div>`:''}${x.driver_phone?`<a href="tel:${esc(x.driver_phone)}" class="inline-block mt-2 font-bold" style="color:var(--brand)">${esc(x.driver_phone)}</a>`:''}${gps?`<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(x.latitude+','+x.longitude)}" class="inline-block mt-3 px-4 py-2 rounded-xl border font-bold">فتح موقع المندوب</a>`:''}</div></div>`;
      if(timer)clearTimeout(timer);
      if(!['delivered','cancelled'].includes(status))timer=setTimeout(()=>load(token,0),5000);
    };
    const run=()=>{const token=tokenFromHash();if(!token||token===active)return;active=token;if(timer)clearTimeout(timer);setTimeout(()=>load(token,0),100);};
    window.addEventListener('hashchange',()=>{active=null;run();});
    setTimeout(run,800);
  }
  installTrackingResilience();
})();

