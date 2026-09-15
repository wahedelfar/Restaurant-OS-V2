(function(){
'use strict';
if(window.__ROS_ADMIN_DRIVERS_DOCK_BRIDGE_V1__)return;
window.__ROS_ADMIN_DRIVERS_DOCK_BRIDGE_V1__=true;
const URL='https://znnnkoujfuweydvbkejh.supabase.co';
const KEY='sb_publishable_gjYA4-E-BL0X1hc3yugqyQ_1VaOo_se';
let client=null,restaurantId=null;
function getClient(){if(!client)client=supabase.createClient(URL,KEY);return client}
async function restoreSession(c){
  const s=await c.auth.getSession();
  if(s.data?.session)return true;
  try{
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('sb-')&&k.includes('-auth-token'));
    for(const k of keys){
      const raw=localStorage.getItem(k);if(!raw)continue;
      const v=JSON.parse(raw);const session=v?.currentSession||v;
      if(session?.access_token&&session?.refresh_token){
        const r=await c.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
        if(!r.error)return true;
      }
    }
  }catch(e){console.error('[ROS auth restore]',e)}
  return false;
}
function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}
function toastMsg(m){if(typeof toast==='function')toast(m);else alert(m)}
function ensureModal(){
 let m=document.getElementById('ros-drivers-auth-management-modal');
 if(m)return m;
 m=document.createElement('div');m.id='ros-drivers-auth-management-modal';
 m.innerHTML='<div style="width:min(920px,100%);max-height:88vh;overflow:auto;background:linear-gradient(145deg,var(--surface,#17191d),var(--surface2,#202329));border:1px solid #D4AF3740;border-radius:28px;color:var(--text,#f6f1e7);box-shadow:0 30px 100px #000c"><div style="position:sticky;top:0;padding:18px 20px;background:#17191dee;backdrop-filter:blur(12px);border-bottom:1px solid #fff1;display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:21px;font-weight:900">إدارة المندوبين</div><div style="font-size:12px;color:var(--muted)">إدارة كاملة للمندوبين</div></div><button id="ros-dm-auth-close" style="width:42px;height:42px;border-radius:13px;border:1px solid #fff2;background:#ffffff08;color:inherit;font-size:20px">×</button></div><div id="ros-dm-auth-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px;padding:18px"></div></div>';
 Object.assign(m.style,{position:'fixed',inset:'0',zIndex:'2147483640',background:'#000b',backdropFilter:'blur(8px)',display:'none',alignItems:'center',justifyContent:'center',padding:'18px',fontFamily:'Cairo,Arial,sans-serif'});
 m.addEventListener('click',e=>{if(e.target===m)close()});document.body.appendChild(m);m.querySelector('#ros-dm-auth-close').onclick=close;return m;
}
function close(){const m=document.getElementById('ros-drivers-auth-management-modal');if(m)m.style.display='none'}
function driverUrl(token){return location.origin+'/#driver/'+encodeURIComponent(token)}
async function rid(){if(restaurantId)return restaurantId;const c=getClient();const r=await c.from('restaurants').select('id').eq('slug',window.APP_CONFIG?.restaurantSlug||'pizza-burger').maybeSingle();if(r.error)throw r.error;if(!r.data?.id)throw new Error('restaurant_not_found');restaurantId=r.data.id;return restaurantId}
async function open(){const m=ensureModal();m.style.display='flex';const g=m.querySelector('#ros-dm-auth-grid');g.innerHTML='<div style="padding:45px;text-align:center;color:var(--muted)">جارٍ التحقق من جلسة الإدارة وتحميل المندوبين...</div>';const c=getClient();if(!await restoreSession(c)){g.innerHTML='<div style="padding:45px;text-align:center;color:var(--muted)">جلسة الإدارة غير متاحة. أغلق النافذة وسجّل الدخول إلى لوحة الإدارة ثم أعد فتح المندوبين.</div>';return}try{const id=await rid();const r=await c.rpc('admin_list_drivers',{p_restaurant_id:id});if(r.error)throw r.error;const rows=r.data||[];if(!rows.length){g.innerHTML='<div style="padding:45px;text-align:center;color:var(--muted)">لا يوجد مندوبون حاليًا.</div>';return}g.innerHTML='';rows.forEach(d=>{const card=document.createElement('div');card.style.cssText='border:1px solid #fff1;background:#ffffff06;border-radius:22px;padding:15px';const photo=d.photo_url?`<img src="${esc(d.photo_url)}" style="width:58px;height:58px;border-radius:18px;object-fit:cover">`:'<div style="width:58px;height:58px;border-radius:18px;display:grid;place-items:center;background:#ffffff0d;font-size:24px">🏍️</div>';card.innerHTML=`<div style="display:flex;align-items:center;gap:12px">${photo}<div><div style="font-weight:900;font-size:17px">${esc(d.name||'مندوب')}</div><div style="color:var(--muted);font-size:13px">${esc(d.phone||'بدون رقم')}</div><div style="margin-top:4px;font-size:12px;color:${d.active?'#55d88a':'#ff7777'}">● ${d.active?'نشط':'متوقف'}</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px"><button data-a="page">لوحة المندوب</button><button data-a="copy">نسخ الرابط</button><button data-a="toggle">${d.active?'إيقاف المندوب':'تفعيل المندوب'}</button><button data-a="delete" style="color:#ff7777">حذف المندوب</button></div>`;card.querySelectorAll('button').forEach(b=>{b.style.cssText+=';min-height:42px;border-radius:13px;border:1px solid #fff2;background:#ffffff08;color:inherit;font-weight:800;cursor:pointer'});card.querySelector('[data-a="page"]').onclick=()=>window.open(driverUrl(d.access_token),'_blank','noopener');card.querySelector('[data-a="copy"]').onclick=async()=>{try{await navigator.clipboard.writeText(driverUrl(d.access_token));toastMsg('تم نسخ رابط لوحة المندوب')}catch{toastMsg(driverUrl(d.access_token))}};card.querySelector('[data-a="toggle"]').onclick=async()=>{if(!confirm(d.active?'هل تريد إيقاف المندوب؟':'هل تريد تفعيل المندوب؟'))return;const x=await c.rpc('admin_update_driver',{p_restaurant_id:id,p_driver_id:d.id,p_active:!d.active});if(x.error)return toastMsg(x.error.message);toastMsg(d.active?'تم إيقاف المندوب':'تم تفعيل المندوب');open()};card.querySelector('[data-a="delete"]').onclick=async()=>{if(!confirm('هل أنت متأكد من حذف المندوب؟'))return;const x=await c.rpc('admin_delete_driver',{p_driver_id:d.id});if(x.error)return toastMsg(x.error.message==='driver_has_active_delivery'?'لا يمكن حذف المندوب لأنه مرتبط بطلب دليفري نشط.':x.error.message);toastMsg('تم حذف المندوب');open()};g.appendChild(card)})}catch(e){console.error('[ROS drivers auth]',e);g.innerHTML='<div style="padding:45px;text-align:center;color:var(--muted)">تعذر تحميل المندوبين: '+esc(e?.message||'خطأ غير معروف')+'</div>'}}
window.openDriversManagement=open;
document.addEventListener('click',function(e){const b=e.target?.closest?.('#ros-admin-action-dock [data-target="ros-drivers-management"]');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open()},true);
})();
