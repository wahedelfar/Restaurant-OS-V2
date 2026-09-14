// kitchen.js - isolated, no import from main app
const cfg = window.KITCHEN_CONFIG;
let soundOn = cfg.SOUND_ENABLED;
let lastCount = 0;

function checkPin(){
  const pin = document.getElementById('pin').value;
  if(pin === cfg.PIN){
    localStorage.setItem('kitchen_auth','1');
    showApp();
  } else {
    document.getElementById('err').style.display='block';
  }
}
function showApp(){
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  startPolling();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
}
function logout(){
  localStorage.removeItem('kitchen_auth');
  location.reload();
}
function toggleSound(){
  soundOn = !soundOn;
  document.getElementById('soundBtn').textContent = soundOn ? '🔊 صوت' : '🔇 كتم';
}

// mock data if no API - isolated
let orders = [];

async function fetchOrders(){
  try{
    if(cfg.SUPABASE_URL){
      // example supabase fetch - you can edit
      const res = await fetch(`${cfg.SUPABASE_URL}/rest/v1/orders?status=eq.kitchen&select=*`,{
        headers:{apikey:cfg.SUPABASE_ANON_KEY,Authorization:`Bearer ${cfg.SUPABASE_ANON_KEY}`}
      });
      const data = await res.json();
      if(Array.isArray(data)) orders = data;
    } else {
      // fallback: check localStorage orders from main app if exists
      const local = localStorage.getItem('restaurant_orders');
      if(local){
        try{ orders = JSON.parse(local).filter(o=>o.kitchen || o.status==='kitchen'); }catch{}
      }
    }
  }catch(e){ console.log('fetch error',e); }
  render();
}

function render(){
  const lists = {new:document.getElementById('list-new'),prep:document.getElementById('list-prep'),ready:document.getElementById('list-ready')};
  Object.values(lists).forEach(l=>l.innerHTML='');
  let count = 0;
  orders.forEach(o=>{
    const state = o.kitchen_state || 'new';
    const div = document.createElement('div');
    div.className = `order ${state}`;
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between"><b>#${o.id || o.table || '---'}</b><span class="time">${o.time || new Date(o.created_at||Date.now()).toLocaleTimeString('ar-EG')}</span></div>
      <div style="margin:6px 0;font-size:14px">${(o.items||[]).map(i=>`${i.name} x${i.qty||1}`).join('<br>') || o.details || 'اوردر مطبخ'}</div>
      <div class="btns">
        ${state==='new'?'<button onclick="moveOrder(\''+o.id+'\',\'prep\')" style="background:#f59e0b">بدء تحضير</button>':''}
        ${state==='prep'?'<button onclick="moveOrder(\''+o.id+'\',\'ready\')" style="background:#10b981;color:#fff">جاهز</button>':''}
        ${state==='ready'?'<button onclick="moveOrder(\''+o.id+'\',\'done\')" style="background:#334155;color:#fff">تم التسليم</button>':''}
      </div>
    `;
    if(state==='new') lists.new.appendChild(div);
    else if(state==='prep') lists.prep.appendChild(div);
    else if(state==='ready') lists.ready.appendChild(div);
    if(state!=='done') count++;
  });
  document.getElementById('count').textContent = count;
  if(count>lastCount && soundOn){
    document.getElementById('ding').play().catch(()=>{});
  }
  lastCount = count;
}

function moveOrder(id,newState){
  orders = orders.map(o=> o.id==id ? {...o,kitchen_state:newState}:o);
  if(newState==='done') orders = orders.filter(o=>o.id!=id);
  localStorage.setItem('restaurant_orders', JSON.stringify(orders));
  render();
}

function startPolling(){
  fetchOrders();
  setInterval(fetchOrders, cfg.POLL_INTERVAL);
}

// auto login
if(localStorage.getItem('kitchen_auth')==='1'){
  showApp();
}
document.getElementById('pin').addEventListener('keyup', e=>{ if(e.key==='Enter') checkPin(); });
