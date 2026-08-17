// src/components/admin/AccessTab.tsx
// تبويب "الوصول والفرق" — منقول كما هو من src/app/admin/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useToastStore } from "@/store/useToastStore";
import { DriverWallet } from "@/types/database";
import {
  setUserRole,
  upsertDriverProfile,
  updateRestaurant as updateRestaurantFirestore,
  fetchDriverWallets,
} from "@/lib/firestore";
import { settleDriverCash } from "@/lib/orders";
import { formatPrice } from "@/constants/currency";
import { inputClass, labelClass } from "./shared";

export function AccessTab() {
  const { restaurants, drivers, loadInitialData } = useAppStore();

  const [driverForm, setDriverForm] = useState({
    uid: "",
    name: "",
    phone: "",
    vehicle: "دراجة نارية",
    plateNumber: "",
  });
  const [driverMsg, setDriverMsg] = useState("");
  const [driverBusy, setDriverBusy] = useState(false);

  const [ownerForm, setOwnerForm] = useState({ restaurantId: "", uid: "" });
  const [ownerMsg, setOwnerMsg] = useState("");
  const [ownerBusy, setOwnerBusy] = useState(false);

  // ---------------- Driver wallets state ----------------
  const [wallets, setWallets] = useState<DriverWallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [settlingDriverId, setSettlingDriverId] = useState<string | null>(
    null,
  );

  const loadWallets = async () => {
    setWalletsLoading(true);
    try {
      const list = await fetchDriverWallets();
      setWallets(list);
    } catch (error) {
      console.error("Failed to load wallets", error);
    } finally {
      setWalletsLoading(false);
    }
  };

  // المكوّن يُركَّب فقط عند تفعيل التبويب — التحميل عند التركيب يحافظ
  // على نفس السلوك الكسول (lazy) القديم المرتبط بتفعيل التبويب
  useEffect(() => {
    loadWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSettle = async (driverId: string) => {
    setSettlingDriverId(driverId);
    try {
      const result = await settleDriverCash(driverId);
      if (!result.ok) useToastStore.getState().error(result.message || "فشلت التسوية");
      await loadWallets();
    } finally {
      setSettlingDriverId(null);
    }
  };

  const handleLinkDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = driverForm.uid.trim();
    if (!uid || !driverForm.name.trim()) {
      setDriverMsg("أدخل معرّف المستخدم (UID) واسم السائق على الأقل");
      return;
    }
    setDriverBusy(true);
    setDriverMsg("");
    try {
      await setUserRole(uid, "courier");
      await upsertDriverProfile(uid, {
        name: driverForm.name.trim(),
        phone: driverForm.phone.trim(),
        vehicle: driverForm.vehicle,
        plateNumber: driverForm.plateNumber.trim(),
        isAvailable: true,
      });
      setDriverMsg("تم ربط السائق وترقية دوره بنجاح ✓");
      setDriverForm({
        uid: "",
        name: "",
        phone: "",
        vehicle: "دراجة نارية",
        plateNumber: "",
      });
      // ✅ إعادة تحليل السائقين ليظهروا فوراً في قائمة الإسناد
      loadInitialData();
    } catch (error) {
      console.error("Failed to link driver", error);
      setDriverMsg(
        "تعذّر الربط — تأكد أن المستخدم سجّل دخول مرة واحدة على الأقل وأن الـ UID صحيح",
      );
    } finally {
      setDriverBusy(false);
    }
  };

  const handleLinkOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    const uid = ownerForm.uid.trim();
    if (!ownerForm.restaurantId || !uid) {
      setOwnerMsg("اختر مطعماً وأدخل معرّف المستخدم (UID)");
      return;
    }
    setOwnerBusy(true);
    setOwnerMsg("");
    try {
      // ✅ يربط ownerId بالمطعم *و* يرقّي دور المستخدم إلى "vendor" معاً،
      // لأن لوحة /vendor تتطلب role === "vendor" بالضبط (RequireRole)،
      // بينما ownerId وحده كان يكفي فقط لصلاحيات Firestore Rules /
      // Cloud Functions لكن ليس لدخول صفحة اللوحة نفسها.
      await updateRestaurantFirestore(ownerForm.restaurantId, {
        ownerId: uid,
      });
      await setUserRole(uid, "vendor");
      setOwnerMsg("تم ربط مالك المطعم وترقية دوره إلى vendor بنجاح ✓");
      setOwnerForm({ restaurantId: "", uid: "" });
    } catch (error) {
      console.error("Failed to link owner", error);
      setOwnerMsg("تعذّر الربط، تحقق من البيانات وحاول مجدداً");
    } finally {
      setOwnerBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h2 className="mb-1 text-lg font-bold text-primary">
            ربط سائق جديد
          </h2>
          <p className="mb-4 text-xs text-foreground-muted">
            يجب أن يكون المستخدم قد سجّل دخول مرة واحدة على الأقل. انسخ
            معرّفه (UID) من Firebase Console ← Authentication.
          </p>
          <form onSubmit={handleLinkDriver} className="space-y-4">
            <div>
              <label className={labelClass}>معرّف المستخدم (UID) *</label>
              <input
                type="text"
                required
                value={driverForm.uid}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, uid: e.target.value })
                }
                className={`${inputClass} font-mono`}
                placeholder="مثال: aB3xY9..."
              />
            </div>
            <div>
              <label className={labelClass}>اسم السائق *</label>
              <input
                type="text"
                required
                value={driverForm.name}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, name: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>رقم الهاتف</label>
              <input
                type="tel"
                value={driverForm.phone}
                onChange={(e) =>
                  setDriverForm({ ...driverForm, phone: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>نوع المركبة</label>
                <select
                  value={driverForm.vehicle}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      vehicle: e.target.value,
                    })
                  }
                  className={inputClass}
                >
                  <option value="دراجة نارية">دراجة نارية</option>
                  <option value="سيارة">سيارة</option>
                  <option value="دراجة هوائية">دراجة هوائية</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>رقم اللوحة</label>
                <input
                  type="text"
                  value={driverForm.plateNumber}
                  onChange={(e) =>
                    setDriverForm({
                      ...driverForm,
                      plateNumber: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={driverBusy}
              className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {driverBusy ? "جارٍ الربط…" : "ربط السائق"}
            </button>
            {driverMsg && (
              <p className="text-center text-xs text-foreground-muted">
                {driverMsg}
              </p>
            )}
          </form>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="mb-1 text-lg font-bold text-primary">
            ربط مالك مطعم
          </h2>
          <p className="mb-4 text-xs text-foreground-muted">
            يجب أن يكون المستخدم قد سجّل دخول مرة واحدة على الأقل كزبون
            عادي. سيتم ترقية دوره تلقائياً إلى &quot;vendor&quot; لمنحه
            صلاحية الدخول للوحة /vendor.
          </p>
          <form onSubmit={handleLinkOwner} className="space-y-4">
            <div>
              <label className={labelClass}>المطعم *</label>
              <select
                required
                value={ownerForm.restaurantId}
                onChange={(e) =>
                  setOwnerForm({
                    ...ownerForm,
                    restaurantId: e.target.value,
                  })
                }
                className={inputClass}
              >
                <option value="">اختر مطعماً...</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.ownerId ? " (مرتبط بالفعل)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>معرّف المستخدم (UID) *</label>
              <input
                type="text"
                required
                value={ownerForm.uid}
                onChange={(e) =>
                  setOwnerForm({ ...ownerForm, uid: e.target.value })
                }
                className={`${inputClass} font-mono`}
                placeholder="مثال: aB3xY9..."
              />
            </div>
            <button
              type="submit"
              disabled={ownerBusy}
              className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {ownerBusy ? "جارٍ الربط…" : "ربط المالك وترقية دوره"}
            </button>
            {ownerMsg && (
              <p className="text-center text-xs text-foreground-muted">
                {ownerMsg}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* ✅ جديد — محافظ كاش المندوبين */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">
              محافظ كاش المندوبين
            </h2>
            <p className="text-xs text-foreground-muted">
              الكاش المتراكم من الطلبات المدفوعة عند الاستلام — يُحدَّث
              تلقائياً عند كل عملية تسليم.
            </p>
          </div>
          <button
            type="button"
            onClick={loadWallets}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-foreground-muted hover:text-foreground"
          >
            تحديث
          </button>
        </div>

        {walletsLoading ? (
          <p className="text-center text-sm text-foreground-muted">
            جارٍ التحميل...
          </p>
        ) : wallets.length === 0 ? (
          <p className="text-center text-sm text-foreground-muted">
            لا يوجد أي كاش متراكم بيد أي مندوب حالياً
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {wallets
              .filter((w) => w.totalCashInHand > 0)
              .map((wallet) => {
                const driver = drivers.find(
                  (d) => d.id === wallet.driverId,
                );
                return (
                  <div
                    key={wallet.driverId}
                    className="rounded-xl border border-glass-border bg-secondary p-3"
                  >
                    <p className="text-sm font-bold">
                      {driver?.name || wallet.driverId}
                    </p>
                    <p className="mt-1 text-xl font-extrabold text-primary">
                      {formatPrice(wallet.totalCashInHand)}
                    </p>
                    <p className="text-[11px] text-foreground-muted">
                      {wallet.cashOrdersSinceSettlement} طلب منذ آخر تسوية
                    </p>
                    <button
                      type="button"
                      disabled={settlingDriverId === wallet.driverId}
                      onClick={() => handleSettle(wallet.driverId)}
                      className="mt-2 w-full rounded-lg bg-primary py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {settlingDriverId === wallet.driverId
                        ? "جارٍ التسوية…"
                        : "تسوية / استلام الكاش"}
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
