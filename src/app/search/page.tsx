"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CuisineSlider } from "@/components/home/CuisineSlider";
import { RestaurantCard } from "@/components/home/RestaurantCard";
import { useAppStore } from "@/store/useAppStore";

function SearchContent() {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<string>(params.get("category") || "all");
  const { restaurants, dishes } = useAppStore();

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
        (r.tagline && r.tagline.toLowerCase().includes(q)) ||
        menuHit
      );
    });
  }, [restaurants, dishes, query, cuisine]);

  return (
    <>
      <h1 className="mb-4 text-2xl font-extrabold">البحث</h1>

      <label className="glass mb-4 flex items-center gap-3 rounded-2xl px-3 py-2.5">
        <SearchIcon className="size-5 text-foreground-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="مطاعم أو أطباق…"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
          aria-label="البحث عن مطاعم"
        />
      </label>

      <div className="mb-5">
        <CuisineSlider value={cuisine} onChange={setCuisine} />
      </div>

      <p className="mb-3 text-xs font-medium text-foreground-muted">
        {filtered.length} مطعم
      </p>

      {filtered.length === 0 ? (
        <p className="glass rounded-2xl px-4 py-8 text-center text-sm text-foreground-muted">
          لا توجد نتائج. جرّب تصنيفاً أو كلمة بحث أخرى.
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
    </>
  );
}

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense
        fallback={<p className="text-sm text-foreground-muted">جارِ التحميل…</p>}
      >
        <SearchContent />
      </Suspense>
    </AppShell>
  );
}
