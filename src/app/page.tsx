// src/app/page.tsx
// ============================================================================
// التعديل: حُذف قسم "🚚 توصيل مجاني" بالكامل. كان مبنياً على
// restaurant.deliveryFee === 0 — حقل مهجور الآن بعد التحول لنظام zones،
// فأصبح هذا القسم مضللاً (لا علاقة له بالرسوم الفعلية التي تعتمد على منطقة
// العميل وقت الطلب، وليست خاصية ثابتة بالمطعم).
// ============================================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { RestaurantShelf } from "@/components/home/RestaurantShelf";
import { RestaurantCard } from "@/components/home/RestaurantCard";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/useAppStore";

export default function HomePage() {
  const router = useRouter();
  const { hasSeenOnboarding, restaurants, zones, selectedZoneId, setSelectedZoneId } = useAppStore();
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

  const isSearching = query.trim().length > 0;

  return (
    <AppShell>
      <div className="glass mb-3 flex items-center justify-between rounded-2xl px-4 py-2.5">
        <span className="text-xs text-foreground-muted">التوصيل إلى:</span>
        <select 
          value={selectedZoneId || ""} 
          onChange={(e) => setSelectedZoneId(e.target.value)}
          className="bg-transparent text-sm font-bold text-primary outline-none cursor-pointer"
        >
          <option value="" disabled>اختر منطقتك</option>
          {zones.map(z => (
            <option key={z.id} value={z.id} className="bg-secondary">{z.name} ({z.deliveryFee}₪)</option>
          ))}
        </select>
      </div>

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
        </>
      )}

      <section className="space-y-6">
        {isSearching ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">نتائج البحث</h2>
            {filteredRestaurants.length === 0 ? (
              <p className="glass rounded-2xl px-4 py-10 text-center text-sm text-foreground-muted">
                لا توجد مطاعم مطابقة حالياً.
              </p>
            ) : (
              <ul className="space-y-4">
                {filteredRestaurants.map((restaurant, index) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} index={index} />
                ))}
              </ul>
            )}
          </div>
        ) : (
          (() => {
            // ✅ تجميع المطاعم حسب الفئة (cuisine)
            const cuisines = [...new Set(restaurants.filter(r => r.active).map(r => r.cuisine || "أخرى"))];
            return cuisines.map((cuisine) => {
              const rests = restaurants.filter(r => r.active && (r.cuisine || "أخرى") === cuisine);
              if (rests.length === 0) return null;
              return (
                <RestaurantShelf
                  key={cuisine}
                  title={cuisine || "مطاعم"}
                  restaurants={rests}
                />
              );
            });
          })()
        )}
      </section>
    </AppShell>
  );
}
