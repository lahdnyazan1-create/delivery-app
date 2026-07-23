"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Bike, 
  LogOut, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  Navigation,
  Phone
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/context/AppContext";
import { INITIAL_DRIVERS, ORDER_STATUSES, type OrderStatus } from "@/data/mockData";

const DRIVER_SESSION_KEY = "zest-active-driver-id";

export default function DriverDashboard() {
  const router = useRouter();
  const { orders, updateOrderStatus } = useApp();

  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const [tab, setTab] = useState<"my-orders" | "available">("my-orders");

  // استرجاع جلسة المندوب
  useEffect(() => {
    const saved = sessionStorage.getItem(DRIVER_SESSION_KEY);
    if (saved) {
      setActiveDriverId(saved);
    }
  }, []);

  const currentDriver = useMemo(
    () => INITIAL_DRIVERS.find((d) => d.id === activeDriverId),
    [activeDriverId]
  );

  // جميع الطلبات غير المكتملة
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled"),
    [orders]
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) return;
    sessionStorage.setItem(DRIVER_SESSION_KEY, selectedDriverId);
    setActiveDriverId(selectedDriverId);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(DRIVER_SESSION_KEY);
    setActiveDriverId(null);
  };

  const handleAcceptOrder = (orderId: string) => {
    updateOrderStatus(orderId, "OutForDelivery");
  };

  // شاشة تسجيل دخول المندوب
  if (!activeDriverId || !currentDriver) {
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
              <Bike className="size-7" />
            </span>
            <h1 className="text-xl font-extrabold">بوابة الكابتن / المندوب</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              اختر اسمك لتسجيل الدخول وبدء استلام وتوصيل الطلبات
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full rounded-2xl border border-glass-border bg-secondary px-4 py-3.5 text-sm font-bold outline-none"
              >
                <option value="">-- اختر المندوب --</option>
                {INITIAL_DRIVERS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.vehicle})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!selectedDriverId}
                className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-50"
              >
                دخول لوحة التوصيل
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
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold">
            <Bike className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold">{currentDriver.name}</h1>
            <p className="text-xs text-foreground-muted">المركبة: {currentDriver.vehicle}</p>
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
          onClick={() => setTab("my-orders")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            tab === "my-orders" ? "bg-primary text-white" : "text-foreground-muted"
          }`}
        >
          الطلبات النشطة ({activeOrders.length})
        </button>
      </div>

      {/* قائمة طلبات التوصيل */}
      <section className="space-y-3 pb-8">
        {activeOrders.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            <CheckCircle2 className="mx-auto size-10 mb-2 opacity-30" />
            <p className="text-sm font-bold">لا يوجد طلبات جاهزة للتوصيل حالياً</p>
          </div>
        ) : (
          activeOrders.map((order) => (
            <div key={order.id} className="glass rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-mono bg-primary/15 text-primary px-2 py-0.5 rounded-md font-bold">
                    #{order.id.slice(-6)}
                  </span>
                  <h3 className="font-bold text-base mt-1">{order.customerName}</h3>
                </div>
                {order.customerPhone && (
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/20 text-accent text-xs font-bold"
                  >
                    <Phone className="size-3.5" /> اتصال
                  </a>
                )}
              </div>

              <div className="flex items-start gap-2 text-xs text-foreground-muted">
                <MapPin className="size-4 shrink-0 text-primary mt-0.5" />
                <span>عنوان التوصيل: {order.deliveryAddress || "غير محدد"}</span>
              </div>

              {/* تحديث حالة التوصيل */}
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
          ))
        )}
      </section>
    </AppShell>
  );
}
