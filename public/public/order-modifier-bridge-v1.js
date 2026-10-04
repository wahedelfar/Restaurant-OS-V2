(function(){
'use strict';
if(window.__ROS_ORDER_MODIFIER_BRIDGE_V1__)return;
window.__ROS_ORDER_MODIFIER_BRIDGE_V1__=true;
function cartItems(){try{return Array.isArray(window.cart)?window.cart:[]}catch(_){return []}}
function enrich(items){
  const c=cartItems();
  if(!Array.isArray(items)||!c.length)return items;
  return items.map((item,i)=>{
    const source=c[i];
    if(!source||String(source.id)!==String(item.product_id))return item;
    const mods=Array.isArray(source.modifiers)?source.modifiers.map(m=>({id:m.id,name:m.name,price:m.price})):[];
    return {...item,modifiers:mods};
  });
}
function patch(){
  const client=window.db;
  if(!client||typeof client.rpc!=='function'||client.__rosModifierBridgePatched)return false;
  const original=client.rpc.bind(client);
  client.rpc=async function(fn,args){
    if(fn==='create_delivery_order'||fn==='create_delivery_order_v2'||fn==='create_dine_in_order'){
      const next={...(args||{})};
      next.p_items=enrich(next.p_items);
      return original(fn,next);
    }
    return original(fn,args);
  };
  client.__rosModifierBridgePatched=true;
  return true;
}
let tries=0;
const timer=setInterval(()=>{if(patch()||++tries>=120)clearInterval(timer)},250);
patch();
})();
