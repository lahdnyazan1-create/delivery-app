"use client";

import { useRef, useState } from "react";
import { Flame, Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { Dish } from "@/data/mockData";
import { useApp } from "@/context/AppContext";

type LivingCardProps = {
  dish: Dish;
  index?: number;
};

function Steam() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-2 mx-auto h-10 w-16 opacity-70"
      viewBox="0 0 64 40"
      aria-hidden
    >
      {[18, 32, 46].map((x, i) => (
        <motion.path
          key={x}
          d={`M${x} 36 C${x - 4} 24 ${x + 4} 16 ${x} 4`}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1], opacity: [0, 0.7, 0] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: i * 0.35,
            ease: "easeInOut",
          }}
        />
      ))}
    </svg>
  );
}

export function LivingCard({ dish, index = 0 }: LivingCardProps) {
  const { addToCart, getRestaurant } = useApp();
  const mediaRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState("");
  const restaurant = getRestaurant(dish.restaurantId);
  const canAdd = Boolean(dish.available && restaurant?.active);
  const price = Number.isFinite(dish.price) ? dish.price : 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 28,
        delay: index * 0.05,
      }}
      whileHover={canAdd ? { scale: 1.02 } : undefined}
      whileTap={canAdd ? { scale: 0.985 } : undefined}
      className={`no-select glass overflow-hidden rounded-3xl ${
        !canAdd ? "opacity-60" : ""
      }`}
    >
      <div
        ref={mediaRef}
        className={`relative aspect-[4/3] bg-gradient-to-br ${dish.gradient}`}
      >
        {dish.isHot && canAdd && <Steam />}
        {dish.isHot && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold text-primary-soft backdrop-blur-md">
            <Flame className="size-3.5" aria-hidden />
            Hot
          </span>
        )}
        {!canAdd && (
          <span className="absolute inset-0 flex items-center justify-center bg-secondary/50 text-sm font-bold uppercase tracking-wide text-foreground backdrop-blur-[2px]">
            {!restaurant?.active ? "Restaurant closed" : "Out of stock"}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-secondary/80 to-transparent" />
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="truncate text-base font-bold text-foreground">
            {dish.name}
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-foreground-muted">
            {dish.category}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-foreground-muted">
            {dish.description}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-extrabold text-primary">
            ${price.toFixed(2)}
          </p>
          <motion.button
            type="button"
            whileTap={canAdd ? { scale: 0.9 } : undefined}
            disabled={!canAdd}
            onClick={() => {
              const rect = mediaRef.current?.getBoundingClientRect();
              const result = addToCart(dish.id, rect);
              if (!result.ok && result.message && result.message !== "conflict") {
                setHint(result.message);
                window.setTimeout(() => setHint(""), 2200);
              }
            }}
            className="no-select touch-target inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(255_107_53_/_0.3)] disabled:cursor-not-allowed disabled:bg-secondary-muted disabled:shadow-none"
            aria-label={`Add ${dish.name} to cart`}
          >
            <Plus className="size-4" aria-hidden />
            Add
          </motion.button>
        </div>
        {hint && (
          <p className="text-xs font-semibold text-primary" role="status">
            {hint}
          </p>
        )}
      </div>
    </motion.article>
  );
}
