"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useDataStore } from "@/store/useDataStore";
import { formatPrice } from "@/constants/currency";

export function FloatingCartBar() {
  const pathname = usePathname();
  const cart = useCartStore((s) => s.cart);
  const dishes = useDataStore((s) => s.dishes);

  const hidden =
    pathname === "/cart" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/driver") ||
    pathname.startsWith("/restaurant") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/order-tracking");

  const items = cart
    .map((item) => ({ item, dish: dishes.find((d) => d.id === item.dishId) }))
    .filter((x) => x.dish);

  const count = items.reduce((sum, { item }) => sum + item.quantity, 0);
  const total = items.reduce(
    (sum, { item, dish }) => sum + dish!.price * item.quantity,
    0,
  );

  return (
    <AnimatePresence>
      {!hidden && count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
          className="fixed inset-x-0 bottom-20 z-40 px-4"
        >
          <Link
            href="/cart"
            className="no-select mx-auto flex max-w-lg items-center justify-between rounded-2xl bg-primary px-4 py-3.5 text-white shadow-[0_10px_30px_rgb(255_107_53_/_0.4)]"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <span className="flex size-6 items-center justify-center rounded-full bg-white/20 text-xs">
                {count}
              </span>
              <ShoppingBag className="size-4" />
              عرض السلة
            </span>
            <span className="text-sm font-extrabold">{formatPrice(total)}</span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
