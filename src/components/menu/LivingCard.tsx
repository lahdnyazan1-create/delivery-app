"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Flame, PlusCircle } from "lucide-react";
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
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      whileTap={canAdd ? { scale: 0.98 } : undefined}
      className={`no-select glass card-lift flex w-full gap-3 rounded-2xl p-3 text-right transition ${
        !canAdd ? "opacity-60" : "hover:border-primary/30"
      }`}
      dir="rtl"
    >
      {/* صورة الطبق — تتضخم ناعمة عند التحويم + شارة الحار تنبض */}
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
        {dish.image ? (
          <Image
            src={dish.image}
            alt={dish.name}
            fill
            sizes="80px"
            className="object-cover transition-transform duration-500 hover:scale-110"
          />
        ) : (
          <div className={`size-full bg-gradient-to-br ${dish.gradient || "from-gray-600 to-gray-800"}`} />
        )}
        {dish.isHot && (
          <motion.span
            className="absolute right-1 top-1 rounded-full bg-red-500/90 p-0.5"
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            <Flame className="size-3 text-white" />
          </motion.span>
        )}
      </div>

      {/* تفاصيل الطبق */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h3 className="truncate text-sm font-bold text-foreground">{dish.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-foreground-muted">{dish.description}</p>
        </div>
        <div className="flex items-center justify-between">
          <p className="rounded-lg bg-white/5 px-2 py-0.5 text-sm font-extrabold text-primary">
            {formatPrice(price)}
          </p>
          {canAdd ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-primary">
              <PlusCircle className="size-4" aria-hidden />
              إضافة
            </span>
          ) : (
            <span className="text-[10px] font-bold text-foreground-muted">غير متوفر</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
