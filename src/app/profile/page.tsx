"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Package,
  Shield,
  Settings2,
  LogIn,
  LogOut,
  LocateFixed,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/useAppStore";

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    orders,
    logoutUser,
    updateUserLocation,
    cart,
    restaurants,
  } = useAppStore();
  const ownedRestaurant = user
    ? restaurants.find((r) => r.ownerId === user.uid)
    : null;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [draftAddress, setDraftAddress] = useState<string | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const address = draftAddress ?? user?.address ?? "";

  const saveAddress = async () => {
    const result = await updateUserLocation({
      address,
      locationLabel: address.trim() || user?.locationLabel || "",
    });
    setGeoMsg(result.message);
    if (result.ok) setDraftAddress(null);
  };

  const locateMe = () => {
    if (!isAuthenticated) {
      setGeoMsg("سجّل الدخول أولاً قبل تحديد الموقع");
      return;
    }
    if (!navigator.geolocation) {
      setGeoMsg("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setGeoMsg("جاري تحديد موقعك…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        const nextAddress = address.trim() || `موقع تلقائي · ${label}`;
        const result = await updateUserLocation({
          lat: latitude,
          lng: longitude,
          locationLabel: label,
          address: nextAddress,
        });
        setDraftAddress(null);
        setGeoMsg(result.ok ? "تم تحديد موقعك الحالي" : result.message);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoMsg(
            "تم رفض إذن الموقع — اكتب العنوان يدوياً أو فعّل الموقع من إعدادات المتصفح",
          );
        } else {
          setGeoMsg("تعذر الحصول على الموقع — اكتب العنوان يدوياً");
        }
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl font-extrabold">الملف الشخصي</h1>
      <p className="mb-6 text-sm text-foreground-muted">
        {isAuthenticated && user
          ? `${user.displayName} · ${user.phone}`
          : "زائر · سجّل دخولك"}
      </p>

      {!isAuthenticated ? (
        <button
          type="button"
          onClick={() => router.push("/login?next=/profile")}
          className="no-select glass touch-target mb-5 flex w-full items-center gap-3 rounded-2xl p-4 text-left"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <LogIn className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">تسجيل الدخول</span>
            <span className="block text-xs text-foreground-muted">
              الاسم ورقم الهاتف لإتمام الطلبات
            </span>
          </span>
          <ChevronRight className="size-5 text-foreground-muted" />
        </button>
      ) : (
        <button
          type="button"
          onClick={logoutUser}
          className="no-select glass touch-target mb-5 flex w-full items-center gap-3 rounded-2xl p-4 text-left"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/5 text-foreground-muted">
            <LogOut className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">تسجيل الخروج</span>
            <span className="block text-xs text-foreground-muted">
              إنهاء الجلسة من هذا الجهاز
            </span>
          </span>
        </button>
      )}

      <div className="glass mb-5 space-y-3 rounded-2xl p-4" dir="rtl">
        <p className="text-sm font-bold text-right">عنوان التوصيل</p>
        <textarea
          value={address}
          onChange={(e) => setDraftAddress(e.target.value)}
          rows={3}
          placeholder="اكتب عنوانك بالتفصيل…"
          className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none disabled:opacity-50"
          disabled={!isAuthenticated}
        />
        <button
          type="button"
          onClick={locateMe}
          disabled={!isAuthenticated}
          className="no-select touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-accent/15 py-3 text-sm font-bold text-accent disabled:opacity-50"
        >
          <LocateFixed className="size-4" />
          تحديد موقعي الحالي تلقائياً 📍
        </button>
        <button
          type="button"
          onClick={saveAddress}
          disabled={!isAuthenticated}
          className="no-select touch-target w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          حفظ العنوان
        </button>
        {(user?.lat != null || user?.locationLabel) && (
          <p className="text-xs text-foreground-muted">
            GPS: {user.locationLabel || `${user.lat}, ${user.lng}`}
          </p>
        )}
        {geoMsg && <p className="text-xs text-accent">{geoMsg}</p>}
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "الطلبات", value: orders.length },
          { label: "في السلة", value: cartCount },
          { label: "العروض", value: 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-2xl px-3 py-4 text-center"
          >
            <p className="text-xl font-extrabold text-primary">{stat.value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <Link
        href="/orders"
        className="glass no-select mb-5 flex items-center gap-3 rounded-2xl p-4"
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Package className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">طلباتي</span>
          <span className="block text-xs text-foreground-muted">
            {orders.length} طلب سابق · تتبع وإعادة الطلب
          </span>
        </span>
        <ChevronRight className="size-5 text-foreground-muted" />
      </Link>

      {user?.role === "admin" && (
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="no-select glass touch-target mb-3 flex w-full items-center gap-3 rounded-2xl p-4 text-left"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Shield className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">لوحة تحكم الإدارة</span>
            <span className="block text-xs text-foreground-muted">
              إدارة المطاعم والطلبات
            </span>
          </span>
          <Settings2 className="size-5 text-foreground-muted" />
        </button>
      )}
      {user?.role === "courier" && (
        <button
          type="button"
          onClick={() => router.push("/driver")}
          className="no-select glass touch-target mb-3 flex w-full items-center gap-3 rounded-2xl p-4 text-left"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Shield className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">لوحة المندوب</span>
            <span className="block text-xs text-foreground-muted">
              الطلبات المتاحة والمُسندة إليك
            </span>
          </span>
          <Settings2 className="size-5 text-foreground-muted" />
        </button>
      )}
      {ownedRestaurant && (
        <button
          type="button"
          onClick={() => router.push("/restaurant")}
          className="no-select glass touch-target flex w-full items-center gap-3 rounded-2xl p-4 text-left"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Shield className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">لوحة المطعم</span>
            <span className="block text-xs text-foreground-muted">
              {ownedRestaurant.name}
            </span>
          </span>
          <Settings2 className="size-5 text-foreground-muted" />
        </button>
      )}
    </AppShell>
  );
}
