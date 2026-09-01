// public/firebase-messaging-sw.js
// ============================================================================
// Service Worker الخاص بإشعارات FCM في الخلفية — يعمل حتى والتطبيق مغلق
// تماماً (هذا شرط نظام التشغيل: الرسالة يستقبلها الـ SW وليس الصفحة).
// الإعدادات تُجلب من /api/push-config لأن ملفات public لا ترى متغيرات البيئة.
// ============================================================================

importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

fetch("/api/push-config")
  .then((res) => res.json())
  .then((config) => {
    if (!config?.projectId) return;
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload.notification?.title || "دُغْري — إشعار جديد";
      const body = payload.notification?.body || "";
      self.registration.showNotification(title, {
        body,
        dir: "rtl",
        lang: "ar",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: payload.data?.tag || "daghri-notification",
        data: payload.data || {},
      });
    });
  })
  .catch((err) =>
    console.warn("[fcm-sw] تعذّرت تهيئة الإشعارات:", err),
  );

// فتح التطبيق عند النقر على الإشعار — على الصفحة المناسبة إن وُجدت
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
