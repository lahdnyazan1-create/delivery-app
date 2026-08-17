// src/components/admin/CategoriesTab.tsx
// تبويب "الفئات" — منقول كما هو من src/app/admin/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useToastStore } from "@/store/useToastStore";
import {
  fetchAllCategories,
  addCategory,
  updateCategory,
  deleteCategoryDoc,
} from "@/lib/firestore";
import { CATEGORY_ICON_OPTIONS, inputClass, labelClass } from "./shared";

export function CategoriesTab() {
  // ---------------- Categories state ----------------
  const [categoriesList, setCategoriesList] = useState<
    { id: string; label: string; icon: string; order: number; visible: boolean }[]
  >([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    label: "",
    icon: CATEGORY_ICON_OPTIONS[0],
    order: 0,
  });
  const [categoryBusy, setCategoryBusy] = useState(false);

  const loadCategories = async () => {
    setCategoriesLoading(true);
    try {
      const list = (await fetchAllCategories()) as any[];
      setCategoriesList(list);
    } catch (error) {
      console.error("Failed to load categories", error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // المكوّن يُركَّب فقط عند تفعيل التبويب — التحميل عند التركيب يحافظ
  // على نفس السلوك الكسول (lazy) القديم المرتبط بتفعيل التبويب
  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.label.trim()) return;
    setCategoryBusy(true);
    try {
      await addCategory({
        label: categoryForm.label.trim(),
        icon: categoryForm.icon,
        order: Number(categoryForm.order),
        visible: true,
      });
      setCategoryForm({ label: "", icon: CATEGORY_ICON_OPTIONS[0], order: 0 });
      await loadCategories();
    } catch (error) {
      console.error("Failed to add category", error);
    } finally {
      setCategoryBusy(false);
    }
  };

  const handleToggleCategoryVisible = async (id: string, visible: boolean) => {
    await updateCategory(id, { visible: !visible });
    await loadCategories();
  };

  const handleDeleteCategory = async (id: string) => {
    const ok = await useToastStore.getState().confirm({
      title: "حذف هذه الفئة؟",
      message: "ستُحذف الفئة نهائياً ولا يمكن التراجع.",
      confirmText: "حذف",
      danger: true,
    });
    if (!ok) return;
    await deleteCategoryDoc(id);
    await loadCategories();
  };

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="glass h-fit rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-bold text-primary">
          إضافة فئة جديدة
        </h2>
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label className={labelClass}>اسم الفئة *</label>
            <input
              type="text"
              required
              value={categoryForm.label}
              onChange={(e) =>
                setCategoryForm({ ...categoryForm, label: e.target.value })
              }
              className={inputClass}
              placeholder="مثال: مشروبات"
            />
          </div>
          <div>
            <label className={labelClass}>الأيقونة</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setCategoryForm({ ...categoryForm, icon })}
                  className={`flex size-10 items-center justify-center rounded-xl border text-lg transition ${
                    categoryForm.icon === icon
                      ? "border-primary bg-primary/15"
                      : "border-glass-border bg-secondary"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>الترتيب (رقم أصغر = أول)</label>
            <input
              type="number"
              value={categoryForm.order}
              onChange={(e) =>
                setCategoryForm({
                  ...categoryForm,
                  order: Number(e.target.value),
                })
              }
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={categoryBusy}
            className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {categoryBusy ? "جارٍ الإضافة…" : "إضافة الفئة"}
          </button>
        </form>
      </div>

      <div className="space-y-4 md:col-span-2">
        <h2 className="text-lg font-bold">
          الفئات الحالية ({categoriesList.length})
        </h2>
        {categoriesLoading ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            جارٍ التحميل...
          </div>
        ) : categoriesList.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            لا توجد فئات بعد
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categoriesList.map((cat) => (
              <div
                key={cat.id}
                className="glass flex items-center justify-between rounded-2xl p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="text-sm font-bold">{cat.label}</p>
                    <p className="text-[10px] text-foreground-muted">
                      ترتيب: {cat.order}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleCategoryVisible(cat.id, cat.visible)
                    }
                    className={`rounded-lg px-2 py-1.5 text-[11px] font-bold ${
                      cat.visible
                        ? "bg-accent/10 text-accent"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {cat.visible ? "ظاهرة" : "مخفية"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="rounded-lg bg-white/5 px-2 py-1.5 text-[11px] font-bold text-foreground-muted hover:text-danger"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
