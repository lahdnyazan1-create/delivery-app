"use client";

import React from "react";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";

export function Header() {
  const { user, isAuthenticated, cart } = useAppStore();

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const displayAddress =
    user?.address?.trim() || user?.locationLabel?.trim() || "حدد موقعك للتوصيل";

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Zest Delivery
          </span>
        </Link>

        <div className="hidden sm:flex items-center text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800 truncate max-w-xs">
          <span className="text-amber-400 ml-1">📍</span>
          <span className="truncate">{displayAddress}</span>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="text-slate-300">
                {user.displayName || "مستخدم"}
              </span>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20"
                >
                  لوحة الأدمن
                </Link>
              )}
              {user.role === "courier" && (
                <Link
                  href="/driver"
                  className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20"
                >
                  لوحة السائق
                </Link>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-amber-500 text-slate-950 px-3 py-1.5 rounded-xl font-bold hover:bg-amber-400 transition"
            >
              تسجيل الدخول
            </Link>
          )}

          <Link
            href="/cart"
            className="relative bg-slate-800 p-2 rounded-xl text-amber-400 hover:bg-slate-700 transition"
          >
            🛒
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {cartItemsCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
