// Service worker: เปิดแอปได้แม้สัญญาณไม่ดี (ข้อมูลยัง sync ผ่าน Firebase เมื่อกลับมาออนไลน์)
const CACHE = 'care-nst-v2-1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'firebase-config.js', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network-first สำหรับไฟล์ของแอป เพื่อให้ได้เวอร์ชันล่าสุดเสมอ แล้วค่อยใช้ cache ตอนออฟไลน์
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
