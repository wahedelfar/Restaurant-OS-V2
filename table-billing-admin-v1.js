(function(){
'use strict';
if(window.__ROS_TABLE_BILLING_ADMIN_V1__)return;
window.__ROS_TABLE_BILLING_ADMIN_V1__=true;
let timer=0;
const esc=v=>typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]);
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