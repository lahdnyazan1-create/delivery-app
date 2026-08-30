// src/components/admin/ProductsTab.tsx
// تبويب "المنتجات" — منقول كما هو من src/app/admin/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useToastStore } from "@/store/useToastStore";
import {
  fetchDishes,
  addDish,
  updateDish,
  deleteDish,
  renameDishCategory,
} from "@/lib/firestore";
import { formatPrice } from "@/constants/currency";
import { ImageUploader } from "@/components/ui/ImageUploader";
import type { Dish } from "@/types/database";
import { inputClass, labelClass } from "./shared";

export function ProductsTab() {
  const { restaurants } = useAppStore();

  // ---------------- Products (Dishes) state ----------------
  const [dishesList, setDishesList] = useState<Dish[]>([]);
  const [dishesLoading, setDishesLoading] = useState(false);
  const [dishRestaurantFilter, setDishRestaurantFilter] = useState("");
  const [dishForm, setDishForm] = useState({
    name: "",
    description: "",
    price: 0,
    category: "أطباق رئيسية",
    image: "",
  });
  const [dishBusy, setDishBusy] = useState(false);
  // ✅ وضع التحرير — الطبق قيد التعديل (null = وضع الإضافة)
  const [editingDishId, setEditingDishId] = useState<string | null>(null);

  const loadDishes = async () => {
    setDishesLoading(true);
    try {
      const list = await fetchDishes();
      setDishesList(list);
    } catch (error) {
      console.error("Failed to load dishes", error);
    } finally {
      setDishesLoading(false);
    }
  };

  // المكوّن يُركَّب فقط عند تفعيل التبويب — التحميل عند التركيب يحافظ
  // على نفس السلوك الكسول (lazy) القديم المرتبط بتفعيل التبويب
  useEffect(() => {
    loadDishes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dishRestaurantFilter && restaurants.length > 0) {
      setDishRestaurantFilter(restaurants[0].id);
    }
  }, [restaurants, dishRestaurantFilter]);

  const resetForm = () => {
    setEditingDishId(null);
    setDishForm({
      name: "",
      description: "",
      price: 0,
      category: "أطباق رئيسية",
      image: "",
    });
  };

  const startEditDish = (dish: Dish) => {
    setEditingDishId(dish.id);
    setDishForm({
      name: dish.name,
      description: dish.description || "",
      price: dish.price,
      category: dish.category || "أطباق رئيسية",
      image: dish.image || "",
    });
    // التمر إلى نموذج التحرير في الأعلى
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteDish = async (dish: Dish) => {
    const ok = await useToastStore.getState().confirm({
      title: `حذف "${dish.name}"؟`,
      message: "سيُحذف الطبق نهائياً من قائمة المطعم ولا يمكن التراجع.",
      confirmText: "حذف",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDish(dish.id);
      if (editingDishId === dish.id) resetForm();
      useToastStore.getState().success("تم حذف المنتج");
      await loadDishes();
    } catch (error: any) {
      useToastStore.getState().error(
        error?.code === "permission-denied"
          ? "تم الرفض من Firestore — تأكد من نشر القواعد الأخيرة"
          : `فشل الحذف: ${error?.message || "خطأ غير معروف"}`,
      );
    }
  };

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishForm.name.trim() || !dishRestaurantFilter) return;
    setDishBusy(true);
    try {
      // ✅ وضع التحرير: تحديث الطبق القائم بدل إضافة جديد
      if (editingDishId) {
        const payload: Partial<Dish> = {
          name: dishForm.name.trim(),
          description: dishForm.description.trim(),
          price: Number(dishForm.price),
          category: dishForm.category.trim(),
          // ✅ نُرسل image دائماً حتى لو كانت فارغة — لأن updateDoc يتجاهل
          // الحقول الغائبة، وهذا كان يمنع حذف صورة المنتج عند إزالتها
          image: dishForm.image || "",
        };
        await updateDish(editingDishId, payload);
        resetForm();
        useToastStore.getState().success("تم حفظ التعديلات");
        await loadDishes();
        return;
      }

      const payload: Parameters<typeof addDish>[0] = {
        restaurantId: dishRestaurantFilter,
        name: dishForm.name.trim(),
        description: dishForm.description.trim(),
        price: Number(dishForm.price),
        category: dishForm.category.trim(),
        available: true,
      };
      if (dishForm.image) payload.image = dishForm.image;
      await addDish(payload);
      resetForm();
      await loadDishes();
    } catch (error: any) {
      useToastStore.getState().error(`فشل الحفظ: ${error?.message || "خطأ غير معروف"}`);
    } finally {
      setDishBusy(false);
    }
  };

  const handleToggleDishAvailable = async (
    dishId: string,
    available: boolean,
  ) => {
    await updateDish(dishId, { available: !available });
    await loadDishes();
  };

  /** ✅ إعادة تسمية فئة عبر كل أطباقها في المطعم المحدد (تُنعكس فوراً في بار الفئات للعميل) */
  const handleRenameCategory = async (oldName: string) => {
    const newName = window.prompt(
      `إعادة تسمية الفئة "${oldName}" — أدخل الاسم الجديد:`,
      oldName,
    );
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    try {
      const ids = dishesForFilter
        .filter((d) => (d.category || "").trim() === oldName)
        .map((d) => d.id);
      await renameDishCategory(ids, newName);
      useToastStore.getState().success(
        `تم تحديث "${oldName}" إلى "${newName.trim()}" على ${ids.length} طبق`,
      );
      await loadDishes();
    } catch (error: any) {
      useToastStore.getState().error(
        `فشلت إعادة التسمية: ${error?.message || "خطأ غير معروف"}`,
      );
    }
  };

  const dishesForFilter = dishesList.filter(
    (d) => d.restaurantId === dishRestaurantFilter,
  );

  // ✅ مرآة بار الفئات في صفحة المطعم: فئات أطباق المطعم المحدد
  //    بترتيب ظهورها الأول + عدد الأطباق في كل فئة — يرى الأدمن
  //    بالضبط ما سيراه العميل في البار العلوي للمطعم
  const restaurantCategories = Array.from(
    dishesForFilter.reduce((map, d) => {
      const cat = (d.category || "").trim();
      if (cat) map.set(cat, (map.get(cat) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  );

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="glass h-fit rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-primary">
          {editingDishId ? "تعديل منتج (طبق)" : "إضافة منتج (طبق)"}
        </h2>
        <div className="mb-4">
          <label className={labelClass}>المطعم *</label>
          <select
            value={dishRestaurantFilter}
            onChange={(e) => setDishRestaurantFilter(e.target.value)}
            className={inputClass}
          >
            <option value="">اختر مطعماً...</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <form onSubmit={handleAddDish} className="space-y-4">
          <div>
            <label className={labelClass}>صورة المنتج</label>
            <ImageUploader
              folder="dishes"
              entityId={dishForm.name.trim() || `temp-${Date.now()}`}
              currentUrl={dishForm.image}
              onUploaded={(url) =>
                setDishForm({ ...dishForm, image: url })
              }
            />
          </div>
          <div>
            <label className={labelClass}>اسم المنتج *</label>
            <input
              type="text"
              required
              value={dishForm.name}
              onChange={(e) =>
                setDishForm({ ...dishForm, name: e.target.value })
              }
              className={inputClass}
              placeholder="مثال: برجر لحم مشوي"
            />
          </div>
          <div>
            <label className={labelClass}>الوصف</label>
            <textarea
              value={dishForm.description}
              onChange={(e) =>
                setDishForm({ ...dishForm, description: e.target.value })
              }
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>السعر (₪) *</label>
              <input
                type="number"
                required
                min={0}
                step="0.5"
                value={dishForm.price}
                onChange={(e) =>
                  setDishForm({
                    ...dishForm,
                    price: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                الفئة (تظهر في بار الفئات بصفحة المطعم)
              </label>
              <input
                type="text"
                list="dish-category-options"
                value={dishForm.category}
                onChange={(e) =>
                  setDishForm({ ...dishForm, category: e.target.value })
                }
                className={inputClass}
                placeholder="مثال: شاورما"
              />
              {/* ✅ اقتراحات بالفئات الموجودة فعلاً في أطباق هذا المطعم */}
              <datalist id="dish-category-options">
                {restaurantCategories.map(([cat]) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>
          <button
            type="submit"
            disabled={dishBusy || !dishRestaurantFilter}
            className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {dishBusy
              ? "جارٍ الحفظ…"
              : editingDishId
                ? "حفظ التعديلات"
                : "إضافة المنتج"}
          </button>
          {editingDishId && (
            <button
              type="button"
              onClick={resetForm}
              className="w-full rounded-xl border border-glass-border bg-secondary py-2.5 text-sm font-bold text-foreground-muted"
            >
              إلغاء التعديل
            </button>
          )}
          {!dishRestaurantFilter && (
            <p className="text-center text-xs text-foreground-muted">
              اختر مطعماً أولاً
            </p>
          )}
        </form>
      </div>

      <div className="space-y-4 md:col-span-2">
        <h2 className="text-lg font-bold">
          منتجات{" "}
          {restaurants.find((r) => r.id === dishRestaurantFilter)?.name ||
            "—"}{" "}
          ({dishesForFilter.length})
        </h2>

        {/* ✅ مرآة بار الفئات: ما يراه العميل في أعلى صفحة المطعم يظهر
            هنا للأدمن — عدد الأطباق بكل فئة + إعادة تسمية دفعة واحدة */}
        {restaurantCategories.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <p className="mb-1 text-sm font-bold text-primary">
              فئات هذا المطعم ({restaurantCategories.length}) — تظهر للعميل كبار علوي في صفحة المطعم
            </p>
            <p className="mb-3 text-[11px] text-foreground-muted">
              لإعادة تسمية فئة: اضغط ✏️ وادخل الاسم الجديد — يُحدَّث على كل أطباق الفئة فوراً
            </p>
            <div className="flex flex-wrap gap-2">
              {restaurantCategories.map(([cat, count]) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-secondary px-3 py-1.5 text-xs font-bold"
                >
                  {cat}
                  <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">
                    {count}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRenameCategory(cat)}
                    aria-label={`إعادة تسمية فئة ${cat}`}
                    className="touch-target text-foreground-muted transition hover:text-primary"
                  >
                    <Pencil className="size-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {dishesLoading ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            جارٍ التحميل...
          </div>
        ) : dishesForFilter.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            لا توجد منتجات لهذا المطعم بعد
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {dishesForFilter.map((dish) => (
              <div
                key={dish.id}
                className="glass flex gap-3 rounded-2xl p-3"
              >
                {/* ✅ relative إلزامية مع <Image fill> — بدونها تتعلق الصورة
                    بأقرب أصل له وضع وثابت (body) وتغطي البطاقة كلها */}
                <div
                  className={`relative size-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br ${
                    dish.gradient || "from-gray-600 to-gray-800"
                  }`}
                >
                  {dish.image && (
                    <Image
                      src={dish.image}
                      alt={dish.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {dish.name}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {formatPrice(dish.price)} · {dish.category}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleDishAvailable(dish.id, dish.available)
                    }
                    className={`mt-1.5 rounded-lg px-2 py-1 text-[11px] font-bold ${
                      dish.available
                        ? "bg-accent/10 text-accent"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {dish.available ? "متوفر" : "غير متوفر"}
                  </button>
                  <div className="mt-1.5 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEditDish(dish)}
                      aria-label={`تعديل ${dish.name}`}
                      className="touch-target flex items-center gap-1 rounded-lg bg-secondary px-2 py-1 text-[11px] font-bold text-foreground-muted transition hover:text-primary"
                    >
                      <Pencil className="size-3" aria-hidden /> تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDish(dish)}
                      aria-label={`حذف ${dish.name}`}
                      className="touch-target flex items-center gap-1 rounded-lg bg-danger/10 px-2 py-1 text-[11px] font-bold text-danger transition hover:bg-danger/20"
                    >
                      <Trash2 className="size-3" aria-hidden /> حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
