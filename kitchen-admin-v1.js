(function(){
  'use strict';
  if(window.__ROS_KITCHEN_ADMIN_V1__) return;
  window.__ROS_KITCHEN_ADMIN_V1__=true;

  const PIN='1234';
  let orders=[];
  let pollTimer=0;
  let busy=false;

  const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const money=n=>`${Number(n||0).toFixed(0)} ${window.APP_CONFIG?.currency||'جنيه'}`;
  const kitchenStatus=o=>{const s=String(o?.kitchen_status||'').toLowerCase();if(s==='cooking')return'preparing';if(s==='new'||!s)return'received';return['received','preparing','ready'].includes(s)?s:'received';};
  const statusMeta={
    received:{label:'جديد',desc:'في انتظار بدء التنفيذ',cls:'ka-received'},
    preparing:{label:'قيد التنفيذ',desc:'يتم تحضير الطلب الآن',cls:'ka-preparing'},
    ready:{label:'تم التجهيز',desc:'الطلب جاهز',cls:'ka-ready'}
  };

  function apiBase(){
    const url=String(window.APP_CONFIG?.supabaseUrl||'').replace(/\/$/,'');
    return url+'/functions/v1/kitchen-api';
  }
  async function api(body){
    const key=window.APP_CONFIG?.supabaseAnonKey;
    const r=await fetch(apiBase(),{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':`Bearer ${key}`,'x-kitchen-pin':PIN},body:JSON.stringify(body)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data?.error)throw new Error(data?.error||data?.message||`HTTP ${r.status}`);
    return data;
  }
  async function load(){
    if(!window.APP_CONFIG?.supabaseUrl||!window.APP_CONFIG?.supabaseAnonKey)return;
    try{
      const key=window.APP_CONFIG.supabaseAnonKey;
      const r=await fetch(apiBase(),{headers:{'apikey':key,'Authorization':`Bearer ${key}`,'x-kitchen-pin':PIN},cache:'no-store'});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||data?.error)throw new Error(data?.error||data?.message||`HTTP ${r.status}`);
      orders=Array.isArray(data)?data:(data.orders||data.data||[]);
      renderBoard();
    }catch(e){
      console.error('kitchen admin load',e);
      const el=document.getElementById('ka-board');
      if(el)el.innerHTML=`<div class="ka-error">تعذر تحميل أوامر المطبخ حاليًا. ${esc(e.message||'خطأ غير معروف')}</div>`;
    }
  }

  function normalizeItems(o){
    let x=o?.items;
    if(typeof x==='string'){try{x=JSON.parse(x)}catch(_){x=[]}}
    if(!Array.isArray(x))x=o?.order_items||o?.orderItems||[];
    return Array.isArray(x)?x:[];
  }
  function itemText(i){
    const name=i?.name||i?.product_name||i?.title||'صنف';
    const qty=i?.quantity??i?.qty??1;
    const mods=i?.modifiers||i?.options;
    let extra='';
    if(Array.isArray(mods)&&mods.length)extra=' • '+mods.map(m=>m?.name||m).join('، ');
    return `${esc(name)}${extra} <b>× ${esc(qty)}</b>`;
  }
  function orderCard(o){
    const s=kitchenStatus(o),m=statusMeta[s]||statusMeta.received,items=normalizeItems(o);
    const id=String(o.id||'');
    const created=o.created_at?new Date(o.created_at):null;
    const age=created&&!isNaN(created)?created.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}):'—';
    const type=String(o.order_type||o.type||'').toLowerCase();
    const typeLabel=type.includes('dine')||o.table_number?'داخل المطعم':type.includes('delivery')||o.address?'توصيل':'طلب خارجي';
    const customer=o.customer_name||o.name||'عميل';
    const table=o.table_number||o.table||'';
    const total=o.total??o.total_amount??o.amount??0;
    let next='';
    if(s==='received')next=`<button class="ka-btn ka-btn-primary" onclick="window.ROS_KITCHEN_ADMIN.setStatus('${esc(id)}','preparing',this)">بدء التنفيذ</button>`;
    else if(s==='preparing')next=`<button class="ka-btn ka-btn-success" onclick="window.ROS_KITCHEN_ADMIN.setStatus('${esc(id)}','ready',this)">تم التجهيز</button>`;
    else next=`<div class="ka-ready-note">✓ جاهز — بانتظار الإجراء التالي</div>`;
    return `<article class="ka-card ${m.cls}">
      <div class="ka-card-head"><div><div class="ka-order-no">طلب #${esc(id.slice(0,8))}</div><div class="ka-time">${age}</div></div><span class="ka-badge">${m.label}</span></div>
      <div class="ka-customer"><b>${esc(customer)}</b><span>${esc(typeLabel)}${table?' • طاولة '+esc(table):''}</span></div>
      <div class="ka-items">${items.length?items.map(itemText).map(x=>`<div class="ka-item">${x}</div>`).join(''):'<div class="ka-item">تفاصيل الأصناف غير متاحة</div>'}</div>
      ${o.notes||o.customer_note||o.notes_text?`<div class="ka-note"><b>ملاحظة:</b> ${esc(o.notes||o.customer_note||o.notes_text)}</div>`:''}
      <div class="ka-card-foot"><strong>${money(total)}</strong>${next}</div>
    </article>`;
  }

  function renderBoard(){
    const board=document.getElementById('ka-board');if(!board)return;
    const active=orders.filter(o=>{const s=String(o.status||'').toLowerCase();return !['cancelled','canceled','delivered'].includes(s)});
    const groups={received:[],preparing:[],ready:[]};
    active.forEach(o=>groups[kitchenStatus(o)].push(o));
    document.getElementById('ka-count').textContent=active.length;
    document.getElementById('ka-received-count').textContent=groups.received.length;
    document.getElementById('ka-preparing-count').textContent=groups.preparing.length;
    document.getElementById('ka-ready-count').textContent=groups.ready.length;
    board.innerHTML=['received','preparing','ready'].map(s=>`<section class="ka-column"><div class="ka-column-head"><div><h3>${statusMeta[s].label}</h3><small>${statusMeta[s].desc}</small></div><span>${groups[s].length}</span></div>${groups[s].length?groups[s].map(orderCard).join(''):`<div class="ka-empty">لا توجد طلبات</div>`}</section>`).join('');
  }

  async function setStatus(id,status,btn){
    if(busy)return;
    busy=true;if(btn){btn.disabled=true;btn.textContent='جارٍ التحديث...';}
    try{await api({action:'update_status',order_id:id,new_status:status});await load();if(typeof window.toast==='function')window.toast(status==='ready'?'تم تجهيز الطلب':'تم بدء تنفيذ الطلب');}
    catch(e){alert(e.message||'تعذر تحديث حالة المطبخ');if(btn){btn.disabled=false;btn.textContent=status==='ready'?'تم التجهيز':'بدء التنفيذ';}}
    finally{busy=false;}
  }

  function inject(){
    if(document.getElementById('ka-launcher'))return;
    const style=document.createElement('style');
    style.id='ka-style';style.textContent=`
      #ka-launcher{position:fixed;right:18px;bottom:18px;z-index:9990;border:1px solid #ffffff20;background:#17191df5;color:#f6f1e7;border-radius:18px;padding:13px 17px;font:800 14px Cairo,Arial;box-shadow:0 15px 45px #0008;cursor:pointer;backdrop-filter:blur(12px)}
      #ka-launcher .ka-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#D4AF37;margin-left:7px;box-shadow:0 0 12px #D4AF37}
      #ka-panel{position:fixed;inset:0;z-index:9989;background:#0d0e10f7;color:#f6f1e7;display:none;overflow:auto;font-family:Cairo,Arial,sans-serif}
      #ka-panel.open{display:block}.ka-wrap{max-width:1500px;margin:auto;padding:24px}.ka-top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}.ka-title h2{margin:0;font-size:30px;font-weight:900}.ka-title p{margin:4px 0 0;color:#aaa39a}.ka-close{border:1px solid #ffffff20;background:#202329;color:#fff;border-radius:14px;padding:10px 15px;font-weight:800;cursor:pointer}.ka-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}.ka-stat{background:#17191d;border:1px solid #ffffff12;border-radius:18px;padding:15px}.ka-stat b{font-size:25px}.ka-stat span{display:block;color:#aaa39a;font-size:12px}.ka-board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}.ka-column{background:#121418;border:1px solid #ffffff12;border-radius:22px;padding:13px;min-height:220px}.ka-column-head{display:flex;justify-content:space-between;align-items:center;padding:5px 5px 13px}.ka-column-head h3{margin:0;font-size:18px;font-weight:900}.ka-column-head small{color:#999;font-size:11px}.ka-column-head>span{min-width:32px;text-align:center;border-radius:10px;padding:5px 8px;background:#202329;font-weight:900}.ka-card{background:#17191d;border:1px solid #ffffff12;border-radius:18px;padding:15px;margin-bottom:12px;box-shadow:0 10px 30px #0003}.ka-card-head,.ka-customer,.ka-card-foot{display:flex;justify-content:space-between;gap:10px;align-items:center}.ka-order-no{font-weight:900;font-size:17px}.ka-time{color:#999;font-size:11px;margin-top:2px}.ka-badge{padding:6px 10px;border-radius:999px;background:#202329;font-size:11px;font-weight:900}.ka-customer{margin-top:13px;padding:10px;border-radius:12px;background:#202329}.ka-customer span{color:#aaa39a;font-size:11px}.ka-items{margin:12px 0}.ka-item{padding:8px 0;border-bottom:1px solid #ffffff0d;font-size:13px;line-height:1.7}.ka-note{margin:10px 0;padding:10px;border-radius:12px;background:#241d0e;color:#e5d4a0;font-size:12px}.ka-card-foot{margin-top:14px}.ka-card-foot strong{font-size:16px}.ka-btn{border:0;border-radius:13px;padding:11px 15px;font:900 12px Cairo;cursor:pointer}.ka-btn:disabled{opacity:.6;cursor:wait}.ka-btn-primary{background:#d4af37;color:#111}.ka-btn-success{background:#4ade80;color:#07130a}.ka-ready-note{color:#80e49c;font-weight:900;font-size:12px}.ka-empty{color:#777;text-align:center;padding:35px 10px}.ka-error{background:#3a1515;border:1px solid #7d2a2a;padding:16px;border-radius:16px;color:#ffd5d5}.ka-received{border-top:3px solid #d4af37}.ka-preparing{border-top:3px solid #f59e0b}.ka-ready{border-top:3px solid #4ade80}
      @media(max-width:900px){.ka-board{grid-template-columns:1fr}.ka-stats{grid-template-columns:repeat(3,1fr)}}@media(max-width:520px){.ka-wrap{padding:14px}.ka-title h2{font-size:24px}.ka-stats{gap:7px}.ka-stat{padding:11px}.ka-stat b{font-size:20px}.ka-top{align-items:flex-start}}
    `;document.head.appendChild(style);
    const launcher=document.createElement('button');launcher.id='ka-launcher';launcher.innerHTML='<span class="ka-dot"></span>المطبخ <span id="ka-count">0</span>';launcher.onclick=()=>open();document.body.appendChild(launcher);
    const panel=document.createElement('div');panel.id='ka-panel';panel.innerHTML=`<div class="ka-wrap"><div class="ka-top"><div class="ka-title"><h2>المطبخ</h2><p>مركز التحكم في أوامر المطبخ — داخلي للإدارة فقط</p></div><button class="ka-close" onclick="window.ROS_KITCHEN_ADMIN.close()">إغلاق</button></div><div class="ka-stats"><div class="ka-stat"><b id="ka-received-count">0</b><span>طلبات جديدة</span></div><div class="ka-stat"><b id="ka-preparing-count">0</b><span>قيد التنفيذ</span></div><div class="ka-stat"><b id="ka-ready-count">0</b><span>تم التجهيز</span></div></div><div id="ka-board" class="ka-board"></div></div>`;document.body.appendChild(panel);
  }
  function open(){inject();document.getElementById('ka-panel').classList.add('open');load();clearInterval(pollTimer);pollTimer=setInterval(load,15000)}
  function close(){document.getElementById('ka-panel')?.classList.remove('open');clearInterval(pollTimer);pollTimer=0}
  window.ROS_KITCHEN_ADMIN={open,close,setStatus,load};

  const original=window.renderAdmin;
  window.renderAdmin=async function(){
    let r;try{if(typeof original==='function')r=await original()}catch(e){console.error(e);throw e}
    inject();
    return r;
  };
  window.addEventListener('hashchange',()=>{if(location.hash==='#admin'||location.hash.startsWith('#admin/'))setTimeout(inject,100)});
  if(location.hash==='#admin'||location.hash.startsWith('#admin/'))setTimeout(inject,200);
})();