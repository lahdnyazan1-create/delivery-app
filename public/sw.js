// ✅ رفع رقم النسخة يحذف كاش الأجهزة القديم تلقائياً عند تحديث الـ SW
// (activate يحذف كل المفاتيح المخالفة) — ضروري بعد كل نشر تغييرات واجهة
const CACHE = "zest-v4";
const ASSETS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // ✅ لا نلمس إلا طلبات GET (والمنشورات أبداً) —
  if (req.method !== "GET") return;

  // ✅ لا نلمس أي طلب خارجي: كان الاعتراض يكسر قنوات Firestore الطويلة
  //    (Listen/Write channel) فتنقطع الاشتراكات الحية ويظهر
  //    "A ServiceWorker intercepted the request and encountered an
  //    unexpected error" — وطلبات firebase-messaging-sw أيضاً خارجية.
  //    كذلك نتجاهل بروتوكولات المتصفح الداخلية (chrome-extension: ...)
  if (!req.url.startsWith(self.location.origin)) return;

  // ✅ التنقلات (فتح الصفحات): الشبكة أولاً (محتوى طازج)، وعند فشلها
  //    نرجع للكاش، وعند غيابهما نعرض /offline — سابقاً كان فشل التنقل
  //    بلا كاش يعرض صفحة المتصفح الافتراضية
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((cached) => cached || caches.match("/offline")),
        ),
    );
    return;
  }

  // باقي الأصول المحلية: كاش أولاً مع تحديث خلفي
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) {
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    }),
  );
});
