"use client";

import { useEffect, useRef } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useDataStore } from "@/store/useDataStore";
import { useOrderStore } from "@/store/useOrderStore";

type AppShellProps = {
  children: React.ReactNode;
  hideHeader?: boolean;
  hideNav?: boolean;
};

export function AppShell({
  children,
  hideHeader = false,
  hideNav = false,
}: AppShellProps) {
  const pathname = usePathname();

  const { user, initAuthListener } = useAuthStore();
  const { loadInitialData, cleanupListeners } = useDataStore();
  const { subscribeToOrders, unsubscribeFromOrders } = useOrderStore();

  const initializedRef = useRef(false);

  // ✅ تهيئة البيانات الأساسية ومستمع Auth مرة واحدة فقط
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
  }, [
    initAuthListener,
    loadInitialData,
    cleanupListeners,
    unsubscribeFromOrders,
  ]);

  // ✅ اشتراك متكيف في الطلبات عند تغير هوية المستخدم أو صلاحيته
  useEffect(() => {
    if (user?.uid) {
      subscribeToOrders(user.uid, user.role);
    }
    return () => {
      unsubscribeFromOrders();
    };
  }, [user?.uid, user?.role, subscribeToOrders, unsubscribeFromOrders]);

  const shouldHideHeader =
    hideHeader ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/driver") ||
    pathname.startsWith("/restaurant");

  const shouldHideNav =
    hideNav ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/driver") ||
    pathname.startsWith("/restaurant");

  return (
    <>
      <OfflineBanner />
      <div className="app-gradient relative mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        {!shouldHideHeader && <Header />}
        <main
          className={`flex flex-1 flex-col px-4 pt-4 ${
            shouldHideNav ? "pb-8" : "pb-28"
          }`}
        >
          {children}
        </main>
        {!shouldHideNav && <BottomNav />}
      </div>
    </>
  );
}
