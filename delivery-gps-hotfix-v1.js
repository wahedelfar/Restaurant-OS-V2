(function(){
  'use strict';

  // app.js registered this handler before the delivery module.
  // Removing it prevents #track/... from being replaced by the menu after async init.
  if(window.renderRouter){
    try{ window.removeEventListener('hashchange', window.renderRouter); }catch(_){ }
  }

  // Replace the fragile inline WhatsApp action with a normal link.
  if(!window.__deliveryWhatsAppHotfix){
    window.__deliveryWhatsAppHotfix=true;
    const originalSend=window.sendDeliveryOrder;
    if(typeof originalSend==='function'){
      window.sendDeliveryOrder=async function(){
        let result;
        try{ result=await originalSend.apply(this,arguments); }catch(e){ throw e; }
        setTimeout(function(){
          const modal=document.querySelector('#modal');
          if(!modal)return;
          const oldButton=Array.from(modal.querySelectorAll('button')).find(b=>/WhatsApp|واتساب|الطلب للمطعم/.test(b.textContent||''));
          if(!oldButton)return;
          const tracking=modal.querySelector('a[href*="#track/"]')?.getAttribute('href')||'';
          const a=document.createElement('a');
          a.href='https://wa.me/201026569682?text='+encodeURIComponent('طلب توصيل جديد من ذا بيتزا برجر كافيه'+(tracking?'\nتتبع الطلب: '+tracking:''));
          a.target='_blank';
          a.rel='noopener noreferrer';
          a.className=oldButton.className;
          a.textContent='إرسال الطلب للمطعم عبر WhatsApp';
          oldButton.replaceWith(a);
        },80);
        return result;
      };
    }
  }

  // Keep delivery tracking/driver routes alive while app.js finishes initialization.
  function replay(){
    if(!/^#(track|driver)\//.test(location.hash||''))return;
    let n=0;
    const tick=function(){
      if(n++>=10)return;
      if(/^#(track|driver)\//.test(location.hash||'')){
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        setTimeout(tick,500);
      }
    };
    setTimeout(tick,100);
  }
  replay();
})();
