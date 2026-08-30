// src/app/order-tracking/page.tsx
// ============================================================================
// التعديلات:
// - ✅ أُضيفت "Accepted" لقائمة STEPS (كانت غائبة، نفس باق OrderStageTracker)
// - ✅ عرض deliveryAddressDetails بدل deliveryAddress المهجور
// - ✅ fallback: لو المستخدم عمل Refresh للصفحة، activeOrder بالمتجر بيصير
//   null (غير محفوظ محلياً)، فنجيب أحدث طلب غير منتهٍ من قائمة orders
//   (اللي بتوصل عبر subscribeToOrders) بدل ما نقول "لا يوجد طلب نشط" بالغلط
// ============================================================================

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Phone, XCircle, Star } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { AppShell } from "@/components/layout/AppShell";
import { OrderStageTracker } from "@/components/tracking/OrderStageTracker";
import { RatingDialog } from "@/components/restaurant/RatingDialog";
import { useAppStore } from "@/store/useAppStore";
import { useToastStore } from "@/store/useToastStore";
import { db } from "@/lib/firebase";
import { formatPrice } from "@/constants/currency";
import type { OrderStatus } from "@/types/database";

const STEPS: OrderStatus[] = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "OutForDelivery",
  "Delivered",
];

const STEP_LABELS: Record<OrderStatus, string> = {
  Pending: "قيد الانتظار",
  Accepted: "تم القبول من المطعم",
  Preparing: "قيد التحضير",
  Ready: "جاهز للتوصيل",
  OutForDelivery: "في الطريق إليك",
  Delivered: "تم التوصيل",
  Cancelled: "ملغي",
};

export default function OrderTrackingPage() {
  const router = useRouter();
  const {
    activeOrder,
    orders,
    setActiveOrder,
    user,
    subscribeToOrders,
    updateOrderStatus,
  } = useAppStore();
  const [cancelling, setCancelling] = useState(false);
  const [courierPhone, setCourierPhone] = useState<string | null>(null);
  // ✅ نافذة التقييم بعد استلام الطلب — تفتح تلقائياً مرة واحدة عند أول
  //    وصول للحالة Delivered بلا ratedAt، ويقدر المستخدم يعود إليها بزر
  const [ratingOpen, setRatingOpen] = useState(false);
  const ratingPromptShownRef = useRef<string | null>(null);

  // ✅ فتح نافذة التقييم تلقائياً فور تسليم الطلب (قبل أن يغادرها المستخدم)
  useEffect(() => {
    if (
      activeOrder?.status === "Delivered" &&
      activeOrder.id &&
      !activeOrder.ratedAt &&
      ratingPromptShownRef.current !== activeOrder.id
    ) {
      ratingPromptShownRef.current = activeOrder.id;
      setRatingOpen(true);
    }
  }, [activeOrder?.status, activeOrder?.id, activeOrder?.ratedAt]);

  // ✅ جلب هاتف المندوب للاتصال به أثناء التوصيل (قراءة ملف سائق مسموحة
  //    بالقواعد لأي مستخدم مسجل — استثناء كود الدعوة)
  useEffect(() => {
    setCourierPhone(null);
    const courierId = activeOrder?.courierId;
    if (activeOrder?.status === "OutForDelivery" && courierId) {
      getDoc(doc(db, "users", courierId))
        .then((snap) => setCourierPhone(snap.data()?.phone || null))
        .catch(() => setCourierPhone(null));
    }
  }, [activeOrder?.courierId, activeOrder?.status]);

  // ✅ إلغاء الطلب — الخادم يسمح للزبون صاحب الطلب بالإلغاء قبل التحضير
  const handleCancel = async () => {
    if (!activeOrder) return;
    const ok = await useToastStore.getState().confirm({
      title: "إلغاء الطلب؟",
      message: "سيتم إلغاء طلبك نهائياً ولا يمكن التراجع.",
      confirmText: "نعم، إلغاء الطلب",
      danger: true,
    });
    if (!ok) return;
    setCancelling(true);
    const result = await updateOrderStatus(activeOrder.id, "Cancelled");
    setCancelling(false);
    if (result.ok) {
      useToastStore.getState().success("تم إلغاء الطلب");
      setActiveOrder(null);
    } else {
      useToastStore.getState().error(result.message || "تعذّر الإلغاء");
    }
  };

  // ✅ يضمن وجود اشتراك مباشر بالطلبات حتى لو المستخدم فتح هذه الصفحة
  // مباشرة (رابط محفوظ / تحديث الصفحة) بدون المرور بشاشة السلة أولاً
  useEffect(() => {
    if (user?.uid) subscribeToOrders(user.uid, user.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ✅ عند تحديث الصفحة يفرغ activeOrder المؤقت بالمتجر — نعيد ربطه بأحدث
  // طلب غير منتهٍ (Delivered/Cancelled) من قائمة orders المشترك بها فعلياً
  useEffect(() => {
    if (!activeOrder && orders.length > 0) {
      const ongoing = orders.find(
        (o) => o.status !== "Delivered" && o.status !== "Cancelled",
      );
      if (ongoing) setActiveOrder(ongoing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder, orders]);

  if (!activeOrder) {
    return (
      <AppShell hideNav>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="no-select touch-target mb-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground-muted"
        >
          <ArrowLeft className="size-4" /> العودة للرئيسية
        </button>
        <div className="glass rounded-3xl px-5 py-10 text-center">
          <p className="font-bold">لا يوجد طلب نشط</p>
          <p className="mt-2 text-sm text-foreground-muted">
            قم بطلب من سلتك لبدء التتبع المباشر.
          </p>
          <Link
            href="/cart"
            className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            الذهاب للسلة
          </Link>
        </div>
      </AppShell>
    );
  }

  const stepIndex = STEPS.indexOf(activeOrder.status);
  const isCancelled = activeOrder.status === "Cancelled";

  return (
    <AppShell hideNav>
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="no-select touch-target flex size-11 items-center justify-center rounded-xl glass"
          aria-label="رجوع"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold">تتبع الطلب</h1>
          <p className="text-xs text-foreground-muted">
            {activeOrder.restaurantName}
            {activeOrder.etaMinutes != null && ` · الوقت المتوقع ~${activeOrder.etaMinutes} دقيقة`}
          </p>
        </div>
      </div>

      {/* ✅ حالة الإلغاء: سابقاً كانت تُعرض بقايا Steps كلها باهتة بلا أي
          تفسير للمستخدم — الآن بطاقة واضحة تشرح وتتيح طلباً جديداً */}
      {isCancelled ? (
        <div className="glass rounded-3xl px-5 py-10 text-center">
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-danger/15 text-danger">
            <XCircle className="size-7" aria-hidden />
          </span>
          <p className="text-lg font-extrabold">تم إلغاء هذا الطلب</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
            لم يُنفَّذ هذا الطلب — يمكنك إعادة الطلب من سلتك أو بدء طلب جديد
            وقتما تشاء.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            بدء طلب جديد
          </Link>
        </div>
      ) : (
        <div className="mb-5">
          <OrderStageTracker status={activeOrder.status} />
        </div>
      )}

      <ol className="glass mb-5 space-y-0 rounded-3xl p-4">
        {STEPS.map((step, i) => {
          const done = i <= stepIndex;
          const current = i === stepIndex;
          return (
            <li key={step} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-accent text-secondary"
                      : "bg-white/10 text-foreground-muted"
                  }`}
                >
                  {done ? <Check className="size-4" /> : i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    className={`mt-1 min-h-4 w-0.5 flex-1 ${
                      i < stepIndex ? "bg-accent" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
              <div className="pt-1">
                <p
                  className={`text-sm font-bold ${
                    current ? "text-primary" : "text-foreground"
                  }`}
                >
                  {STEP_LABELS[step]}
                </p>
                {current && (
                  <p className="text-xs text-foreground-muted">
                    يتحدّث فوراً عند تغيير الحالة من الإدارة.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="glass mb-4 rounded-3xl p-4">
        <p className="mb-1 text-sm font-bold">التوصيل إلى</p>
        <p className="text-sm text-foreground-muted">
          {activeOrder.customerPhone
            ? `${activeOrder.customerName} · ${activeOrder.customerPhone}`
            : activeOrder.customerName}
        </p>
        <p className="mt-1 text-sm text-foreground">
          {activeOrder.deliveryAddressDetails || activeOrder.deliveryAddress}
        </p>
      </div>

      {/* ✅ إجراءات حسب الحالة: الاتصال بالمندوب أثناء التوصيل + الإلغاء قبل التحضير */}
      <div className="mb-4 flex gap-2">
        {activeOrder.status === "OutForDelivery" && courierPhone && (
          <a
            href={`tel:${courierPhone}`}
            className="no-select touch-target flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-white transition active:scale-95"
          >
            <Phone className="size-4" aria-hidden /> الاتصال بالمندوب
          </a>
        )}
        {(activeOrder.status === "Pending" || activeOrder.status === "Accepted") && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="no-select touch-target flex flex-1 items-center justify-center gap-2 rounded-2xl border border-danger/40 bg-danger/10 py-3 text-sm font-bold text-danger transition active:scale-95 disabled:opacity-50"
          >
            <XCircle className="size-4" aria-hidden />
            {cancelling ? "جارٍ الإلغاء…" : "إلغاء الطلب"}
          </button>
        )}
        {/* ✅ بعد الاستلام: التقييم الحقيقي — يغيب الزر بعد التقييم (ratedAt) */}
        {activeOrder.status === "Delivered" && !activeOrder.ratedAt && (
          <button
            type="button"
            onClick={() => setRatingOpen(true)}
            className="no-select touch-target pulse-ring flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-white transition active:scale-95"
          >
            <Star className="size-4 fill-current" aria-hidden />
            قيّم طلبك
          </button>
        )}
        {activeOrder.status === "Delivered" && activeOrder.ratedAt && (
          <div className="glass flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-accent">
            <Star className="size-4 fill-current" aria-hidden />
            قيّمت الطلب
            {activeOrder.ratingStars != null && (
              <span className="font-extrabold">({activeOrder.ratingStars}/5)</span>
            )}
          </div>
        )}
      </div>

      <div className="glass rounded-3xl p-4">
        <p className="mb-1 text-sm font-bold">تفاصيل الطلب</p>
        <p className="mb-3 text-xs text-foreground-muted">
          من {activeOrder.restaurantName}
        </p>
        <ul className="mb-3 space-y-2">
          {activeOrder.items.map((item) => (
            <li
              key={item.dishId || item.id}
              className="flex justify-between text-sm text-foreground-muted"
            >
              <span>
                {item.quantity}× {item.name}
              </span>
              {/* ✅ سعر البند يشمل الإضافات (يحسبها الخادم) — سابقاً كان
                  مجموع البنود لا يطابق الإجمالي المعروض عند وجود إضافات */}
              <span>
                {formatPrice((item.price + (item.addonsPrice || 0)) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        {activeOrder.discount > 0 && (
          <p className="mb-1 flex justify-between text-sm text-accent">
            <span>خصم ({activeOrder.promoCode})</span>
            <span>-{formatPrice(activeOrder.discount)}</span>
          </p>
        )}
        <p className="flex justify-between border-t border-glass-border pt-2 text-base font-extrabold">
          <span>الإجمالي</span>
          <span className="text-primary">{formatPrice(activeOrder.total)}</span>
        </p>
      </div>

      {/* ✅ نافذة التقييم — تفتح تلقائياً عند الاستلام أو بزر "قيّم طلبك" */}
      <RatingDialog
        orderId={activeOrder.id}
        restaurantName={activeOrder.restaurantName}
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
      />
    </AppShell>
  );
}
