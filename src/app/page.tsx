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
import { Search as SearchIcon, MapPin, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { BannerCarousel } from "@/components/home/BannerCarousel";
import { RestaurantShelf } from "@/components/home/RestaurantShelf";
import { RestaurantCard } from "@/components/home/RestaurantCard";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/useAppStore";
import { useDataStore } from "@/store/useDataStore";

/** تحية حسب وقت اليوم — لمسة حيّة بدل عنوان جامد */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "سهرة طعمة 🌙";
  if (h < 12) return "صباح الخير ☀️";
  if (h < 17) return "نهارك سعيد 🌤️";
  return "مساء الورد 🌆";
}

/** هيكل عظمي أثناء التحميل الأول — بدل "لا توجد مطاعم بعد" الكاذبة */
function HomeSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="جارٍ تحميل المحتوى">
      <div className="shimmer aspect-[16/9] rounded-3xl" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer size-16 rounded-2xl" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="shimmer h-40 w-48 shrink-0 rounded-2xl" style={{ animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
      <div className="shimmer h-24 rounded-3xl" />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { hasSeenOnboarding, restaurants, zones, selectedZoneId, setSelectedZoneId } = useAppStore();
  const dataLoading = useDataStore((s) => s.loading);
  const dataError = useDataStore((s) => s.error);
  const reloadInitialData = useDataStore((s) => s.loadInitialData);
  const [query, setQuery] = useState("");

  // ✅ التحية تُحسب بعد التركيب فقط — الصفحة مُخبأة مسبقاً (prerendered)
  //    فيُخزَّن نصها وقت البناء ويختلف عن وقت الفتح الفعلي فيكسر
  //    الـ hydration (React #425). أول رسم يستخدم نصاً ثابتاً متطابقاً.
  const [greetingText, setGreetingText] = useState("أهلاً بك في دُغْري 👋");
  useEffect(() => {
    setGreetingText(greeting());
  }, []);

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

  // ✅ لا نعرض حالة "فارغ/لا مطاعم" إلا بعد انتهاء التحميل الفعلي —
  //    وأخطاء المستمعات تُعرض كبطاقة إعادة محاولة بدل قوائم فارغة صامتة
  const initialLoading = dataLoading && restaurants.length === 0 && !isSearching;
  const loadFailed = !dataLoading && !!dataError && restaurants.length === 0 && !isSearching;

  return (
    <AppShell>
      {/* ✅ تحية حية بتدرج لوني + جسيمات ناعمة — بداية ممتعة بدل قائمة جافة */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="mb-4 flex items-center justify-between gap-3 rounded-3xl border border-glass-border bg-secondary/40 px-5 py-4"
      >
        <div>
          <p className="text-xs font-semibold text-foreground-muted">{greetingText}</p>
          <h1 className="text-gradient mt-0.5 text-2xl font-black leading-tight">
            وشو رأيك تأكل اليوم؟
          </h1>
        </div>
        <motion.span
          className="float-soft text-4xl"
          aria-hidden
        >
          🍔
        </motion.span>
      </motion.div>

      <label className="glass mb-4 flex items-center gap-3 rounded-2xl px-4 py-3 transition focus-within:border-primary">
        <SearchIcon className="size-5 shrink-0 text-foreground-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن مطعم أو نوع الأكل…"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
          aria-label="ابحث عن مطعم"
        />
      </label>

      <div className="glass mb-5 flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground-muted">
          <MapPin className="size-3.5 text-teal" aria-hidden />
          التوصيل إلى
        </span>
        <select
          value={selectedZoneId || ""}
          onChange={(e) => setSelectedZoneId(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-left text-sm font-bold text-teal outline-none cursor-pointer"
          aria-label="اختر منطقة التوصيل"
        >
          <option value="" disabled>اختر منطقتك</option>
          {zones.map(z => (
            <option key={z.id} value={z.id} className="bg-secondary text-foreground">{z.name} ({z.deliveryFee}₪)</option>
          ))}
        </select>
      </div>

      {loadFailed ? (
        <div className="glass rounded-2xl px-4 py-10 text-center" role="alert">
          <p className="text-sm font-bold text-danger">تعذّر تحميل المطاعم</p>
          <p className="mt-1 text-xs text-foreground-muted">
            تحقق من اتصالك بالإنترنت وحاول مجدداً.
          </p>
          <button
            type="button"
            onClick={() => reloadInitialData()}
            className="mt-4 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white transition active:scale-95"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : initialLoading ? (
        <HomeSkeleton />
      ) : (
        <>
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
        </>
      )}
    </AppShell>
  );
}
