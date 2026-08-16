"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Flame } from "lucide-react";
import type { Dish } from "@/types/database";
import { useAppStore } from "@/store/useAppStore";
import { formatPrice } from "@/constants/currency";

type LivingCardProps = {
  dish: Dish;
  index?: number;
  onDishClick: (dish: Dish) => void;
};

export function LivingCard({ dish, index = 0, onDishClick }: LivingCardProps) {
  const { getRestaurant } = useAppStore();
  const restaurant = getRestaurant(dish.restaurantId);
  const canAdd = Boolean(dish.available && restaurant?.active);
  const price = Number.isFinite(dish.price) ? dish.price : 0;

  return (
    <motion.button
      type="button"
      onClick={() => canAdd && onDishClick(dish)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileTap={canAdd ? { scale: 0.98 } : undefined}
      className={`no-select glass flex w-full gap-3 rounded-2xl p-3 text-right transition ${
        !canAdd ? "opacity-60" : "hover:bg-white/5"
      }`}
      dir="rtl"
    >
      {/* صورة الطبق */}
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
        {dish.image ? (
          <Image
            src={dish.image}
            alt={dish.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className={`size-full bg-gradient-to-br ${dish.gradient || "from-gray-600 to-gray-800"}`} />
        )}
        {dish.isHot && (
          <span className="absolute right-1 top-1 rounded-full bg-red-500/80 p-0.5">
            <Flame className="size-3 text-white" />
          </span>
        )}
      </div>

      {/* تفاصيل الطبق */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h3 className="truncate text-sm font-bold text-foreground">{dish.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-foreground-muted">{dish.description}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-extrabold text-primary">{formatPrice(price)}</p>
          {!canAdd && (
            <span className="text-[10px] font-bold text-foreground-muted">غير متوفر</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
