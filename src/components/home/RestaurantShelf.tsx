// src/components/home/RestaurantShelf.tsx
// ============================================================================
// التعديلات:
// - ✅ يعرض restaurant.image الفعلية إن وُجدت
// - ✅ حُذفت شارة "توصيل مجاني" المبنية على restaurant.deliveryFee (مهجور
//   الآن، الرسوم تُحدَّد بمنطقة العميل وقت الطلب وليست خاصية ثابتة للمطعم)
// ============================================================================

"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Star } from "lucide-react";
import type { Restaurant } from "@/types/database";

type RestaurantShelfProps = {
  title: string;
  restaurants: Restaurant[];
  emptyHint?: string;
};

export function RestaurantShelf({
  title,
  restaurants,
  emptyHint,
}: RestaurantShelfProps) {
  if (restaurants.length === 0 && !emptyHint) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-foreground">{title}</h2>
      {restaurants.length === 0 ? (
        <p className="glass rounded-2xl px-4 py-6 text-center text-xs text-foreground-muted">
          {emptyHint}
        </p>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max gap-3 pb-1">
            {restaurants.map((restaurant) => (
              <li key={restaurant.id} className="w-48 shrink-0">
                <Link
                  href={`/restaurant/${restaurant.id}`}
                  className="no-select glass block overflow-hidden rounded-2xl"
                >
                  <div
                    className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${
                      restaurant.coverGradient || "from-gray-700 to-gray-900"
                    }`}
                  >
                        {restaurant.image && (
                          <Image
                            src={restaurant.image}
                            alt={restaurant.name}
                            fill
                            sizes="192px"
                            className="object-cover"
                          />
                        )}
                    {restaurant.promoTag && (
                      <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-white">
                        {restaurant.promoTag}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="truncate text-sm font-bold text-foreground">
                      {restaurant.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-foreground-muted">
                      <span className="inline-flex items-center gap-0.5 text-accent-soft">
                        <Star className="size-3 fill-current" />
                        {restaurant.rating?.toFixed(1) ?? "0.0"}
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="size-3" />
                        {restaurant.etaMinutes} د
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
