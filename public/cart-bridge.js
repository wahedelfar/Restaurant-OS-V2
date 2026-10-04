(function(){
  'use strict';
  // app.js keeps these as global lexical bindings, not window properties.
  // Expose live getters so delivery/admin modules always use the same state.
  try{
    Object.defineProperty(window,'cart',{configurable:true,enumerable:false,get:function(){return cart},set:function(v){cart=v}});
    Object.defineProperty(window,'db',{configurable:true,enumerable:false,get:function(){return db}});
    Object.defineProperty(window,'store',{configurable:true,enumerable:false,get:function(){return store}});
  }catch(e){console.warn('app state bridge unavailable',e)}
})();
