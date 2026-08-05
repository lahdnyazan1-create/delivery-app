// src/hooks/useOnlineStatus.ts
// ============================================================================
// المشكلة السابقة: الاعتماد فقط على navigator.onLine قد يكون غير دقيق في
// بعض المتصفحات/الأجهزة (وأشهر سبب عملي: خانة "Offline" مفعّلة بالغلط في
// Chrome DevTools ← Network conditions، تبقى مفعّلة حتى بعد إغلاق الأدوات).
//
// الحل: نثق بحدثي online/offline من المتصفح فوراً كإشارة أولية، لكن أيضاً
// نتحقق دورياً بطلب شبكة خفيف فعلي (HEAD request) لتفادي False Positives،
// حتى لو navigator.onLine قال "متصل" أو "غير متصل" بشكل خاطئ.
// ============================================================================

"use client";

import { useState, useEffect, useRef } from "react";

const CHECK_INTERVAL_MS = 15000;
// ملف صغير جداً وموجود دائماً على أي دومين Next.js — يكفي للتحقق من الشبكة
const PING_URL = "/favicon.ico";

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const checkingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const verifyRealConnection = async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        await fetch(`${PING_URL}?_=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
        });
        if (!cancelled) setIsOnline(true);
      } catch {
        // فشل الطلب الفعلي = غير متصل فعلاً بغض النظر عن navigator.onLine
        if (!cancelled) setIsOnline(false);
      } finally {
        checkingRef.current = false;
      }
    };

    const handleOnline = () => verifyRealConnection();
    const handleOffline = () => verifyRealConnection();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // تحقق فوري عند التحميل (يصحح أي حالة أولية خاطئة من navigator.onLine)
    verifyRealConnection();

    // وتحقق دوري خفيف كل 15 ثانية كطبقة أمان إضافية
    const interval = setInterval(verifyRealConnection, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return isOnline;
}
