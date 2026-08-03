"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function MartPage() {
  const router = useRouter();
  return (
    <AppShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <span className="glass flex size-20 items-center justify-center rounded-full text-primary">
          <ShoppingCart className="size-9" />
        </span>
        <h1 className="text-xl font-extrabold">مارت — قريباً</h1>
        <p className="max-w-xs text-sm text-foreground-muted">
          نعمل على إطلاق متجر سريع للبقالة والمنتجات اليومية. تابعنا قريباً!
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="no-select touch-target rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
        >
          العودة للمطاعم
        </button>
      </div>
    </AppShell>
  );
}
