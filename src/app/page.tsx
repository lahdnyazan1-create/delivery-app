"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { Header } from "@/components/layout/Header";
import { Restaurant } from "@/types/database";

export default function HomePage() {
  const router = useRouter();
  const { hasSeenOnboarding, restaurants } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!hasSeenOnboarding) {
      router.replace("/onboarding");
    }
  }, [hasSeenOnboarding, router]);

  const filteredRestaurants = restaurants.filter((r: Restaurant) => {
    return (
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cuisine?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 dir-rtl">
      <Header />
      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-gradient-to-r from-slate-900 to-slate-900/60 p-6 md:p-8 rounded-3xl border border-slate-800 space-y-4">
          <h1 className="text-2xl md:text-4xl font-extrabold text-amber-400">
            أطلب أكلك المفضل بسهولة
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl">
            تصفح القائمة الشاملة لأفضل المطاعم واطلب وجبتك ليصلك المندوب في أسرع
            وقت.
          </p>

          <input
            type="text"
            placeholder="ابحث عن مطعم أو نوع الأكل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-sm outline-none focus:border-amber-500 text-slate-200"
          />
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-slate-200">المطاعم المتاحة</h2>
          {filteredRestaurants.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
              لا توجد مطاعم مطابقة للبحث حالياً.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant: Restaurant) => (
                <div
                  key={restaurant.id}
                  onClick={() => router.push(`/restaurant/${restaurant.id}`)}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/50 cursor-pointer transition space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-slate-100">
                      {restaurant.name}
                    </h3>
                    <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg border border-amber-500/20">
                      ⭐ {restaurant.rating || 5.0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {restaurant.cuisine || "وجبات متنوعة"}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-3">
                    <span>⏱️ {restaurant.etaMinutes || 30} دقيقة</span>
                    <span>🛵 {restaurant.deliveryFee || 5} ₪ توصيل</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
