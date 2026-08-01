"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Restaurant, OrderStatus } from "@/types/database";
import { RequireRole } from "@/components/auth/RequireRole";
import {
  addRestaurant as addRestaurantFirestore,
  toggleRestaurantActive as toggleRestaurantActiveFirestore,
} from "@/lib/firestore";

const STATUS_LABELS: Record<OrderStatus, string> = {
  Pending: "قيد الانتظار",
  Preparing: "قيد التحضير",
  Ready: "جاهز للتوصيل",
  OutForDelivery: "خرج للتوصيل",
  Delivered: "تم التسليم",
  Cancelled: "ملغي",
};

function statusBadgeClass(status: OrderStatus) {
  if (status === "Delivered") {
    return "bg-accent/10 text-accent border border-accent/20";
  }
  if (status === "Cancelled") {
    return "bg-red-500/10 text-red-400 border border-red-500/20";
  }
  return "bg-primary/10 text-primary border border-primary/20";
}

function AdminDashboardContent() {
  const {
    restaurants,
    orders,
    drivers,
    updateOrderStatus,
    assignDriverToOrder,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<
    "orders" | "restaurants" | "analytics"
  >("orders");

  const [restForm, setRestForm] = useState({
    name: "",
    cuisine: "وجبات سريعة",
    deliveryFee: 5,
    etaMinutes: 30,
    address: "",
  });

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restForm.name) return;

    const newRest: Omit<Restaurant, "id"> = {
      name: restForm.name,
      cuisine: restForm.cuisine,
      rating: 5.0,
      deliveryFee: Number(restForm.deliveryFee),
      etaMinutes: Number(restForm.etaMinutes),
      address: restForm.address,
      active: true,
      coverGradient: "from-primary to-red-600",
      logoGradient: "from-primary to-orange-600",
    };

    try {
      await addRestaurantFirestore(newRest);
      setRestForm({
        name: "",
        cuisine: "وجبات سريعة",
        deliveryFee: 5,
        etaMinutes: 30,
        address: "",
      });
    } catch (error) {
      console.error("Failed to add restaurant", error);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await toggleRestaurantActiveFirestore(id, !currentActive);
    } catch (error) {
      console.error("Failed to toggle restaurant", error);
    }
  };

  const handleAssignDriver = (orderId: string, driverId: string) => {
    assignDriverToOrder(orderId, driverId);
  };

  const totalRevenue = orders
    .filter((o) => o.status === "Delivered")
    .reduce((acc, curr) => acc + curr.total, 0);

  const activeOrders = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled",
  );

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-glass-border pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="bg-gradient-to-r from-primary to-primary-soft bg-clip-text text-3xl font-bold text-transparent">
            لوحة تحكم الإدارة
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            إدارة المطاعم، الطلبات، والعمليات المباشرة
          </p>
        </div>

        <div className="glass flex rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "orders"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الطلبات ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("restaurants")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "restaurants"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            المطاعم ({restaurants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "analytics"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الإحصائيات
          </button>
        </div>
      </header>

      {activeTab === "orders" && (
        <div className="space-y-4">
          <h2 className="mb-4 text-xl font-bold">متابعة الطلبات المباشرة</h2>
          {orders.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
              لا يوجد طلبات حالية
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="glass space-y-4 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between border-b border-glass-border pb-3">
                    <div>
                      <span className="font-mono text-xs text-primary">
                        #{order.id.slice(-6)}
                      </span>
                      <h3 className="text-lg font-bold">
                        {order.restaurantName}
                      </h3>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-foreground">
                    <p>
                      <span className="text-foreground-muted">العميل:</span>{" "}
                      {order.customerName} ({order.customerPhone})
                    </p>
                    <p>
                      <span className="text-foreground-muted">العنوان:</span>{" "}
                      {order.deliveryAddress}
                    </p>
                    <p>
                      <span className="text-foreground-muted">
                        المندوب الحالي:
                      </span>{" "}
                      {order.courierId || "غير محدد"}
                    </p>
                    <p>
                      <span className="text-foreground-muted">المجموع:</span>{" "}
                      <strong className="text-primary">
                        {order.total} ₪
                      </strong>
                    </p>
                  </div>

                  <div className="space-y-1 rounded-xl bg-white/5 p-3 text-xs text-foreground-muted">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {item.quantity}× {item.name}
                        </span>
                        <span>{item.price * item.quantity} ₪</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-glass-border pt-2">
                    <div className="flex items-center gap-2">
                      <label className="w-20 text-xs text-foreground-muted">
                        السائق:
                      </label>
                      <select
                        value={order.courierId || ""}
                        onChange={(e) =>
                          handleAssignDriver(order.id, e.target.value)
                        }
                        className="w-full rounded-lg border border-glass-border bg-secondary p-2 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="">اختر سائق...</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.vehicle})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-20 text-xs text-foreground-muted">
                        الحالة:
                      </label>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateOrderStatus(
                            order.id,
                            e.target.value as OrderStatus,
                          )
                        }
                        className="w-full rounded-lg border border-glass-border bg-secondary p-2 text-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="Pending">قيد الانتظار</option>
                        <option value="Preparing">قيد التحضير</option>
                        <option value="Ready">جاهز للتوصيل</option>
                        <option value="OutForDelivery">خرج للتوصيل</option>
                        <option value="Delivered">تم التسليم</option>
                        <option value="Cancelled">ملغي</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "restaurants" && (
        <div className="grid gap-8 md:grid-cols-3">
          <div className="glass h-fit rounded-2xl p-6">
            <h2 className="mb-4 text-lg font-bold text-primary">
              إضافة مطعم جديد
            </h2>
            <form onSubmit={handleAddRestaurant} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-foreground-muted">
                  اسم المطعم
                </label>
                <input
                  type="text"
                  required
                  value={restForm.name}
                  onChange={(e) =>
                    setRestForm({ ...restForm, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-glass-border bg-secondary p-2.5 text-sm text-foreground outline-none focus:border-primary"
                  placeholder="مثال: بيتزا الخليل"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-foreground-muted">
                  المطبخ / التصنيف
                </label>
                <input
                  type="text"
                  value={restForm.cuisine}
                  onChange={(e) =>
                    setRestForm({ ...restForm, cuisine: e.target.value })
                  }
                  className="w-full rounded-xl border border-glass-border bg-secondary p-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-foreground-muted">
                    أجرة التوصيل (₪)
                  </label>
                  <input
                    type="number"
                    value={restForm.deliveryFee}
                    onChange={(e) =>
                      setRestForm({
                        ...restForm,
                        deliveryFee: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-glass-border bg-secondary p-2.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-foreground-muted">
                    الوقت المتوقع (دقيقة)
                  </label>
                  <input
                    type="number"
                    value={restForm.etaMinutes}
                    onChange={(e) =>
                      setRestForm({
                        ...restForm,
                        etaMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-glass-border bg-secondary p-2.5 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-foreground-muted">
                  العنوان
                </label>
                <input
                  type="text"
                  value={restForm.address}
                  onChange={(e) =>
                    setRestForm({ ...restForm, address: e.target.value })
                  }
                  className="w-full rounded-xl border border-glass-border bg-secondary p-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90"
              >
                إضافة المطعم
              </button>
            </form>
          </div>

          <div className="space-y-4 md:col-span-2">
            <h2 className="text-lg font-bold">
              المطاعم المسجلة ({restaurants.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {restaurants.map((rest) => (
                <div
                  key={rest.id}
                  className="glass flex items-center justify-between rounded-2xl p-4"
                >
                  <div>
                    <h3 className="text-base font-bold">{rest.name}</h3>
                    <p className="text-xs text-foreground-muted">
                      {rest.cuisine || "وجبات"} • {rest.deliveryFee} ₪ توصيل
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(rest.id, rest.active)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      rest.active
                        ? "border border-accent/30 bg-accent/10 text-accent"
                        : "border border-red-500/30 bg-red-500/10 text-red-400"
                    }`}
                  >
                    {rest.active ? "نشط" : "متوقف"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-foreground-muted">
              إجمالي المبيعات المكتملة
            </p>
            <p className="mt-2 text-3xl font-extrabold text-accent">
              {totalRevenue.toFixed(2)} ₪
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-foreground-muted">
              الطلبات النشطة حالياً
            </p>
            <p className="mt-2 text-3xl font-extrabold text-primary">
              {activeOrders.length}
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-foreground-muted">
              إجمالي الطلبات الكلي
            </p>
            <p className="mt-2 text-3xl font-extrabold text-primary-soft">
              {orders.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <RequireRole role="admin">
      <AdminDashboardContent />
    </RequireRole>
  );
}
