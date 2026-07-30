"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Utensils,
  LogOut,
  Package,
  Store,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/useAppStore";
import { ORDER_STATUSES } from "@/constants/orderStatuses";
import type { OrderStatus } from "@/types/database";
import { updateDish } from "@/lib/firestore";
import { formatPrice } from "@/constants/currency";

export default function RestaurantDashboard() {
  const router = useRouter();
  const {
    restaurants,
    dishes,
    orders,
    updateOrderStatus,
    user,
    isAuthenticated,
    logoutUser,
  } = useAppStore();

  const [tab, setTab] = useState<"orders" | "menu">("orders");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // ✅ إصلاح الربط (النقطة 6): البحث عن المطعم الخاص بمالكه عبر ownerId
  const userRestaurant = useMemo(() => {
    if (!user) return null;
    return restaurants.find((r) => r.ownerId === user.uid);
  }, [restaurants, user]);

  const restaurantOrders = useMemo(
    () => orders.filter((o) => o.restaurantId === userRestaurant?.id),
    [orders, userRestaurant],
  );

  const restaurantDishes = useMemo(
    () => dishes.filter((d) => d.restaurantId === userRestaurant?.id),
    [dishes, userRestaurant],
  );

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  const toggleDishAvailability = async (
    dishId: string,
    currentAvailable: boolean,
  ) => {
    try {
      await updateDish(dishId, { available: !currentAvailable });
    } catch (error) {
      console.error("Failed to update dish", error);
    }
  };

  // ✅ حماية: يجب تسجيل الدخول
  if (!isAuthenticated || !user) {
    return (
      <AppShell hideNav hideHeader>
        <div className="flex flex-1 flex-col items-center justify-center pt-safe">
          <ShieldAlert className="size-16 text-primary mb-4" />
          <h1 className="text-xl font-extrabold mb-2">يجب تسجيل الدخول</h1>
          <p className="text-sm text-foreground-muted mb-6">
            فقط مالكو المطاعم المسجلين يمكنهم الوصول
          </p>
          <button
            type="button"
            onClick={() => router.push("/login?next=/restaurant")}
            className="no-select touch-target rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white"
          >
            تسجيل الدخول
          </button>
        </div>
      </AppShell>
    );
  }

  // ✅ حماية: يجب وجود مطعم مرتبط
  if (!userRestaurant) {
    return (
      <AppShell hideNav hideHeader>
        <div className="flex flex-1 flex-col items-center justify-center pt-safe">
          <Store className="size-16 text-foreground-muted mb-4" />
          <h1 className="text-xl font-extrabold mb-2">لا يوجد مطعم مرتبط</h1>
          <p className="text-sm text-foreground-muted mb-6">
            حسابك غير مرتبط بأي مطعم. تواصل مع الإدارة.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="no-select touch-target rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-white"
          >
            تسجيل الخروج
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav hideHeader>
      <div className="mb-4 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold text-lg">
            {userRestaurant.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-extrabold">{userRestaurant.name}</h1>
            <p className="text-xs text-foreground-muted">
              لوحة إدارة المطبخ والطلبات
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="no-select touch-target glass flex size-11 items-center justify-center rounded-xl text-foreground-muted hover:text-primary"
          title="تسجيل الخروج"
        >
          <LogOut className="size-5" />
        </button>
      </div>

      <div className="mb-5 flex rounded-2xl bg-secondary p-1 border border-glass-border">
        <button
          type="button"
          onClick={() => setTab("orders")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            tab === "orders" ? "bg-primary text-white" : "text-foreground-muted"
          }`}
        >
          الطلبات الواردة ({restaurantOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("menu")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            tab === "menu" ? "bg-primary text-white" : "text-foreground-muted"
          }`}
        >
          قائمة الوجبات ({restaurantDishes.length})
        </button>
      </div>

      {tab === "orders" && (
        <section className="space-y-3 pb-8">
          {restaurantOrders.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
              <Utensils className="mx-auto size-10 mb-2 opacity-30" />
              <p className="text-sm font-bold">لا يوجد طلبات حالية للمطعم</p>
            </div>
          ) : (
            restaurantOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              return (
                <div key={order.id} className="glass rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono bg-primary/15 text-primary px-2 py-0.5 rounded-md font-bold">
                        #{order.id.slice(-6)}
                      </span>
                      <h3 className="font-bold text-base mt-1">
                        {order.customerName}
                      </h3>
                      <p className="text-xs text-foreground-muted">
                        {order.customerPhone}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-primary block">
                        {formatPrice(order.total)}
                      </span>
                      <button
                        onClick={() =>
                          setExpandedOrderId(isExpanded ? null : order.id)
                        }
                        className="mt-1 text-xs flex items-center gap-1 text-foreground-muted hover:text-white"
                      >
                        {isExpanded ? "إخفاء الأصناف" : "تفاصيل الوجبات"}
                        {isExpanded ? (
                          <ChevronUp className="size-3" />
                        ) : (
                          <ChevronDown className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-glass-border pt-2 mt-2 space-y-1.5">
                      <p className="text-xs font-bold text-foreground-muted">
                        الوجبات المطلوب تحضيرها:
                      </p>
                      {order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0"
                        >
                          <span className="font-bold text-foreground">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-mono text-foreground-muted">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-glass-border pt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground-muted font-bold">
                      حالة الطلب:
                    </span>
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(
                          order.id,
                          e.target.value as OrderStatus,
                        )
                      }
                      className="rounded-xl border border-glass-border bg-secondary px-3 py-1.5 text-xs font-bold outline-none text-primary"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {tab === "menu" && (
        <section className="space-y-3 pb-8">
          {restaurantDishes.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
              <Package className="mx-auto size-10 mb-2 opacity-30" />
              <p className="text-sm font-bold">
                لا يوجد وجبات مسجلة بهذا المطعم
              </p>
            </div>
          ) : (
            restaurantDishes.map((dish) => (
              <div
                key={dish.id}
                className="glass rounded-2xl p-4 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm">{dish.name}</h4>
                  <p className="text-xs text-foreground-muted">
                    {formatPrice(dish.price)} · {dish.category}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    toggleDishAvailability(dish.id, dish.available)
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dish.available
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "bg-primary/20 text-primary border border-primary/30"
                  }`}
                >
                  {dish.available ? (
                    <ToggleRight className="size-4" />
                  ) : (
                    <ToggleLeft className="size-4" />
                  )}
                  {dish.available ? "متوفر" : "غير متوفر"}
                </button>
              </div>
            ))
          )}
        </section>
      )}
    </AppShell>
  );
}
