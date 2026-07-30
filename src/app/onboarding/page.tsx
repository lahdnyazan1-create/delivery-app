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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-4xl mx-auto">
          🚀
        </div>
        <h1 className="text-2xl font-bold text-amber-400">
          أهلاً بك في تطبيق توصيل الطلبات
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          اطلب وجباتك المفضلة من أفضل المطاعم المحلية مع تتبع مباشر وحالة الطلب
          خطوة بخطوة.
        </p>
        <button
          onClick={handleFinish}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3.5 rounded-2xl transition shadow-lg shadow-amber-500/10"
        >
          ابدأ التصفح الآن
        </button>
      </div>
    </div>
  );
}
