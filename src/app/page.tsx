"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { RestaurantShelf } from "@/components/home/RestaurantShelf";
import { RestaurantCard } from "@/components/home/RestaurantCard";
import { useAppStore } from "@/store/useAppStore";

export default function HomePage() {
  const router = useRouter();
  const { hasSeenOnboarding, restaurants } = useAppStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!hasSeenOnboarding) {
      router.replace("/onboarding");
    }
  }, [hasSeenOnboarding, router]);

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((r) => {
      if (!r.active) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        (r.tagline && r.tagline.toLowerCase().includes(q)) ||
        (r.cuisine && r.cuisine.toLowerCase().includes(q))
      );
    });
  }, [restaurants, query]);

  const featuredRestaurants = useMemo(
    () => restaurants.filter((r) => r.active && r.promoTag),
    [restaurants],
  );

  const topRated = useMemo(
    () =>
      [...restaurants]
        .filter((r) => r.active)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 8),
    [restaurants],
  );

  const freeDelivery = useMemo(
    () => restaurants.filter((r) => r.active && r.deliveryFee === 0),
    [restaurants],
  );

  const isSearching = query.trim().length > 0;

  return (
    <AppShell>
      <label className="glass mb-5 flex items-center gap-3 rounded-2xl px-3 py-2.5">
        <SearchIcon className="size-5 text-foreground-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن مطعم أو نوع الأكل…"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
          aria-label="ابحث عن مطعم"
        />
      </label>

      {!isSearching && (
        <>
          <div className="mb-6">
            <BannerCarousel />
          </div>

          <div className="mb-6">
            <CategoriesGrid limit={7} />
          </div>

          {featuredRestaurants.length > 0 && (
            <div className="mb-6">
              <RestaurantShelf title="🔥 وفّر معنا" restaurants={featuredRestaurants} />
            </div>
          )}

          <div className="mb-6">
            <RestaurantShelf
              title="⭐ الأعلى تقييماً"
              restaurants={topRated}
              emptyHint="لا توجد مطاعم بعد"
            />
          </div>

          {freeDelivery.length > 0 && (
            <div className="mb-6">
              <RestaurantShelf title="🚚 توصيل مجاني" restaurants={freeDelivery} />
            </div>
          )}
        </>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {isSearching ? "نتائج البحث" : "كل المطاعم"}
          </h2>
          <span className="text-xs font-medium text-foreground-muted">
            {filteredRestaurants.length} مطعم
          </span>
        </div>

        {filteredRestaurants.length === 0 ? (
          <p className="glass rounded-2xl px-4 py-10 text-center text-sm text-foreground-muted">
            لا توجد مطاعم مطابقة حالياً.
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
