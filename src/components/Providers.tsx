"use client";

import { AppProvider, useApp } from "@/context/AppContext";
import { FlyToCart } from "@/components/cart/FlyToCart";
import { CartConflictModal } from "@/components/cart/CartConflictModal";
import { useEffect } from "react";

function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const onLoad = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline registration optional */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}

function StorageBanner() {
  const { storageError, hydrated } = useApp();
  if (!hydrated || !storageError) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[200] bg-primary px-4 py-2 text-center text-xs font-bold text-white"
    >
      {storageError}
    </div>
  );
}

function HydrationGate({ children }: { children: React.ReactNode }) {
  const { hydrated } = useApp();
  if (!hydrated) {
    return (
      <div className="app-gradient flex min-h-dvh items-center justify-center">
        <div className="glass rounded-3xl px-8 py-6 text-center">
          <div className="mx-auto mb-3 size-8 animate-pulse rounded-full bg-primary/40" />
          <p className="text-sm font-semibold text-foreground-muted">
            Loading Zest…
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ServiceWorkerRegister />
      <HydrationGate>
        <StorageBanner />
        {children}
        <FlyToCart />
        <CartConflictModal />
      </HydrationGate>
    </AppProvider>
  );
}
