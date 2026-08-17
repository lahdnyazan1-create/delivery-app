// src/components/admin/RestaurantsTab.tsx
// تبويب "المطاعم" — منقول كما هو من src/app/admin/page.tsx
"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Restaurant } from "@/types/database";
import {
  addRestaurant as addRestaurantFirestore,
  toggleRestaurantActive as toggleRestaurantActiveFirestore,
  updateRestaurant as updateRestaurantFirestore,
} from "@/lib/firestore";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { inputClass, labelClass } from "./shared";

export function RestaurantsTab() {
  const { restaurants } = useAppStore();

  const [restForm, setRestForm] = useState({
    name: "",
    cuisine: "وجبات سريعة",
    deliveryFee: 5,
    etaMinutes: 30,
    address: "",
    image: "",
  });

  const [promoDrafts, setPromoDrafts] = useState<Record<string, string>>({});

  // ---------------- Restaurants / Promo ----------------

  const handleSavePromoTag = async (id: string) => {
    const value = (promoDrafts[id] ?? "").trim();
    try {
      await updateRestaurantFirestore(id, { promoTag: value || null });
    } catch (error) {
      console.error("Failed to update promo tag", error);
    }
  };

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restForm.name) return;

    const newRest: Omit<Restaurant, "id"> = {
      name: restForm.name,
      cuisine: restForm.cuisine,
      rating: 5.0,
      deliveryFee: Number(restForm.deliveryFee),
      etaMinutes: Number(restForm.etaMinutes),
      address: restForm.address,
      active: true,
      coverGradient: "from-primary to-red-600",
      logoGradient: "from-primary to-orange-600",
    };
    if (restForm.image) newRest.image = restForm.image;

    try {
      await addRestaurantFirestore(newRest);
      setRestForm({
        name: "",
        cuisine: "وجبات سريعة",
        deliveryFee: 5,
        etaMinutes: 30,
        address: "",
        image: "",
      });
    } catch (error) {
      console.error("Failed to add restaurant", error);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await toggleRestaurantActiveFirestore(id, !currentActive);
    } catch (error) {
      console.error("Failed to toggle restaurant", error);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="glass h-fit rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-primary">
          إضافة مطعم جديد
        </h2>
        <form onSubmit={handleAddRestaurant} className="space-y-4">
          <div>
            <label className={labelClass}>صورة المطعم</label>
            <ImageUploader
              folder="restaurants"
              entityId={restForm.name.trim() || `temp-${Date.now()}`}
              currentUrl={restForm.image}
              onUploaded={(url) =>
                setRestForm({ ...restForm, image: url })
              }
            />
          </div>
          <div>
            <label className={labelClass}>اسم المطعم</label>
            <input
              type="text"
              required
              value={restForm.name}
              onChange={(e) =>
                setRestForm({ ...restForm, name: e.target.value })
              }
              className={inputClass}
              placeholder="مثال: بيتزا الخليل"
            />
          </div>
          <div>
            <label className={labelClass}>المطبخ / التصنيف</label>
            <input
              type="text"
              value={restForm.cuisine}
              onChange={(e) =>
                setRestForm({ ...restForm, cuisine: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                أجرة توصيل احتياطية (₪)
              </label>
              <input
                type="number"
                value={restForm.deliveryFee}
                onChange={(e) =>
                  setRestForm({
                    ...restForm,
                    deliveryFee: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
              <p className="mt-1 text-[10px] text-foreground-muted">
                غير مستخدمة فعلياً بعد الآن — الرسوم الفعلية من منطقة
                التوصيل التي يختارها العميل
              </p>
            </div>
            <div>
              <label className={labelClass}>الوقت المتوقع (دقيقة)</label>
              <input
                type="number"
                value={restForm.etaMinutes}
                onChange={(e) =>
                  setRestForm({
                    ...restForm,
                    etaMinutes: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>العنوان</label>
            <input
              type="text"
              value={restForm.address}
              onChange={(e) =>
                setRestForm({ ...restForm, address: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90"
          >
            إضافة المطعم
          </button>
        </form>
      </div>

      <div className="space-y-4 md:col-span-2">
        <h2 className="text-lg font-bold">
          المطاعم المسجلة ({restaurants.length})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {restaurants.map((rest) => (
            <div key={rest.id} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">{rest.name}</h3>
                  <p className="text-xs text-foreground-muted">
                    {rest.cuisine || "وجبات"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleActive(rest.id, rest.active)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    rest.active
                      ? "border border-accent/30 bg-accent/10 text-accent"
                      : "border border-danger/30 bg-danger/10 text-danger"
                  }`}
                >
                  {rest.active ? "نشط" : "متوقف"}
                </button>
              </div>
              <p className="mt-2 truncate text-[11px] text-foreground-muted">
                المالك:{" "}
                {rest.ownerId ? (
                  <span className="font-mono text-accent">
                    {rest.ownerId}
                  </span>
                ) : (
                  <span className="text-danger">غير مرتبط بعد</span>
                )}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={promoDrafts[rest.id] ?? rest.promoTag ?? ""}
                  onChange={(e) =>
                    setPromoDrafts({
                      ...promoDrafts,
                      [rest.id]: e.target.value,
                    })
                  }
                  placeholder="مثال: عرض اليوم! — اتركه فارغاً للإخفاء"
                  className="w-full rounded-lg border border-glass-border bg-secondary px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => handleSavePromoTag(rest.id)}
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
                >
                  حفظ
                </button>
              </div>
              <p className="mt-1 text-[10px] text-foreground-muted">
                ⚠️ شارة نصية زخرفية فقط تظهر بالرئيسية — لا تخصم أي مبلغ
                فعلياً. لخصم حقيقي على السعر استخدم تبويب &quot;أكواد
                الخصم&quot;.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
