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
  for(const k of ['categories','products','tables']){const q=await db.from(k).select('*').eq('restaurant_id',r.data.id).order(k==='tables'?'table_number':'sort_order');if(q.error)throw q.error;store[k]=q.data||[]}
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

async function renderAdmin(){theme();document.body.style.background='var(--bg)';const session=(await db?.auth.getSession())?.data?.session;if(db&&!session){renderLogin();return}if(!store.restaurant){renderSetup();return}await ensureDrinksCategory();$('#app').innerHTML=`<div class="min-h-screen"><header class="bg-white border-b sticky top-0 z-30"><div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center"><div><b class="text-xl">Restaurant OS</b><div class="text-xs text-gray-500">Dashboard • Supabase Connected</div></div><div class="flex gap-2"><a href="#menu" class="px-4 py-2 rounded-xl bg-gray-100">فتح المنيو</a><button onclick="logout()" class="px-4 py-2 rounded-xl bg-gray-100">خروج</button></div></div></header><main class="max-w-7xl mx-auto p-4 md:p-6"><div class="grid md:grid-cols-4 gap-4 mb-5"><div class="bg-white p-5 rounded-3xl"><div class="text-gray-500">المنتجات</div><b class="text-3xl">${store.products.length}</b></div><div class="bg-white p-5 rounded-3xl"><div class="text-gray-500">الطاولات</div><b class="text-3xl">${store.tables.filter(t=>t.active).length}</b></div><div class="bg-white p-5 rounded-3xl"><div class="text-gray-500">الطلبات</div><b class="text-3xl">${store.orders.length}</b></div><div class="bg-white p-5 rounded-3xl"><div class="text-gray-500">الثيم</div><div class="flex flex-wrap gap-2 mt-2">${Object.entries(THEMES).map(([k,t])=>`<button title="${t.name}" onclick="setTheme('${store.restaurant.id}','${t.accent}')" class="w-8 h-8 rounded-full border-2" style="background:${t.accent}"></button>`).join('')}</div></div></div><div class="grid lg:grid-cols-3 gap-5"><section class="lg:col-span-2 bg-white rounded-3xl p-5"><div class="flex justify-between mb-4 items-center gap-3"><h2 class="text-xl font-extrabold">المنتجات</h2><button onclick="productForm()" class="px-4 py-2 rounded-xl bg-black text-white">+ إضافة منتج</button></div><div id="productEditor" class="hidden mb-5"></div><div class="overflow-auto"><table class="w-full text-right"><thead><tr class="border-b"><th class="p-3">المنتج</th><th>السعر</th><th>التصنيف</th><th>الحالة</th><th></th></tr></thead><tbody>${store.products.map(p=>`<tr class="border-b"><td class="p-3 font-bold">${esc(p.name)}</td><td>${money(p.price)}</td><td>${esc(store.categories.find(c=>c.id===p.category_id)?.name||'-')}</td><td>${p.available?'متاح':'مخفي'}</td><td><button onclick="productForm('${p.id}')" class="text-blue-600 ml-3">تعديل</button><button onclick="delProduct('${p.id}')" class="text-red-600">حذف</button></td></tr>`).join('')}</tbody></table></div></section><section class="bg-white rounded-3xl p-5"><h2 class="text-xl font-extrabold mb-4">الطاولات و QR</h2><p class="text-sm text-gray-500 mb-4">كل QR يفتح المنيو مع رقم الطاولة تلقائياً.</p><div class="grid grid-cols-3 gap-2">${store.tables.map(t=>`<button onclick="showQR(${t.table_number})" class="border rounded-xl p-3">طاولة ${t.table_number}</button>`).join('')}</div></section></div><section class="bg-white rounded-3xl p-5 mt-5"><div class="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 class="text-xl font-extrabold">آخر الطلبات</h2><button id="deleteOrdersBtn" onclick="deleteAllOrders()" class="px-4 py-2 rounded-xl bg-red-600 text-white font-bold">حذف الطلبات السابقة</button></div><div class="space-y-2">${store.orders.slice(0,10).map(o=>`<div class="border rounded-2xl p-3"><div class="flex justify-between gap-3"><span class="font-bold">${o.order_type==='dine_in'?'طاولة '+o.table_number:'طلب خارجي'} — ${esc(o.customer_name||'عميل')}</span><b>${money(o.total)}</b></div><div class="text-sm text-gray-500 mt-2">${o.customer_phone?'هاتف: '+esc(o.customer_phone)+' — ':''}${o.payment_method==='vodafone'?'Vodafone Cash':''}</div>${o.payment_proof_url?`<a href="${esc(o.payment_proof_url)}" target="_blank" rel="noopener" class="inline-block mt-2 text-blue-600 font-bold">عرض صورة التحويل</a>`:''}</div>`).join('')||'<div class="text-gray-500">لا توجد طلبات بعد.</div>'}</div></section></main></div><div id="modal"></div>`}
function renderLogin(){document.body.style.background='#f3f4f6';$('#app').innerHTML=`<main class="min-h-screen grid place-items-center p-5"><form onsubmit="login(event)" class="bg-white rounded-3xl shadow-xl p-6 w-full max-w-md"><h1 class="text-3xl font-extrabold">Restaurant OS</h1><p class="text-gray-500 mt-2">تسجيل دخول لوحة الإدارة</p><input id="email" type="email" required class="w-full border rounded-2xl p-4 mt-6" placeholder="البريد الإلكتروني"><input id="password" type="password" required class="w-full border rounded-2xl p-4 mt-3" placeholder="كلمة المرور"><button class="w-full mt-4 py-4 rounded-2xl bg-black text-white font-bold">دخول</button><a href="#menu" class="block text-center mt-4 text-gray-500">العودة للمنيو</a></form></main>`}
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
  const data={name:$('#pn')?.value.trim()||'',description:$('#pd')?.value.trim()||'',price:Number($('#pp')?.value||0),image_url:$('#pi')?.value.trim()||'',category_id:$('#pc')?.value||null,available:$('#pa')?.checked!==false,sort_order:existing?.sort_order||store.products.length+1,restaurant_id:store.restaurant.id};
  if(!data.name||!Number.isFinite(data.price)||data.price<=0)return toast('أدخل الاسم والسعر بشكل صحيح');
  if(!db)return toast('لوحة الإدارة تحتاج اتصال Supabase');
  const {data:{session}}=await db.auth.getSession();
  if(!session)return toast('انتهت جلسة الإدارة — سجل الدخول مرة أخرى');
  if(btn){btn.disabled=true;btn.textContent='جارٍ الحفظ...';btn.style.opacity='.65'}
  try{
    if(id){
      const r=await db.rpc('owner_update_product',{p_id:id,p_name:data.name,p_description:data.description,p_price:data.price,p_image_url:data.image_url,p_category_id:data.category_id,p_available:data.available,p_sort_order:data.sort_order});
      if(r.error)throw r.error;
    }else{
      const duplicateCheck=await db.from('products').select('id,name').eq('restaurant_id',data.restaurant_id);
      if(duplicateCheck.error)throw duplicateCheck.error;
      const normalizedName=data.name.toLowerCase();
      const duplicate=(duplicateCheck.data||[]).some(p=>String(p.name||'').trim().toLowerCase()===normalizedName);
      if(duplicate){toast('يوجد منتج بنفس الاسم بالفعل');return;}
      const r=await db.from('products').insert(data);
      if(r.error){
        if(r.error.code==='23505'){toast('يوجد منتج بنفس الاسم بالفعل');return;}
        throw r.error;
      }
    }
    await loadSupabase();
    const saved=id?store.products.find(x=>x.id===id):store.products.find(x=>x.name===data.name&&Number(x.price)===data.price);
    if(id&&(!saved||saved.name!==data.name||Number(saved.price)!==data.price))throw new Error('لم يتم تأكيد حفظ التعديل من قاعدة البيانات');
    closeProductEditor();
    await renderAdmin();
    toast('تم حفظ المنتج بنجاح');
  }catch(e){console.error('saveProduct',e);toast('تعذر حفظ المنتج: '+(e?.message||'خطأ غير معروف'))}
  finally{if(btn){btn.disabled=false;btn.textContent='حفظ';btn.style.opacity=''}}
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
