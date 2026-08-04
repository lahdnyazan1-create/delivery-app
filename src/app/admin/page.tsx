"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Restaurant, OrderStatus } from "@/types/database";
import { RequireRole } from "@/components/auth/RequireRole";
import {
  addRestaurant as addRestaurantFirestore,
  toggleRestaurantActive as toggleRestaurantActiveFirestore,
  setUserRole,
  upsertDriverProfile,
  updateRestaurant as updateRestaurantFirestore,
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
    return "bg-danger/10 text-danger border border-danger/20";
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
    "orders" | "restaurants" | "access" | "analytics"
  >("orders");

  const [restForm, setRestForm] = useState({
    name: "",
    cuisine: "وجبات سريعة",
    deliveryFee: 5,
    etaMinutes: 30,
    address: "",
  });

  const [driverForm, setDriverForm] = useState({
    uid: "",
    name: "",
    phone: "",
    vehicle: "دراجة نارية",
    plateNumber: "",
  });
  const [driverMsg, setDriverMsg] = useState("");
  const [driverBusy, setDriverBusy] = useState(false);

  const [ownerForm, setOwnerForm] = useState({ restaurantId: "", uid: "" });
  const [ownerMsg, setOwnerMsg] = useState("");
  const [ownerBusy, setOwnerBusy] = useState(false);

  const [promoDrafts, setPromoDrafts] = useState<Record<string, string>>({});

  const handleSavePromoTag = async (id: string) => {
    const value = (promoDrafts[id] ?? "").trim();
    try {
      await updateRestaurantFirestore(id, { promoTag: value || null });
    } catch (error) {
      console.error("Failed to update promo tag", error);
    }
  };

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

  const handleLinkDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = driverForm.uid.trim();
    if (!uid || !driverForm.name.trim()) {
      setDriverMsg("أدخل معرّف المستخدم (UID) واسم السائق على الأقل");
      return;
    }
    setDriverBusy(true);
    setDriverMsg("");
    try {
      await setUserRole(uid, "courier");
      await upsertDriverProfile(uid, {
        name: driverForm.name.trim(),
        phone: driverForm.phone.trim(),
        vehicle: driverForm.vehicle,
        plateNumber: driverForm.plateNumber.trim(),
        isAvailable: true,
      });
      setDriverMsg("تم ربط السائق وترقية دوره بنجاح ✓");
      setDriverForm({
        uid: "",
        name: "",
        phone: "",
        vehicle: "دراجة نارية",
        plateNumber: "",
      });
    } catch (error) {
      console.error("Failed to link driver", error);
      setDriverMsg(
        "تعذّر الربط — تأكد أن المستخدم سجّل دخول مرة واحدة على الأقل وأن الـ UID صحيح",
      );
    } finally {
      setDriverBusy(false);
    }
  };

  const handleLinkOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = ownerForm.uid.trim();
    if (!ownerForm.restaurantId || !uid) {
      setOwnerMsg("اختر مطعماً وأدخل معرّف المستخدم (UID)");
      return;
    }
    setOwnerBusy(true);
    setOwnerMsg("");
    try {
      await updateRestaurantFirestore(ownerForm.restaurantId, {
        ownerId: uid,
      });
      setOwnerMsg("تم ربط مالك المطعم بنجاح ✓");
      setOwnerForm({ restaurantId: "", uid: "" });
    } catch (error) {
      console.error("Failed to link owner", error);
      setOwnerMsg("تعذّر الربط، تحقق من البيانات وحاول مجدداً");
    } finally {
      setOwnerBusy(false);
    }
  };

  const totalRevenue = orders
    .filter((o) => o.status === "Delivered")
    .reduce((acc, curr) => acc + curr.total, 0);

  const activeOrders = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled",
  );

  const inputClass =
    "w-full rounded-xl border border-glass-border bg-secondary p-2.5 text-sm text-foreground outline-none focus:border-primary";
  const labelClass = "mb-1 block text-xs text-foreground-muted";

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

        <div className="glass flex flex-wrap rounded-xl p-1">
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
            onClick={() => setActiveTab("access")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "access"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الوصول والفرق
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
                <label className={labelClass}>اسم المطعم</label>
                <input
                  type="text"
                  required
                  value={restForm.name}
                  onChange={(e) =>
                    setRestForm({ ...restForm, name: e.target.value })
                  }
                  className={inputClass}
                  placeholder="مثال: بيتزا الخليل"
                />
              </div>
              <div>
                <label className={labelClass}>المطبخ / التصنيف</label>
                <input
                  type="text"
                  value={restForm.cuisine}
                  onChange={(e) =>
                    setRestForm({ ...restForm, cuisine: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>أجرة التوصيل (₪)</label>
                  <input
                    type="number"
                    value={restForm.deliveryFee}
                    onChange={(e) =>
                      setRestForm({
                        ...restForm,
                        deliveryFee: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>الوقت المتوقع (دقيقة)</label>
                  <input
                    type="number"
                    value={restForm.etaMinutes}
                    onChange={(e) =>
                      setRestForm({
                        ...restForm,
                        etaMinutes: Number(e.target.value),
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>العنوان</label>
                <input
                  type="text"
                  value={restForm.address}
                  onChange={(e) =>
                    setRestForm({ ...restForm, address: e.target.value })
                  }
                  className={inputClass}
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
                <div key={rest.id} className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between">
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
                          : "border border-danger/30 bg-danger/10 text-danger"
                      }`}
                    >
                      {rest.active ? "نشط" : "متوقف"}
                    </button>
                  </div>
                  <p className="mt-2 truncate text-[11px] text-foreground-muted">
                    المالك:{" "}
                    {rest.ownerId ? (
                      <span className="font-mono text-accent">
                        {rest.ownerId}
                      </span>
                    ) : (
                      <span className="text-danger">غير مرتبط بعد</span>
                    )}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={promoDrafts[rest.id] ?? rest.promoTag ?? ""}
                      onChange={(e) =>
                        setPromoDrafts({
                          ...promoDrafts,
                          [rest.id]: e.target.value,
                        })
                      }
                      placeholder="مثال: خصم 10% — اتركه فارغاً للإخفاء"
                      className="w-full rounded-lg border border-glass-border bg-secondary px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => handleSavePromoTag(rest.id)}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
                    >
                      حفظ
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-foreground-muted">
                    يظهر في قسم &quot;وفّر معنا&quot; بالرئيسية عند تعبئته
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "access" && (
        <div className="grid gap-8 md:grid-cols-2">
          <div className="glass rounded-2xl p-6">
            <h2 className="mb-1 text-lg font-bold text-primary">
              ربط سائق جديد
            </h2>
            <p className="mb-4 text-xs text-foreground-muted">
              يجب أن يكون المستخدم قد سجّل دخول مرة واحدة على الأقل. انسخ
              معرّفه (UID) من Firebase Console ← Authentication.
            </p>
            <form onSubmit={handleLinkDriver} className="space-y-4">
              <div>
                <label className={labelClass}>معرّف المستخدم (UID) *</label>
                <input
                  type="text"
                  required
                  value={driverForm.uid}
                  onChange={(e) =>
                    setDriverForm({ ...driverForm, uid: e.target.value })
                  }
                  className={`${inputClass} font-mono`}
                  placeholder="مثال: aB3xY9..."
                />
              </div>
              <div>
                <label className={labelClass}>اسم السائق *</label>
                <input
                  type="text"
                  required
                  value={driverForm.name}
                  onChange={(e) =>
                    setDriverForm({ ...driverForm, name: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>رقم الهاتف</label>
                <input
                  type="tel"
                  value={driverForm.phone}
                  onChange={(e) =>
                    setDriverForm({ ...driverForm, phone: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>نوع المركبة</label>
                  <select
                    value={driverForm.vehicle}
                    onChange={(e) =>
                      setDriverForm({
                        ...driverForm,
                        vehicle: e.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="دراجة نارية">دراجة نارية</option>
                    <option value="سيارة">سيارة</option>
                    <option value="دراجة هوائية">دراجة هوائية</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>رقم اللوحة</label>
                  <input
                    type="text"
                    value={driverForm.plateNumber}
                    onChange={(e) =>
                      setDriverForm({
                        ...driverForm,
                        plateNumber: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={driverBusy}
                className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {driverBusy ? "جارٍ الربط…" : "ربط السائق"}
              </button>
              {driverMsg && (
                <p className="text-center text-xs text-foreground-muted">
                  {driverMsg}
                </p>
              )}
            </form>
          </div>

          <div className="glass rounded-2xl p-6">
            <h2 className="mb-1 text-lg font-bold text-primary">
              ربط مالك مطعم
            </h2>
            <p className="mb-4 text-xs text-foreground-muted">
              يجب أن يكون المستخدم قد سجّل دخول مرة واحدة على الأقل كزبون
              عادي — لا حاجة لتغيير دوره.
            </p>
            <form onSubmit={handleLinkOwner} className="space-y-4">
              <div>
                <label className={labelClass}>المطعم *</label>
                <select
                  required
                  value={ownerForm.restaurantId}
                  onChange={(e) =>
                    setOwnerForm({
                      ...ownerForm,
                      restaurantId: e.target.value,
                    })
                  }
                  className={inputClass}
                >
                  <option value="">اختر مطعماً...</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.ownerId ? " (مرتبط بالفعل)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>معرّف المستخدم (UID) *</label>
                <input
                  type="text"
                  required
                  value={ownerForm.uid}
                  onChange={(e) =>
                    setOwnerForm({ ...ownerForm, uid: e.target.value })
                  }
                  className={`${inputClass} font-mono`}
                  placeholder="مثال: aB3xY9..."
                />
              </div>
              <button
                type="submit"
                disabled={ownerBusy}
                className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {ownerBusy ? "جارٍ الربط…" : "ربط المالك"}
              </button>
              {ownerMsg && (
                <p className="text-center text-xs text-foreground-muted">
                  {ownerMsg}
                </p>
              )}
            </form>
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
