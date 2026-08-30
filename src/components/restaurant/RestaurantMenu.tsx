// src/components/restaurant/RestaurantMenu.tsx
// ============================================================================
// قائمة طعام المطعم (عميل). يعرض فوراً البيانات المهيَّأة من الخادم
// (SSR initialRestaurant/initialDishes) إن وُجدت، ثم يرقّيها تلقائياً
// لبيانات الاشتراك الحيّة من useDataStore عند وصولها.
//
// ✅ بار الفئات العلوي: الفئات تُستخرج من حقل category في أطباق هذا
//    المطعم وتُرتَّب حسب أقدم طبق فيها (يعكس الترتيب المنطقي الذي أنشأ
//    به المطعم قائمته) بدل ترتيب المستندات العشوائي في Firestore.
// ✅ زر السلة: صار شريطاً عائماً عاماً (FloatingCartBar) يظهر هنا عند
//    إضافة أول صنف — أُزيلت أيقونة السلة الثابتة من الهيدر لأنها كانت
//    تختفي عند التمرير وتتكرر بلا داعٍ.
// ============================================================================

"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LivingCard } from "@/components/menu/LivingCard";
import { DishModal } from "@/components/menu/DishModal";
import { CategoryBar } from "@/components/restaurant/CategoryBar";
import { RestaurantRatings } from "@/components/restaurant/RestaurantRatings";
import type { Dish, Restaurant } from "@/types/database";
import { useAppStore } from "@/store/useAppStore";

type RestaurantMenuProps = {
  id: string;
  initialRestaurant?: Restaurant | null;
  initialDishes?: Dish[];
};

export function RestaurantMenu({ id, initialRestaurant = null, initialDishes = [] }: RestaurantMenuProps) {
  const router = useRouter();

  const { getRestaurant, getDishesByRestaurant } = useAppStore();

  // ✅ حالة لفتح وإغلاق نافذة تفاصيل المنتج
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);

  // ✅ فئة القائمة المحددة عبر البار العلوي — "" تعني عرض كل الأطباق
  const [activeCategory, setActiveCategory] = useState("");

  // نفضّل بيانات الاشتراك الحيّة عند وصولها، وبيانات SSR قبل ذلك
  const liveRestaurant = getRestaurant(id);
  const restaurant = liveRestaurant ?? initialRestaurant;

  const liveMenu = getDishesByRestaurant(id);
  const menu = liveMenu.length > 0 ? liveMenu : initialDishes;

  // ✅ ترتيب الفئات: حسب أقدم طبق في كل فئة (createdAt) — يطابق الترتيب
  //    الذي بُني به المطبخ بدل الترتيب العشوائي لوثائق Firestore، ويسقط
  //    للأبجدية عند تساوي الطوابع الزمنية
  const categories = useMemo(() => {
    const firstSeen = new Map<string, number>();
    for (const dish of menu) {
      const cat = (dish.category || "").trim();
      if (!cat) continue;
      const t = dish.createdAt ?? Number.MAX_SAFE_INTEGER;
      if (!firstSeen.has(cat) || t < firstSeen.get(cat)!) {
        firstSeen.set(cat, t);
      }
    }
    return Array.from(firstSeen.entries())
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "ar"))
      .map(([cat]) => cat);
  }, [menu]);

  // ✅ القائمة مرتبة: بحسب فئاتها ثم داخل كل فئة بحسب الأحدث إنشاءاً
  const categoryOrder = useMemo(
    () => new Map(categories.map((cat, i) => [cat, i])),
    [categories],
  );
  const sortedMenu = useMemo(
    () =>
      [...menu].sort((a, b) => {
        const ca = categoryOrder.get((a.category || "").trim()) ?? categories.length;
        const cb = categoryOrder.get((b.category || "").trim()) ?? categories.length;
        if (ca !== cb) return ca - cb;
        return (a.createdAt ?? 0) - (b.createdAt ?? 0);
      }),
    [menu, categoryOrder, categories.length],
  );

  // إن حُذفت الفئة المحددة من القائمة (تغيّر بيانات حياً) نرجع لعرض الكل
  useEffect(() => {
    if (activeCategory && !categories.includes(activeCategory)) {
      setActiveCategory("");
    }
  }, [categories, activeCategory]);

  const visibleMenu = activeCategory
    ? sortedMenu.filter((dish) => (dish.category || "").trim() === activeCategory)
    : sortedMenu;

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
    <>
      <AppShell hideHeader>
        <div className="relative -mx-4 mb-5 overflow-hidden">
          {/* ✅ هيرو المطعم: صورة بتدرج سينمائي يضمن وضوح الأزرار فوق أي صورة */}
          <div
            className={`relative aspect-[16/8] overflow-hidden bg-gradient-to-br ${restaurant.coverGradient || "from-gray-700 to-gray-900"}`}
          >
            {restaurant.image && (
              <Image
                src={restaurant.image}
                alt={restaurant.name}
                fill
                priority
                sizes="(max-width: 512px) 100vw, 512px"
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/25 to-background/40" />
          </div>
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-safe">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="no-select touch-target glass-strong mt-3 flex size-11 items-center justify-center rounded-xl shadow-[var(--shadow-card)]"
              aria-label="رجوع"
            >
              <ArrowLeft className="size-5" />
            </button>
            {/* السلة صارت شريطاً عائماً أسفل الشاشة — يظهر مع أول صنف يضاف */}
          </div>

          <div className="relative -mt-10 px-4">
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
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-foreground-muted">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-accent-soft">
                <Star className="size-3.5 fill-current" />
                {restaurant.rating?.toFixed(1) ?? "0.0"}
                {restaurant.ratingCount != null && restaurant.ratingCount > 0 && (
                  <span className="text-[10px] font-bold text-foreground-muted">
                    ({restaurant.ratingCount} تقييم)
                  </span>
                )}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {restaurant.etaMinutes}–{restaurant.etaMinutes + 10} دقيقة
              </span>
              <span>رسوم التوصيل تُحدَّد حسب منطقتك بالسلة</span>
            </div>
          </div>
        </div>

        {/* ✅ بار الفئات العلوي — لاصق أعلى الشاشة، فئات أطباق هذا المطعم */}
        <CategoryBar
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          dishes={menu}
        />

        <section className="space-y-4">
          <h2 className="flex items-center justify-between text-lg font-bold">
            <span>{activeCategory || "القائمة"}</span>
            <span className="text-xs font-semibold text-foreground-muted">
              {visibleMenu.length} صنف
            </span>
          </h2>
          {visibleMenu.length === 0 ? (
            <p className="glass rounded-2xl px-4 py-8 text-center text-sm text-foreground-muted">
              {menu.length === 0
                ? "لا توجد أطباق مُدرجة بعد. تحقق لاحقاً."
                : "لا توجد أطباق في هذه الفئة حالياً."}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4">
              {visibleMenu.map((dish, index) => (
                <li key={dish.id}>
                  {/* ✅ تمرير دالة النقر لفتح النافذة */}
                  <LivingCard
                    dish={dish}
                    index={index}
                    onDishClick={(d) => setSelectedDish(d)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ✅ تقييمات الزبائن الفعلية على هذا المطعم (من طلبات مُسلَّمة) */}
        {restaurant.ratingCount != null && restaurant.ratingCount > 0 && (
          <section className="mt-6">
            <RestaurantRatings restaurantId={restaurant.id} />
          </section>
        )}
      </AppShell>

      {/* ✅ نافذة تفاصيل المنتج */}
      <DishModal
        dish={selectedDish}
        isOpen={!!selectedDish}
        onClose={() => setSelectedDish(null)}
      />
    </>
  );
}
