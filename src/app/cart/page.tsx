// src/app/cart/page.tsx
// ============================================================================
// التعديلات الجديدة:
// - ✅ حُذف <ScratchCard /> نهائياً (كان يفعّل كود "ZEST30" المخفي تلقائياً
//   بميكانيكية "اخدش واربح"). خانة كود الخصم اليدوية بقيت كما هي بالأسفل.
// - ✅ العنوان صار موحّداً مع صفحة البروفايل: يُملأ تلقائياً من
//   user.address عند فتح السلة إن لم يكن قد كُتب شيء بعد، مع زر
//   "استخدام عنواني المحفوظ" وعرض حالة GPS إن وُجدت إحداثيات محفوظة.
// - ✅ رسائل أوضح لحالة عدم وجود مناطق توصيل بعد.
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, MapPin, Check, LocateFixed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { SwipeButton } from "@/components/checkout/SwipeButton";
import { useAppStore } from "@/store/useAppStore";
import { formatPrice } from "@/constants/currency";

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    cartRestaurantId,
    appliedPromo,
    user,
    getDish,
    getRestaurant,
    updateQuantity,
    removeFromCart,
    applyPromo,
    placeOrder,
    getCartTotal,
    zones,
    selectedZoneId,
    setSelectedZoneId,
    deliveryAddressDetails,
    setDeliveryAddressDetails,
    orderNotes,
    setOrderNotes,
  } = useAppStore();

  const { subtotal, discount, deliveryFee, total } = getCartTotal();

  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  const isAuthenticated = Boolean(user);

  // ✅ إن لم تُختر منطقة بعد ووُجدت مناطق متاحة، اختر أول منطقة تلقائياً
  useEffect(() => {
    if (!selectedZoneId && zones.length > 0) {
      setSelectedZoneId(zones[0].id);
    }
  }, [zones, selectedZoneId, setSelectedZoneId]);

  // ✅ توحيد العنوان مع البروفايل: إن كان عند المستخدم عنوان محفوظ ولم يكتب
  // شيئاً بعد بهذه الجلسة، نعبّئه تلقائياً (يقدر يعدّله وقتها براحته)
  useEffect(() => {
    if (!deliveryAddressDetails && user?.address) {
      setDeliveryAddressDetails(user.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.address]);

  const hasZone = Boolean(selectedZoneId);
  const hasAddressDetails = Boolean(deliveryAddressDetails.trim().length >= 3);
  const canCheckout = Boolean(
    isAuthenticated && hasZone && hasAddressDetails && cart.length > 0,
  );
  const cartRestaurant = getRestaurant(cartRestaurantId || "");

  const useSavedAddress = () => {
    if (user?.address) setDeliveryAddressDetails(user.address);
  };

  const handleConfirm = async () => {
    const result = await placeOrder();
    if (!result.ok) {
      setCheckoutError(result.message || "");
      return false;
    }
    setCheckoutError("");
    router.push("/order-tracking");
    return true;
  };

  const visibleCart = cart.filter((item) => getDish(item.dishId));

  const checkoutLabel = !isAuthenticated
    ? "يتطلب تسجيل الدخول"
    : !hasZone
      ? "اختر منطقة التوصيل"
      : !hasAddressDetails
        ? "أضف تفاصيل العنوان"
        : "اسحب لتأكيد الطلب";

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-foreground">السلة</h1>
        {cartRestaurant && (
          <p className="mt-1 text-sm text-foreground-muted">
            تطلب من{" "}
            <span className="font-semibold text-primary">
              {cartRestaurant.name}
            </span>
          </p>
        )}
      </div>

      {visibleCart.length === 0 ? (
        <div className="glass space-y-3 rounded-3xl px-5 py-10 text-center">
          <p className="text-base font-semibold text-foreground">
            سلتك فارغة
          </p>
          <p className="text-sm text-foreground-muted">
            اختر مطعمًا، أضف أطباقًا، ثم اسحب للتأكيد.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="no-select touch-target mt-2 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            تصفح المطاعم
          </button>
        </div>
      ) : (
        <>
          <ul className="mb-5 space-y-3">
            <AnimatePresence initial={false}>
              {visibleCart.map((item) => {
                const dish = getDish(item.dishId)!;
                return (
                  <motion.li
                    key={item.dishId}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    className="glass flex gap-3 rounded-3xl p-3"
                  >
                    <div
                      className={`size-16 shrink-0 rounded-2xl bg-gradient-to-br ${dish.gradient || "from-gray-600 to-gray-800"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-foreground">
                            {dish.name}
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-amber-400 bg-amber-400/10 rounded-md px-1.5 py-0.5 mt-0.5 w-fit">
                              📝 {item.notes}
                            </p>
                          )}
                          <p className="text-xs text-foreground-muted">
                            {dish.category}
                          </p>
                          <p className="text-sm text-primary">
                            {formatPrice(dish.price + (item.selectedAddons?.reduce((s, a) => s + a.price, 0) || 0))}
                          </p>
                          {item.selectedAddons && item.selectedAddons.length > 0 && (
                            <p className="text-[10px] text-foreground-muted">
                              + {item.selectedAddons.map(a => a.name).join("، ")}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.dishId)}
                          className="no-select touch-target flex size-11 items-center justify-center rounded-xl text-foreground-muted hover:text-primary"
                          aria-label={`إزالة ${dish.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/5 p-1">
                        <button
                          type="button"
                          className="no-select touch-target flex size-11 items-center justify-center rounded-full active:bg-white/10 transition-colors"
                          onClick={() =>
                            updateQuantity(item.dishId, item.quantity - 1)
                          }
                          aria-label="تقليل الكمية"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="no-select touch-target flex size-11 items-center justify-center rounded-full active:bg-white/10 transition-colors"
                          onClick={() =>
                            updateQuantity(item.dishId, item.quantity + 1)
                          }
                          aria-label="زيادة الكمية"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>

          {/* قسم اختيار منطقة التوصيل + تفاصيل العنوان (موحّد مع البروفايل) */}
          <div className="glass mb-5 rounded-3xl p-4" dir="rtl">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <p className="text-sm font-bold">التوصيل</p>
            </div>

            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => router.push("/login?next=/cart")}
                className="no-select touch-target w-full rounded-xl bg-primary/15 py-3 text-sm font-bold text-primary"
              >
                سجّل الدخول لإتمام الطلب
              </button>
            ) : (
              <>
                <p className="mb-2 text-xs font-bold text-foreground-muted">
                  اختر منطقتك
                </p>
                {zones.length === 0 ? (
                  <p className="mb-4 rounded-xl bg-secondary px-3 py-2.5 text-xs text-foreground-muted">
                    لا توجد مناطق توصيل مُضافة بعد من الإدارة. تواصل معنا أو
                    حاول لاحقاً.
                  </p>
                ) : (
                  <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <ul className="flex w-max gap-2 pb-1">
                      {zones.map((zone) => {
                        const isSelected = selectedZoneId === zone.id;
                        return (
                          <li key={zone.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedZoneId(zone.id)}
                              className={`no-select touch-target flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-bold transition-all ${
                                isSelected
                                  ? "bg-primary text-white shadow-[0_6px_20px_rgb(255_107_53_/_0.35)]"
                                  : "glass text-foreground-muted hover:text-foreground"
                              }`}
                            >
                              {isSelected && <Check className="size-3.5" />}
                              {zone.name} — {formatPrice(zone.deliveryFee)}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground-muted">
                    تفاصيل العنوان (اسم الشارع، رقم المبنى، الطابق...)
                  </p>
                  {user?.address && (
                    <button
                      type="button"
                      onClick={useSavedAddress}
                      className="flex items-center gap-1 text-[11px] font-bold text-accent"
                    >
                      <LocateFixed className="size-3" />
                      استخدام عنواني المحفوظ
                    </button>
                  )}
                </div>
                <textarea
                  value={deliveryAddressDetails}
                  onChange={(e) => setDeliveryAddressDetails(e.target.value)}
                  placeholder="مثال: شارع رفيديا، عمارة الأمل، طابق 2"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-foreground-muted/60"
                />
                {(user?.lat != null || user?.locationLabel) && (
                  <p className="mt-1.5 text-[11px] text-foreground-muted">
                    📍 موقعك الدقيق محفوظ ({user.locationLabel || "GPS"}) —
                    سيُرفق تلقائياً مع الطلب لمساعدة المندوب على الوصول.
                  </p>
                )}
                {!user?.lat && (
                  <p className="mt-1.5 text-[11px] text-foreground-muted">
                    لتحديد موقعك بدقة أكبر عبر GPS، فعّله من صفحة{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/profile")}
                      className="font-bold text-accent underline"
                    >
                      الملف الشخصي
                    </button>
                    .
                  </p>
                )}
              </>
            )}
          </div>

          <div className="glass mb-5 rounded-3xl p-4">
            <p className="mb-2 text-xs font-bold text-foreground-muted">
              ملاحظات عامة للطلب (للمطعم أو السائق)
            </p>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="مثال: اتصل بي قبل الوصول، الباب مفتوح من اليمين..."
              rows={2}
              className="w-full resize-none rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none placeholder:text-foreground-muted/60"
            />
          </div>

          <div className="glass mb-5 flex gap-2 rounded-3xl p-3">
            <input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="كود الخصم"
              className="min-w-0 flex-1 rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const result = applyPromo(promoInput);
                setPromoMsg(result.message);
              }}
              className="no-select touch-target rounded-xl bg-primary px-4 text-sm font-bold text-white"
            >
              تطبيق
            </button>
          </div>
          {promoMsg && (
            <p className="mb-4 text-center text-xs text-foreground-muted">
              {promoMsg}
            </p>
          )}

          <div className="glass mb-5 space-y-2 rounded-3xl p-4 text-sm">
            <div className="flex justify-between text-foreground-muted">
              <span>المجموع الفرعي</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-foreground-muted">
              <span>التوصيل</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-accent">
                <span>خصم ({appliedPromo})</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-glass-border pt-2 text-base font-extrabold text-foreground">
              <span>الإجمالي</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>

          {checkoutError && (
            <p className="mb-3 text-center text-sm font-semibold text-primary">
              {checkoutError}
            </p>
          )}

          <SwipeButton
            disabled={!canCheckout}
            label={checkoutLabel}
            onConfirm={handleConfirm}
          />
        </>
      )}
    </AppShell>
  );
}
