(function(){
  'use strict';
  // app.js keeps cart as a global lexical binding (`let cart=[]`), not window.cart.
  // Delivery UI needs a live bridge to that same array; a getter avoids stale copies.
  try{
    Object.defineProperty(window,'cart',{
      configurable:true,
      enumerable:false,
      get:function(){return cart},
      set:function(v){cart=v}
    });
  }catch(e){console.warn('cart bridge unavailable',e)}
})();
