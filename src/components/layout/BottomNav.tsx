"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UtensilsCrossed, ShoppingCart, Package, User } from "lucide-react";

const tabs = [
  { href: "/", label: "مطاعم", icon: UtensilsCrossed },
  { href: "/mart", label: "مارت", icon: ShoppingCart },
  { href: "/orders", label: "طلبات", icon: Package },
  { href: "/profile", label: "ملف شخصي", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/order-tracking") ||
    pathname.startsWith("/driver") ||
    pathname.startsWith("/restaurant")
  ) {
    return null;
  }

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="glass-strong fixed inset-x-0 bottom-0 z-40 border-t border-glass-border pb-safe"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

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
