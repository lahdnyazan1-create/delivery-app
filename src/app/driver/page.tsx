// src/app/driver/page.tsx
// ============================================================================
// التعديلات:
// - ✅ claimOrder و updateOrderStatus يمرّان الآن عبر src/lib/orders.ts
//   (Cloud Functions) بدل الكتابة المباشرة على Firestore.
// - ✅ استُبدل الـ <select> الذي كان يعرض كل الحالات الست بزر واحد "تم التسليم"،
//   لأن المندوب لا يملك صلاحياً سوى الانتقال Out For Delivery -> Delivered
//   (يُفرض هذا الآن من السيرفر عبر STATUS_TRANSITIONS، فلا داعي لعرض خيارات
//   ستُرفض على أي حال).
// - ✅ يعرض العنوان من deliveryAddressDetails بدل الحقل القديم deliveryAddress.
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  LogOut,
  MapPin,
  CheckCircle2,
  Phone,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RequireRole } from "@/components/auth/RequireRole";
import { useAppStore } from "@/store/useAppStore";
import { useToastStore } from "@/store/useToastStore";
import { getMyReferralCode, respondToCourierInvite } from "@/lib/orders";
import { formatPrice } from "@/constants/currency";

function DriverDashboardContent() {
  const router = useRouter();
  const showError = useToastStore((s) => s.error);
  const {
    orders,
    updateOrderStatus,
    claimOrder,
    drivers,
    user,
    logoutUser,
  } = useAppStore();
  const [tab, setTab] = useState<"my-orders" | "available">("my-orders");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<string | null>(null);

  // ✅ نظام كود الإحالة — كود الدعوة الخاص بالسائق + الدعوات المعلقة الموجهة له
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyReferralCode().then((res) => {
      if (!cancelled && res.ok && res.referralCode) setMyReferralCode(res.referralCode);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingInvites = useMemo(
    () =>
      orders.filter(
        (o) => o.preferredCourierId === user?.uid && o.courierInviteStatus === "pending",
      ),
    [orders, user],
  );

  const handleInviteResponse = async (orderId: string, accept: boolean) => {
    setRespondingTo(orderId);
    const result = await respondToCourierInvite(orderId, accept);
    setRespondingTo(null);
    if (result.ok) {
      useToastStore.getState().success(result.message || "تم");
      if (accept) setTab("my-orders");
    } else {
      useToastStore.getState().error(result.message || "تعذّر تنفيذ الرد");
    }
  };
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const currentDriver = useMemo(
    () => drivers.find((d) => d.id === user?.uid),
    [drivers, user],
  );

  const myOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.courierId === user?.uid &&
          o.status !== "Delivered" &&
          o.status !== "Cancelled",
      ),
    [orders, user],
  );

  // ✅ الطلبات المتاحة للاستلام هي فقط تلك بحالة "Ready" بدون مندوب —
  // (Pending/Preparing لم تعد متاحة للاستلام أصلاً لأن السيرفر يرفضها الآن)
  const availableOrders = useMemo(
    () => orders.filter((o) => !o.courierId && o.status === "Ready"),
    [orders],
  );

  const handleClaim = async (orderId: string) => {
    if (!user) return;
    setClaiming(orderId);
    const result = await claimOrder(orderId);
    setClaiming(null);
    if (result?.ok) {
      setTab("my-orders");
    } else if (result?.message) {
      showError(result.message);
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    setDelivering(orderId);
    const result = await updateOrderStatus(orderId, "Delivered");
    setDelivering(null);
    if (!result.ok && result.message) {
      showError(result.message);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/");
  };

  const visibleOrders = tab === "my-orders" ? myOrders : availableOrders;

  return (
    <AppShell hideNav hideHeader>
      {/* الهيدر */}
      <div className="mb-4 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/20 text-primary font-bold">
            <Bike className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold">
              {user?.displayName || "المندوب"}
            </h1>
            <p className="text-xs text-foreground-muted">
              {currentDriver
                ? `المركبة: ${currentDriver.vehicle}`
                : "لا يوجد بروفايل مركبة مرتبط بحسابك بعد"}
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

      {/* ✅ دعوات الأولوية المعلّقة — للسائق المدعو 5 دقائق للقبول قبل تحرير الطلب */}
      {pendingInvites.length > 0 && (
        <div className="mb-5 space-y-3">
          {pendingInvites.map((invite) => (
            <div key={invite.id} className="glass rounded-2xl border border-primary/40 p-4" role="alert">
              <p className="text-sm font-extrabold text-primary">🔔 دعوة أولوية من زبونك!</p>
              <p className="mt-1 text-xs text-foreground-muted">
                طلب #{invite.id?.slice(0, 6)} من {invite.customerName} — لديك 5 دقائق للقبول قبل
                تحرير الطلب لجميع المندوبين.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={respondingTo === invite.id}
                  onClick={() => handleInviteResponse(invite.id, true)}
                  className="flex-1 rounded-xl bg-accent py-2 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
                >
                  {respondingTo === invite.id ? "جارٍ…" : "قبول الدعوة"}
                </button>
                <button
                  type="button"
                  disabled={respondingTo === invite.id}
                  onClick={() => handleInviteResponse(invite.id, false)}
                  className="flex-1 rounded-xl border border-glass-border bg-secondary py-2 text-xs font-bold text-foreground-muted transition active:scale-95 disabled:opacity-50"
                >
                  رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ كود الدعوة الخاص بالسائق — يشاركه مع زبائنه المفضلين */}
      {myReferralCode && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(myReferralCode).then(() =>
              useToastStore.getState().success("تم نسخ كود الدعوة"),
            );
          }}
          className="glass mb-5 flex w-full items-center justify-between rounded-2xl p-4 text-right transition active:scale-[0.98]"
        >
          <div>
            <p className="text-xs font-bold text-foreground-muted">كود الدعوة الخاص بك</p>
            <p dir="ltr" className="mt-1 text-lg font-extrabold tracking-widest text-primary">
              {myReferralCode}
            </p>
          </div>
          <span className="rounded-xl bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary">
            اضغط للنسخ 📋
          </span>
        </button>
      )}

      {/* التبويبات */}
      <div className="mb-5 flex rounded-2xl bg-secondary p-1 border border-glass-border">
        <button
          type="button"
          onClick={() => setTab("my-orders")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            tab === "my-orders"
              ? "bg-primary text-white"
              : "text-foreground-muted"
          }`}
        >
          طلباتي ({myOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("available")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            tab === "available"
              ? "bg-primary text-white"
              : "text-foreground-muted"
          }`}
        >
          طلبات متاحة ({availableOrders.length})
        </button>
      </div>

      {/* قائمة الطلبات */}
      <section className="space-y-3 pb-8">
        {visibleOrders.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            <CheckCircle2 className="mx-auto size-10 mb-2 opacity-30" />
            <p className="text-sm font-bold">
              {tab === "my-orders"
                ? "لا يوجد طلبات مسندة لك حالياً"
                : "لا يوجد طلبات متاحة الآن"}
            </p>
          </div>
        ) : (
          visibleOrders.map((order) => {
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
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-primary">
                      {formatPrice(order.total)}
                    </span>
                    {order.customerPhone && (
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/20 text-accent text-xs font-bold"
                      >
                        <Phone className="size-3.5" /> اتصال
                      </a>
                    )}
                  </div>
                </div>

                {/* شارة طريقة الدفع — مهمة للمندوب ليعرف إن كان سيقبض كاش */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                      order.paymentMethod === "CASH"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-emerald-500/15 text-emerald-500"
                    }`}
                  >
                    <Wallet className="size-3" />
                    {order.paymentMethod === "CASH"
                      ? "الدفع كاش عند الاستلام"
                      : "مدفوع مسبقاً"}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-xs text-foreground-muted">
                  <MapPin className="size-4 shrink-0 text-primary mt-0.5" />
                  <span>
                    عنوان التوصيل:{" "}
                    {order.deliveryAddressDetails ||
                      order.deliveryAddress ||
                      "غير محدد"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setExpandedOrderId(isExpanded ? null : order.id)
                  }
                  className="text-xs flex items-center gap-1 text-foreground-muted hover:text-white"
                >
                  {isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل والأصناف"}
                  {isExpanded ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-glass-border pt-2 space-y-1">
                    <p className="text-xs font-bold text-foreground-muted">
                      محتويات الطلب:
                    </p>
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs py-0.5"
                      >
                        <span className="text-foreground">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-mono text-foreground-muted">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "available" ? (
                  <button
                    type="button"
                    onClick={() => handleClaim(order.id)}
                    disabled={claiming === order.id}
                    className="no-select touch-target w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-white disabled:opacity-60"
                  >
                    <PackageCheck className="size-4" />
                    {claiming === order.id
                      ? "جارِ الاستلام..."
                      : "استلام الطلب"}
                  </button>
                ) : (
                  <div className="border-t border-glass-border pt-3">
                    {order.status === "OutForDelivery" ? (
                      <button
                        type="button"
                        onClick={() => handleMarkDelivered(order.id)}
                        disabled={delivering === order.id}
                        className="no-select touch-target w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                      >
                        <CheckCircle2 className="size-4" />
                        {delivering === order.id
                          ? "جارِ التحديث..."
                          : "تم التسليم"}
                      </button>
                    ) : (
                      <p className="text-center text-xs text-foreground-muted">
                        الحالة الحالية: {order.status}
                      </p>
                    )}
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

export default function DriverDashboard() {
  return (
    <RequireRole role="courier">
      <DriverDashboardContent />
    </RequireRole>
  );
}
