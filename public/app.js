(async function(){
  try {
    const url='https://cdn.jsdelivr.net/gh/wahedelfar/Restaurant-OS-V2@main/app.js';
    const res=await fetch(url,{cache:'no-store'});
    if(!res.ok) throw new Error('تعذر تحميل محرك الموقع');
    const code=await res.text();
    (0,eval)(code);
  } catch(e) {
    console.error('ROS legacy app loader failed',e);
    const el=document.getElementById('app');
    if(el) el.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f6f3;font-family:Cairo,Arial,sans-serif;direction:rtl"><div style="max-width:520px;background:#fff;border-radius:24px;padding:28px;text-align:center;box-shadow:0 10px 40px #0001"><h1 style="font-size:26px;font-weight:800;margin:0 0 10px">تعذر تشغيل الموقع</h1><p style="color:#666;line-height:1.8;margin:0">تعذر تحميل ملفات الموقع الأساسية. أعد المحاولة.</p><button onclick="location.reload()" style="margin-top:18px;background:#111;color:#fff;border:0;border-radius:14px;padding:12px 22px;font-weight:700">إعادة المحاولة</button></div></main>';
  }
})();
