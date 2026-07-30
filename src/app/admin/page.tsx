"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Restaurant, OrderStatus } from "@/types/database";
import { RequireRole } from "@/components/auth/RequireRole";
import {
  addRestaurant as addRestaurantFirestore,
  toggleRestaurantActive as toggleRestaurantActiveFirestore,
} from "@/lib/firestore";

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
      coverGradient: "from-amber-500 to-red-600",
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 dir-rtl">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            لوحة تحكم الإدارة
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            إدارة المطاعم، الطلبات، والعمليات المباشرة
          </p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === "orders"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            الطلبات ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("restaurants")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === "restaurants"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            المطاعم ({restaurants.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === "analytics"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }`}
          >
            الإحصائيات
          </button>
        </div>
      </header>

      {activeTab === "orders" && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">متابعة الطلبات المباشرة</h2>
          {orders.length === 0 ? (
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center text-slate-400">
              لا يوجد طلبات حالية
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs text-amber-400 font-mono">
                        #{order.id.slice(-6)}
                      </span>
                      <h3 className="font-bold text-lg">
                        {order.restaurantName}
                      </h3>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        order.status === "Delivered"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : order.status === "Cancelled"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  <div className="text-sm space-y-1 text-slate-300">
                    <p>
                      <span className="text-slate-500">العميل:</span>{" "}
                      {order.customerName} ({order.customerPhone})
                    </p>
                    <p>
                      <span className="text-slate-500">العنوان:</span>{" "}
                      {order.deliveryAddress}
                    </p>
                    <p>
                      <span className="text-slate-500">المندوب الحالي:</span>{" "}
                      {order.courierId || "غير محدد"}
                    </p>
                    <p>
                      <span className="text-slate-500">المجموع:</span>{" "}
                      <strong className="text-amber-400">
                        {order.total} ₪
                      </strong>
                    </p>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl text-xs space-y-1 text-slate-400">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span>{item.price * item.quantity} ₪</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 space-y-2 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 w-20">
                        السائق:
                      </label>
                      <select
                        value={order.courierId || ""}
                        onChange={(e) =>
                          handleAssignDriver(order.id, e.target.value)
                        }
                        className="bg-slate-950 border border-slate-800 text-xs rounded-lg p-2 w-full text-slate-200 outline-none"
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
                      <label className="text-xs text-slate-400 w-20">
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
                        className="bg-slate-950 border border-slate-800 text-xs rounded-lg p-2 w-full text-slate-200 outline-none"
                      >
                        <option value="Pending">قيد الانتظار (Pending)</option>
                        <option value="Preparing">
                          قيد التحضير (Preparing)
                        </option>
                        <option value="Ready">جاهز للتوصيل (Ready)</option>
                        <option value="OutForDelivery">
                          خرج للتوصيل (OutForDelivery)
                        </option>
                        <option value="Delivered">
                          تم التسليم (Delivered)
                        </option>
                        <option value="Cancelled">ملغي (Cancelled)</option>
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
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-fit">
            <h2 className="text-lg font-bold mb-4 text-amber-400">
              إضافة مطعم جديد
            </h2>
            <form onSubmit={handleAddRestaurant} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  اسم المطعم
                </label>
                <input
                  type="text"
                  required
                  value={restForm.name}
                  onChange={(e) =>
                    setRestForm({ ...restForm, name: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm outline-none focus:border-amber-500"
                  placeholder="مثال: بيتزا الخليل"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  المطبخ / التصنيف
                </label>
                <input
                  type="text"
                  value={restForm.cuisine}
                  onChange={(e) =>
                    setRestForm({ ...restForm, cuisine: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  العنوان
                </label>
                <input
                  type="text"
                  value={restForm.address}
                  onChange={(e) =>
                    setRestForm({ ...restForm, address: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition mt-2"
              >
                إضافة المطعم
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-4">
            <h2 className="text-lg font-bold">
              المطاعم المسجلة ({restaurants.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {restaurants.map((rest) => (
                <div
                  key={rest.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-bold text-base">{rest.name}</h3>
                    <p className="text-xs text-slate-400">
                      {rest.cuisine || "وجبات"} • {rest.deliveryFee} ₪ توصيل
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(rest.id, rest.active)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      rest.active
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-sm">إجمالي المبيعات المكتملة</p>
            <p className="text-3xl font-extrabold text-amber-400 mt-2">
              {totalRevenue.toFixed(2)} ₪
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-sm">الطلبات النشطة حالياً</p>
            <p className="text-3xl font-extrabold text-sky-400 mt-2">
              {activeOrders.length}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <p className="text-slate-400 text-sm">إجمالي الطلبات الكلي</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-2">
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
