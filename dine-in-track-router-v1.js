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
async function showTableBill(table,guestToken){
  if(!window.db||!table||!guestToken)return;
  const app=document.querySelector('#app');if(!app)return;
  app.innerHTML='<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-4 pb-10"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="text-sm font-bold" style="color:var(--muted)">TABLE BILL</div><h1 class="text-3xl font-extrabold">حساب الطاولة</h1></div><button id="rosBillBack" class="rounded-xl border px-4 py-2 font-bold">رجوع</button></div><div id="rosBillBody" class="mt-6">جارٍ تحميل الحساب...</div></div></div></main>';
  document.getElementById('rosBillBack')?.addEventListener('click',()=>location.hash='menu');
  const host=document.getElementById('rosBillBody');
  try{
    const r=await db.rpc('get_table_bill',{p_restaurant_id:window.store?.restaurant?.id,p_table_number:Number(table),p_guest_token:guestToken});
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
      try{const q=await db.rpc('request_table_bill',{p_restaurant_id:window.store?.restaurant?.id,p_table_number:Number(table),p_guest_token:guestToken});if(q.error)throw q.error;btn.textContent='تم طلب الحساب — الموظف هيجيلك';}
      catch(e){btn.disabled=false;btn.textContent='اطلب الحساب من الموظف';if(window.toast)window.toast(e.message||'تعذر طلب الحساب');}
    });
  }catch(e){host.innerHTML='<div class="rounded-2xl p-5 bg-red-500/10">'+esc(e.message||'تعذر تحميل الحساب')+'</div>'}
}

async function render(token){clear();if(!(await waitDb()))return;const app=document.querySelector('#app');if(!app)return;app.innerHTML='<main class="min-h-screen luxury-page p-4"><div class="max-w-3xl mx-auto pt-4 pb-10"><div class="lux-card rounded-3xl p-5"><div class="flex justify-between items-center gap-3"><div><div class="text-sm font-bold" style="color:var(--muted)">DINE-IN ORDER</div><h1 class="text-3xl font-extrabold">تتبع طلبك</h1></div><button id="rosDineTrackBack" class="rounded-xl border px-4 py-2 font-bold">القائمة</button></div><div id="rosDineTrackBody" class="mt-6">جارٍ تحميل حالة الطلب...</div></div></div></main>';document.getElementById('rosDineTrackBack')?.addEventListener('click',()=>location.hash='menu');const host=document.getElementById('rosDineTrackBody');let currentTableNumber=null;const load=async()=>{const r=await db.rpc('public_track_order_v2',{p_token:token});if(r.error){host.innerHTML='<div class="rounded-2xl p-5 bg-red-500/10">تعذر تحميل حالة الطلب.</div>';return}const x=r.data?.[0];if(!x){host.innerHTML='<div class="rounded-2xl p-5 bg-red-500/10">رابط متابعة الطلب غير صالح.</div>';return}currentTableNumber=x.table_number;if(x.order_type&&x.order_type!=='dine_in'){location.hash='track/'+encodeURIComponent(token);return}const rank={new:0,preparing:1,ready:2,delivered:3}[x.status]??0;const steps=['تم استلام الطلب','جاري التجهيز','طلبك جاهز','شكرًا لاختيارنا'];host.innerHTML=`<div class="rounded-3xl p-5" style="background:var(--surface2)"><div class="grid grid-cols-2 sm:grid-cols-4 gap-3">${steps.map((s,i)=>`<div class="rounded-2xl p-4 border ${i===rank?'ring-2':''}" style="background:${i<=rank?'color-mix(in srgb,var(--brand) 14%,var(--surface2))':'var(--surface2)'};border-color:${i===rank?'var(--brand)':'color-mix(in srgb,var(--text) 9%,transparent)'}"><div class="w-9 h-9 rounded-full grid place-items-center font-extrabold mb-2" style="background:${i<=rank?'var(--brand)':'var(--surface)'};color:${i<=rank?'#111':'var(--muted)'}">${i<rank?'✓':i===rank?'●':'○'}</div><div class="font-extrabold text-sm">${s}</div></div>`).join('')}</div><div class="mt-5 rounded-3xl p-5 border" style="background:var(--surface);border-color:color-mix(in srgb,var(--brand) 24%,transparent)"><div class="text-sm font-bold" style="color:var(--muted)">حالة طلبك الآن</div><div class="text-2xl sm:text-3xl font-extrabold mt-2">${esc(x.admin_message||statusText[x.status]||'تم استلام الطلب')}</div>${x.status==='preparing'&&x.prep_minutes?`<div class="mt-4 rounded-2xl p-4" style="background:color-mix(in srgb,var(--brand) 10%,var(--surface2))"><div class="font-bold">وقت التجهيز</div><div class="text-3xl font-extrabold mt-1">أمامك ${Number(x.prep_minutes)} دقيقة</div></div>`:''}</div><div class="mt-5 grid grid-cols-2 gap-3"><div class="rounded-2xl p-4" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">الطاولة</div><div class="text-2xl font-extrabold mt-1">${esc(x.table_number||'—')}</div></div><div class="rounded-2xl p-4" style="background:var(--surface)"><div class="text-sm" style="color:var(--muted)">الإجمالي</div><div class="text-2xl font-extrabold mt-1">${money(x.total)}</div></div></div><div class="mt-5 rounded-2xl p-4 text-center text-sm" style="background:var(--surface2);color:var(--muted)">سيتم تحديث حالة طلب الصالة تلقائيًا.</div><button id="rosShowTableBill" class="w-full mt-4 py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">عرض حساب الطاولة</button></div>`};await load();document.getElementById('rosShowTableBill')?.addEventListener('click',()=>showTableBill(currentTableNumber,token));timer=setInterval(load,3000)}
function boot(){const t=dineToken();if(t)render(t);else clear()}
async function ensureTableSession(table){
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

document.addEventListener('click',async e=>{const el=e.target?.closest?.('#rosDineSubmitBtn');if(!el)return;const table=typeof tableFromUrl==='function'?tableFromUrl():null;if(!table||!Array.isArray(window.cart)||!window.cart.length)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(window.__ROS_DINE_SUBMIT_BUSY__)return;window.__ROS_DINE_SUBMIT_BUSY__=true;(async()=>{el.disabled=true;el.textContent='جارٍ إرسال الطلب...';try{for(let i=0;i<100&&!window.db;i++)await new Promise(r=>setTimeout(r,100));for(let i=0;i<100&&!window.store?.restaurant?.id;i++)await new Promise(r=>setTimeout(r,100));if(!window.db||!window.store?.restaurant?.id)throw new Error('بيانات المطعم لم تجهز بعد، حاول مرة أخرى');const name=document.querySelector('#cust')?.value.trim()||'عميل';const items=window.cart.map(x=>({product_id:x.id,quantity:Number(x.qty||1)}));const session=await rpcTimeout(ensureTableSession(table),'اختيار حساب الطاولة',20000);if(!session){return}if(!['single','separate'].includes(session.billing_mode))throw new Error('اختار طريقة الحساب أولًا');const guestToken=session.guest_token;if(!guestToken)throw new Error('تعذر إنشاء جلسة العميل');const r=await rpcTimeout(window.db.rpc('create_dine_in_order_with_session',{p_restaurant_id:window.store.restaurant.id,p_table_number:Number(table),p_customer_name:name,p_items:items,p_guest_token:guestToken}),'إرسال الطلب',20000);if(r.error)throw r.error;const row=Array.isArray(r.data)?r.data[0]:r.data;const token=row?.tracking_token;if(!token)throw new Error('لم يتم إنشاء رابط متابعة الطلب');window.cart=[];if(typeof window.updateCart==='function')window.updateCart();const modal=document.querySelector('#modal');if(modal){modal.innerHTML=`<div class="fixed inset-0 modal z-50 p-4 grid place-items-center"><div class="checkout-modal w-full max-w-md rounded-3xl p-6 text-center"><div class="text-5xl mb-3">✓</div><h2 class="text-2xl font-extrabold">تم إرسال طلبك للمطبخ</h2><p class="mt-2" style="color:var(--muted)">الطاولة رقم ${esc(table)}</p><div class="mt-4 rounded-2xl p-4 font-bold" style="background:var(--surface2)">أهلاً بحضرتك في مطعمنا — طلبك وصل للمطبخ.</div><button id="rosDineTrackNow" type="button" class="mt-5 w-full py-4 rounded-2xl font-extrabold" style="background:var(--brand);color:#111">حالة طلبك</button><button type="button" class="mt-3 w-full py-3 rounded-2xl border font-bold" onclick="location.hash='menu'">العودة للقائمة</button></div></div>`;document.getElementById('rosDineTrackNow')?.addEventListener('click',()=>{location.hash='#dine-track/'+encodeURIComponent(token)})}}catch(err){console.error('dine-in-track-router-v1',err);if(typeof window.toast==='function')window.toast('تعذر إرسال الطلب: '+(err?.message||'خطأ غير معروف'));else alert('تعذر إرسال الطلب: '+(err?.message||'خطأ غير معروف'))}finally{el.disabled=false;el.textContent='إتمام الطلب';window.__ROS_DINE_SUBMIT_BUSY__=false}})()},true);
window.addEventListener('hashchange',boot);
const original=window.renderRouter;window.renderRouter=function(){const t=dineToken();if(t)return render(t);return typeof original==='function'?original.apply(this,arguments):undefined};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();