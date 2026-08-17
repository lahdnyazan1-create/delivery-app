"use client";

import { useEffect } from "react";

/**
 * ✅ ضمان وصول التحديثات لمستخدمي PWA (المثبتين على الشاشة الرئيسية):
 *  - عند سيطرة نسخة جديدة من Service Worker (skipWaiting + clients.claim
 *    مفعّلان في sw.js) تُبلَّغ المستخدم وتُعاد صفحته ناعماً للإصدار الجديد —
 *    بدل بقاء البوك مارك على نسخة قديمة إلى حين إعادة إضافتها يدوياً.
 *  - فحص دوري كل ساعة + فحص عند كل فتح للتطبيق.
 */
export function SWUpdatePrompt() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let reloaded = false;

    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      import("@/store/useToastStore").then(({ useToastStore }) =>
        useToastStore.getState().info("تم تحديث التطبيق لإصدار أحدث ✨"),
      );
      // مهلة قصيرة ليرى المستخدم التنبيه قبل إعادة التحميل
      setTimeout(() => window.location.reload(), 1500);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // فحص التحديثات: مرة عند الإقلاع + كل ساعة (يبقي المثبتين محدّثين)
    const check = () =>
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).catch(() => {});
    check();
    const interval = setInterval(check, 60 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      clearInterval(interval);
    };
  }, []);

  return null;
}
