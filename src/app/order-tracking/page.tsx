"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { OrderStageTracker } from "@/components/tracking/OrderStageTracker";
import { useApp } from "@/context/AppContext";
import type { OrderStatus } from "@/data/mockData";

const STEPS: OrderStatus[] = [
  "Pending",
  "Preparing",
  "Out for Delivery",
  "Delivered",
];

export default function OrderTrackingPage() {
  const router = useRouter();
  const { activeOrder } = useApp();

  if (!activeOrder) {
    return (
      <AppShell hideNav>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="no-select touch-target mb-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground-muted"
        >
          <ArrowLeft className="size-4" /> Back home
        </button>
        <div className="glass rounded-3xl px-5 py-10 text-center">
          <p className="font-bold">No active order</p>
          <p className="mt-2 text-sm text-foreground-muted">
            Place an order from your cart to start live tracking.
          </p>
          <Link
            href="/cart"
            className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            Go to cart
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
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold">Order tracking</h1>
          <p className="text-xs text-foreground-muted">
            {activeOrder.restaurantName} · ETA ~{activeOrder.etaMinutes} min
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
                  {step}
                </p>
                {current && (
                  <p className="text-xs text-foreground-muted">
                    Updates instantly when admin changes status.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="glass mb-4 rounded-3xl p-4">
        <p className="mb-1 text-sm font-bold">Delivery to</p>
        <p className="text-sm text-foreground-muted">
          {activeOrder.customerName} · {activeOrder.customerPhone}
        </p>
        <p className="mt-1 text-sm text-foreground">{activeOrder.deliveryAddress}</p>
      </div>

      <div className="glass rounded-3xl p-4">
        <p className="mb-1 text-sm font-bold">Order details</p>
        <p className="mb-3 text-xs text-foreground-muted">
          From {activeOrder.restaurantName}
        </p>
        <ul className="mb-3 space-y-2">
          {activeOrder.items.map((item) => (
            <li
              key={item.dishId}
              className="flex justify-between text-sm text-foreground-muted"
            >
              <span>
                {item.quantity}× {item.name}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        {activeOrder.discount > 0 && (
          <p className="mb-1 flex justify-between text-sm text-accent">
            <span>Discount ({activeOrder.promoCode})</span>
            <span>-${activeOrder.discount.toFixed(2)}</span>
          </p>
        )}
        <p className="flex justify-between border-t border-glass-border pt-2 text-base font-extrabold">
          <span>Total</span>
          <span className="text-primary">${activeOrder.total.toFixed(2)}</span>
        </p>
      </div>
    </AppShell>
  );
}
