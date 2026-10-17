const C='eommu-v4',A=['./','index.html','styles.css','app.js','manifest.webmanifest','icon.svg','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!=='eommu-data').map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(w=>w[0]?w[0].focus():clients.openWindow('./')))});
async function due(){const c=await caches.open('eommu-data'),r=await c.match('due.json');if(!r)return;const a=await r.json(),keep=[];
for(const t of a){if(new Date(t.due)<=Date.now())await self.registration.showNotification(t.title,{body:t.notes||'Due now',tag:t.id,icon:'icons/icon-192.png',badge:'icons/icon-192.png'});else keep.push(t)}
await c.put('due.json',new Response(JSON.stringify(keep)))}
self.addEventListener('periodicsync',e=>{if(e.tag==='eommu-due')e.waitUntil(due())});
