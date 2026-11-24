'use strict';
const CACHE='currencylive-shell-v3';
const SHELL=['./','./index.html','./styles.css?v=3','./app.js?v=3','./manifest.webmanifest','./assets/favicon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET')return;
  if(url.origin==='https://api.frankfurter.dev'||url.origin==='https://api.gold-api.com')return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok&&url.origin===location.origin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match(event.request).then(cached=>cached||((event.request.mode==='navigate')?caches.match('./index.html'):Response.error()))));
});
