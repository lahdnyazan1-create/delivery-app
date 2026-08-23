// src/components/admin/RestaurantsTab.tsx
// تبويب "المطاعم" — إضافة/تعديل/حذف كامل من الأدمن
"use client";

import React, { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useToastStore } from "@/store/useToastStore";
import { Restaurant } from "@/types/database";
import {
  addRestaurant as addRestaurantFirestore,
  toggleRestaurantActive as toggleRestaurantActiveFirestore,
  updateRestaurant as updateRestaurantFirestore,
  deleteRestaurant,
} from "@/lib/firestore";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { inputClass, labelClass } from "./shared";

const emptyForm = {
  name: "",
  cuisine: "وجبات سريعة",
  deliveryFee: 5,
  etaMinutes: 30,
  address: "",
  image: "",
};

export function RestaurantsTab() {
  const { restaurants } = useAppStore();

  const [restForm, setRestForm] = useState(emptyForm);
  const [editingRestaurantId, setEditingRestaurantId] = useState<string | null>(null);
  const [restBusy, setRestBusy] = useState(false);

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

  const startEditRestaurant = (rest: Restaurant) => {
    setEditingRestaurantId(rest.id);
    setRestForm({
      name: rest.name,
      cuisine: rest.cuisine || "وجبات سريعة",
      deliveryFee: Number(rest.deliveryFee ?? 5),
      etaMinutes: Number(rest.etaMinutes ?? 30),
      address: rest.address || "",
      image: rest.image || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetRestForm = () => {
    setEditingRestaurantId(null);
    setRestForm(emptyForm);
  };

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restForm.name.trim()) return;
    setRestBusy(true);

    try {
      // ✅ وضع التحرير: تحديث المطعم القائم بدل إضافة جديد
      if (editingRestaurantId) {
        const payload: Partial<Restaurant> = {
          name: restForm.name.trim(),
          cuisine: restForm.cuisine.trim(),
          deliveryFee: Number(restForm.deliveryFee),
          etaMinutes: Number(restForm.etaMinutes),
          address: restForm.address.trim(),
        };
        // حذف الرابط يعني إزالة الحقل تماماَ (بدلاً من تخزين "")
        if (restForm.image) payload.image = restForm.image;
        else payload.image = "";
        await updateRestaurantFirestore(editingRestaurantId, payload);
        useToastStore.getState().success("تم حفظ التعديلات");
        resetRestForm();
        return;
      }

      const newRest: Omit<Restaurant, "id"> = {
        name: restForm.name.trim(),
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

      await addRestaurantFirestore(newRest);
      resetRestForm();
      useToastStore.getState().success("تمت إضافة المطعم");
    } catch (error: any) {
      useToastStore.getState().error(
        `فشل الحفظ: ${error?.message || "خطأ غير معروف"}`,
      );
    } finally {
      setRestBusy(false);
    }
  };

  const handleDeleteRestaurant = async (rest: Restaurant) => {
    const ok = await useToastStore.getState().confirm({
      title: `حذف "${rest.name}" نهائياَ؟`,
      message:
        "سيُحذف المطعم مع جميع أطباقه نهائياً ولا يمكن التراجع. الطلبات السابقة تبقى في السجل.",
      confirmText: "حذف المطعم وأطباقه",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteRestaurant(rest.id);
      if (editingRestaurantId === rest.id) resetRestForm();
      useToastStore.getState().success("تم حذف المطعم وأطباقه");
    } catch (error: any) {
      useToastStore.getState().error(
        `فشل الحذف: ${error?.message || "خطأ غير معروف"}`,
      );
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
          {editingRestaurantId ? "تعديل المطعم" : "إضافة مطعم جديد"}
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
            disabled={restBusy}
            className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {restBusy
              ? "جارٍ الحفظ…"
              : editingRestaurantId
                ? "حفظ التعديلات"
                : "إضافة المطعم"}
          </button>
          {editingRestaurantId && (
            <button
              type="button"
              onClick={resetRestForm}
              className="w-full rounded-xl border border-glass-border bg-secondary py-2.5 text-sm font-bold text-foreground-muted"
            >
              إلغاء التعديل
            </button>
          )}
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
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEditRestaurant(rest)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground-muted transition hover:text-primary"
                >
                  <Pencil className="size-3.5" aria-hidden /> تعديل
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRestaurant(rest)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger transition hover:bg-danger/20"
                >
                  <Trash2 className="size-3.5" aria-hidden /> حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
