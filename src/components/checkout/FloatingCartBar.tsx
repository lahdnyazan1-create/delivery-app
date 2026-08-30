"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, MessageCircle } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useDataStore } from "@/store/useDataStore";
import { formatPrice } from "@/constants/currency";

// ============================================================================
// شريط السلة العائم + زر الدعم:
// - يظهر في كل صفحات التصفح (الرئيسية، المطعم، البحث…) فور إضافة أي صنف،
//   بما فيها صفحة المطعم (كانت مخفية فيها سابقاً رغم أن الإضافة تحدث هناك!)
// - يختفي في: صفحة السلة نفسها (وجوده هناك حشو)، صفحة إتمام/تتبع الطلب،
//   ولوحات الإدارة (admin/driver/vendor) حيث لا معنى لسلة تسوّق.
// - زر الدعم صار جزءاً من نفس الصف ليصعد وينزل مع السلة بدل زرين
//   متنافرين متراكبين في زوايا مختلفة.
// ============================================================================

export function FloatingCartBar() {
  const pathname = usePathname();
  const cart = useCartStore((s) => s.cart);
  const dishes = useDataStore((s) => s.dishes);

  const hidden =
    pathname === "/cart" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/driver") ||
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/order-tracking") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding");

  const items = cart
    .map((item) => ({ item, dish: dishes.find((d) => d.id === item.dishId) }))
    .filter((x) => x.dish);

  const count = items.reduce((sum, { item }) => sum + item.quantity, 0);

  // مجموع الأصناف شاملاً الإضافات — يوسم "+ التوصيل" لأن رسوم المنطقة
  // والخصم يحددان لاحقاً في شاشة السلة
  const total = items.reduce((sum, { item, dish }) => {
    const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
    return sum + (dish!.price + addonsPrice) * item.quantity;
  }, 0);

  const showCart = !hidden && count > 0;
  const showSupport = !hidden;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex max-w-lg items-end justify-between px-4">
      {/* زر الدعم — يبقى دوماً بجانب السلة/الشاشة */}
      <AnimatePresence>
        {showSupport && (
          <motion.a
            href="https://wa.me/970599000000"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
            className="no-select touch-target pointer-events-auto glass flex size-11 shrink-0 items-center justify-center rounded-full text-accent shadow-[var(--shadow-card)] transition active:scale-90"
            aria-label="الدعم الفني عبر واتساب"
          >
            <MessageCircle className="size-5" />
          </motion.a>
        )}
      </AnimatePresence>

      {/* شريط السلة العائم */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="pointer-events-auto w-full"
          >
            <Link
              href="/cart"
              className="no-select flex items-center justify-between rounded-2xl bg-primary px-4 py-3.5 text-white shadow-[0_10px_30px_rgb(255_107_53_/_0.4)] transition active:scale-[0.97]"
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                <span className="flex size-6 items-center justify-center rounded-full bg-white/25 text-xs font-extrabold">
                  {count}
                </span>
                <ShoppingBag className="size-4" aria-hidden />
                عرض السلة
              </span>
              <span className="text-sm font-extrabold">
                {formatPrice(total)}
                <span className="text-[10px] font-bold opacity-80"> + التوصيل</span>
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
