"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { ScratchCard } from "@/components/promo/ScratchCard";
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
  } = useAppStore();

  const { subtotal, discount, deliveryFee, total } = getCartTotal();

  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  const isAuthenticated = Boolean(user);
  const hasLocation = Boolean(user && user.address?.trim());
  const canCheckout = Boolean(
    isAuthenticated && hasLocation && cart.length > 0,
  );
  const cartRestaurant = getRestaurant(cartRestaurantId || "");

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
                          <p className="text-xs text-foreground-muted">
                            {dish.category}
                          </p>
                          <p className="text-sm text-primary">
                            {formatPrice(dish.price)}
                          </p>
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
                      {/* ✅ Touch targets 44px */}
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

          <div className="glass mb-5 rounded-3xl p-4" dir="rtl">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <p className="text-sm font-bold">عنوان التوصيل</p>
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
                <p className="text-sm text-foreground">
                  {user?.address || "لم يتم تحديد عنوان"}
                </p>
                {user?.lat != null && (
                  <p className="mt-1 text-xs text-foreground-muted">
                    GPS: {user.lat.toFixed(5)}, {user.lng?.toFixed(5)}
                  </p>
                )}
                {!hasLocation && (
                  <button
                    type="button"
                    onClick={() => router.push("/profile")}
                    className="no-select touch-target mt-3 w-full rounded-xl bg-primary/15 py-3 text-sm font-bold text-primary"
                  >
                    أضف عنوان التوصيل من الملف الشخصي
                  </button>
                )}
              </>
            )}
          </div>

          <div className="mb-5">
            <ScratchCard />
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
            label={
              !isAuthenticated
                ? "يتطلب تسجيل الدخول"
                : !hasLocation
                  ? "أضف عنوان التوصيل"
                  : "اسحب لتأكيد الطلب"
            }
            onConfirm={handleConfirm}
          />
        </>
      )}
    </AppShell>
  );
}
