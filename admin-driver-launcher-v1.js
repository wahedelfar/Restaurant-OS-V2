(function(){
  'use strict';
  if(window.__ROS_ADMIN_DRIVER_LAUNCHER_V1__)return;
  window.__ROS_ADMIN_DRIVER_LAUNCHER_V1__=true;

  function esc(v){return typeof window.esc==='function'?window.esc(v==null?'':String(v)):String(v==null?'':v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));}
  function notify(msg){try{typeof toast==='function'?toast(msg):alert(msg)}catch(_){alert(msg)}}
  function getDb(){try{if(window.__ROS_DRIVER_DB__)return window.__ROS_DRIVER_DB__;const c=window.APP_CONFIG||{};if(window.supabase?.createClient&&c.supabaseUrl&&c.supabaseAnonKey)return window.__ROS_DRIVER_DB__=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey);return window.db||null}catch(_){return null}}

  function css(){
    if(document.getElementById('ros-driver-launcher-style'))return;
    const s=document.createElement('style');s.id='ros-driver-launcher-style';s.textContent=`
      #ros-driver-launcher{position:fixed;right:150px;bottom:76px;z-index:9988;border:1px solid #ffffff20;background:#17191df5;color:#f6f1e7;border-radius:18px;padding:13px 17px;min-width:118px;height:46px;font:800 14px Cairo,Arial;box-shadow:0 15px 45px #0008;cursor:pointer;backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;gap:7px}
      #ros-driver-panel{position:fixed;inset:0;z-index:9992;background:#0d0e10f7;backdrop-filter:blur(14px);display:none;overflow:auto;font-family:Cairo,Arial;color:var(--text)}
      #ros-driver-panel.open{display:block}
      .rd-wrap{max-width:560px;margin:0 auto;padding:24px}.rd-card{background:linear-gradient(145deg,var(--surface),var(--surface2));border:1px solid color-mix(in srgb,var(--brand) 20%,transparent);border-radius:24px;padding:22px;box-shadow:0 24px 70px #0008}.rd-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}.rd-head h2{margin:0;font-size:26px;font-weight:900}.rd-close{width:44px;height:44px;border-radius:14px;border:1px solid #ffffff18;background:var(--surface2);color:var(--text);font-size:24px;cursor:pointer}.rd-label{display:block;font-size:13px;font-weight:800;margin:0 0 7px}.rd-field{width:100%;min-height:50px;border-radius:15px!important}.rd-photo{border:1px dashed #ffffff25;padding:12px!important;background:var(--surface)!important}.rd-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.rd-btn{min-height:48px;border-radius:14px;border:1px solid #ffffff18;font:800 14px Cairo;cursor:pointer}.rd-btn.primary{background:var(--brand);color:#111;border-color:transparent}.rd-hint{font-size:11px;color:var(--muted);margin-top:7px}
      @media(max-width:600px){#ros-driver-launcher{right:150px;bottom:76px;min-width:112px}.rd-wrap{padding:14px}.rd-actions{grid-template-columns:1fr}.rd-head h2{font-size:22px}}
    `;document.head.appendChild(s)
  }

  function hideLegacyTables(){
    document.querySelectorAll('#app section').forEach(sec=>{
      const h=sec.querySelector('h2');
      if(h&&h.textContent.trim()==='الطاولات و QR'){
        sec.dataset.rosLegacyTables='1';
        sec.style.display='none';
      }
    });
  }

  function ensure(){
    if(!(location.hash==='#admin'||location.hash.startsWith('#admin/')))return;
    css();hideLegacyTables();
    if(!document.getElementById('ros-driver-launcher')){
      const b=document.createElement('button');b.id='ros-driver-launcher';b.type='button';b.innerHTML='<span>🚚</span><span>إضافة مندوب</span>';b.onclick=openPanel;document.body.appendChild(b)
    }
    if(!document.getElementById('ros-driver-panel')){
      const p=document.createElement('div');p.id='ros-driver-panel';p.innerHTML=`<div class="rd-wrap"><div class="rd-card"><div class="rd-head"><div><h2>إضافة مندوب</h2><div class="rd-hint">أضف بيانات المندوب وصورته من مكان واحد.</div></div><button type="button" class="rd-close" aria-label="إغلاق">×</button></div><div class="space-y-4"><div><label class="rd-label" for="rd-name">اسم المندوب</label><input id="rd-name" class="rd-field w-full border p-4" placeholder="اسم المندوب"></div><div><label class="rd-label" for="rd-phone">رقم الموبايل</label><input id="rd-phone" class="rd-field w-full border p-4" inputmode="tel" placeholder="رقم الموبايل"></div><div><label class="rd-label" for="rd-photo">صورة المندوب <span style="color:var(--muted)">(اختياري)</span></label><input id="rd-photo" class="rd-field rd-photo w-full border" type="file" accept="image/*"><div class="rd-hint">JPG / PNG / WEBP — حتى 5MB</div></div></div><div class="rd-actions"><button type="button" id="rd-save" class="rd-btn primary">إضافة المندوب</button><button type="button" id="rd-cancel" class="rd-btn">إلغاء</button></div></div></div>`;
      p.querySelector('.rd-close').onclick=closePanel;p.querySelector('#rd-cancel').onclick=closePanel;p.addEventListener('click',e=>{if(e.target===p)closePanel()});p.querySelector('#rd-save').onclick=saveDriver;document.body.appendChild(p)
    }
  }

  async function uploadPhoto(db,file){
    if(!file)return null;
    if(file.size>5*1024*1024)throw new Error('صورة المندوب يجب ألا تتجاوز 5MB');
    if(!String(file.type||'').startsWith('image/'))throw new Error('اختر ملف صورة صالح');
    const restaurantId=window.store?.restaurant?.id;
    if(!restaurantId)throw new Error('بيانات المطعم غير متاحة');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${restaurantId}/${crypto.randomUUID()}.${ext}`;
    const up=await db.storage.from('driver-images').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
    if(up.error)throw up.error;
    return db.storage.from('driver-images').getPublicUrl(path)?.data?.publicUrl||null;
  }

  async function saveDriver(){
    const btn=document.getElementById('rd-save');if(!btn)return;
    const name=document.getElementById('rd-name')?.value.trim()||'';
    const phone=document.getElementById('rd-phone')?.value.trim()||null;
    const file=document.getElementById('rd-photo')?.files?.[0]||null;
    if(!name)return notify('اكتب اسم المندوب');
    const db=getDb();if(!db)return notify('خدمة Supabase غير متاحة');
    btn.disabled=true;const old=btn.textContent;btn.textContent='جارٍ إضافة المندوب...';
    try{
      const photo_url=await uploadPhoto(db,file);
      const r=await db.rpc('admin_create_driver_with_photo',{p_restaurant_id:window.store?.restaurant?.id,p_name:name,p_phone:phone,p_photo_url:photo_url});
      if(r.error)throw r.error;
      document.getElementById('rd-name').value='';document.getElementById('rd-phone').value='';document.getElementById('rd-photo').value='';
      closePanel();notify(photo_url?'تمت إضافة المندوب مع الصورة':'تمت إضافة المندوب بنجاح');
      if(typeof window.renderAdmin==='function')setTimeout(()=>window.renderAdmin(),200);
    }catch(e){console.error('admin driver add',e);notify(e?.message||'تعذر إضافة المندوب')}
    finally{btn.disabled=false;btn.textContent=old}
  }

  function openPanel(){ensure();document.getElementById('ros-driver-panel')?.classList.add('open');document.getElementById('rd-name')?.focus()}
  function closePanel(){document.getElementById('ros-driver-panel')?.classList.remove('open')}

  const observer=new MutationObserver(()=>{if(location.hash==='#admin'||location.hash.startsWith('#admin/')){ensure()}});
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#admin')){closePanel();return}ensure()});
  ensure();
})();
