// src/app/admin/page.tsx
// ============================================================================
// التعديلات:
// - ✅ STATUS_LABELS أصبحت تغطي "Accepted" أيضاً (كانت ناقصة فتسبب خطأ عرض)
// - ✅ عرض deliveryAddressDetails بدل deliveryAddress المهجور + شارة طريقة الدفع
// - ✅ "ربط مالك مطعم" صار يضبط role="vendor" تلقائياً (كان يربط ownerId فقط
//   بدون ترقية الدور، فكانت لوحة /vendor ترفض دخوله لأنها تتحقق من الدور)
// - ✅ تبويب "مناطق التوصيل" جديد بالكامل — إضافة/تعديل رسوم/تفعيل وتعطيل
// - ✅ قسم جديد بتبويب "الوصول والفرق" لعرض وتسوية محافظ كاش المندوبين
// ============================================================================

"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Restaurant, OrderStatus, Zone, DriverWallet } from "@/types/database";
import { RequireRole } from "@/components/auth/RequireRole";
import {
  addRestaurant as addRestaurantFirestore,
  toggleRestaurantActive as toggleRestaurantActiveFirestore,
  setUserRole,
  upsertDriverProfile,
  updateRestaurant as updateRestaurantFirestore,
  fetchAllZones,
  addZone,
  updateZone,
  toggleZoneActive,
  fetchDriverWallets,
  fetchPromoCodes,
  addPromoCode,
  updatePromoCode,
  deletePromoCodeDoc,
  fetchAllCategories,
  addCategory,
  updateCategory,
  deleteCategoryDoc,
  fetchAllBanners,
  addBanner,
  updateBanner,
  deleteBannerDoc,
} from "@/lib/firestore";
import { settleDriverCash } from "@/lib/orders";
import { formatPrice } from "@/constants/currency";

// أيقونات مقترحة (Emoji) لفئات الرئيسية — بسيطة وتعمل بدون رفع أي صور
const CATEGORY_ICON_OPTIONS = [
  "🍔", "🍕", "🍗", "🌯", "🥗", "🍰", "☕", "🥤",
  "🍜", "🍣", "🥙", "🍟", "🧁", "🍦", "🥪", "🛒",
];

const STATUS_LABELS: Record<OrderStatus, string> = {
  Pending: "قيد الانتظار",
  Accepted: "مقبول من المطعم",
  Preparing: "قيد التحضير",
  Ready: "جاهز للتوصيل",
  OutForDelivery: "خرج للتوصيل",
  Delivered: "تم التسليم",
  Cancelled: "ملغي",
};

function statusBadgeClass(status: OrderStatus) {
  if (status === "Delivered") {
    return "bg-accent/10 text-accent border border-accent/20";
  }
  if (status === "Cancelled") {
    return "bg-danger/10 text-danger border border-danger/20";
  }
  return "bg-primary/10 text-primary border border-primary/20";
}

function AdminDashboardContent() {
  const {
    restaurants,
    orders,
    drivers,
    updateOrderStatus,
    assignDriverToOrder,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<
    | "orders"
    | "restaurants"
    | "zones"
    | "promocodes"
    | "categories"
    | "banners"
    | "access"
    | "analytics"
  >("orders");

  const [restForm, setRestForm] = useState({
    name: "",
    cuisine: "وجبات سريعة",
    deliveryFee: 5,
    etaMinutes: 30,
    address: "",
  });

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

  const [promoDrafts, setPromoDrafts] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (activeTab === "zones") {
      loadZones();
    }
  }, [activeTab]);

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

  useEffect(() => {
    if (activeTab === "access") {
      loadWallets();
    }
  }, [activeTab]);

  const handleSettle = async (driverId: string) => {
    setSettlingDriverId(driverId);
    try {
      const result = await settleDriverCash(driverId);
      if (!result.ok) alert(result.message || "فشلت التسوية");
      await loadWallets();
    } finally {
      setSettlingDriverId(null);
    }
  };

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

  useEffect(() => {
    if (activeTab === "promocodes") loadPromoCodes();
  }, [activeTab]);

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

  const handleDeletePromo = async (code: string) => {
    if (!confirm(`حذف كود "${code}" نهائياً؟`)) return;
    await deletePromoCodeDoc(code);
    await loadPromoCodes();
  };

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

  useEffect(() => {
    if (activeTab === "categories") loadCategories();
  }, [activeTab]);

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
    if (!confirm("حذف هذه الفئة نهائياً؟")) return;
    await deleteCategoryDoc(id);
    await loadCategories();
  };

  // ---------------- Banners state ----------------
  const [bannersList, setBannersList] = useState<
    {
      id: string;
      title: string;
      subtitle?: string;
      ctaText?: string;
      ctaLink?: string;
      gradient?: string;
      imageUrl?: string;
      order: number;
      active: boolean;
    }[]
  >([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    ctaText: "",
    ctaLink: "",
    imageUrl: "",
    order: 0,
  });
  const [bannerBusy, setBannerBusy] = useState(false);

  const loadBanners = async () => {
    setBannersLoading(true);
    try {
      const list = (await fetchAllBanners()) as any[];
      setBannersList(list);
    } catch (error) {
      console.error("Failed to load banners", error);
    } finally {
      setBannersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "banners") loadBanners();
  }, [activeTab]);

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) return;
    setBannerBusy(true);
    try {
      await addBanner({
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim() || undefined,
        ctaText: bannerForm.ctaText.trim() || undefined,
        ctaLink: bannerForm.ctaLink.trim() || undefined,
        imageUrl: bannerForm.imageUrl.trim() || undefined,
        gradient: "from-primary to-red-600",
        order: Number(bannerForm.order),
        active: true,
      });
      setBannerForm({
        title: "",
        subtitle: "",
        ctaText: "",
        ctaLink: "",
        imageUrl: "",
        order: 0,
      });
      await loadBanners();
    } catch (error) {
      console.error("Failed to add banner", error);
    } finally {
      setBannerBusy(false);
    }
  };

  const handleToggleBannerActive = async (id: string, active: boolean) => {
    await updateBanner(id, { active: !active });
    await loadBanners();
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("حذف هذا الإعلان نهائياً؟")) return;
    await deleteBannerDoc(id);
    await loadBanners();
  };

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

    try {
      await addRestaurantFirestore(newRest);
      setRestForm({
        name: "",
        cuisine: "وجبات سريعة",
        deliveryFee: 5,
        etaMinutes: 30,
        address: "",
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

  const handleAssignDriver = (orderId: string, driverId: string) => {
    assignDriverToOrder(orderId, driverId);
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

  const totalRevenue = orders
    .filter((o) => o.status === "Delivered")
    .reduce((acc, curr) => acc + curr.total, 0);

  const activeOrders = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled",
  );

  const inputClass =
    "w-full rounded-xl border border-glass-border bg-secondary p-2.5 text-sm text-foreground outline-none focus:border-primary";
  const labelClass = "mb-1 block text-xs text-foreground-muted";

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-glass-border pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="bg-gradient-to-r from-primary to-primary-soft bg-clip-text text-3xl font-bold text-transparent">
            لوحة تحكم الإدارة
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            إدارة المطاعم، الطلبات، والعمليات المباشرة
          </p>
        </div>

        <div className="glass flex flex-wrap rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "orders"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الطلبات ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("restaurants")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "restaurants"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            المطاعم ({restaurants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("zones")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "zones"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            مناطق التوصيل
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("promocodes")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "promocodes"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            أكواد الخصم
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "categories"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الفئات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("banners")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "banners"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الإعلانات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("access")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "access"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الوصول والفرق
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "analytics"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الإحصائيات
          </button>
        </div>
      </header>

      {activeTab === "orders" && (
        <div className="space-y-4">
          <h2 className="mb-4 text-xl font-bold">متابعة الطلبات المباشرة</h2>
          {orders.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
              لا يوجد طلبات حالية
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="glass space-y-4 rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between border-b border-glass-border pb-3">
                    <div>
                      <span className="font-mono text-xs text-primary">
                        #{order.id.slice(-6)}
                      </span>
                      <h3 className="text-lg font-bold">
                        {order.restaurantName}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          order.paymentMethod === "CASH"
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-emerald-500/15 text-emerald-500"
                        }`}
                      >
                        {order.paymentMethod === "CASH"
                          ? "كاش"
                          : "مدفوع مسبقاً"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-foreground">
                    <p>
                      <span className="text-foreground-muted">العميل:</span>{" "}
                      {order.customerName} ({order.customerPhone})
                    </p>
                    <p>
                      <span className="text-foreground-muted">العنوان:</span>{" "}
                      {order.deliveryAddressDetails ||
                        order.deliveryAddress ||
                        "—"}
                    </p>
                    <p>
                      <span className="text-foreground-muted">
                        المندوب الحالي:
                      </span>{" "}
                      {order.courierId || "غير محدد"}
                    </p>
                    <p>
                      <span className="text-foreground-muted">المجموع:</span>{" "}
                      <strong className="text-primary">
                        {formatPrice(order.total)}
                      </strong>
                    </p>
                  </div>

                  <div className="space-y-1 rounded-xl bg-white/5 p-3 text-xs text-foreground-muted">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {item.quantity}× {item.name}
                        </span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 border-t border-glass-border pt-2">
                    <div className="flex items-center gap-2">
                      <label className="w-20 text-xs text-foreground-muted">
                        السائق:
                      </label>
                      <select
                        value={order.courierId || ""}
                        onChange={(e) =>
                          handleAssignDriver(order.id, e.target.value)
                        }
                        disabled={order.status !== "Ready"}
                        className="w-full rounded-lg border border-glass-border bg-secondary p-2 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
                      >
                        <option value="">اختر سائق...</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.vehicle})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="w-20 text-xs text-foreground-muted">
                        الحالة:
                      </label>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateOrderStatus(
                            order.id,
                            e.target.value as OrderStatus,
                          )
                        }
                        className="w-full rounded-lg border border-glass-border bg-secondary p-2 text-xs text-foreground outline-none focus:border-primary"
                      >
                        {(Object.keys(STATUS_LABELS) as OrderStatus[]).map(
                          (s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    {/* ⚠️ ملاحظة: الإدارة تملك صلاحية القفز لأي حالة (isAdmin
                        في updateOrderStatus)، لكن ننصح باتباع التسلسل الطبيعي
                        لتفادي أخطاء تشغيلية (مثل تخطي "جاهز" قبل تعيين سائق). */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "restaurants" && (
        <div className="grid gap-8 md:grid-cols-3">
          <div className="glass h-fit rounded-2xl p-6">
            <h2 className="mb-4 text-lg font-bold text-primary">
              إضافة مطعم جديد
            </h2>
            <form onSubmit={handleAddRestaurant} className="space-y-4">
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
      )}

      {activeTab === "zones" && (
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
      )}

      {activeTab === "promocodes" && (
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
                  <div
                    key={promo.code}
                    className="glass flex items-center justify-between rounded-2xl p-4"
                  >
                    <div>
                      <p className="font-mono text-base font-bold">
                        {promo.code}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        خصم {promo.percentOff}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleTogglePromo(promo.code, promo.active)
                        }
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
                        onClick={() => handleDeletePromo(promo.code)}
                        className="rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-bold text-foreground-muted hover:text-danger"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-foreground-muted">
              ملاحظة: كود &quot;ZEST30&quot; (اخدش واربح) أُزيل من الواجهة —
              إن كان لا يزال موجوداً بهذه القائمة، احذفه من هنا نهائياً.
            </p>
          </div>
        </div>
      )}

      {activeTab === "categories" && (
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
      )}

      {activeTab === "banners" && (
        <div className="grid gap-8 md:grid-cols-3">
          <div className="glass h-fit rounded-2xl p-6">
            <h2 className="mb-1 text-lg font-bold text-primary">
              إضافة إعلان جديد
            </h2>
            <p className="mb-4 text-xs text-foreground-muted">
              رابط الصورة اختياري — إن تُرك فارغاً يظهر تدرج لوني بدلاً منه.
            </p>
            <form onSubmit={handleAddBanner} className="space-y-4">
              <div>
                <label className={labelClass}>العنوان *</label>
                <input
                  type="text"
                  required
                  value={bannerForm.title}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, title: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>العنوان الفرعي</label>
                <input
                  type="text"
                  value={bannerForm.subtitle}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, subtitle: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>نص الزر</label>
                  <input
                    type="text"
                    value={bannerForm.ctaText}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, ctaText: e.target.value })
                    }
                    className={inputClass}
                    placeholder="اطلب الآن"
                  />
                </div>
                <div>
                  <label className={labelClass}>رابط الزر</label>
                  <input
                    type="text"
                    value={bannerForm.ctaLink}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, ctaLink: e.target.value })
                    }
                    className={inputClass}
                    placeholder="/restaurant/xyz"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>رابط صورة (اختياري)</label>
                <input
                  type="text"
                  value={bannerForm.imageUrl}
                  onChange={(e) =>
                    setBannerForm({ ...bannerForm, imageUrl: e.target.value })
                  }
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className={labelClass}>الترتيب</label>
                <input
                  type="number"
                  value={bannerForm.order}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      order: Number(e.target.value),
                    })
                  }
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={bannerBusy}
                className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
              >
                {bannerBusy ? "جارٍ الإضافة…" : "إضافة الإعلان"}
              </button>
            </form>
          </div>

          <div className="space-y-4 md:col-span-2">
            <h2 className="text-lg font-bold">
              الإعلانات الحالية ({bannersList.length})
            </h2>
            {bannersLoading ? (
              <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
                جارٍ التحميل...
              </div>
            ) : bannersList.length === 0 ? (
              <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
                لا توجد إعلانات بعد
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {bannersList.map((banner) => (
                  <div key={banner.id} className="glass rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold">{banner.title}</p>
                        {banner.subtitle && (
                          <p className="text-xs text-foreground-muted">
                            {banner.subtitle}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleBannerActive(banner.id, banner.active)
                        }
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                          banner.active
                            ? "bg-accent/10 text-accent"
                            : "bg-danger/10 text-danger"
                        }`}
                      >
                        {banner.active ? "نشط" : "معطّل"}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="mt-3 w-full rounded-lg bg-white/5 py-1.5 text-xs font-bold text-foreground-muted hover:text-danger"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "access" && (
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
      )}

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-foreground-muted">
              إجمالي المبيعات المكتملة
            </p>
            <p className="mt-2 text-3xl font-extrabold text-accent">
              {formatPrice(totalRevenue)}
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-foreground-muted">
              الطلبات النشطة حالياً
            </p>
            <p className="mt-2 text-3xl font-extrabold text-primary">
              {activeOrders.length}
            </p>
          </div>
          <div className="glass rounded-2xl p-6">
            <p className="text-sm text-foreground-muted">
              إجمالي الطلبات الكلي
            </p>
            <p className="mt-2 text-3xl font-extrabold text-primary-soft">
              {orders.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <RequireRole role="admin">
      <AdminDashboardContent />
    </RequireRole>
  );
}
