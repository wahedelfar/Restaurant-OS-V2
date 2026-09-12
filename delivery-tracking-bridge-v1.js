(function(){
  'use strict';
  if(window.__ROS_DELIVERY_TRACKING_BRIDGE_V1__) return;
  window.__ROS_DELIVERY_TRACKING_BRIDGE_V1__=true;
  const legacyRouter=window.renderRouter;
  if(typeof legacyRouter!=='function') return;
  try{window.removeEventListener('hashchange',legacyRouter)}catch(_){ }
  window.renderRouter=function(){
    const h=String(location.hash||'');
    if(/^#track\//i.test(h)) return;
    return legacyRouter.apply(this,arguments);
  };
})();
