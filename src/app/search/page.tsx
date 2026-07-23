"use client";

import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CuisineSlider } from "@/components/home/CuisineSlider";
import { RestaurantCard } from "@/components/home/RestaurantCard";
import { useApp } from "@/context/AppContext";
import type { CuisineId } from "@/data/mockData";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<CuisineId | "all">("all");
  const { restaurants, dishes } = useApp();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (!r.active) return false;
      const cuisineOk = cuisine === "all" || r.cuisineId === cuisine;
      if (!cuisineOk) return false;
      if (!q) return true;
      const menuHit = dishes.some(
        (d) =>
          d.restaurantId === r.id &&
          (d.name.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q)),
      );
      return (
        r.name.toLowerCase().includes(q) ||
        r.tagline.toLowerCase().includes(q) ||
        menuHit
      );
    });
  }, [restaurants, dishes, query, cuisine]);

  return (
    <AppShell>
      <h1 className="mb-4 text-2xl font-extrabold">Search</h1>

      <label className="glass mb-4 flex items-center gap-3 rounded-2xl px-3 py-2.5">
        <SearchIcon className="size-5 text-foreground-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Restaurants or dishes…"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
          aria-label="Search restaurants"
        />
      </label>

      <div className="mb-5">
        <CuisineSlider value={cuisine} onChange={setCuisine} />
      </div>

      <p className="mb-3 text-xs font-medium text-foreground-muted">
        {filtered.length} restaurant{filtered.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <p className="glass rounded-2xl px-4 py-8 text-center text-sm text-foreground-muted">
          No matches. Try another cuisine or keyword.
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
    </AppShell>
  );
}
