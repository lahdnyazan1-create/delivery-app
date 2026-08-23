// src/components/admin/PromoCodesTab.tsx
// تبويب "أكواد الخصم" — منقول كما هو من src/app/admin/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useToastStore } from "@/store/useToastStore";
import {
  fetchPromoCodes,
  addPromoCode,
  updatePromoCode,
  deletePromoCodeDoc,
} from "@/lib/firestore";
import { inputClass, labelClass } from "./shared";

export function PromoCodesTab() {
  // ---------------- Real Promo Codes state (منفصل عن promoTag الزخرفي) ----------------
  const [promoList, setPromoList] = useState<
    { code: string; percentOff: number; active: boolean }[]
  >([]);
  const [promoListLoading, setPromoListLoading] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: "", percentOff: 10 });
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState("");

  const loadPromoCodes = async () => {
    setPromoListLoading(true);
    setPromoError("");
    try {
      const list = await fetchPromoCodes();
      setPromoList(list);
    } catch (error) {
      console.error("Failed to load promo codes", error);
    } finally {
      setPromoListLoading(false);
    }
  };

  // المكوّن يُركَّب فقط عند تفعيل التبويب — التحميل عند التركيب يحافظ
  // على نفس السلوك الكسول (lazy) القديم المرتبط بتفعيل التبويب
  useEffect(() => {
    loadPromoCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoForm.code.trim()) return;
    setPromoBusy(true);
    setPromoError("");
    try {
      await addPromoCode(promoForm.code.trim(), promoForm.percentOff);
      setPromoForm({ code: "", percentOff: 10 });
      await loadPromoCodes();
    } catch (error: any) {
      setPromoError(`فشلت الإضافة: ${error?.message || "خطأ غير معروف"}`);
    } finally {
      setPromoBusy(false);
    }
  };

  const handleTogglePromo = async (code: string, active: boolean) => {
    await updatePromoCode(code, { active: !active });
    await loadPromoCodes();
  };

  // ✅ تعديل نسبة الخصم مباشرة من البطاقة (inline)
  const handleSavePercent = async (code: string, percent: number) => {
    if (percent < 1 || percent > 100) {
      useToastStore.getState().error("النسبة يجب أن تكون بين 1 و100%");
      return;
    }
    try {
      await updatePromoCode(code, { percentOff: Number(percent) });
      useToastStore.getState().success(`تم تحديث نسبة كود ${code}`);
      await loadPromoCodes();
    } catch (error: any) {
      useToastStore.getState().error(
        `فشل التحديث: ${error?.message || "خطأ غير معروف"}`,
      );
    }
  };

  const handleDeletePromo = async (code: string) => {
    const ok = await useToastStore.getState().confirm({
      title: `حذف كود "${code}"؟`,
      message: "سيُحذف الكود نهائياً ولا يمكن التراجع.",
      confirmText: "حذف",
      danger: true,
    });
    if (!ok) return;
    await deletePromoCodeDoc(code);
    await loadPromoCodes();
  };

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="glass h-fit rounded-2xl p-6">
        <h2 className="mb-1 text-lg font-bold text-primary">
          إضافة كود خصم حقيقي
        </h2>
        <p className="mb-4 text-xs text-foreground-muted">
          هذا الكود يُطبَّق فعلياً على السعر عند إدخاله بشاشة السلة —
          ليس نصاً زخرفياً.
        </p>
        <form onSubmit={handleAddPromoCode} className="space-y-4">
          <div>
            <label className={labelClass}>الكود *</label>
            <input
              type="text"
              required
              value={promoForm.code}
              onChange={(e) =>
                setPromoForm({
                  ...promoForm,
                  code: e.target.value.toUpperCase(),
                })
              }
              className={`${inputClass} font-mono uppercase`}
              placeholder="مثال: WELCOME10"
            />
          </div>
          <div>
            <label className={labelClass}>نسبة الخصم %</label>
            <input
              type="number"
              min={1}
              max={100}
              value={promoForm.percentOff}
              onChange={(e) =>
                setPromoForm({
                  ...promoForm,
                  percentOff: Number(e.target.value),
                })
              }
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={promoBusy}
            className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {promoBusy ? "جارٍ الإضافة…" : "إضافة الكود"}
          </button>
          {promoError && (
            <p className="rounded-lg bg-danger/10 p-2.5 text-xs font-semibold text-danger">
              {promoError}
            </p>
          )}
        </form>
      </div>

      <div className="space-y-4 md:col-span-2">
        <h2 className="text-lg font-bold">
          الأكواد الحالية ({promoList.length})
        </h2>
        {promoListLoading ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            جارٍ التحميل...
          </div>
        ) : promoList.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            لا توجد أكواد بعد
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {promoList.map((promo) => (
              <PromoCard
                key={promo.code}
                promo={promo}
                onToggle={handleTogglePromo}
                onSavePercent={handleSavePercent}
                onDelete={handleDeletePromo}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-foreground-muted">
          ملاحظة: كود &quot;ZEST30&quot; (اخدش واربح) أُزيل من الواجهة —
          إن كان لا يزال موجوداً بهذه القائمة، احذفه من هنا نهائياً.
        </p>
      </div>
    </div>
  );
}

function PromoCard({
  promo,
  onToggle,
  onSavePercent,
  onDelete,
}: {
  promo: { code: string; percentOff: number; active: boolean };
  onToggle: (code: string, active: boolean) => void;
  onSavePercent: (code: string, percent: number) => void;
  onDelete: (code: string) => void;
}) {
  const [percent, setPercent] = useState(Number(promo.percentOff));

  useEffect(() => {
    setPercent(Number(promo.percentOff));
  }, [promo.percentOff]);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-base font-bold">{promo.code}</p>
          <p className="text-xs text-foreground-muted">
            خصم {promo.percentOff}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(promo.code, promo.active)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
              promo.active
                ? "bg-accent/10 text-accent"
                : "bg-danger/10 text-danger"
            }`}
          >
            {promo.active ? "نشط" : "معطّل"}
          </button>
          <button
            type="button"
            onClick={() => onDelete(promo.code)}
            className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-bold text-foreground-muted hover:text-danger"
          >
            حذف
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={100}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="w-full rounded-lg border border-glass-border bg-secondary px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => onSavePercent(promo.code, percent)}
          disabled={percent === Number(promo.percentOff)}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          حفظ النسبة
        </button>
      </div>
    </div>
  );
}