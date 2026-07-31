"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CuisineSlider } from "@/components/home/CuisineSlider";
import { RestaurantCard } from "@/components/home/RestaurantCard";
import { useAppStore } from "@/store/useAppStore";
import type { CuisineOption } from "@/constants/cuisines";

export default function HomePage() {
  const router = useRouter();
  const { hasSeenOnboarding, restaurants } = useAppStore();
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState<CuisineOption>("all");

  useEffect(() => {
    if (!hasSeenOnboarding) {
      router.replace("/onboarding");
    }
  }, [hasSeenOnboarding, router]);

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (!r.active) return false;
      const cuisineOk = cuisine === "all" || r.cuisineId === cuisine;
      if (!cuisineOk) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.tagline && r.tagline.toLowerCase().includes(q)) ||
        (r.cuisine && r.cuisine.toLowerCase().includes(q))
      );
    });
  }, [restaurants, query, cuisine]);

  return (
    <AppShell>
      <div className="glass mb-6 space-y-4 rounded-3xl p-6">
        <h1 className="text-2xl font-extrabold text-foreground">
          أطلب أكلك المفضل بسهولة
        </h1>
        <p className="text-sm text-foreground-muted">
          تصفح أفضل المطاعم المحلية واطلب وجبتك ليصلك المندوب في أسرع وقت.
        </p>
        <label className="glass-strong flex items-center gap-3 rounded-2xl px-3 py-2.5">
          <SearchIcon className="size-5 text-foreground-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مطعم أو نوع الأكل…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
            aria-label="ابحث عن مطعم"
          />
        </label>
      </div>

      <div className="mb-5">
        <CuisineSlider value={cuisine} onChange={setCuisine} />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">المطاعم المتاحة</h2>
          <span className="text-xs font-medium text-foreground-muted">
            {filteredRestaurants.length} مطعم
          </span>
        </div>

        {filteredRestaurants.length === 0 ? (
          <p className="glass rounded-2xl px-4 py-10 text-center text-sm text-foreground-muted">
            لا توجد مطاعم مطابقة حالياً. جرّب تصنيفاً آخر أو كلمة بحث مختلفة.
          </p>
        ) : (
          <ul className="space-y-4">
            {filteredRestaurants.map((restaurant, index) => (
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
