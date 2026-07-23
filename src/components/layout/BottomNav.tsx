"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import { useApp } from "@/context/AppContext";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { cartCount } = useApp();

  if (pathname.startsWith("/admin") || pathname.startsWith("/order-tracking")) {
    return null;
  }

  return (
    <nav
      aria-label="Primary"
      className="glass-strong fixed inset-x-0 bottom-0 z-40 border-t border-glass-border pb-safe"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`no-select touch-target relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-colors ${
                  active
                    ? "text-primary"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2.5 : 2}
                  aria-hidden
                />
                {href === "/cart" && cartCount > 0 && (
                  <span className="absolute right-[22%] top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
                <span className="text-[11px] font-semibold tracking-wide">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
