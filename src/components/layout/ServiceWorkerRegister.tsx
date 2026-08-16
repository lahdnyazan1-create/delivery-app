"use client";

import { useEffect } from "react";

/**
 * تسجيل الـ Service Worker لتفعيل وضع PWA.
 * كان public/sw.js موجوداً دون أي register — أي أن اللافتة "أنت غير متصل"
 * كانت الوحيدة المتبقية بلا Offline Shell فعلي.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed:", err));
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
