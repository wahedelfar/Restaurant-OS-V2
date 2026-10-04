(function(){
'use strict';
const DB='ros-offline-v1',VER=1;let dbPromise=null;
function open(){if(dbPromise)return dbPromise;dbPromise=new Promise((resolve)=>{if(!('indexedDB'in window))return resolve(null);const r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('snapshots'))d.createObjectStore('snapshots');if(!d.objectStoreNames.contains('queue'))d.createObjectStore('queue',{keyPath:'id',autoIncrement:true});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)});return dbPromise}
async function tx(name,mode,fn){const d=await open();if(!d)return null;return new Promise(resolve=>{const t=d.transaction(name,mode),s=t.objectStore(name);let out;try{out=fn(s)}catch(_){out=null}t.oncomplete=()=>resolve(out);t.onerror=()=>resolve(null);t.onabort=()=>resolve(null)})}
async function saveSnapshot(snapshot){const payload={...snapshot,saved_at:new Date().toISOString()};await tx('snapshots','readwrite',s=>s.put(payload,'current'));try{localStorage.setItem('ros_offline_ready','1')}catch(_){}return payload}
async function loadSnapshot(){return await tx('snapshots','readonly',s=>new Promise(r=>{const q=s.get('current');q.onsuccess=()=>r(q.result||null);q.onerror=()=>r(null)}))}
async function enqueue(type,payload){const item={type,payload,created_at:new Date().toISOString()};return await tx('queue','readwrite',s=>new Promise(r=>{const q=s.add(item);q.onsuccess=()=>r({...item,id:q.result});q.onerror=()=>r(null)}))}
async function queueList(){return await tx('queue','readonly',s=>new Promise(r=>{const q=s.getAll();q.onsuccess=()=>r(q.result||[]);q.onerror=()=>r([])}))||[]}
async function clearQueue(){await tx('queue','readwrite',s=>s.clear())}
function isOnline(){return navigator.onLine!==false}
function banner(){if(document.getElementById('ros-offline-status'))return;const b=document.createElement('div');b.id='ros-offline-status';b.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483001;display:none;padding:10px 14px;border-radius:14px;background:#17191d;color:#f6f1e7;border:1px solid rgba(212,175,55,.35);box-shadow:0 10px 30px rgba(0,0,0,.3);font:700 13px Cairo,Arial,sans-serif;text-align:center;direction:rtl';document.body.appendChild(b);const render=()=>{const off=!isOnline();b.textContent=off?'أنت تعمل الآن بدون إنترنت — البيانات المحلية متاحة.':'';b.style.display=off?'block':'none'};addEventListener('online',render);addEventListener('offline',render);render()}
window.ROSOffline={version:1,saveSnapshot,loadSnapshot,enqueue,queueList,clearQueue,isOnline};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>{open();banner()},{once:true}):(()=>{open();banner()})();
})();
