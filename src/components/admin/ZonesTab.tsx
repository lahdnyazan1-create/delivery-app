// src/components/admin/ZonesTab.tsx
// تبويب "مناطق التوصيل" — إضافة/تعديل/حذف/تفعيل من الأدمن
"use client";

import React, { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";
import { Zone } from "@/types/database";
import {
  fetchAllZones,
  addZone,
  updateZone,
  toggleZoneActive,
  deleteZone,
} from "@/lib/firestore";
import { inputClass, labelClass } from "./shared";

const emptyZoneForm = { name: "", deliveryFee: 5, estimatedMinutes: 30 };

export function ZonesTab() {
  // ---------------- Zones state ----------------
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zoneForm, setZoneForm] = useState(emptyZoneForm);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneBusy, setZoneBusy] = useState(false);
  const [zoneError, setZoneError] = useState("");

  const loadZones = async () => {
    setZonesLoading(true);
    setZoneError("");
    try {
      const list = await fetchAllZones();
      setZones(list);
    } catch (error) {
      console.error("Failed to load zones", error);
      setZoneError(
        "تعذّر تحميل المناطق — تأكد من نشر قواعد Firestore المحدّثة (firebase deploy --only firestore:rules)",
      );
    } finally {
      setZonesLoading(false);
    }
  };

  // المكوّن يُركَّز فقط عند تفعيل التبويب — التحميل عند التركيب يحافظ
  // على نفس السلوك الكسول (lazy) القديم المرتبط بتفعيل التبويب
  useEffect(() => {
    loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetZoneForm = () => {
    setEditingZoneId(null);
    setZoneForm(emptyZoneForm);
  };

  const startEditZone = (zone: Zone) => {
    setEditingZoneId(zone.id);
    setZoneForm({
      name: zone.name,
      deliveryFee: Number(zone.deliveryFee ?? 5),
      estimatedMinutes: Number(zone.estimatedMinutes ?? 30),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForm.name.trim()) return;
    setZoneBusy(true);
    setZoneError("");
    try {
      // ✅ وضع التحرير: تحديث المنطقة القائمة بدل إضافة جديدة
      if (editingZoneId) {
        await updateZone(editingZoneId, {
          name: zoneForm.name.trim(),
          deliveryFee: Number(zoneForm.deliveryFee),
          estimatedMinutes: Number(zoneForm.estimatedMinutes),
        });
        resetZoneForm();
        useToastStore.getState().success("تم حفظ تعديلات المنطقة");
        await loadZones();
        return;
      }

      await addZone({
        name: zoneForm.name.trim(),
        deliveryFee: Number(zoneForm.deliveryFee),
        estimatedMinutes: Number(zoneForm.estimatedMinutes),
        active: true,
      });
      resetZoneForm();
      useToastStore.getState().success("تمت إضافة المنطقة");
      await loadZones();
    } catch (error: any) {
      console.error("Failed to add zone", error);
      // ✅ نعرض الخطأ الفعلي بدل بلعه بصمت — غالباَ permission-denied يعني
      // أن قواعد Firestore الجديدة لم ت商铺 بعد على المشروع
      setZoneError(
        error?.code === "permission-denied"
          ? "تم الرفض من Firestore (permission-denied). غالباَ قواعد firestore.rules الجديدة لم ت商铺 بعد — شغّل: firebase deploy --only firestore:rules"
          : `فشلت العملية: ${error?.message || "خطأ غير معروف"}`,
      );
    } finally {
      setZoneBusy(false);
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    const ok = await useToastStore.getState().confirm({
      title: `حذف منطقة "${zone.name}"؟`,
      message:
        "سيُحذف تعريف المنطقة نهائياَ — الطلبات السابقة لا تتأثر.",
      confirmText: "حذف",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteZone(zone.id);
      if (editingZoneId === zone.id) resetZoneForm();
      useToastStore.getState().success("تم حذف المنطقة");
      await loadZones();
    } catch (error: any) {
      useToastStore.getState().error(
        `فشل الحذف: ${error?.message || "خطأ غير معروف"}`,
      );
    }
  };

  const handleSaveZoneField = async (
    zoneId: string,
    field: "deliveryFee" | "estimatedMinutes",
    value: number,
  ) => {
    try {
      await updateZone(zoneId, { [field]: Number(value) });
      await loadZones();
      useToastStore.getState().success("تم الحفظ");
    } catch (error) {
      console.error("Failed to update zone", error);
      useToastStore.getState().error("فشل الحفظ — تحقق من القواعد");
    }
  };

  const handleToggleZone = async (zoneId: string, active: boolean) => {
    try {
      await toggleZoneActive(zoneId, !active);
      await loadZones();
    } catch (error) {
      console.error("Failed to toggle zone", error);
    }
  };

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="glass h-fit rounded-2xl p-6">
        <h2 className="mb-1 text-lg font-bold text-primary">
          {editingZoneId ? "تعديل منطقة التوصيل" : "إضافة منطقة توصيل"}
        </h2>
        <p className="mb-4 text-xs text-foreground-muted">
          رسوم التوصيل الفعلية لكل طلب تُحسب من هنا الآن، وليس من إعدادات
          المطعم.
        </p>
        <form onSubmit={handleAddZone} className="space-y-4">
          <div>
            <label className={labelClass}>اسم المنطقة *</label>
            <input
              type="text"
              required
              value={zoneForm.name}
              onChange={(e) =>
                setZoneForm({ ...zoneForm, name: e.target.value })
              }
              className={inputClass}
              placeholder="مثال: نابلس - وسط البلد"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>رسوم التوصيل (₪)</label>
              <input
                type="number"
                min={0}
                value={zoneForm.deliveryFee}
                onChange={(e) =>
                  setZoneForm({
                    ...zoneForm,
                    deliveryFee: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>الوقت المتوقع (دقيقة)</label>
              <input
                type="number"
                min={0}
                value={zoneForm.estimatedMinutes}
                onChange={(e) =>
                  setZoneForm({
                    ...zoneForm,
                    estimatedMinutes: Number(e.target.value),
                  })
                }
                className={inputClass}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={zoneBusy}
            className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {zoneBusy
              ? "جارٍ الحفظ…"
              : editingZoneId
                ? "حفظ التعديلات"
                : "إضافة المنطقة"}
          </button>
          {editingZoneId && (
            <button
              type="button"
              onClick={resetZoneForm}
              className="w-full rounded-xl border border-glass-border bg-secondary py-2.5 text-sm font-bold text-foreground-muted"
            >
              إلغاء التعديل
            </button>
          )}
          {zoneError && (
            <p className="rounded-lg bg-danger/10 p-2.5 text-xs font-semibold text-danger">
              {zoneError}
            </p>
          )}
        </form>
      </div>

      <div className="space-y-4 md:col-span-2">
        <h2 className="text-lg font-bold">
          المناطق المسجلة ({zones.length})
        </h2>
        {zonesLoading ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            جارٍ التحميل...
          </div>
        ) : zones.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            لا توجد مناطق بعد — أضف واحدة من النموذج
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {zones.map((zone) => (
              <div key={zone.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold">{zone.name}</h3>
                    <p className="text-xs text-foreground-muted">
                      {zone.estimatedMinutes ?? "—"} دقيقة تقريباً
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleZone(zone.id, zone.active)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      zone.active
                        ? "border border-accent/30 bg-accent/10 text-accent"
                        : "border border-danger/30 bg-danger/10 text-danger"
                    }`}
                  >
                    {zone.active ? "نشطة" : "معطّلة"}
                  </button>
                </div>
                <ZoneQuickFields
                  zone={zone}
                  onSave={handleSaveZoneField}
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditZone(zone)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-secondary px-2 py-1.5 text-[11px] font-bold text-foreground-muted transition hover:text-primary"
                  >
                    <Pencil className="size-3" aria-hidden /> تعديل كامل
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteZone(zone)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-danger/10 px-2 py-1.5 text-[11px] font-bold text-danger transition hover:bg-danger/20"
                  >
                    <Trash2 className="size-3" aria-hidden /> حذف
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

/** حقلا الرسوم والوقت مع حفظ فوري لكل منطقة (لوحة مفاتيح محلية لكل منطقة) */
function ZoneQuickFields({
  zone,
  onSave,
}: {
  zone: Zone;
  onSave: (
    zoneId: string,
    field: "deliveryFee" | "estimatedMinutes",
    value: number,
  ) => void;
}) {
  const [fee, setFee] = useState(zone.deliveryFee);
  const [minutes, setMinutes] = useState(zone.estimatedMinutes ?? 30);

  // مزامنة الحقول إذا حدّثت القائمة من الخارج (مثل حفظ منطقة أخرى)
  useEffect(() => {
    setFee(zone.deliveryFee);
    setMinutes(zone.estimatedMinutes ?? 30);
  }, [zone.deliveryFee, zone.estimatedMinutes]);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
          className="w-full rounded-lg border border-glass-border bg-secondary px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => onSave(zone.id, "deliveryFee", fee)}
          disabled={fee === zone.deliveryFee}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
        >
          حفظ الرسوم
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-full rounded-lg border border-glass-border bg-secondary px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => onSave(zone.id, "estimatedMinutes", minutes)}
          disabled={minutes === (zone.estimatedMinutes ?? 0)}
          className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground-muted disabled:opacity-40"
        >
          حفظ الوقت
        </button>
      </div>
    </div>
  );
}
