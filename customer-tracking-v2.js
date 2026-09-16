(function(){
'use strict';
if(window.__ROS_CUSTOMER_TRACKING__) return;
window.__ROS_CUSTOMER_TRACKING__ = true;

function getId(){
  try{
    const u = new URL(window.location.href);
    let id = u.searchParams.get('id') || u.searchParams.get('orderId') || '';
    if(!id){
      const h = window.location.hash || '';
      const m = h.match(/id=([^&]+)/);
      if(m) id = m[1];
    }
    if(!id) id = localStorage.getItem('ros_last_order_id') || '';
    return id;
  }catch(e){ return ''; }
}

function showLoading(){
  const box = document.getElementById('rosTrackBox');
  if(!box) return;
  box.innerHTML = '<div style="padding:24px;text-align:center;font-family:Cairo,sans-serif"><div style="font-size:18px;font-weight:700;margin-bottom:12px">تتبع طلبك</div><div style="width:32px;height:32px;border:3px solid #ddd;border-top-color:#000;border-radius:50%;margin:12px auto;animation:spin 1s linear infinite"></div><div>جاري تحميل حالة الطلب...</div><style>@keyframes spin{to{transform:rotate(360deg)}}</style></div>';
}

function showError(msg){
  const box = document.getElementById('rosTrackBox');
  if(!box) return;
  box.innerHTML = '<div style="padding:24px;text-align:center;font-family:Cairo,sans-serif">'+msg+'</div>';
}

async function start(){
  showLoading();
  const id = getId();
  if(!id){
    setTimeout(function(){
      const id2 = getId();
      if(!id2) showError('رابط التتبع غير صالح - برجاء فتح الرابط من رسالة الواتساب');
      else location.reload();
    }, 800);
    return;
  }
  try{ localStorage.setItem('ros_last_order_id', id); }catch(e){}

  // لو عندك supabase جاهز - هيجيب البيانات - لو مش جاهز هيفضل عارض Loading مش شاشة سودة
  let tries = 0;
  async function tryLoad(){
    tries++;
    try{
      if(window.db && window.db.getOrder){
        const order = await window.db.getOrder(id);
        if(order) {
          if(window.renderTrack) window.renderTrack(order);
          return;
        }
      }
    }catch(e){}
    if(tries < 10) setTimeout(tryLoad, 800);
    else showError('جاري تجهيز بيانات الطلب... حاول تحديث الصفحة');
  }
  tryLoad();
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
})();
