"use client";

import React from "react";
import Link from "next/link";
import { MapPin, ShoppingBag } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function Header() {
  const { user, isAuthenticated, cart } = useAppStore();

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const displayAddress =
    user?.address?.trim() || user?.locationLabel?.trim() || "حدد موقعك للتوصيل";

  return (
    <header className="sticky top-0 z-40 border-b border-glass-border bg-background/90 px-4 py-3 text-foreground backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-primary to-primary-soft bg-clip-text text-xl font-black text-transparent">
            Zest Delivery
          </span>
        </Link>

        <div className="glass hidden max-w-xs items-center gap-1.5 truncate rounded-full px-3 py-1.5 text-xs text-foreground-muted sm:flex">
          <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="truncate">{displayAddress}</span>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-foreground-muted sm:inline">
                {user.displayName || "مستخدم"}
              </span>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-primary"
                >
                  لوحة الأدمن
                </Link>
              )}
              {user.role === "courier" && (
                <Link
                  href="/driver"
                  className="rounded-lg border border-accent/20 bg-accent/10 px-2 py-1 text-accent"
                >
                  لوحة السائق
                </Link>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-primary px-3 py-1.5 font-bold text-white transition hover:bg-primary/90"
            >
              تسجيل الدخول
            </Link>
          )}

          <Link
            href="/cart"
            className="glass relative flex size-10 items-center justify-center rounded-xl text-primary transition hover:bg-white/10"
            aria-label={`السلة، ${cartItemsCount} عناصر`}
          >
            <ShoppingBag className="size-4.5" aria-hidden />
            {cartItemsCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-accent text-[10px] font-black text-secondary">
                {cartItemsCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
