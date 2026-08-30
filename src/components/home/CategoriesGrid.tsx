"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { useDataStore } from "@/store/useDataStore";

type CategoriesGridProps = {
  limit?: number;
};

export function CategoriesGrid({ limit }: CategoriesGridProps) {
  const categories = useDataStore((s) => s.categories)
    .filter((c) => c.visible)
    .sort((a, b) => a.order - b.order);

  const visibleItems = limit ? categories.slice(0, limit) : categories;
  const showSeeAll = Boolean(limit && categories.length > limit!);

  if (categories.length === 0) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">الفئات</h2>
        {showSeeAll && (
          <Link href="/categories" className="text-xs font-bold text-primary">
            عرض الكل
          </Link>
        )}
      </div>
      <ul className="grid grid-cols-4 gap-3">
        {visibleItems.map((cat, index) => (
          <motion.li
            key={cat.id}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.04, type: "spring", stiffness: 300, damping: 22 }}
            whileTap={{ scale: 0.88 }}
          >
            <Link
              href={`/search?category=${cat.id}`}
              className="no-select flex flex-col items-center gap-1.5"
            >
              <span className="glass card-lift flex size-16 items-center justify-center rounded-full text-2xl transition-colors hover:border-primary/40">
                {cat.icon}
              </span>
              <span className="text-center text-[11px] font-semibold text-foreground-muted">
                {cat.label}
              </span>
            </Link>
          </motion.li>
        ))}
        {showSeeAll && (
          <motion.li
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: visibleItems.length * 0.04, type: "spring", stiffness: 300, damping: 22 }}
            whileTap={{ scale: 0.88 }}
          >
            <Link
              href="/categories"
              className="no-select flex flex-col items-center gap-1.5"
            >
              <span className="glass card-lift flex size-16 items-center justify-center rounded-full text-primary transition-colors hover:border-primary/40">
                <LayoutGrid className="size-6" />
              </span>
              <span className="text-center text-[11px] font-semibold text-foreground-muted">
                عرض الكل
              </span>
            </Link>
          </motion.li>
        )}
      </ul>
    </div>
  );
}
