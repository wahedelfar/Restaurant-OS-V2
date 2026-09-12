(function(){
'use strict';
if(window.__ROS_DELIVERY_NAV_FIX_V2__)return;
window.__ROS_DELIVERY_NAV_FIX_V2__=true;

function text(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim()}
function isTrack(){const h=String(location.hash||'');return /^#track\//i.test(h)||/^#dine-track\//i.test(h)}
function isDriver(){return /^#driver\//i.test(String(location.hash||''))}
function isAdmin(){const h=String(location.hash||'');return h==='#admin'||h.startsWith('#admin/')}

function saveDialog(){
  let d=document.getElementById('ros-driver-save-help');
  if(!d){
    d=document.createElement('div');
    d.id='ros-driver-save-help';
    d.innerHTML='<div class="ros-save-box"><div class="ros-save-title">احفظ صفحتك على موبايلك</div><div class="ros-save-text"></div><button type="button" class="ros-save-close">حسنًا</button></div>';
    document.body.appendChild(d);
    d.addEventListener('click',e=>{if(e.target===d)d.classList.remove('show')});
    d.querySelector('.ros-save-close').addEventListener('click',()=>d.classList.remove('show'));
  }
  const ua=navigator.userAgent||'';
  let msg='';
  if(/iphone|ipad|ipod/i.test(ua)){
    msg='في Safari اضغط زر المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية». بهذه الطريقة تحفظ صفحة المندوب نفسها للوصول السريع.';
  }else if(/android/i.test(ua)){
    msg='في Chrome اضغط ⋮ ثم «إضافة إلى الشاشة الرئيسية» أو «Add to Home screen». احفظ هذه الصفحة الحالية الخاصة بك كمندوب.';
  }else if(/edg/i.test(ua)){
    msg='من قائمة Edge اختر «Apps» ثم «Install this site as an app» إذا ظهر الخيار، أو احفظ الصفحة في المفضلة للوصول السريع.';
  }else if(/chrome|crios/i.test(ua)){
    msg='من قائمة Chrome اختر «Save and share» ثم «Create shortcut» لإنشاء اختصار مباشر لهذه الصفحة على سطح المكتب.';
  }else{
    msg='استخدم قائمة المتصفح واختر «إضافة إلى الشاشة الرئيسية» أو «إنشاء اختصار» أو احفظ الصفحة في المفضلة، حسب المتصفح.';
  }
  d.querySelector('.ros-save-text').textContent=msg;
  d.classList.add('show');
}

function style(){
  if(document.getElementById('ros-driver-save-style'))return;
  const s=document.createElement('style');s.id='ros-driver-save-style';
  s.textContent='#ros-driver-save-help{position:fixed;inset:0;z-index:130;display:none;place-items:center;padding:18px;background:#000c;backdrop-filter:blur(8px)}#ros-driver-save-help.show{display:grid}#ros-driver-save-help .ros-save-box{width:min(430px,100%);padding:24px;text-align:center;color:var(--text,#fff);background:linear-gradient(145deg,var(--surface,#17191d),var(--surface2,#202329));border:1px solid color-mix(in srgb,var(--brand,#D4AF37) 60%,transparent);border-radius:26px;box-shadow:0 25px 80px #000b}.ros-save-title{font-size:22px;font-weight:900;margin-bottom:12px;color:var(--brand,#D4AF37)}.ros-save-text{line-height:1.9;color:var(--text,#fff)}.ros-save-close{margin-top:18px;padding:11px 28px;border:0;border-radius:14px;background:var(--brand,#D4AF37);color:#111;font-weight:900}'
  document.head.appendChild(s);
}

function replaceDriverExit(){
  if(!isDriver())return;
  const buttons=[...document.querySelectorAll('button,a')].filter(el=>text(el)==='خروج');
  for(const el of buttons){
    if(el.dataset.rosSavePage==='1')continue;
    el.dataset.rosSavePage='1';
    if(el.tagName==='A')el.removeAttribute('href');
    el.textContent='احفظ صفحتك على موبايلك';
    el.title='احفظ صفحة المندوب على الشاشة الرئيسية أو سطح المكتب';
    el.setAttribute('aria-label',el.title);
    el.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();saveDialog()},true);
  }
}

document.addEventListener('click',function(e){
  const el=e.target?.closest?.('button,a');
  if(!el)return;
  const t=text(el);
  if(isAdmin()&&t==='فتح المينو'){
    e.preventDefault();e.stopImmediatePropagation();location.hash='#menu';return;
  }
  if(isTrack()&&t==='القائمة'){
    e.preventDefault();e.stopImmediatePropagation();location.hash='#menu';return;
  }
  if(isDriver()&&(t==='خروج'||el.dataset.rosSavePage==='1')){
    e.preventDefault();e.stopImmediatePropagation();saveDialog();return;
  }
},true);

style();
let obsTimer=0;
function scan(){clearTimeout(obsTimer);obsTimer=setTimeout(replaceDriverExit,30)}
new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
replaceDriverExit();
window.addEventListener('hashchange',()=>setTimeout(replaceDriverExit,50));
})();
