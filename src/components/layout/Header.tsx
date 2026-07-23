"use client";

import Link from "next/link";
import { MapPin, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";

export function Header() {
  const { cartCount, cartPopKey, activeOrder, user } = useApp();

  const locationText =
    user?.address?.trim() ||
    user?.locationLabel?.trim() ||
    "Set your delivery address";

  return (
    <header className="sticky top-0 z-40 pt-safe">
      <div className="glass mx-3 mt-3 flex items-center gap-3 rounded-2xl px-3 py-2.5">
        <Link
          href="/profile"
          className="flex min-w-0 flex-1 items-center gap-2 px-1"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <MapPin className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-foreground-muted">
              Deliver to
            </span>
            <span className="block truncate text-sm font-bold text-foreground">
              {locationText}
            </span>
          </span>
        </Link>

        {activeOrder && activeOrder.status !== "Delivered" && (
          <Link
            href="/order-tracking"
            className="no-select touch-target rounded-xl bg-accent/15 px-2.5 py-2 text-[11px] font-bold text-accent"
          >
            Track
          </Link>
        )}

        <Link href="/cart" aria-label={`Cart, ${cartCount} items`}>
          <motion.span
            key={cartPopKey}
            id="cart-icon"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.22, 1] }}
            transition={{ duration: 0.35 }}
            className="no-select touch-target relative flex size-11 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_24px_rgb(255_107_53_/_0.35)]"
          >
            <ShoppingBag className="size-5" aria-hidden />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-secondary">
                {cartCount}
              </span>
            )}
          </motion.span>
        </Link>
      </div>
    </header>
  );
}
