// Service worker: offline app shell + notification click handling.
// ponytail: cache-first for same-origin GETs, network fallback. One cache, bump CACHE to invalidate.
const CACHE='tt-v4';
const ASSETS=['timetable.html','qrcode.min.js','content.js'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request,u=new URL(req.url);
  if(req.method!=='GET'||u.origin!==location.origin)return;      // cross-origin untouched
  // App page: network-first so new deploys show up immediately; fall back to cache when offline.
  if(req.mode==='navigate'||req.destination==='document'){
    e.respondWith(
      fetch(req).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));return res;})
        .catch(()=>caches.match(req).then(r=>r||caches.match('timetable.html')))
    );
    return;
  }
  // Other same-origin assets: cache-first, populate on first fetch.
  e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
    const cp=res.clone();caches.open(CACHE).then(c=>c.put(req,cp));return res;})));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(cs=>cs[0]?cs[0].focus():clients.openWindow('timetable.html')));
});
