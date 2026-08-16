"use client";

import React from "react";
import { Order } from "@/types/database";
import { useAppStore } from "@/store/useAppStore";
import { STATUS_LABELS_AR } from "@/constants/orderStatuses";
import { playSound, triggerHaptic } from "@/lib/sound-haptics";
import { RotateCcw, PackageCheck } from "lucide-react";
import { formatPrice } from "@/constants/currency";

export default function OrderHistory() {
  const { orders, loading, addToCart, clearCart, getDish } = useAppStore();

  const handleQuickReOrder = (orderItems: Order["items"], restaurantId: string) => {
    playSound("add");
    triggerHaptic("medium");
    clearCart();

    orderItems.forEach((item) => {
      const dish = getDish(item.dishId || "");
      if (dish) {
        addToCart(dish.id, restaurantId);
      }
    });
    // ✅ تم إزالة alert المزعج، سيتم نقل المستخدم تلقائياً أو يرى الشريط العائم يظهر
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-xs text-foreground-muted">
        جاري تحميل سجل الطلبات...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center" dir="rtl">
        <PackageCheck className="mx-auto mb-2 size-8 text-foreground-muted opacity-50" />
        <p className="text-sm font-bold">لا توجد طلبات سابقة حتى الآن</p>
        <p className="text-xs text-foreground-muted">اطلب وجبتك الأولى لتظهر هنا!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <h3 className="text-sm font-bold px-1">سجل الطلبات وإعادة الطلب السريع 📜</h3>
      {orders.map((order) => (
        <div key={order.id} className="glass rounded-2xl p-4 transition-all hover:bg-white/5">
          <div className="flex items-center justify-between border-b border-glass-border pb-2 mb-3">
            <div>
              <span className="text-xs font-bold text-primary block">طلب #{order.id?.slice(0, 6) ?? ""}</span>
              <span className="text-[10px] text-foreground-muted">
                {order.createdAt ? new Date(order.createdAt).toLocaleDateString("ar-EG") : "مؤخراً"}
              </span>
            </div>
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
              {STATUS_LABELS_AR[order.status] ?? order.status}
            </span>
          </div>

          <ul className="mb-3 space-y-1">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex justify-between text-xs text-foreground-muted">
                <span>{item.quantity}x {item.name}</span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-glass-border pt-2">
            <div>
              <span className="text-[10px] text-foreground-muted block">المجموع</span>
              <span className="text-sm font-extrabold text-foreground">{formatPrice(order.total)}</span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickReOrder(order.items, order.restaurantId)}
              className="no-select touch-target flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-all"
            >
              <RotateCcw className="size-3.5" />
              <span>إعادة الطلب ⚡</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
