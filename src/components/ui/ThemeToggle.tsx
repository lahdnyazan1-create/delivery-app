// src/components/ui/ThemeToggle.tsx
// ============================================================================
// زر تبديل الثيم (فاتح/داكن) — يعمل على أي صفحة، يحفظ الاختيار في
// localStorage ويسترجعه فوراً عند التحميل (قبل الرسم عبر سكربت في
// layout.tsx كي لا تومض الصفحة بلون خاطئ). الثيم الداكن هو الافتراضي.
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "daghri-theme";
/** مفتاح الهوية القديمة (Zest) — يُقرأ مرة أخيرة كي لا يفقد
 *  المستخدم اختياره بعد التحول إلى هوية دُغْري، ثم يُكتب الجديد فقط */
const LEGACY_THEME_STORAGE_KEY = "zest-theme";

/** يقرأ الثيم المحفوظ إن وُجد — الداكن هو الافتراضي */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored =
    localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  return (stored as Theme) || "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = getStoredTheme();
    setTheme(current);
    applyTheme(current);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* التخزين ممتلئ/معطل — يبقى التبديل للجلسة الحالية */
    }
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      aria-pressed={isDark}
      className="no-select touch-target glass relative flex size-10 items-center justify-center overflow-hidden rounded-full text-primary transition active:scale-90"
      dir="ltr"
    >
      {/* العرض قبل التركيب ثابت كي لا يختلف عن HTML المرسوم من الخادم */}
      <motion.span
        key={mounted ? theme : "dark"}
        initial={{ y: 14, opacity: 0, rotate: -30 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
        className="flex items-center justify-center"
      >
        {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
      </motion.span>
    </button>
  );
}
