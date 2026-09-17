(function(){
  'use strict';
  if(window.__ROS_TRACKING_RESILIENCE_V1__) return;
  window.__ROS_TRACKING_RESILIENCE_V1__=true;

  const esc=v=>typeof window.esc==='function'?window.esc(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>typeof window.money==='function'?window.money(v):`${Number(v||0).toFixed(0)} جنيه`;
  const labels={new:'تم استلام الطلب',confirmed:'تم تأكيد الطلب',preparing:'جاري تجهيز الطلب',ready:'الطلب جاهز',assigned:'تم تعيين المندوب',accepted:'المندوب قبل الطلب',picked_up:'المندوب استلم الطلب',out_for_delivery:'الطلب في الطريق إليك',delivered:'تم تسليم الطلب'};
  let activeToken=null;
  let timer=null;

  function tokenFromHash(){
    const h=location.hash||'';
    return h.startsWith('#track/')?decodeURIComponent(h.slice(7)):null;
  }

  async function waitForDb(){
    for(let i=0;i<40;i++){
      if(window.db&&typeof window.db.rpc==='function') return true;
      await new Promise(r=>setTimeout(r,100));
    }
    return false;
  }

  async function load(token,attempt){
    if(token!==tokenFromHash()) return;
    const box=document.querySelector('#trackBox')||document.querySelector('#rosTrackBox');
    if(!box) return;
    const ready=await waitForDb();
    if(!ready) return;
    const r=await db.rpc('public_track_order',{p_token:token});
    if(token!==tokenFromHash()) return;
    if(r.error){
      if(attempt<8){setTimeout(()=>load(token,attempt+1),500);return;}
      box.innerHTML=`<div class="p-5 rounded-2xl bg-red-500/10">تعذر تحميل حالة الطلب: ${esc(r.error.message)}</div>`;
      return;
    }
    const x=Array.isArray(r.data)?r.data[0]:r.data;
    if(!x){
      if(attempt<12){
        box.innerHTML='<div class="p-5 rounded-2xl" style="background:var(--surface2)">جارٍ تأكيد استلام الطلب...</div>';
        setTimeout(()=>load(token,attempt+1),500);
        return;
      }
      box.innerHTML='<div class="p-5 rounded-2xl bg-red-500/10">رابط التتبع غير صالح أو الطلب غير موجود.</div>';
      return;
    }

    const status=String(x.status||'new');
    const state=labels[status]||'تم استلام الطلب';
    const gps=x.latitude!=null&&x.longitude!=null;
    box.innerHTML=`<div class="space-y-4"><div class="rounded-3xl p-6 text-center" style="background:var(--surface2);border:1px solid color-mix(in srgb,var(--brand) 24%,transparent)"><div class="text-5xl mb-3">✓</div><div class="text-2xl font-extrabold">${esc(state)}</div><div class="mt-2 text-sm" style="color:var(--muted)">${status==='new'?'جاري تجهيز طلبك وسيتم تحديث الحالة تلقائيًا.':'سيتم تحديث حالة الطلب والتوصيل تلقائيًا.'}</div></div><div class="rounded-2xl p-4" style="background:var(--surface2)"><div class="text-sm" style="color:var(--muted)">العميل</div><div class="font-bold">${esc(x.customer_name||'عميل')}</div><div class="mt-3 text-sm" style="color:var(--muted)">الإجمالي</div><div class="font-extrabold text-xl">${money(x.total)}</div><div class="mt-3 text-sm" style="color:var(--muted)">حالة الطلب</div><div class="font-bold">${esc(state)}</div>${x.driver_name?`<div class="mt-3 text-sm" style="color:var(--muted)">المندوب</div><div class="font-bold">${esc(x.driver_name)}</div>`:''}${x.driver_phone?`<a href="tel:${esc(x.driver_phone)}" class="inline-block mt-2 font-bold" style="color:var(--brand)">${esc(x.driver_phone)}</a>`:''}${gps?`<a target="_blank" rel="noopener" href="https://www.google.com/maps?q=${encodeURIComponent(x.latitude+','+x.longitude)}" class="inline-block mt-3 px-4 py-2 rounded-xl border font-bold">فتح موقع المندوب</a>`:''}</div></div>`;

    if(timer) clearTimeout(timer);
    if(!['delivered','cancelled'].includes(status)) timer=setTimeout(()=>load(token,0),5000);
  }

  function run(){
    const token=tokenFromHash();
    if(!token||token===activeToken) return;
    activeToken=token;
    if(timer)clearTimeout(timer);
    setTimeout(()=>load(token,0),100);
  }

  window.addEventListener('hashchange',()=>{activeToken=null;run();});
  setTimeout(run,1200);
})();
