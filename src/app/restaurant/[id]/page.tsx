"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Clock, Star, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LivingCard } from "@/components/menu/LivingCard";
import { useAppStore } from "@/store/useAppStore";

export default function RestaurantMenuPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { getRestaurant, getDishesByRestaurant, cart } = useAppStore();
  const cartCount = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const restaurant = getRestaurant(id);
  const menu = getDishesByRestaurant(id);

  if (!restaurant) {
    return (
      <AppShell hideNav>
        <p className="glass rounded-2xl px-4 py-8 text-center text-sm">
          المطعم غير موجود.
        </p>
        <Link href="/" className="mt-4 block text-center text-primary">
          العودة للرئيسية
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell hideHeader>
      <div className="relative -mx-4 mb-5 overflow-hidden">
        <div
          className={`aspect-[16/8] bg-gradient-to-br ${restaurant.coverGradient || "from-gray-700 to-gray-900"}`}
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-safe">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="no-select touch-target glass mt-3 flex size-11 items-center justify-center rounded-xl"
            aria-label="رجوع"
          >
            <ArrowLeft className="size-5" />
          </button>
          <Link
            href="/cart"
            id="cart-icon"
            className="no-select touch-target glass relative mt-3 flex size-11 items-center justify-center rounded-xl"
            aria-label={`السلة، ${cartCount} عناصر`}
          >
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-secondary">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

        <div className="relative -mt-8 px-4">
          <div
            className={`mb-3 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br ${restaurant.logoGradient || "from-primary to-orange-600"} text-xl font-extrabold text-white shadow-lg ring-4 ring-background`}
          >
            {restaurant.name.slice(0, 1)}
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">
            {restaurant.name}
          </h1>
          {!restaurant.active && (
            <p className="mt-2 rounded-xl bg-primary/15 px-3 py-2 text-sm font-bold text-primary">
              هذا المطعم مغلق حالياً
            </p>
          )}
          <p className="mt-1 text-sm text-foreground-muted">
            {restaurant.tagline || restaurant.cuisine || ""}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-foreground-muted">
            <span className="inline-flex items-center gap-1 text-accent-soft">
              <Star className="size-3.5 fill-current" />
              {restaurant.rating?.toFixed(1) ?? "0.0"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {restaurant.etaMinutes}–{restaurant.etaMinutes + 10} دقيقة
            </span>
            <span>
              توصيل ₪{restaurant.deliveryFee?.toFixed(2) ?? "0.00"}
            </span>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">القائمة</h2>
        {menu.length === 0 ? (
          <p className="glass rounded-2xl px-4 py-8 text-center text-sm text-foreground-muted">
            لا توجد أطباق مُدرجة بعد. تحقق لاحقاً.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-4">
            {menu.map((dish, index) => (
              <li key={dish.id}>
                <LivingCard dish={dish} index={index} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
