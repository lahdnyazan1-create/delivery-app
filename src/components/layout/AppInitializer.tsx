"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
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
      
      // ✅ الاستماع للإشعارات وتسجيلها بالكونسول (أو يمكن ربطها لاحقاً بجرس الإشعارات)
      const unsubNotifs = subscribeToNotifications(user.uid, (notifs) => {
        const lastNotif = notifs[0];
        if (lastNotif && !lastNotif.read) {
          console.log("🔔 إشعار جديد:", lastNotif.message);
          // يمكن إضافة اهتزاز أو صوت هنا مستقبلاً
          if (typeof window !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate(200);
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
