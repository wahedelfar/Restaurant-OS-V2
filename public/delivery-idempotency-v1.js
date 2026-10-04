(function(){
  'use strict';
  if(window.__ROS_DELIVERY_IDEMPOTENCY_V1__) return;
  window.__ROS_DELIVERY_IDEMPOTENCY_V1__=true;

  function patch(){
    const client=window.db;
    if(!client||typeof client.rpc!=='function'||client.__rosDeliveryRpcPatched)return false;

    const originalRpc=client.rpc.bind(client);
    client.rpc=async function(fn,args){
      if(fn==='create_delivery_order'){
        const pending=window.__ROS_PENDING_DELIVERY_REQUEST_ID__;
        const requestId=pending||crypto.randomUUID();
        window.__ROS_PENDING_DELIVERY_REQUEST_ID__=requestId;

        const nextArgs={...(args||{}),p_client_request_id:requestId};
        const result=await originalRpc('create_delivery_order_v2',nextArgs);

        if(!result?.error){
          window.__ROS_PENDING_DELIVERY_REQUEST_ID__=null;
        }
        return result;
      }
      return originalRpc(fn,args);
    };

    client.__rosDeliveryRpcPatched=true;
    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    if(patch()||++tries>=120)clearInterval(timer);
  },250);
  patch();
})();