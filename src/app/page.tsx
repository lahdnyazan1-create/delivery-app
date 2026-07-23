"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CuisineSlider } from "@/components/home/CuisineSlider";
import { RestaurantCard } from "@/components/home/RestaurantCard";
import { ScratchCard } from "@/components/promo/ScratchCard";
import { useApp } from "@/context/AppContext";
import type { CuisineId } from "@/data/mockData";

export default function HomePage() {
  const { restaurants } = useApp();
  const [cuisine, setCuisine] = useState<CuisineId | "all">("all");

  const filtered = restaurants.filter((r) => {
    if (!r.active) return false;
    if (cuisine === "all") return true;
    return r.cuisineId === cuisine;
  });

  return (
    <AppShell>
      <section className="mb-4 space-y-1">
        <p className="text-sm font-medium text-foreground-muted">
          Delivering near you
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          <span className="text-primary">Zest</span> restaurants
        </h1>
      </section>

      <section className="mb-5">
        <ScratchCard />
      </section>

      <section className="mb-5" aria-label="Cuisines">
        <CuisineSlider value={cuisine} onChange={setCuisine} />
      </section>

      <section aria-labelledby="restaurants-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2
            id="restaurants-heading"
            className="text-lg font-bold text-foreground"
          >
            {cuisine === "all" ? "All restaurants" : "Matching restaurants"}
          </h2>
          <span className="text-xs font-semibold text-foreground-muted">
            {filtered.length} open
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="glass rounded-2xl px-4 py-8 text-center text-sm text-foreground-muted">
            No restaurants in this category.
          </p>
        ) : (
          <ul className="space-y-4">
            {filtered.map((restaurant, index) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                index={index}
              />
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
