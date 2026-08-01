"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding } = useAppStore();

  const handleFinish = () => {
    completeOnboarding();
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
      <div className="glass w-full max-w-md space-y-6 rounded-3xl p-8">
        <div className="mx-auto flex size-20 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-4xl">
          🚀
        </div>
        <h1 className="text-2xl font-bold text-primary">
          أهلاً بك في تطبيق توصيل الطلبات
        </h1>
        <p className="text-sm leading-relaxed text-foreground-muted">
          اطلب وجباتك المفضلة من أفضل المطاعم المحلية مع تتبع مباشر وحالة الطلب
          خطوة بخطوة.
        </p>
        <button
          type="button"
          onClick={handleFinish}
          className="w-full rounded-2xl bg-primary py-3.5 font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90"
        >
          ابدأ التصفح الآن
        </button>
      </div>
    </div>
  );
}
