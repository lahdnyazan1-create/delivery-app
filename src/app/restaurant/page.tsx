"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Utensils, 
  LogOut, 
  Clock, 
  CheckCircle, 
  Package, 
  Store, 
  ChevronDown, 
  ChevronUp, 
  ToggleLeft, 
  ToggleRight,
  ArrowLeft
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/context/AppContext";
import { ORDER_STATUSES, type OrderStatus } from "@/data/mockData";

const RESTAURANT_SESSION_KEY = "zest-active-restaurant-id";

export default function RestaurantDashboard() {
  const router = useRouter();
  const { restaurants, dishes, orders, updateOrderStatus, upsertDish } = useApp();

  const [selectedRestId, setSelectedRestId] = useState<string>("");
  const [activeRestId, setActiveRestId] = useState<string | null>(null);
  const [tab, setTab] = useState<"orders" | "menu">("orders");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // استرجاع الجلسة عند التحميل
  useEffect(() => {
    const saved = sessionStorage.getItem(RESTAURANT_SESSION_KEY);
    if (saved) {
      setActiveRestId(saved);
    }
  }, []);

  const currentRestaurant = useMemo(
    () => restaurants.find((r) => r.id === activeRestId),
    [restaurants, activeRestId]
  );

  const restaurantOrders = useMemo(
    () => orders.filter((o) => o.restaurantId === activeRestId),
    [orders, activeRestId]
  );

  const restaurantDishes = useMemo(
    () => dishes.filter((d) => d.restaurantId === activeRestId),
    [dishes, activeRestId]
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestId) return;
    sessionStorage.setItem(RESTAURANT_SESSION_KEY, selectedRestId);
    setActiveRestId(selectedRestId);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(RESTAURANT_SESSION_KEY);
    setActiveRestId(null);
  };

  // شاشة تسجيل الدخول
  if (!activeRestId || !currentRestaurant) {
    return (
      <AppShell hideNav hideHeader>
        <div className="flex flex-1 flex-col justify-center pt-safe">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="no-select touch-target mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted"
          >
            <ArrowLeft className="size-4" /> العودة للرئيسية
          </button>

          <div className="glass mx-auto w-full max-w-sm rounded-3xl p-6 text-center">
            <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Store className="size-7" />
            </span>
            <h1 className="text-xl font-extrabold">بوابة المطاعم</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              اختر المطعم لتسجيل الدخول وإدارة الطلبات والوجبات
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <select
                value={selectedRestId}
                onChange={(e) => setSelectedRestId(e.target.value)}
                className="w-full rounded-2xl border border-glass-border bg-secondary px-4 py-3.5 text-sm font-bold outline-none"
              >
                <option value="">-- اختر المطعم --</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!selectedRestId}
                className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-50"
              >
                دخول لوحة التحكم
              </button>
            </form>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav hideHeader>
      {/* الهيدر */}
      <div className="mb-4 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold text-lg">
            {currentRestaurant.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-extrabold">{currentRestaurant.name}</h1>
            <p className="text-xs text-foreground-muted">لوحة إجارة المطبخ والطلبات</p>
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

      {/* التبويبات */}
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

      {/* تبويب الطلبات */}
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
                      <h3 className="font-bold text-base mt-1">{order.customerName}</h3>
                      <p className="text-xs text-foreground-muted">{order.customerPhone}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-primary block">
                        ${order.total.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="mt-1 text-xs flex items-center gap-1 text-foreground-muted hover:text-white"
                      >
                        {isExpanded ? "إخفاء الأصناف" : "تفاصيل الوجبات"}
                        {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      </button>
                    </div>
                  </div>

                  {/* قائمة أصناف الطلب */}
                  {isExpanded && (
                    <div className="border-t border-glass-border pt-2 mt-2 space-y-1.5">
                      <p className="text-xs font-bold text-foreground-muted">الوجبات المطلوب تحضيرها:</p>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0">
                          <span className="font-bold text-foreground">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-mono text-foreground-muted">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* تحديث حالة الطلب السريع من قبل المطعم */}
                  <div className="border-t border-glass-border pt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground-muted font-bold">حالة الطلب:</span>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
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

      {/* تبويب التحكم بالوجبات */}
      {tab === "menu" && (
        <section className="space-y-3 pb-8">
          {restaurantDishes.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
              <Package className="mx-auto size-10 mb-2 opacity-30" />
              <p className="text-sm font-bold">لا يوجد وجبات مسجلة بهذا المطعم</p>
            </div>
          ) : (
            restaurantDishes.map((dish) => (
              <div key={dish.id} className="glass rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm">{dish.name}</h4>
                  <p className="text-xs text-foreground-muted">${dish.price.toFixed(2)} · {dish.category}</p>
                </div>
                <button
                  type="button"
                  onClick={() => upsertDish({ ...dish, available: !dish.available })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dish.available 
                      ? "bg-accent/20 text-accent border border-accent/30" 
                      : "bg-primary/20 text-primary border border-primary/30"
                  }`}
                >
                  {dish.available ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
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
