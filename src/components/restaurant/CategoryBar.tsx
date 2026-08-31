// src/components/restaurant/CategoryBar.tsx
// ============================================================================
// بار الفئات العلوي في صفحة المطعم — يستخرج الفئات تلقائياً من حقل
// category في أطباق نفس المطعم، بدون أي إعداد إضافي. بار لاصق (sticky)
// قابل للتمرير أفقياً مع إخفاء شريط التمرير، وحبّة نشطة تنزلق بمرونة
// (framer-motion layoutId) بين الفئات مع عدّاد أطباق لكل فئة.
// ============================================================================

"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Dish } from "@/types/database";

type CategoryBarProps = {
  /** كل الفئات المستخرجة من أطباق المطعم — بترتيبها النهائي */
  categories: string[];
  /** الفئة المحددة حالياً — "" تعني "الكل" */
  activeCategory: string;
  onSelect: (category: string) => void;
  /** القائمة الكاملة — لحساب عدد الأطباق داخل كل فئة */
  dishes: Dish[];
};

export function CategoryBar({ categories, activeCategory, onSelect, dishes }: CategoryBarProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // عند تغيير الفئة المحددة نمرر زرها إلى منتصف منطقة العرض
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !activeCategory) return;
    const btn = scroller.querySelector<HTMLButtonElement>(
      `[data-category="${CSS.escape(activeCategory)}"]`,
    );
    if (btn) {
      const left = btn.offsetLeft - scroller.clientWidth / 2 + btn.clientWidth / 2;
      scroller.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeCategory]);

  if (categories.length === 0) return null;

  const countFor = (cat: string) =>
    dishes.filter((d) => (d.category || "").trim() === cat).length;

  const chips = ["", ...categories];

  return (
    <div
      className="sticky top-0 z-30 -mx-4 border-b border-glass-border px-4 py-2.5 backdrop-blur-md"
      style={{ background: "var(--nav-bg)" }}
      dir="rtl"
    >
      <div
        ref={scrollerRef}
        className="flex gap-2 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chips.map((cat) => {
          const isActive = activeCategory === cat;
          const count = cat === "" ? dishes.length : countFor(cat);
          return (
            <button
              key={cat || "__all__"}
              type="button"
              data-category={cat}
              onClick={() => onSelect(cat)}
              className={`no-select touch-target relative shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                isActive ? "text-white" : "glass text-foreground-muted hover:text-foreground"
              }`}
              aria-pressed={isActive}
            >
              {isActive && (
                <motion.span
                  layoutId="menu-category-pill"
                  className="absolute inset-0 rounded-full bg-primary shadow-[var(--shadow-glow)]"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {cat === "" ? "الكل" : cat}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-extrabold ${
                    isActive ? "bg-white/25 text-white" : "bg-foreground/10 text-foreground-muted"
                  }`}
                >
                  {count}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
