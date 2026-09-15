(function(){
  'use strict';
  if(window.__ROS_ADMIN_PAYMENT_PROOF_V1__)return;
  window.__ROS_ADMIN_PAYMENT_PROOF_V1__=true;

  const esc=v=>typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  let timer=0;

  async function render(){
    if(!location.hash.startsWith('#admin'))return;
    const panel=document.querySelector('#deliveryControlPanel');
    if(!panel||!window.db||!window.store?.restaurant?.id)return;
    let host=document.querySelector('#rosVodafoneProofs');
    if(!host){
      host=document.createElement('section');
      host.id='rosVodafoneProofs';
      host.className='mt-7 rounded-3xl p-5';
      host.style.cssText='background:var(--surface2);border:1px solid color-mix(in srgb,var(--brand) 22%,transparent);';
      panel.appendChild(host);
    }
    const q=await db.from('orders')
      .select('id,customer_name,customer_phone,payment_method,transfer_phone,payment_proof_url,total,created_at,status,order_type')
      .eq('restaurant_id',store.restaurant.id)
      .eq('order_type','delivery')
      .eq('payment_method','vodafone')
      .not('payment_proof_url','is',null)
      .order('created_at',{ascending:false})
      .limit(30);
    if(q.error){console.warn('admin payment proofs',q.error);return}
    const rows=q.data||[];
    host.innerHTML=`<div class="flex items-center justify-between gap-3 mb-4"><div><div class="text-xs font-bold" style="color:var(--muted)">VODAFONE CASH</div><h2 class="text-xl font-extrabold">إثباتات تحويل Vodafone Cash مع الطلبات</h2></div><span class="text-xs font-bold" style="color:var(--muted)">${rows.length} طلب</span></div>${rows.length?`<div class="space-y-3">${rows.map(x=>{const id=String(x.id||''),short=id.slice(0,8),date=x.created_at?new Date(x.created_at).toLocaleString('ar-EG'):'';return `<article class="rounded-2xl p-4" style="background:var(--surface);border:1px solid color-mix(in srgb,var(--text) 9%,transparent)"><div class="flex flex-wrap items-start justify-between gap-3"><div><div class="font-extrabold">${esc(x.customer_name||'عميل')} <span class="text-xs font-bold" style="color:var(--muted)">#${esc(short)}</span></div><div class="text-sm mt-1" style="color:var(--muted)">${esc(x.customer_phone||'')} ${x.transfer_phone?`• المحوّل منه: <span dir="ltr">${esc(x.transfer_phone)}</span>`:''}</div><div class="text-sm mt-1">الإجمالي: <b>${money(x.total)}</b> • الحالة: <b>${esc(x.status||'—')}</b></div>${date?`<div class="text-xs mt-1" style="color:var(--muted)">${esc(date)}</div>`:''}</div><a href="${esc(x.payment_proof_url)}" target="_blank" rel="noopener noreferrer" class="shrink-0 rounded-xl border px-4 py-2 font-extrabold">فتح صورة التحويل</a></div><a href="${esc(x.payment_proof_url)}" target="_blank" rel="noopener noreferrer" class="block mt-4"><img src="${esc(x.payment_proof_url)}" alt="إثبات تحويل Vodafone Cash للطلب #${esc(short)}" loading="lazy" class="w-full max-h-80 object-contain rounded-2xl border" style="background:var(--surface2);border-color:color-mix(in srgb,var(--text) 10%,transparent);" onerror="this.style.display='none'"></a></article>`}).join('')}</div>`:'<div class="rounded-2xl p-5 text-sm" style="color:var(--muted);background:var(--surface)">لا توجد طلبات Vodafone Cash بإثبات تحويل مرفق حاليًا.</div>'}`;
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(()=>render().catch(()=>{}),120)}
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  schedule();
  setInterval(schedule,15000);
})();
