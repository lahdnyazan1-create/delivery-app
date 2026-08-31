// src/components/home/RestaurantCard.tsx
// ============================================================================
// بطاقة مطعم في الرئيسية والبحث — صورة بتكبير ناعم عند التحويم، شارة
// تقييم تعرض المتوسط وعدد التقييمات الفعلية، ورفع البطاقة عند اللمس.
// ============================================================================
"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Restaurant } from "@/types/database";

type RestaurantCardProps = {
  restaurant: Restaurant;
  index?: number;
};

export function RestaurantCard({ restaurant, index = 0 }: RestaurantCardProps) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 28,
        delay: index * 0.05,
      }}
    >
      <Link
        href={`/restaurant/${restaurant.id}`}
        className="no-select glass card-lift block overflow-hidden rounded-3xl transition-transform active:scale-[0.985]"
      >
        <div
          className={`relative aspect-[16/7] overflow-hidden bg-gradient-to-br ${restaurant.coverGradient || "from-gray-700 to-gray-900"}`}
        >
          {restaurant.image && (
            <Image
              src={restaurant.image}
              alt={restaurant.name}
              fill
              sizes="(max-width: 512px) 100vw, 512px"
              className="object-cover transition-transform duration-500 hover:scale-105"
            />
          )}
          <div className={`absolute inset-0 bg-gradient-to-br ${restaurant.logoGradient || "from-primary to-orange-600"} opacity-20`} />
          <div
            className={`absolute -bottom-5 left-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ${restaurant.logoGradient || "from-primary to-orange-600"} text-lg font-extrabold text-white shadow-lg ring-2 ring-background`}
          >
            {restaurant.name.slice(0, 1)}
          </div>
          <span className="absolute right-3 top-3 rounded-full bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold text-foreground backdrop-blur-md">
            {restaurant.cuisine || "مطبخ"}
          </span>
          {!restaurant.active && (
            <span className="absolute left-3 top-3 rounded-full bg-danger/90 px-2.5 py-1 text-[10px] font-bold text-white">
              مغلق الآن
            </span>
          )}
        </div>

        <div className="space-y-2 px-4 pb-4 pt-7">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-extrabold text-foreground">
                {restaurant.name}
              </h3>
              <p className="truncate text-sm text-foreground-muted">
                {restaurant.tagline || ""}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-foreground/5 px-2 py-1 text-xs font-bold text-accent-soft">
              <Star className="size-3 fill-current" aria-hidden />
              {restaurant.rating?.toFixed(1) ?? "0.0"}
              {(restaurant.ratingCount ?? 0) > 0 && (
                <span className="text-[10px] font-semibold text-foreground-muted">
                  ({restaurant.ratingCount})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-foreground-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {restaurant.etaMinutes}–{restaurant.etaMinutes + 10} دقيقة
            </span>
            <span>·</span>
            <span>رسوم التوصيل حسب منطقتك</span>
          </div>
        </div>
      </Link>
    </motion.li>
  );
}
