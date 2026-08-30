"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
      style={{ background: "var(--nav-bg)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href} className="relative flex-1">
              <Link
                href={href}
                className={`no-select touch-target relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-colors ${
                  active
                    ? "text-primary"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {/* ✅ حبّة خلفية منزلقة تتبع التبويب النشط — بدل تلوين نص جاف */}
                {active && (
                  <motion.span
                    layoutId="bottom-nav-pill"
                    className="absolute inset-x-2 inset-y-0 -z-10 rounded-2xl bg-primary/10"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <motion.span
                  animate={active ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="flex"
                >
                  <Icon
                    className="size-5"
                    strokeWidth={active ? 2.5 : 2}
                    aria-hidden
                  />
                </motion.span>
                <span
                  className={`text-[11px] font-semibold tracking-wide transition-colors ${
                    active ? "text-primary" : ""
                  }`}
                >
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
