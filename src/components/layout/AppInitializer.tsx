"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useToastStore } from "@/store/useToastStore";
import { subscribeToNotifications } from "@/lib/firestore";
import { useDataStore } from "@/store/useDataStore";
import { useOrderStore } from "@/store/useOrderStore";

// مكوّن منطقي بحت (لا يرسم شيئاً) — يعمل مرة واحدة في جذر التطبيق
// بمعزل عن AppShell البصري، حتى لا يتوقف تشغيله على أي شرط عرض
export function AppInitializer() {
  const { user, initAuthListener } = useAuthStore();
  const { loadInitialData, cleanupListeners } = useDataStore();
  const { subscribeToOrders, unsubscribeFromOrders } = useOrderStore();

  const initializedRef = useRef(false);
  // ✅ آخر معرف إشعار ظهر كتوست — يمنع تكرار التوست مع كل لقطة
  // جديدة للاشتراك (اللقطات تصل عند أي تغيير في المجموعة)
  const lastNotifIdShown = useRef<string | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const unsubAuth = initAuthListener();
    loadInitialData();

    return () => {
      unsubAuth();
      cleanupListeners();
      unsubscribeFromOrders();
    };
  }, [initAuthListener, loadInitialData, cleanupListeners, unsubscribeFromOrders]);

  useEffect(() => {
    if (user?.uid) {
      subscribeToOrders(user.uid, user.role);
      
      // ✅ الاستماع للإشعارات — يظهر الأحدث غير المقروء كتوست مرئي
      // (قبل ذلك كان يُطبع في الكونسول فقط ولا يراه المستخدم)
      const unsubNotifs = subscribeToNotifications(user.uid, (notifs) => {
        const lastNotif = notifs[0];
        if (
          lastNotif &&
          !lastNotif.read &&
          lastNotif.id !== lastNotifIdShown.current
        ) {
          lastNotifIdShown.current = lastNotif.id;
          useToastStore.getState().info(`🔔 ${lastNotif.message}`);
          if (typeof window !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate(200);
            } catch {
              /* غير مدعوم */
            }
          }
        }
      });

      return () => {
        unsubscribeFromOrders();
        unsubNotifs();
      };
    }
    return () => {
      unsubscribeFromOrders();
    };
  }, [user?.uid, user?.role, subscribeToOrders, unsubscribeFromOrders]);

  return null;
}
