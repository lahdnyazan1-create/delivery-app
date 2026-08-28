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
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { formatPrice } from "@/constants/currency";
import type { Order } from "@/types/database";

function DriverDashboardContent() {
  const router = useRouter();
  const showError = useToastStore((s) => s.error);
  const {
    orders,
    updateOrderStatus,
    claimOrder,
    user,
    logoutUser,
  } = useAppStore();
  const [tab, setTab] = useState<"my-orders" | "available" | "earnings">("my-orders");
  const [claiming, setClaiming] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<string | null>(null);

  // ✅ نظام كود الإحالة — كود الدعوة الخاص بالسائق + الدعوات المعلقة الموجهة له
  const [myReferralCode, setMyReferralCode] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  // ✅ بروفايل المركبة: يُقرأ من مستند السائق الخاص به (القواعد تسمح له
  //    بقراءة مستنده فقط) — الاعتماد على drivers بالمتجر كان يعرض دائماً
  //    "لا يوجد بروفايل" لأن جلب المجموعة كاملة للأدمن حصراً
  const [myVehicle, setMyVehicle] = useState<string | null>(null);

  // ✅ المحفظة — الكاش الذي بحوزته والذي لم تُسوَّى بعد مع الإدارة
  const [wallet, setWallet] = useState<{ totalCashInHand: number; cashOrdersSinceSettlement: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) return;
    getDoc(doc(db, "drivers", user.uid))
      .then((snap) => {
        if (!cancelled && snap.exists()) setMyVehicle(snap.data()?.vehicle || null);
      })
      .catch(() => {});
    getDoc(doc(db, "driverWallets", user.uid))
      .then((snap) => {
        if (!cancelled && snap.exists()) {
          setWallet({
            totalCashInHand: snap.data()?.totalCashInHand || 0,
            cashOrdersSinceSettlement: snap.data()?.cashOrdersSinceSettlement || 0,
          });
        }
      })
      .catch(() => {});
    getMyReferralCode().then((res) => {
      if (!cancelled && res.ok && res.referralCode) setMyReferralCode(res.referralCode);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const pendingInvites = useMemo(
    () =>
      orders.filter(
        (o) => o.preferredCourierId === user?.uid && o.courierInviteStatus === "pending",
      ),
    [orders, user],
  );

  // ✅ عداد تنازلي حي لمهلة القبول (5 دقائق) — تكّ كل ثانية فقط أثناء
  //    وجود دعوات معلقة، ويُحوّل Timestamp/رقم الملي ثانية إلى نص متبقي
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    if (pendingInvites.length === 0) return;
    setNowTs(Date.now());
    const timer = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pendingInvites.length]);

  const inviteRemainingMs = (invite: Order): number => {
    const exp = invite.courierInviteExpiresAt;
    const expiresMs =
      exp && typeof exp === "object" && typeof exp.toMillis === "function"
        ? exp.toMillis()
        : typeof exp === "number"
          ? exp
          : 0;
    return Math.max(0, expiresMs - nowTs);
  };

  const formatRemaining = (ms: number): string => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

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

  // ✅ تجميع الطلبيات (v1): أثناء رحلة نشطة نقترح طلبات "Ready" من نفس
  //    منطقة التوصيل — المطاعم في نفس المربع السكني غالباً، فيستلم
  //    المندوب رحلتين بنفس الخروج
  const activeDeliveryZones = useMemo(
    () =>
      new Set(
        myOrders
          .filter((o) => o.status === "OutForDelivery")
          .map((o) => o.zoneId),
      ),
    [myOrders],
  );

  const batchSuggestions = useMemo(
    () =>
      availableOrders.filter(
        (o) =>
          o.zoneId && activeDeliveryZones.has(o.zoneId) && !myOrders.some((m) => m.id === o.id),
      ),
    [availableOrders, activeDeliveryZones, myOrders],
  );

  // ✅ سجل التوصيلات المكتملة + ملخص الأرباح — البيانات تصل أصلاً عبر
  //    اشتراك courierId (آخر 50) لكن كانت تُفلتر خارج الواجهة
  const deliveredHistory = useMemo(
    () => orders.filter((o) => o.courierId === user?.uid && o.status === "Delivered"),
    [orders, user],
  );
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const todayDelivered = useMemo(
    () => deliveredHistory.filter((o) => (o.createdAt || 0) >= todayStart),
    [deliveredHistory, todayStart],
  );
  const todayCash = todayDelivered.reduce((sum, o) => sum + (o.paymentMethod === "CASH" ? o.total : 0), 0);
  const totalDeliveredCash = deliveredHistory.reduce(
    (sum, o) => sum + (o.paymentMethod === "CASH" ? o.total : 0),
    0,
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
    // ✅ تأكيد قبل الإنهاء — نقرة واحدة خاطئة كانت تُغلق الطلب نهائياً
    const ok = await useToastStore.getState().confirm({
      title: "تأكيد تسليم الطلب؟",
      message: "تأكد من استلام الزبون للمبلغ الكامل قبل التأكيد — لا يمكن التراجع.",
      confirmText: "نعم، تم التسليم والقبض",
    });
    if (!ok) return;
    setDelivering(orderId);
    const result = await updateOrderStatus(orderId, "Delivered");
    setDelivering(null);
    if (result.ok) {
      useToastStore.getState().success("تم تسجيل التسليم 🎉");
      // إعادة قراءة المحفظة — الكاش المحصّل بحوزتك زاد
      if (user?.uid) {
        getDoc(doc(db, "driverWallets", user.uid))
          .then((snap) => {
            if (snap.exists()) {
              setWallet({
                totalCashInHand: snap.data()?.totalCashInHand || 0,
                cashOrdersSinceSettlement: snap.data()?.cashOrdersSinceSettlement || 0,
              });
            }
          })
          .catch(() => {});
      }
    } else if (result.message) {
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
              {myVehicle ? `المركبة: ${myVehicle}` : "لا يوجد بروفايل مركبة مرتبط بحسابك بعد"}
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
          {pendingInvites.map((invite) => {
            const remainingMs = inviteRemainingMs(invite);
            return (
            <div key={invite.id} className="glass rounded-2xl border border-primary/40 p-4" role="alert">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-extrabold text-primary">🔔 دعوة أولوية من زبونك!</p>
                {/* ✅ الوقت المتبقي للقبول قبل تحرير الطلب لجميع المندوبين */}
                <span
                  dir="ltr"
                  className={`shrink-0 rounded-lg px-2 py-1 font-mono text-sm font-extrabold ${
                    remainingMs > 0
                      ? "bg-primary/10 text-primary"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {remainingMs > 0 ? `⏳ ${formatRemaining(remainingMs)}` : "⌛ يُحرَّر الآن…"}
                </span>
              </div>
              <p className="mt-1 text-xs text-foreground-muted">
                طلب #{invite.id?.slice(0, 6)} من {invite.customerName} — اقبله قبل انتهاء المهلة
                وإلا سيتحرر الطلب لجميع المندوبين.
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
            );
          })}
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

      {/* ✅ تجميع الطلبيات — طلبات جاهزة بنفس منطقة رحلتك النشطة */}
      {tab === "my-orders" && batchSuggestions.length > 0 && (
        <div className="glass mb-5 rounded-2xl border border-accent/30 p-4">
          <p className="text-sm font-extrabold text-accent">📦 فرصة تجميع رحلة!</p>
          <p className="mt-1 text-xs text-foreground-muted">
            يوجد {batchSuggestions.length === 1 ? "طلب جاهز" : `${batchSuggestions.length} طلبات جاهزة`} في
            نفس منطقة توصيلك الحالية — استلمها معك في نفس الخروج ووفّر وقتاً ومحروقاً.
          </p>
          <div className="mt-3 space-y-2">
            {batchSuggestions.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{o.restaurantName} · طلب #{o.id?.slice(0, 6)}</p>
                  <p className="text-[11px] text-foreground-muted">{o.customerName} — {o.deliveryAddressDetails?.slice(0, 40)}</p>
                </div>
                <button
                  type="button"
                  disabled={claiming === o.id}
                  onClick={() => handleClaim(o.id)}
                  className="shrink-0 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
                >
                  {claiming === o.id ? "…" : "ضم للرحلة"}
                </button>
              </div>
            ))}
          </div>
        </div>
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
        <button
          type="button"
          onClick={() => setTab("earnings")}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            tab === "earnings"
              ? "bg-primary text-white"
              : "text-foreground-muted"
          }`}
        >
          الأرباح والسجل
        </button>
      </div>

      {/* ✅ تبويب الأرباح والسجل — الكاش بحوزة السائق + أداء اليوم + التوصيلات المكتملة */}
      {tab === "earnings" && (
        <section className="space-y-4 pb-8">
          <div className="glass rounded-2xl border border-amber-500/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground-muted">الكاش بحوزتك (لم تُسوَّى بعد)</p>
                <p className="mt-1 text-2xl font-extrabold text-amber-400">
                  {formatPrice(wallet?.totalCashInHand ?? totalDeliveredCash)}
                </p>
              </div>
              <Wallet className="size-8 text-amber-400/50" aria-hidden />
            </div>
            {wallet && (
              <p className="mt-2 text-[11px] text-foreground-muted">
                {wallet.cashOrdersSinceSettlement} طلب كاش منذ آخر تسوية مع الإدارة
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-accent">{todayDelivered.length}</p>
              <p className="mt-1 text-[11px] font-bold text-foreground-muted">توصيلات اليوم</p>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-accent">{formatPrice(todayCash)}</p>
              <p className="mt-1 text-[11px] font-bold text-foreground-muted">كاش اليوم</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-bold">سجل التوصيلات ({deliveredHistory.length})</h3>
            {deliveredHistory.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-xs text-foreground-muted">
                لا توجد توصيلات مكتملة بعد
              </div>
            ) : (
              <div className="space-y-2">
                {deliveredHistory.map((o) => (
                  <div key={o.id} className="glass flex items-center justify-between rounded-xl p-3 text-xs">
                    <div>
                      <p className="font-bold">{o.restaurantName}</p>
                      <p className="text-foreground-muted">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString("ar-EG") : ""} ·{" "}
                        {o.customerName}
                      </p>
                    </div>
                    <span className="font-extrabold text-primary">{formatPrice(o.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* قائمة الطلبات — تُعرض في تبويبي طلباتي/المتاحة فقط */}
      {tab !== "earnings" && (
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

                {/* ✅ فتح الموقع في تطبيق الخرائط — يظهر عند وجود إحداثيات GPS */}
                {tab === "my-orders" &&
                  order.status === "OutForDelivery" &&
                  order.customerLat != null &&
                  order.customerLng != null && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${order.customerLat},${order.customerLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-select touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 py-2 text-xs font-bold text-primary"
                    >
                      <MapPin className="size-3.5" aria-hidden /> فتح الموقع في الخرائط 🗺️
                    </a>
                  )}

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
      )}
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
