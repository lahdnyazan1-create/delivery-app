// src/components/restaurant/RestaurantRatings.tsx
// ============================================================================
// قسم تقييمات مطعم — آخر التقييمات الفعلية (طلبات مُسلَّمة قيّمها
// أصحابها عبر rateOrder). يُخفى بالكامل إن لم توجد تقييمات بعد، ويستخدم
// getRestaurantRatings Callable حتى لا تُقرأ مجموعة ratings بأكملها
// من العميل ولا تُكشف هويات المقيمين.
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { getRestaurantRatings, type RestaurantRatingEntry } from "@/lib/orders";

type RestaurantRatingsProps = {
  restaurantId: string;
};

export function RestaurantRatings({ restaurantId }: RestaurantRatingsProps) {
  const [ratings, setRatings] = useState<RestaurantRatingEntry[]>([]);
  const [visible, setVisible] = useState(3);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    getRestaurantRatings(restaurantId).then((res) => {
      if (!alive) return;
      setRatings(res.ok ? res.ratings : []);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [restaurantId]);

  if (!loaded || ratings.length === 0) return null;

  const shown = ratings.slice(0, visible);

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        تقييمات الزبائن
        <span className="inline-flex items-center gap-1 rounded-lg bg-foreground/5 px-2 py-0.5 text-xs font-bold text-accent-soft">
          <Star className="size-3 fill-current" aria-hidden />
          {ratings.length}
        </span>
      </h2>

      <ul className="space-y-3">
        {shown.map((rating, index) => (
          <motion.li
            key={rating.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass rounded-2xl p-4"
            dir="rtl"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-foreground">{rating.customerName}</span>
              <span className="flex items-center gap-0.5" aria-label={`${rating.stars} من 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`size-3.5 ${i < rating.stars ? "fill-amber-400 text-amber-400" : "text-foreground-muted/30"}`}
                    aria-hidden
                  />
                ))}
              </span>
            </div>
            {rating.comment && (
              <p className="mt-2 flex gap-1.5 text-sm leading-relaxed text-foreground-muted">
                <Quote className="size-3.5 shrink-0 rotate-180 text-primary/60" aria-hidden />
                {rating.comment}
              </p>
            )}
            <p className="mt-2 text-[10px] text-foreground-muted">
              {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString("ar-EG") : ""}
            </p>
          </motion.li>
        ))}
      </ul>

      {visible < ratings.length && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + 5)}
          className="no-select touch-target w-full rounded-2xl border border-glass-border bg-secondary py-2.5 text-xs font-bold text-foreground-muted transition hover:text-primary"
        >
          عرض تقييمات أكثر ({ratings.length - visible})
        </button>
      )}
    </section>
  );
}
