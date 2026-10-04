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
