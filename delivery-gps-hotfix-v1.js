(function(){
  'use strict';

  // Fix tracking being overwritten by app.js after async init.
  // app.js registered its hashchange handler before delivery-gps-fix.js.
  if(window.renderRouter){
    try{ window.removeEventListener('hashchange', window.renderRouter); }catch(_){ }
  }

  // Fix WhatsApp CTA by replacing the fragile inline onclick with a real anchor.
  if(!window.__deliveryWhatsAppHotfix){
    window.__deliveryWhatsAppHotfix=true;
    const originalSend=window.sendDeliveryOrder;
    if(typeof originalSend==='function'){
      window.sendDeliveryOrder=async function(){
        const items=Array.isArray(window.cart)?window.cart.map(x=>({name:x.name,qty:x.qty,price:x.price})):[];
        const name=document.querySelector('#cust')?.value?.trim()||'عميل';
        const phone=document.querySelector('#customerPhone')?.value?.trim()||'';
        const address=document.querySelector('#addr')?.value?.trim()||'';
        const total=items.reduce((sum,x)=>sum+(Number(x.price)||0)*(Number(x.qty)||0),0);
        let result;
        try{ result=await originalSend.apply(this,arguments); }catch(e){ throw e; }
        setTimeout(function(){
          const modal=document.querySelector('#modal');
          if(!modal)return;
          const oldButton=Array.from(modal.querySelectorAll('button')).find(b=>/WhatsApp|واتساب|الطلب للمطعم/.test(b.textContent||''));
          if(!oldButton)return;
          const tracking=modal.querySelector('a[href*="#track/"]')?.getAttribute('href')||'';
          const coords=window.__customerCoords?`${Number(window.__customerCoords.lat).toFixed(6)}, ${Number(window.__customerCoords.lng).toFixed(6)}`:'غير محدد';
          const restaurant=window.store?.restaurant?.name||'ذا بيتزا برجر كافيه';
          let wa=String(window.store?.restaurant?.whatsapp_number||'').replace(/\D/g,'');
          if(wa.startsWith('0'))wa='20'+wa.slice(1);
          if(!wa)wa='201026569682';
          const lines=items.map(x=>`${x.name} × ${x.qty}`).join('\n');
          const msg=`طلب توصيل جديد من ${restaurant}\nالاسم: ${name}\nالهاتف: ${phone}\nالعنوان: ${address}\nالموقع: ${coords}\n\n${lines}\n\nالإجمالي: ${total.toFixed(0)} جنيه${tracking?`\nتتبع الطلب: ${tracking}`:''}`;
          const a=document.createElement('a');
          a.href=`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
          a.target='_blank';
          a.rel='noopener noreferrer';
          a.className=oldButton.className;
          a.textContent='إرسال الطلب للمطعم عبر WhatsApp';
          oldButton.replaceWith(a);
        },50);
        return result;
      };
    }
  }

  // Re-assert delivery routes after app.js async init completes.
  function replay(){
    const h=location.hash||'';
    if(!/^#(track|driver)\//.test(h))return;
    let n=0;
    const tick=function(){
      if(n++>=10)return;
      const current=location.hash||'';
      if(/^#(track|driver)\//.test(current)){
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        setTimeout(tick,500);
      }
    };
    setTimeout(tick,100);
  }
  replay();
})();
