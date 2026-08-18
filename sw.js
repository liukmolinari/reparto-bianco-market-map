const CACHE='rb-market-map-v1c';
const APP=[
  './','./index.html','./styles.css','./app.js','./stores.js','./manifest.webmanifest','./icon-192.png','./icon-512.png',
  './assets/logo-mediaworld.png','./assets/logo-unieuro.png','./assets/logo-euronics.png','./assets/logo-trony.png','./assets/logo-comet.png'
];
self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)));
});
self.addEventListener('activate',e=>{
  e.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy));
    return r;
  }).catch(()=>caches.match(e.request)));
});
