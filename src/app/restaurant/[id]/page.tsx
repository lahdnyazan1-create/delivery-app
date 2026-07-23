"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Star, ShoppingBag } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LivingCard } from "@/components/menu/LivingCard";
import { useApp } from "@/context/AppContext";
import { CUISINES } from "@/data/mockData";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function RestaurantMenuPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { getRestaurant, getDishesByRestaurant, cartCount } = useApp();

  const restaurant = getRestaurant(id);
  const menu = getDishesByRestaurant(id);
  const cuisine = restaurant
    ? CUISINES.find((c) => c.id === restaurant.cuisineId)
    : null;

  if (!restaurant) {
    return (
      <AppShell hideNav>
        <p className="glass rounded-2xl px-4 py-8 text-center text-sm">
          Restaurant not found.
        </p>
        <Link href="/" className="mt-4 block text-center text-primary">
          Back home
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell hideHeader>
      <div className="relative -mx-4 mb-5 overflow-hidden">
        <div
          className={`aspect-[16/8] bg-gradient-to-br ${restaurant.coverGradient}`}
        />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-safe">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="no-select touch-target glass mt-3 flex size-11 items-center justify-center rounded-xl"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <Link
            href="/cart"
            id="cart-icon"
            className="no-select touch-target glass relative mt-3 flex size-11 items-center justify-center rounded-xl"
            aria-label={`Cart, ${cartCount} items`}
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
            className={`mb-3 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br ${restaurant.logoGradient} text-xl font-extrabold text-white shadow-lg ring-4 ring-background`}
          >
            {restaurant.name.slice(0, 1)}
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">
            {restaurant.name}
          </h1>
          {!restaurant.active && (
            <p className="mt-2 rounded-xl bg-primary/15 px-3 py-2 text-sm font-bold text-primary">
              This restaurant is currently inactive
            </p>
          )}
          <p className="mt-1 text-sm text-foreground-muted">
            {restaurant.tagline}
            {cuisine ? ` · ${cuisine.label}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-foreground-muted">
            <span className="inline-flex items-center gap-1 text-accent-soft">
              <Star className="size-3.5 fill-current" />
              {restaurant.rating.toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {restaurant.etaMinutes}–{restaurant.etaMinutes + 10} min
            </span>
            <span>${restaurant.deliveryFee.toFixed(2)} delivery</span>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold">Menu</h2>
        {menu.length === 0 ? (
          <p className="glass rounded-2xl px-4 py-8 text-center text-sm text-foreground-muted">
            No dishes listed yet. Check back soon.
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
