"use client";
import OrderHistory from "@/components/profile/OrderHistory";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  MapPinned,
  Package,
  Shield,
  Settings2,
  LogIn,
  LogOut,
  LocateFixed,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/context/AppContext";

export default function ProfilePage() {
  const router = useRouter();
  const {
    orders,
    activeOrder,
    unlockedPromos,
    cartCount,
    user,
    isAuthenticated,
    logoutUser,
    updateUserLocation,
  } = useApp();

  const [draftAddress, setDraftAddress] = useState<string | null>(null);
  const [geoMsg, setGeoMsg] = useState("");
  const address = draftAddress ?? user?.address ?? "";

  const saveAddress = () => {
    const result = updateUserLocation({
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
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        const nextAddress = address.trim() || `موقع تلقائي · ${label}`;
        const result = updateUserLocation({
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
      <h1 className="mb-1 text-2xl font-extrabold">Profile</h1>
      <p className="mb-6 text-sm text-foreground-muted">
        {isAuthenticated && user
          ? `${user.fullName} · ${user.phone}`
          : "Guest · سجّل دخولك"}
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
            <span className="block text-sm font-bold">Login / تسجيل الدخول</span>
            <span className="block text-xs text-foreground-muted">
              Name + phone to place orders
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
            <span className="block text-sm font-bold">Logout</span>
            <span className="block text-xs text-foreground-muted">
              Clear session from this device
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
          { label: "Orders", value: orders.length },
          { label: "In cart", value: cartCount },
          { label: "Promos", value: unlockedPromos.length },
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

      <div className="mb-5 space-y-2">
        {activeOrder && activeOrder.status !== "Delivered" ? (
          <Link
            href="/order-tracking"
            className="glass no-select flex items-center gap-3 rounded-2xl p-4"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <MapPinned className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Active order</span>
              <span className="block text-xs text-foreground-muted">
                {activeOrder.restaurantName} · {activeOrder.status}
              </span>
            </span>
            <ChevronRight className="size-5 text-foreground-muted" />
          </Link>
        ) : (
          <div className="glass flex items-center gap-3 rounded-2xl p-4">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/5 text-foreground-muted">
              <Package className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">No active delivery</span>
              <span className="block text-xs text-foreground-muted">
                Place an order to track stages live.
              </span>
            </span>
          </div>
        )}

        <OrderHistory />
      </div>

      <button
        type="button"
        onClick={() => router.push("/admin")}
        className="no-select glass touch-target flex w-full items-center gap-3 rounded-2xl p-4 text-left"
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Shield className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            Admin Dashboard / واجهة التحكم
          </span>
          <span className="block text-xs text-foreground-muted">
            PIN protected · full CRUD
          </span>
        </span>
        <Settings2 className="size-5 text-foreground-muted" />
      </button>
    </AppShell>
  );
}
