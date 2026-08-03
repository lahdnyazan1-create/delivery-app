"use client";

import Link from "next/link";
import { MapPinned } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import OrderHistory from "@/components/profile/OrderHistory";
import { useAppStore } from "@/store/useAppStore";

export default function OrdersPage() {
  const { activeOrder, isAuthenticated } = useAppStore();

  return (
    <AppShell>
      <h1 className="mb-5 text-2xl font-extrabold">طلباتي</h1>

      {!isAuthenticated ? (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm font-bold">سجّل الدخول لمتابعة طلباتك</p>
          <Link
            href="/login?next=/orders"
            className="mt-3 inline-flex rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white"
          >
            تسجيل الدخول
          </Link>
        </div>
      ) : (
        <>
          {activeOrder && activeOrder.status !== "Delivered" && (
            <Link
              href="/order-tracking"
              className="glass no-select mb-5 flex items-center gap-3 rounded-2xl p-4"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <MapPinned className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">طلب نشط الآن</span>
                <span className="block text-xs text-foreground-muted">
                  {activeOrder.restaurantName} · تابع الحالة مباشرة
                </span>
              </span>
            </Link>
          )}
          <OrderHistory />
        </>
      )}
    </AppShell>
  );
}
