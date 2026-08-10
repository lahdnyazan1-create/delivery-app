// src/components/menu/LivingCard.tsx
// ============================================================================
// التعديل: عند وجود أصناف من مطعم آخر بالسلة، كان الفشل يظهر كتلميح نصي
// صغير يختفي خلال ثانيتين — سهل جداً تفويته، فيبدو للمستخدم وكأن الزر لا
// يعمل. الآن نعرض نافذة تأكيد واضحة: "إفراغ السلة والبدء من هنا" أو "إلغاء".
// ============================================================================

"use client";

import { useRef, useState } from "react";
import { Flame, Plus, AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Dish } from "@/types/database";
import { useAppStore } from "@/store/useAppStore";
import { formatPrice } from "@/constants/currency";

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
  const { addToCart, replaceCartAndAdd, getRestaurant } = useAppStore();
  const mediaRef = useRef<HTMLDivElement>(null);
  const [hint, setHint] = useState("");
  const [showCustomize, setShowCustomize] = useState(false);
  const [tempNotes, setTempNotes] = useState("");
  const [showConflict, setShowConflict] = useState(false);
  const restaurant = getRestaurant(dish.restaurantId);
  const canAdd = Boolean(dish.available && restaurant?.active);
  const price = Number.isFinite(dish.price) ? dish.price : 0;

  const handleAddClick = () => {
    setShowCustomize(true);
  };

  const handleConfirmAdd = () => {
    const result = addToCart(dish.id, dish.restaurantId, tempNotes);
    if (!result.ok) {
      if (result.conflict) {
        setShowConflict(true);
      } else if (result.message) {
        setHint(result.message);
        window.setTimeout(() => setHint(""), 2200);
      }
    }
    setShowCustomize(false);
    setTempNotes("");
  };

  const handleReplaceConfirm = () => {
    replaceCartAndAdd(dish.id, dish.restaurantId, tempNotes);
    setShowConflict(false);
    setShowCustomize(false);
    setTempNotes("");
  };

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
      className={`no-select glass relative overflow-hidden rounded-3xl ${
        !canAdd ? "opacity-60" : ""
      }`}
    >
      <div
        ref={mediaRef}
        className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${
          dish.gradient || "from-gray-600 to-gray-800"
        }`}
      >
        {dish.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dish.image}
            alt={dish.name}
            loading="lazy"
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {dish.isHot && canAdd && <Steam />}
        {dish.isHot && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold text-primary-soft backdrop-blur-md">
            <Flame className="size-3.5" aria-hidden />
            حار
          </span>
        )}
        {!canAdd && (
          <span className="absolute inset-0 flex items-center justify-center bg-secondary/50 text-sm font-bold uppercase tracking-wide text-foreground backdrop-blur-[2px]">
            {!restaurant?.active ? "المطعم مغلق" : "غير متوفر"}
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
            {formatPrice(price)}
          </p>
          <motion.button
            type="button"
            whileTap={canAdd ? { scale: 0.9 } : undefined}
            disabled={!canAdd}
            onClick={handleAddClick}
            className="no-select touch-target inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgb(255_107_53_/_0.3)] disabled:cursor-not-allowed disabled:bg-secondary-muted disabled:shadow-none"
            aria-label={`أضف ${dish.name} إلى السلة`}
          >
            <Plus className="size-4" aria-hidden />
            أضف
          </motion.button>
        </div>
        {hint && (
          <p className="text-xs font-semibold text-primary" role="status">
            {hint}
          </p>
        )}
      </div>

      {/* ✅ نافذة تأكيد واضحة بدل الفشل الصامت عند تعارض المطعم */}
      <AnimatePresence>
        {showConflict && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-secondary/95 p-5 backdrop-blur-sm"
          >
            <div className="w-full space-y-3 text-center">
              <AlertTriangle className="mx-auto size-8 text-primary" />
              <p className="text-sm font-bold text-foreground">
                سلتك تحتوي أصناف من مطعم آخر
              </p>
              <p className="text-xs text-foreground-muted">
                إفراغها والبدء بطلب جديد من هذا المطعم؟
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConflict(false)}
                  className="no-select touch-target flex-1 rounded-xl bg-white/10 py-2.5 text-xs font-bold text-foreground"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleReplaceConfirm}
                  className="no-select touch-target flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-white"
                >
                  إفراغ والبدء من هنا
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ نافذة تخصيص الطلب (إضافة ملاحظات) */}
      <AnimatePresence>
        {showCustomize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-end justify-center bg-secondary/90 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="w-full space-y-3 rounded-2xl bg-background-elevated p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">تخصيص: {dish.name}</h3>
                <button
                  type="button"
                  onClick={() => setShowCustomize(false)}
                  className="text-foreground-muted hover:text-foreground"
                >
                  <X className="size-5" />
                </button>
              </div>
              <textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="أضف ملاحظاتك هنا (مثال: بدون بصل، حار جداً...)"
                rows={3}
                className="w-full resize-none rounded-xl border border-glass-border bg-secondary p-3 text-sm text-foreground outline-none focus:border-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white"
              >
                إضافة للسلة
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
