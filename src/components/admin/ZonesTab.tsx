// src/components/admin/ZonesTab.tsx
// تبويب "مناطق التوصيل" — منقول كما هو من src/app/admin/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Zone } from "@/types/database";
import {
  fetchAllZones,
  addZone,
  updateZone,
  toggleZoneActive,
} from "@/lib/firestore";
import { inputClass, labelClass } from "./shared";

export function ZonesTab() {
  // ---------------- Zones state ----------------
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    name: "",
    deliveryFee: 5,
    estimatedMinutes: 30,
  });
  const [zoneBusy, setZoneBusy] = useState(false);
  const [zoneError, setZoneError] = useState("");
  const [zoneFeeDrafts, setZoneFeeDrafts] = useState<Record<string, number>>(
    {},
  );

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

  // المكوّن يُركَّب فقط عند تفعيل التبويب — التحميل عند التركيب يحافظ
  // على نفس السلوك الكسول (lazy) القديم المرتبط بتفعيل التبويب
  useEffect(() => {
    loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForm.name.trim()) return;
    setZoneBusy(true);
    setZoneError("");
    try {
      await addZone({
        name: zoneForm.name.trim(),
        deliveryFee: Number(zoneForm.deliveryFee),
        estimatedMinutes: Number(zoneForm.estimatedMinutes),
        active: true,
      });
      setZoneForm({ name: "", deliveryFee: 5, estimatedMinutes: 30 });
      await loadZones();
    } catch (error: any) {
      console.error("Failed to add zone", error);
      // ✅ نعرض الخطأ الفعلي بدل بلعه بصمت — غالباً permission-denied يعني
      // أن قواعد Firestore الجديدة لم تُنشر بعد على المشروع
      setZoneError(
        error?.code === "permission-denied"
          ? "تم الرفض من Firestore (permission-denied). غالباً قواعد firestore.rules الجديدة لم تُنشر بعد — شغّل: firebase deploy --only firestore:rules"
          : `فشلت الإضافة: ${error?.message || "خطأ غير معروف"}`,
      );
    } finally {
      setZoneBusy(false);
    }
  };

  const handleSaveZoneFee = async (zoneId: string) => {
    const value = zoneFeeDrafts[zoneId];
    if (value === undefined) return;
    try {
      await updateZone(zoneId, { deliveryFee: Number(value) });
      await loadZones();
    } catch (error) {
      console.error("Failed to update zone fee", error);
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
          إضافة منطقة توصيل
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
            {zoneBusy ? "جارٍ الإضافة…" : "إضافة المنطقة"}
          </button>
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
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={
                      zoneFeeDrafts[zone.id] ?? zone.deliveryFee
                    }
                    onChange={(e) =>
                      setZoneFeeDrafts({
                        ...zoneFeeDrafts,
                        [zone.id]: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-glass-border bg-secondary px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveZoneFee(zone.id)}
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
                  >
                    حفظ الرسوم
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
