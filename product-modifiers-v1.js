(function(){
  'use strict';
  if(window.__ROS_PRODUCT_MODIFIERS_V1__) return;
  window.__ROS_PRODUCT_MODIFIERS_V1__=true;

  const TABLE='product_modifiers';
  const modifierMap=new Map();
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const money=n=>typeof window.money==='function'?window.money(n):`${Number(n||0).toFixed(0)} جنيه`;

  function getDb(){try{return (typeof db!=='undefined'&&db)||window.db||null}catch(_){return window.db||null}}
  function getStore(){try{return (typeof store!=='undefined'&&store)||window.store||null}catch(_){return window.store||null}}

  async function loadModifiers(){
    const client=getDb(), st=getStore();
    if(!client||!st?.products?.length) return false;
    const ids=st.products.map(p=>p.id).filter(Boolean);
    if(!ids.length) return true;
    const r=await client.from(TABLE).select('id,product_id,name,price,is_required,created_at').in('product_id',ids).order('created_at');
    if(r.error){console.warn('Product modifiers load:',r.error);return false}
    modifierMap.clear();
    (r.data||[]).forEach(m=>{
      const key=String(m.product_id);
      if(!modifierMap.has(key))modifierMap.set(key,[]);
      modifierMap.get(key).push({...m,price:Number(m.price)||0});
    });
    return true;
  }

  function sameModifiers(a,b){return JSON.stringify(a||[])===JSON.stringify(b||[])}

  function openModifierModal(product){
    const modifiers=modifierMap.get(String(product.id))||[];
    const modal=$('#modal');
    if(!modal)return;
    if(!modifiers.length){addToCart(product,[]);return}
    const base=Number(product.price)||0;
    modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-end md:place-items-center" id="rosModifierModal">
      <div class="checkout-modal w-full max-w-lg rounded-3xl p-5 max-h-[92vh] overflow-auto" role="dialog" aria-modal="true">
        <div class="flex justify-between items-center gap-3">
          <div><div class="eyebrow">إضافات الطلب</div><h2 class="text-2xl font-extrabold">${esc(product.name)}</h2></div>
          <button type="button" id="rosModifierClose" class="w-10 h-10 rounded-full border text-2xl" aria-label="إغلاق">×</button>
        </div>
        <div class="mt-5 space-y-3" id="rosModifierList">
          ${modifiers.map((m,i)=>`<label class="flex items-center justify-between gap-3 rounded-2xl border p-4 cursor-pointer" style="background:var(--surface2)">
            <span class="flex items-center gap-3 min-w-0"><input type="checkbox" class="ros-modifier-check w-5 h-5" data-index="${i}" data-id="${esc(m.id)}" data-name="${esc(m.name)}" data-price="${m.price}"><span class="font-bold">${esc(m.name)}${m.is_required?' <span style="color:var(--brand)">* مطلوب</span>':''}</span></span>
            <span class="font-extrabold whitespace-nowrap">+${money(m.price)}</span>
          </label>`).join('')}
        </div>
        <div class="mt-5 rounded-2xl p-4 border" style="background:var(--surface)">
          <div class="text-sm" style="color:var(--muted)">السعر الأساسي</div><div class="font-bold">${money(base)}</div>
          <div class="text-sm mt-3" style="color:var(--muted)">الإضافات</div><div id="rosModifierExtrasTotal" class="font-bold">${money(0)}</div>
          <div class="border-t mt-3 pt-3 flex justify-between items-center"><span class="font-extrabold">الإجمالي</span><strong id="rosModifierTotal" class="text-2xl">${money(base)}</strong></div>
        </div>
        <button type="button" id="rosModifierAdd" class="w-full mt-5 py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">إضافة للسلة</button>
      </div></div>`;

    const updateTotal=()=>{
      const selected=[...modal.querySelectorAll('.ros-modifier-check:checked')].map(c=>({id:c.dataset.id,name:c.dataset.name,price:Number(c.dataset.price)||0}));
      const extras=selected.reduce((s,m)=>s+m.price,0);
      $('#rosModifierExtrasTotal').textContent=money(extras);
      $('#rosModifierTotal').textContent=money(base+extras);
    };
    modal.querySelectorAll('.ros-modifier-check').forEach(c=>c.addEventListener('change',updateTotal));
    $('#rosModifierClose')?.addEventListener('click',()=>{modal.innerHTML=''});
    $('#rosModifierAdd')?.addEventListener('click',()=>{
      const selected=[...modal.querySelectorAll('.ros-modifier-check:checked')].map(c=>({id:c.dataset.id,name:c.dataset.name,price:Number(c.dataset.price)||0}));
      const missing=modifiers.some((m,i)=>m.is_required&&!modal.querySelector(`.ros-modifier-check[data-index="${i}"]`)?.checked);
      if(missing){if(typeof toast==='function')toast('يرجى اختيار الإضافات المطلوبة');return}
      addToCart(product,selected);
      modal.innerHTML='';
    });
  }

  function addToCart(product,selected){
    const base=Number(product.price)||0;
    const extras=selected.reduce((s,m)=>s+(Number(m.price)||0),0);
    const finalPrice=base+extras;
    const modifiers=selected.map(m=>({id:m.id,name:m.name,price:Number(m.price)||0}));
    let item=(Array.isArray(cart)?cart:[]).find(x=>x.id===product.id&&sameModifiers(x.modifiers,modifiers));
    if(item){item.qty=(Number(item.qty)||0)+1;item.price=finalPrice;item.base_price=base;item.modifiers=modifiers}
    else if(Array.isArray(cart))cart.push({id:product.id,name:product.name,price:finalPrice,base_price:base,qty:1,modifiers});
    if(typeof updateCart==='function')updateCart();
    if(typeof toast==='function')toast(modifiers.length?'تمت إضافة المنتج والإضافات':'تمت إضافة المنتج');
  }

  function productFromButton(btn){
    const card=btn.closest('.product-card-lux');
    if(!card)return null;
    const img=card.querySelector('img');
    const name=card.querySelector('.font-extrabold.text-lg')?.textContent?.trim()||img?.alt||'';
    const p=(getStore()?.products||[]).find(x=>String(x.name).trim()===name);
    if(p)return p;
    const onclick=btn.getAttribute('onclick')||'';
    const m=onclick.match(/add\(['\"]([^'\"]+)['\"]\)/);
    return m?(getStore()?.products||[]).find(x=>String(x.id)===m[1]):null;
  }

  function injectAdminSection(){
    const save=$('#saveProductBtn'), modal=$('#modal');
    if(!save||!modal)return;
    const productId=save.dataset.productId||'';
    let section=$('#rosModifiersEditor');
    if(section)return;
    const price=$('#pp');
    if(!price)return;
    section=document.createElement('section');
    section.id='rosModifiersEditor';
    section.className='rounded-2xl border p-4 mt-2';
    section.style.cssText='background:var(--surface2);border-color:color-mix(in srgb,var(--brand) 18%,transparent)';
    section.innerHTML=`<div class="flex items-center justify-between gap-3"><div><div class="font-extrabold text-lg">الإضافات</div><div class="text-xs mt-1" style="color:var(--muted)">${productId?'إضافات اختيارية أو مطلوبة لهذا المنتج':'احفظ المنتج أولًا ثم أضف الإضافات'}</div></div><button type="button" id="rosAddModifier" class="rounded-xl border px-4 py-2 font-extrabold" ${productId?'':'disabled'}>إضافة extra</button></div><div id="rosModifierRows" class="mt-4 space-y-2"></div>${productId?'<button type="button" id="rosSaveModifiers" class="w-full mt-4 py-3 rounded-xl font-extrabold" style="background:var(--brand);color:#111">حفظ الإضافات</button>':''}`;
    price.parentElement?.insertAdjacentElement('afterend',section);
    if(!productId)return;

    const renderRows=(rows)=>{
      const wrap=$('#rosModifierRows');
      wrap.innerHTML=(rows||[]).map(m=>`<div class="ros-mod-row grid grid-cols-[1fr_110px_auto] gap-2 items-center" data-existing-id="${esc(m.id||'')}"><input class="ros-mod-name border rounded-xl p-3" value="${esc(m.name)}" placeholder="اسم الإضافة"><input class="ros-mod-price border rounded-xl p-3" type="number" min="0" step="1" value="${Number(m.price)||0}" placeholder="السعر"><button type="button" class="ros-del-mod rounded-xl border px-3 py-3 font-bold">حذف</button></div>`).join('')||'<div class="text-sm" style="color:var(--muted)">لا توجد إضافات لهذا المنتج.</div>';
    };
    renderRows(modifierMap.get(String(productId))||[]);
    $('#rosAddModifier')?.addEventListener('click',()=>{
      const wrap=$('#rosModifierRows');
      if(wrap.querySelector('.text-sm'))wrap.innerHTML='';
      const row=document.createElement('div');
      row.className='ros-mod-row grid grid-cols-[1fr_110px_auto] gap-2 items-center';
      row.innerHTML='<input class="ros-mod-name border rounded-xl p-3" placeholder="اسم الإضافة"><input class="ros-mod-price border rounded-xl p-3" type="number" min="0" step="1" placeholder="السعر"><button type="button" class="ros-del-mod rounded-xl border px-3 py-3 font-bold">حذف</button>';
      wrap.appendChild(row);
      row.querySelector('.ros-mod-name')?.focus();
    });
    section.addEventListener('click',e=>{
      if(e.target.closest('.ros-del-mod')){e.target.closest('.ros-mod-row')?.remove();if(!$('#rosModifierRows .ros-mod-row'))$('#rosModifierRows').innerHTML='<div class="text-sm" style="color:var(--muted)">لا توجد إضافات لهذا المنتج.</div>'}
    });
    $('#rosSaveModifiers')?.addEventListener('click',async()=>{
      const client=getDb();
      if(!client)return;
      const rows=[...document.querySelectorAll('#rosModifierRows .ros-mod-row')].map(r=>({id:r.dataset.existingId||null,name:r.querySelector('.ros-mod-name')?.value.trim()||'',price:Number(r.querySelector('.ros-mod-price')?.value||0)}));
      if(rows.some(x=>!x.name||!Number.isFinite(x.price)||x.price<0)){if(typeof toast==='function')toast('أدخل اسم وسعر كل إضافة بشكل صحيح');return}
      const b=$('#rosSaveModifiers');if(b){b.disabled=true;b.textContent='جارٍ حفظ الإضافات...'}
      try{
        const old=modifierMap.get(String(productId))||[];
        const keep=rows.filter(x=>x.id).map(x=>x.id);
        const removeIds=old.map(x=>x.id).filter(id=>!keep.includes(id));
        if(removeIds.length){const d=await client.from(TABLE).delete().in('id',removeIds);if(d.error)throw d.error}
        const updates=rows.filter(x=>x.id).map(x=>client.from(TABLE).update({name:x.name,price:x.price}).eq('id',x.id).eq('product_id',productId));
        const ur=await Promise.all(updates);const ue=ur.find(x=>x.error);if(ue?.error)throw ue.error;
        const inserts=rows.filter(x=>!x.id).map(x=>({product_id:productId,name:x.name,price:x.price,is_required:false}));
        if(inserts.length){const ins=await client.from(TABLE).insert(inserts);if(ins.error)throw ins.error}
        await loadModifiers();
        renderRows(modifierMap.get(String(productId))||[]);
        if(typeof toast==='function')toast('تم حفظ الإضافات');
      }catch(err){console.error('save modifiers',err);if(typeof toast==='function')toast('تعذر حفظ الإضافات: '+(err?.message||'خطأ غير معروف'))}
      finally{if(b){b.disabled=false;b.textContent='حفظ الإضافات'}}
    });
  }

  window.addEventListener('click',function(e){
    const card=e.target?.closest?.('.product-card-lux');
    if(!card)return;
    const btn=card.querySelector('.add-btn');
    const p=btn&&productFromButton(btn);
    if(!p)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openModifierModal(p);
  },true);

  const observer=new MutationObserver(()=>{injectAdminSection()});
  observer.observe(document.body,{childList:true,subtree:true});

  let tries=0;
  const boot=async()=>{
    const st=getStore();
    if(st?.products?.length){
      await loadModifiers();
      injectAdminSection();
      return true;
    }
    return false;
  };
  const timer=setInterval(async()=>{try{if(await boot()||++tries>120)clearInterval(timer)}catch(e){console.warn('modifiers boot',e)}},250);
  boot().catch(console.warn);
})();
