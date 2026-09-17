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
    host.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><div style="font-size:21px;font-weight:900">عرض اليوم</div><div style="font-size:12px;color:var(--muted,#A9A39A);margin-top:4px">اختر منتجًا أو أكثر واكتب نص العرض الذي سيظهر للعميل مرة واحدة عند فتح الموقع.</div></div><span id="ros-daily-offer-status"></span></div><div style="margin-top:15px"><label style="display:block;font-weight:800;margin-bottom:7px">المنتجات</label><select id="ros-daily-offer-products" multiple size="7"></select></div><div style="margin-top:13px"><label style="display:block;font-weight:800;margin-bottom:7px">نص العرض</label><textarea id="ros-daily-offer-text" rows="3" placeholder="مثال: خصم 50% أو اشتري واحدة واحصل على الأخرى بنصف الثمن"></textarea></div><div class="ros-offer-actions"><button id="ros-daily-offer-save" type="button">حفظ عرض اليوم</button><button id="ros-daily-offer-disable" type="button">إخفاء العرض</button></div>`;
    app.insertBefore(host,app.firstChild);
    const select=host.querySelector('#ros-daily-offer-products');
    (getStore()?.products||[]).filter(p=>p.available!==false).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar')).forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=`${p.name} — ${money(p.price)}`;if((offer?.product_ids||[]).some(id=>String(id)===String(p.id)))o.selected=true;select.appendChild(o)});
    host.querySelector('#ros-daily-offer-text').value=offer?.offer_text||'';
    const status=host.querySelector('#ros-daily-offer-status');status.textContent=offer?.active?'العرض ظاهر للعملاء':'العرض مخفي';
    host.querySelector('#ros-daily-offer-save').addEventListener('click',async()=>{const ids=[...select.selectedOptions].map(o=>o.value);const text=host.querySelector('#ros-daily-offer-text').value.trim();if(!ids.length)return toast?.('اختر منتجًا واحدًا على الأقل');if(!text)return toast?.('اكتب نص العرض أولًا');const b=host.querySelector('#ros-daily-offer-save');b.disabled=true;try{const client=getDb();const r=await client.from(TABLE).upsert({restaurant_id:RESTAURANT_ID,product_ids:ids,offer_text:text,active:true,updated_at:new Date().toISOString()},{onConflict:'restaurant_id'});if(r.error)throw r.error;status.textContent='العرض ظاهر للعملاء';toast?.('تم حفظ عرض اليوم');sessionStorage.removeItem('ros_daily_offer_seen_v1')}catch(e){console.error('[ROS daily offer] save',e);toast?.('تعذر حفظ العرض: '+(e?.message||'خطأ'))}finally{b.disabled=false}});
    host.querySelector('#ros-daily-offer-disable').addEventListener('click',async()=>{const client=getDb();if(!client)return;const r=await client.from(TABLE).upsert({restaurant_id:RESTAURANT_ID,product_ids:[],offer_text:'',active:false,updated_at:new Date().toISOString()},{onConflict:'restaurant_id'});if(r.error)return toast?.('تعذر إخفاء العرض');status.textContent='العرض مخفي';toast?.('تم إخفاء عرض اليوم')});
  }

  async function boot(){
    style();
    if(!(await waitReady()))return;
    if(isAdmin){
      const offer=await loadOffer();
      const tryInject=()=>{if(document.getElementById('app')?.children.length)adminCard(offer)};
      tryInject();
      const mo=new MutationObserver(()=>adminCard(offer));if(document.body)mo.observe(document.body,{childList:true,subtree:true});
    }else{
      hideOffersCategory();
      const offer=await loadOffer();
      showCustomerOffer(offer);
    }
  }
  boot().catch(e=>console.warn('[ROS daily offer] boot',e));
})();
