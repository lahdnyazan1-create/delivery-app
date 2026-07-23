"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { ScratchCard } from "@/components/promo/ScratchCard";
import { SwipeButton } from "@/components/checkout/SwipeButton";
import { useApp } from "@/context/AppContext";

export default function CartPage() {
  const router = useRouter();
  const {
    state: { cart, appliedPromo, user },
    cartRestaurant,
    getDish,
    updateQuantity,
    deliveryFee,
    removeFromCart,
    subtotal,
    discount,
    total,
    placeOrder,
    applyPromo,
  } = useApp();  

  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  const isAuthenticated = Boolean(user);
  const hasLocation = Boolean(user && user.address?.trim());
  const canCheckout = Boolean(isAuthenticated && hasLocation && cart.length > 0);

  const handleConfirm = () => {
    const result = placeOrder();
    if (!result.ok) {
      setCheckoutError(result.message);
      return false;
    }
    setCheckoutError("");
    window.setTimeout(() => router.push("/order-tracking"), 650);
    return true;
  };

  const grandTotal = total + deliveryFee;

  const visibleCart = cart.filter((item) => getDish(item.dishId));

  return (
    <AppShell>
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-foreground">Cart</h1>
        {cartRestaurant && (
          <p className="mt-1 text-sm text-foreground-muted">
            Ordering from{" "}
            <span className="font-semibold text-primary">
              {cartRestaurant.name}
            </span>
          </p>
        )}
      </div>

      {visibleCart.length === 0 ? (
        <div className="glass space-y-3 rounded-3xl px-5 py-10 text-center">
          <p className="text-base font-semibold text-foreground">
            Your cart is empty
          </p>
          <p className="text-sm text-foreground-muted">
            Pick a restaurant, add dishes, then swipe to confirm.
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="no-select touch-target mt-2 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            Browse restaurants
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
                      className={`size-16 shrink-0 rounded-2xl bg-gradient-to-br ${dish.gradient}`}
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
                            ${dish.price.toFixed(2)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.dishId)}
                          className="no-select touch-target flex size-10 items-center justify-center rounded-xl text-foreground-muted hover:text-primary"
                          aria-label={`Remove ${dish.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/5 p-1">
                        <button
                          type="button"
                          className="no-select touch-target flex size-9 items-center justify-center rounded-full"
                          onClick={() =>
                            updateQuantity(item.dishId, item.quantity - 1)
                          }
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="no-select touch-target flex size-9 items-center justify-center rounded-full"
                          onClick={() =>
                            updateQuantity(item.dishId, item.quantity + 1)
                          }
                          aria-label="Increase quantity"
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
                onClick={() =>
                  router.push("/login?next=/cart")
                }
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
              placeholder="Promo code"
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
              Apply
            </button>
          </div>
          {promoMsg && (
            <p className="mb-4 text-center text-xs text-foreground-muted">
              {promoMsg}
            </p>
          )}

          <div className="glass mb-5 space-y-2 rounded-3xl p-4 text-sm">
            <div className="flex justify-between text-foreground-muted">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-foreground-muted">
              <span>Delivery</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-accent">
                <span>Discount ({appliedPromo})</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-glass-border pt-2 text-base font-extrabold text-foreground">
              <span>Total</span>
              <span className="text-primary">${grandTotal.toFixed(2)}</span>
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
                ? "Login required"
                : !hasLocation
                  ? "Add delivery address"
                  : "Swipe to place order"
            }
            onConfirm={handleConfirm}
          />
        </>
      )}
    </AppShell>
  );
}
