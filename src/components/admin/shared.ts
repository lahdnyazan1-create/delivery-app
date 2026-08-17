// src/components/admin/shared.ts
// ============================================================================
// عناصر مشتركة بين مكوّنات تبويبات لوحة الإدارة — منقولة كما هي من
// src/app/admin/page.tsx الأصلي دون أي تغيير بالسلوك.
// ============================================================================
import type { OrderStatus } from "@/types/database";

// أيقونات مقترحة (Emoji) لفئات الرئيسية — بسيطة وتعمل بدون رفع أي صور
export const CATEGORY_ICON_OPTIONS = [
  "🍔", "🍕", "🍗", "🌯", "🥗", "🍰", "☕", "🥤",
  "🍜", "🍣", "🥙", "🍟", "🧁", "🍦", "🥪", "🛒",
];

export function statusBadgeClass(status: OrderStatus) {
  if (status === "Delivered") {
    return "bg-accent/10 text-accent border border-accent/20";
  }
  if (status === "Cancelled") {
    return "bg-danger/10 text-danger border border-danger/20";
  }
  return "bg-primary/10 text-primary border border-primary/20";
}

export const inputClass =
  "w-full rounded-xl border border-glass-border bg-secondary p-2.5 text-sm text-foreground outline-none focus:border-primary";
export const labelClass = "mb-1 block text-xs text-foreground-muted";
