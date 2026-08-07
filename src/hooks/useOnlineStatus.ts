// src/hooks/useOnlineStatus.ts
// ============================================================================
// نسخة مُبسّطة مع تسجيل واضح بالـ console لتشخيص سبب "دائماً غير متصل":
// - تفترض "متصل" افتراضياً (لا وميض عند التحميل)
// - تتحقق فعلياً بطلب شبكة كل 5 ثوانٍ بدل الثقة بـ navigator.onLine فقط
// - تطبع بالـ console بالضبط سبب أي فشل — افتح Console بالمتصفح (F12) لو
//   ما زال الإشعار يظهر، وابعتلي اللي يطبعه بالضبط.
// ============================================================================

"use client";

import { useState, useEffect } from "react";

const CHECK_INTERVAL_MS = 5000;
const PING_URL = "/favicon.ico";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${PING_URL}?_=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });
        // أي رد من السيرفر (حتى 404) يعني الاتصال شغّال فعلياً
        if (!cancelled) {
          if (!isOnline) console.log("✅ الاتصال عاد — رد بحالة", res.status);
          setIsOnline(true);
        }
      } catch (err) {
        if (!cancelled) {
          // ✅ هذا السطر هو المفتاح للتشخيص: افتح Console وشوف شو بيطبع بالضبط
          console.warn("⚠️ فشل التحقق من الاتصال بالشبكة:", err);
          setIsOnline(false);
        }
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isOnline;
}
