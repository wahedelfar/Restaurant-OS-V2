(async function(){
  'use strict';

  const app=document.getElementById('app');
  const VERSION='offline-runtime-v1';
  const RUNTIME_URL='/app.js?v='+VERSION;

  const fail=(e)=>{
    console.error('ROS V2 offline-first loader failed:',e);
    const msg=e&&e.message?e.message:String(e);
    if(app) app.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#f6f6f3;font-family:Cairo,Arial,sans-serif;direction:rtl"><div style="max-width:620px;background:#fff;border-radius:24px;padding:28px;text-align:center;box-shadow:0 10px 40px #0001"><h1 style="font-size:26px;font-weight:800;margin:0 0 10px">تعذر تشغيل الموقع</h1><p style="color:#666;line-height:1.8;margin:0">'+String(msg).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))+'</p><button onclick="location.reload()" style="margin-top:18px;background:#111;color:#fff;border:0;border-radius:14px;padding:12px 22px;font-weight:700">إعادة المحاولة</button></div></main>';
  };

  const readRuntime=async()=>{
    try{
      const r=await fetch(RUNTIME_URL,{cache:'no-store'});
      if(!r.ok)throw new Error('تعذر تحميل محرك الموقع المحلي ('+r.status+')');
      const text=await r.text();
      try{
        const c=await caches.open('ros-offline-runtime-v1');
        await c.put(RUNTIME_URL,new Response(text,{headers:{'Content-Type':'application/javascript; charset=utf-8'}}));
      }catch(_){}
      return text;
    }catch(networkErr){
      const cached=await caches.match(RUNTIME_URL);
      if(cached)return await cached.text();
      throw networkErr;
    }
  };

  try{
    let code=await readRuntime();

    const missingSupabase=
      "if(!window.supabase||typeof window.supabase.createClient!=='function'){"+
      "showFatal('مكتبة Supabase لم يتم تحميلها. افتح الموقع مرة أخرى أو جرّب Chrome.');"+
      "return;"+
      "}";

    const offlineSupabase=
      "if(!window.supabase||typeof window.supabase.createClient!=='function'){"+
      "const snap=await window.ROSOffline?.loadSnapshot?.();"+
      "if(snap){store=snap;renderRouter();return;}"+
      "seed();renderRouter();return;"+
      "}";

    if(code.indexOf(missingSupabase)<0)throw new Error('نسخة app.js المحلية غير متوافقة مع Offline Foundation');
    code=code.replace(missingSupabase,offlineSupabase);

    const onlineFallback="catch(e){console.error(e);seed();toast('تعذر الاتصال بـ Supabase — تم تشغيل نسخة العرض المحلية')}";
    const offlineFallback="catch(e){console.error(e);const snap=await window.ROSOffline?.loadSnapshot?.();if(snap)store=snap;else seed();toast(snap?'تم تشغيل آخر نسخة محفوظة محليًا':'تعذر الاتصال بـ Supabase — تم تشغيل نسخة العرض المحلية')}";
    if(code.indexOf(onlineFallback)>=0)code=code.replace(onlineFallback,offlineFallback);

    const renderLine='    renderRouter();';
    const saveLine='    renderRouter();\n    try{if(window.ROSOffline&&store?.restaurant)await window.ROSOffline.saveSnapshot(store)}catch(_){}';
    if(code.indexOf(renderLine)<0)throw new Error('نقطة حفظ Offline Snapshot غير موجودة في app.js');
    code=code.replace(renderLine,saveLine);

    code=code.replace(/async function init\(\)\{/,'async function __rosInit(){');
    code=code.replace(/\ninit\(\);\s*$/,'\n');

    if(!/async function __rosInit\(\)/.test(code))throw new Error('تعذر تجهيز دالة تشغيل ROS المحلية');

    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      let settled=false;
      const onerr=(ev)=>{
        if(settled)return;
        settled=true;
        window.removeEventListener('error',onerr);
        reject(new Error('خطأ داخل محرك الموقع المحلي: '+(ev.message||'JavaScript error')));
      };
      window.addEventListener('error',onerr);
      s.text=code;
      document.body.appendChild(s);
      setTimeout(()=>{
        if(settled)return;
        settled=true;
        window.removeEventListener('error',onerr);
        resolve();
      },0);
    });

    if(typeof window.__rosInit!=='function')throw new Error('محرك ROS المحلي تم تحميله لكن دالة التشغيل غير متاحة');
    await window.__rosInit();
  }catch(e){
    fail(e);
  }
})();
