"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { OrderStageTracker } from "@/components/tracking/OrderStageTracker";
import { useOrderStore } from "@/store/useOrderStore";
import { formatPrice } from "@/constants/currency";
import type { OrderStatus } from "@/types/database";

const STEPS: OrderStatus[] = [
  "Pending",
  "Preparing",
  "Ready",
  "OutForDelivery",
  "Delivered",
];

const STEP_LABELS: Record<OrderStatus, string> = {
  Pending: "قيد الانتظار",
  Preparing: "قيد التحضير",
  Ready: "جاهز للتوصيل",
  OutForDelivery: "في الطريق إليك",
  Delivered: "تم التوصيل",
  Cancelled: "ملغي",
};

export default function OrderTrackingPage() {
  const router = useRouter();
  const activeOrder = useOrderStore((state) => state.activeOrder);

  if (!activeOrder) {
    return (
      <AppShell hideNav>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="no-select touch-target mb-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground-muted"
        >
          <ArrowLeft className="size-4" /> العودة للرئيسية
        </button>
        <div className="glass rounded-3xl px-5 py-10 text-center">
          <p className="font-bold">لا يوجد طلب نشط</p>
          <p className="mt-2 text-sm text-foreground-muted">
            قم بطلب من سلتك لبدء التتبع المباشر.
          </p>
          <Link
            href="/cart"
            className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            الذهاب للسلة
          </Link>
        </div>
      </AppShell>
    );
  }

  const stepIndex = STEPS.indexOf(activeOrder.status);

  return (
    <AppShell hideNav>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="no-select touch-target flex size-11 items-center justify-center rounded-xl glass"
          aria-label="رجوع"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold">تتبع الطلب</h1>
          <p className="text-xs text-foreground-muted">
            {activeOrder.restaurantName} · الوقت المتوقع ~{activeOrder.etaMinutes} دقيقة
          </p>
        </div>
      </div>

      <div className="mb-5">
        <OrderStageTracker status={activeOrder.status} />
      </div>

      <ol className="glass mb-5 space-y-0 rounded-3xl p-4">
        {STEPS.map((step, i) => {
          const done = i <= stepIndex;
          const current = i === stepIndex;
          return (
            <li key={step} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-accent text-secondary"
                      : "bg-white/10 text-foreground-muted"
                  }`}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    className={`mt-1 min-h-4 w-0.5 flex-1 ${
                      i < stepIndex ? "bg-accent" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
              <div className="pt-1">
                <p
                  className={`text-sm font-bold ${
                    current ? "text-primary" : "text-foreground"
                  }`}
                >
                  {STEP_LABELS[step]}
                </p>
                {current && (
                  <p className="text-xs text-foreground-muted">
                    يتحدّث فوراً عند تغيير الحالة من الإدارة.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="glass mb-4 rounded-3xl p-4">
        <p className="mb-1 text-sm font-bold">التوصيل إلى</p>
        <p className="text-sm text-foreground-muted">
          {activeOrder.customerName} · {activeOrder.customerPhone}
        </p>
        <p className="mt-1 text-sm text-foreground">
          {activeOrder.deliveryAddress}
        </p>
      </div>

      <div className="glass rounded-3xl p-4">
        <p className="mb-1 text-sm font-bold">تفاصيل الطلب</p>
        <p className="mb-3 text-xs text-foreground-muted">
          من {activeOrder.restaurantName}
        </p>
        <ul className="mb-3 space-y-2">
          {activeOrder.items.map((item) => (
            <li
              key={item.dishId || item.id}
              className="flex justify-between text-sm text-foreground-muted"
            >
              <span>
                {item.quantity}× {item.name}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        {activeOrder.discount > 0 && (
          <p className="mb-1 flex justify-between text-sm text-accent">
            <span>خصم ({activeOrder.promoCode})</span>
            <span>-{formatPrice(activeOrder.discount)}</span>
          </p>
        )}
        <p className="flex justify-between border-t border-glass-border pt-2 text-base font-extrabold">
          <span>الإجمالي</span>
          <span className="text-primary">{formatPrice(activeOrder.total)}</span>
        </p>
      </div>
    </AppShell>
  );
}
