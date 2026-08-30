"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, LogOut, Phone, ChevronDown, ChevronUp, Clock, ChefHat, PackageCheck, Ban, Wallet, Power } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAppStore } from "@/store/useAppStore";
import { useToastStore } from "@/store/useToastStore";
import { requestCourierForOrder } from "@/lib/orders";
import { playSound, triggerHaptic } from "@/lib/sound-haptics";
import { STATUS_LABELS_AR } from "@/constants/orderStatuses";
import { subscribeRestaurantOrders } from "@/lib/firestore";
import { formatPrice } from "@/constants/currency";
import type { Order, OrderStatus } from "@/types/database";

function VendorDashboardContent() {
  const router = useRouter();
  const { user, logoutUser, restaurants, updateOrderStatus, toggleRestaurantActive } = useAppStore();

  const myRestaurant = useMemo(() => restaurants.find((r) => r.ownerId === user?.uid), [restaurants, user]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [requestingCourierFor, setRequestingCourierFor] = useState<string | null>(null);

  useEffect(() => {
    if (!myRestaurant?.id) return;
    const unsub = subscribeRestaurantOrders(myRestaurant.id, setOrders);
    return () => unsub();
  }, [myRestaurant?.id]);

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled"), [orders]);
  const historyOrders = useMemo(() => orders.filter((o) => o.status === "Delivered" || o.status === "Cancelled"), [orders]);
  const visibleOrders = tab === "active" ? activeOrders : historyOrders;

  // ✅ إحصائيات اليوم — عدد الطلبات والإيرادات المكتملة اليوم
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  // ✅ إيرادات اليوم من الطلبات المسلَّمة فعلاً — سابقاً كان يحسب كل طلب
  //    غير ملغي (بما فيه قيد التحضير) فتظهر إيرادات لم تُحصَّل بعد
  const todayOrders = useMemo(
    () => orders.filter(
      (o) => (o.createdAt || 0) >= todayStart && o.status === "Delivered",
    ),
    [orders, todayStart],
  );
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const todayNewCount = orders.filter(
    (o) => (o.createdAt || 0) >= todayStart && o.status !== "Cancelled",
  ).length;

  // ✅ تنبيه صوتي عند ورود طلب Pending جديد — المطعم قد يكون مشغولاً بالمطبخ
  //    ولا يلاحظ الطلب؛ نراقب عدد الطلبات المعلقة ونتغير معه
  const pendingCount = activeOrders.filter((o) => o.status === "Pending").length;
  const prevPendingRef = useRef(pendingCount);
  useEffect(() => {
    if (pendingCount > prevPendingRef.current) {
      playSound("add");
      triggerHaptic("medium");
      useToastStore.getState().info("🔔 طلب جديد وارد!");
    }
    prevPendingRef.current = pendingCount;
  }, [pendingCount]);

  // ✅ تفعيل/تعطيل المطعم — كان الخطأ يُبلَع بصمت (كتابة مباشرة بلا معالجة)
  const handleToggleActive = async () => {
    if (!myRestaurant) return;
    try {
      await toggleRestaurantActive(myRestaurant.id);
      useToastStore.getState().success(myRestaurant.active ? "تم إغلاق المطعم مؤقتاً" : "المطعم مفتوح الآن 🎉");
    } catch (error: any) {
      useToastStore.getState().error(
        error?.code === "permission-denied"
          ? "تم الرفض — تأكد من نشر أحدث قواعد Firestore"
          : `تعذّر التغيير: ${error?.message || "خطأ غير معروف"}`,
      );
    }
  };

  const handleLogout = async () => { await logoutUser(); router.push("/"); };
  const handleTransition = async (orderId: string, newStatus: OrderStatus) => {
    setActingOn(orderId);
    const result = await updateOrderStatus(orderId, newStatus);
    setActingOn(null);
    if (!result.ok && result.message) useToastStore.getState().error(result.message);
  };

  if (!myRestaurant) {
    return (
      <AppShell hideNav hideHeader>
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Store className="size-10 text-foreground-muted opacity-30" />
          <p className="text-sm font-bold text-foreground-muted">لا يوجد مطعم مرتبط بحسابك بعد.</p>
          <button type="button" onClick={handleLogout} className="mt-4 flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-xs font-bold">
            <LogOut className="size-4" /> تسجيل الخروج
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav hideHeader>
      <div className="mb-4 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold">
            <Store className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold">{myRestaurant.name}</h1>
            <p className="text-xs text-foreground-muted">{myRestaurant.active ? "المطعم مفتوح" : "المطعم مغلق"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* ✅ زر إغلاق/فتح المطعم */}
          <button
            type="button"
            onClick={handleToggleActive}
            className={`no-select touch-target glass flex size-11 items-center justify-center rounded-xl ${myRestaurant.active ? "text-danger" : "text-accent"}`}
            title={myRestaurant.active ? "إغلاق المطعم" : "فتح المطعم"}
          >
            <Power className="size-5" />
          </button>
          <button type="button" onClick={handleLogout} className="no-select touch-target glass flex size-11 items-center justify-center rounded-xl text-foreground-muted hover:text-primary" title="تسجيل الخروج">
            <LogOut className="size-5" />
          </button>
        </div>
      </div>

      {/* ✅ إحصائيات اليوم — نظرة سريعة للأداء دون فتح لوحة الأدمن */}
      <div className="glass mb-5 grid grid-cols-3 gap-2 rounded-2xl p-4 text-center">
        <div>
          <p className="text-xl font-extrabold text-primary">{todayNewCount}</p>
          <p className="text-[11px] font-bold text-foreground-muted">طلبات اليوم</p>
        </div>
        <div>
          <p className="text-xl font-extrabold text-accent">{formatPrice(todayRevenue)}</p>
          <p className="text-[11px] font-bold text-foreground-muted">إيرادات اليوم</p>
        </div>
        <div>
          <p className="text-xl font-extrabold text-amber-400">{activeOrders.length}</p>
          <p className="text-[11px] font-bold text-foreground-muted">قيد التنفيذ</p>
        </div>
      </div>

      <div className="mb-5 flex rounded-2xl bg-secondary p-1 border border-glass-border">
        <button type="button" onClick={() => setTab("active")} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${tab === "active" ? "bg-primary text-white" : "text-foreground-muted"}`}>
          الطلبات الحالية ({activeOrders.length})
        </button>
        <button type="button" onClick={() => setTab("history")} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${tab === "history" ? "bg-primary text-white" : "text-foreground-muted"}`}>
          السجل ({historyOrders.length})
        </button>
      </div>

      <section className="space-y-3 pb-8">
        {visibleOrders.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            <ChefHat className="mx-auto size-10 mb-2 opacity-30" />
            <p className="text-sm font-bold">{tab === "active" ? "لا يوجد طلبات حالياً" : "لا يوجد سجل بعد"}</p>
          </div>
        ) : (
          visibleOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const isActing = actingOn === order.id;
            return (
              <div key={order.id} className="glass rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono bg-primary/15 text-primary px-2 py-0.5 rounded-md font-bold">#{order.id.slice(-6)}</span>
                    <h3 className="font-bold text-base mt-1">{order.customerName}</h3>
                    <span className="text-[11px] font-bold text-foreground-muted">{STATUS_LABELS_AR[order.status]}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-sm font-extrabold text-primary">{formatPrice(order.total)}</span>
                    {order.customerPhone && (
                      <a href={`tel:${order.customerPhone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/20 text-accent text-xs font-bold">
                        <Phone className="size-3.5" /> اتصال
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${order.paymentMethod === "CASH" ? "bg-amber-500/15 text-amber-500" : "bg-emerald-500/15 text-emerald-500"}`}>
                    <Wallet className="size-3" />
                    {order.paymentMethod === "CASH" ? "كاش" : "مدفوع مسبقاً"}
                  </span>
                </div>

                <button type="button" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)} className="text-xs flex items-center gap-1 text-foreground-muted hover:text-white">
                  {isExpanded ? "إخفاء الأصناف" : "عرض الأصناف"}
                  {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-glass-border pt-2 space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col py-1 border-b border-glass-border last:border-0">
                        <div className="flex justify-between text-xs">
                          <span className="text-foreground font-bold">{item.quantity}x {item.name}</span>
                          <span className="font-mono text-foreground-muted">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                        {item.notes && <span className="text-[11px] text-amber-400 mt-0.5">📝 {item.notes}</span>}
                      </div>
                    ))}
                    <div className="flex items-start gap-2 pt-2 text-xs text-foreground-muted">
                      <Clock className="size-3.5 shrink-0 mt-0.5" />
                      <span>{order.deliveryAddressDetails}</span>
                    </div>
                  </div>
                )}

                {order.status === "Pending" && (
                  <div className="border-t border-glass-border pt-3 flex gap-2">
                    <button type="button" disabled={isActing} onClick={() => handleTransition(order.id, "Accepted")} className="no-select touch-target flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white disabled:opacity-60">
                      <PackageCheck className="size-4" /> قبول الطلب
                    </button>
                    <button type="button" disabled={isActing} onClick={() => handleTransition(order.id, "Cancelled")} className="no-select touch-target flex items-center justify-center gap-2 rounded-xl bg-red-500/15 text-red-500 px-4 py-2.5 text-xs font-bold disabled:opacity-60">
                      <Ban className="size-4" /> رفض
                    </button>
                  </div>
                )}

                {order.status === "Accepted" && (
                  <div className="border-t border-glass-border pt-3 flex gap-2">
                    <button type="button" disabled={isActing} onClick={() => handleTransition(order.id, "Preparing")} className="no-select touch-target flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white disabled:opacity-60">
                      <ChefHat className="size-4" /> بدء التحضير
                    </button>
                    <button type="button" disabled={isActing} onClick={() => handleTransition(order.id, "Cancelled")} className="no-select touch-target flex items-center justify-center gap-2 rounded-xl bg-red-500/15 text-red-500 px-4 py-2.5 text-xs font-bold disabled:opacity-60">
                      <Ban className="size-4" /> إلغاء
                    </button>
                  </div>
                )}

                {order.status === "Preparing" && (
                  <div className="border-t border-glass-border pt-3">
                    <button type="button" disabled={isActing} onClick={() => handleTransition(order.id, "Ready")} className="no-select touch-target w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white disabled:opacity-60">
                      <PackageCheck className="size-4" /> الطلب جاهز
                    </button>
                  </div>
                )}

                {order.status === "Ready" && (
                  <div className="border-t border-glass-border pt-3">
                    <p className="mb-2 text-center text-xs font-bold text-foreground-muted">بانتظار استلام مندوب...</p>
                    {/* ✅ "اطلب مندوب" — Push لكل المندوبين المسجلين للإشعارات */}
                    <button
                      type="button"
                      disabled={requestingCourierFor === order.id}
                      onClick={async () => {
                        setRequestingCourierFor(order.id);
                        const result = await requestCourierForOrder(order.id);
                        setRequestingCourierFor(null);
                        if (result.ok) {
                          useToastStore.getState().success(result.message || "تم إرسال الطلب للمندوبين");
                        } else {
                          useToastStore.getState().error(result.message || "تعذّر إرسال الطلب");
                        }
                      }}
                      className="no-select touch-target w-full rounded-xl bg-secondary py-2.5 text-xs font-bold text-primary transition active:scale-95 disabled:opacity-60"
                    >
                      {requestingCourierFor === order.id
                        ? "جارٍ إرسال الطلب…"
                        : "🛵 اطلب مندوب دلفري"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}

export default function VendorDashboard() {
  return (
    <RequireRole role="vendor">
      <VendorDashboardContent />
    </RequireRole>
  );
}
