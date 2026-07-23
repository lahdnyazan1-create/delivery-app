"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, LogOut, Pencil, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/context/AppContext";
import {
  COVER_PRESETS,
  CUISINES,
  LOGO_PRESETS,
  ORDER_STATUSES,
  type Dish,
  type OrderStatus,
  type PromoCode,
  type Restaurant,
} from "@/data/mockData";

type Tab = "orders" | "restaurants" | "dishes" | "promos";

export default function AdminPage() {
  const router = useRouter();
  const {
    adminUnlocked,
    unlockAdmin,
    lockAdmin,
    orders,
    restaurants,
    dishes,
    promoCodes,
    updateOrderStatus,
    upsertRestaurant,
    deleteRestaurant,
    upsertDish,
    deleteDish,
    upsertPromo,
    deletePromoCode,
    createRestaurantId,
    createDishId,
  } = useApp();

  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [tab, setTab] = useState<Tab>("orders");
  const [showHistory, setShowHistory] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [restForm, setRestForm] = useState<Restaurant | null>(null);
  const [dishForm, setDishForm] = useState<Dish | null>(null);
  const [promoForm, setPromoForm] = useState<PromoCode | null>(null);

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== "Delivered"),
    [orders],
  );

  const historyOrders = useMemo(
    () => orders.filter((o) => o.status === "Delivered"),
    [orders],
  );

  const displayedOrders = showHistory ? historyOrders : activeOrders;

  if (!adminUnlocked) {
    return (
      <AppShell hideNav hideHeader>
        <div className="flex flex-1 flex-col justify-center pt-safe">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="no-select touch-target mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted"
          >
            <ArrowLeft className="size-4" /> Profile
          </button>
          <div className="glass mx-auto w-full max-w-sm rounded-3xl p-6 text-center">
            <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Lock className="size-6" />
            </span>
            <h1 className="text-xl font-extrabold">Admin PIN</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              واجهة التحكم — أدخل الرمز للمتابعة
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="mt-5 w-full rounded-2xl border border-glass-border bg-secondary px-4 py-3 text-center text-lg tracking-[0.4em] outline-none"
            />
            {pinError && (
              <p className="mt-2 text-xs text-primary">{pinError}</p>
            )}
            <button
              type="button"
              onClick={() => {
                if (unlockAdmin(pin)) {
                  setPinError("");
                  setPin("");
                } else {
                  setPinError("رمز غير صحيح");
                }
              }}
              className="no-select touch-target mt-4 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white"
            >
              Unlock
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav hideHeader>
      <div className="mb-4 flex items-center gap-3 pt-safe">
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="no-select touch-target glass flex size-11 items-center justify-center rounded-xl"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold">Admin Dashboard</h1>
          <p className="text-xs text-foreground-muted">واجهة التحكم الشاملة</p>
        </div>
        <button
          type="button"
          onClick={lockAdmin}
          className="no-select touch-target glass flex size-11 items-center justify-center rounded-xl text-foreground-muted"
          aria-label="Lock admin"
        >
          <LogOut className="size-5" />
        </button>
      </div>

      <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex w-max gap-2">
          {(
            [
              ["orders", `Orders (${activeOrders.length})`],
              ["restaurants", `Restaurants (${restaurants.length})`],
              ["dishes", `Dishes (${dishes.length})`],
              ["promos", `Promos (${promoCodes.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`no-select touch-target rounded-full px-4 py-2 text-sm font-bold ${
                tab === id
                  ? "bg-primary text-white"
                  : "glass text-foreground-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "orders" && (
        <section className="space-y-3 pb-8">
          <div className="flex justify-between items-center bg-secondary/50 p-1.5 rounded-xl border border-glass-border mb-3">
            <button
              onClick={() => setShowHistory(false)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${!showHistory ? "bg-primary text-white" : "text-foreground-muted"}`}
            >
              الطلبات النشطة ({activeOrders.length})
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${showHistory ? "bg-primary text-white" : "text-foreground-muted"}`}
            >
              الطلبات المكتملة ({historyOrders.length})
            </button>
          </div>

          {displayedOrders.length === 0 ? (
            <p className="glass rounded-2xl px-4 py-8 text-center text-sm text-foreground-muted">
              {showHistory ? "لا يوجد طلبات مكتملة." : "لا يوجد طلبات حالية."}
            </p>
          ) : (
            displayedOrders.map((order) => {
              const isExpanded = expandedOrderId === order.id;
              return (
                <div key={order.id} className="glass rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        #{order.id.slice(-6)}
                      </span>
                      <h3 className="font-bold text-base mt-1">{order.restaurantName}</h3>
                      <p className="text-xs text-foreground-muted">
                        العميل: {order.customerName} · {order.customerPhone}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        العنوان: {order.deliveryAddress}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-primary block">
                        ${order.total.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="mt-2 text-xs flex items-center gap-1 text-foreground-muted hover:text-white"
                      >
                        {isExpanded ? "إخفاء الأصناف" : "عرض الأصناف"}
                        {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && order.items && (
                    <div className="border-t border-glass-border pt-2 mt-2 space-y-1">
                      <p className="text-xs font-bold text-foreground-muted mb-1">عناصر الطلب:</p>
                      {order.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-white/5 last:border-0">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-glass-border pt-3">
                    <label className="block text-xs font-semibold text-foreground-muted mb-1">
                      تحديث حالة الطلب
                    </label>
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(
                          order.id,
                          e.target.value as OrderStatus,
                        )
                      }
                      className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none font-bold"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* باقي أقسام الواجهة (المطاعم، الوجبات، الكوبونات) تبدأ من هنا كما هي بدون تغيير */}
      {tab === "restaurants" && (
        <section className="space-y-3 pb-8">
          <button
            type="button"
            onClick={() =>
              setRestForm({
                id: createRestaurantId(),
                name: "",
                cuisineId: "burgers",
                rating: 4.5,
                etaMinutes: 25,
                deliveryFee: 1.5,
                coverGradient: COVER_PRESETS[0],
                logoGradient: LOGO_PRESETS[0],
                tagline: "",
                active: true,
              })
            }
            className="no-select touch-target flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-white"
          >
            <Plus className="size-4" /> Add restaurant
          </button>

          {restaurants.map((r) => (
            <div key={r.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{r.name}</p>
                  <p className="text-xs text-foreground-muted">
                    {r.etaMinutes} min · {r.active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setRestForm(r)}
                    className="touch-target flex size-10 items-center justify-center rounded-xl"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete restaurant "${r.name}" and its dishes?`,
                        )
                      ) {
                        deleteRestaurant(r.id);
                      }
                    }}
                    className="touch-target flex size-10 items-center justify-center rounded-xl text-primary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {restForm && (
            <div className="glass space-y-2 rounded-2xl p-4">
              <p className="font-bold">
                {restaurants.some((r) => r.id === restForm.id)
                  ? "Edit restaurant"
                  : "New restaurant"}
              </p>
              <input
                value={restForm.name}
                onChange={(e) =>
                  setRestForm({ ...restForm, name: e.target.value })
                }
                placeholder="Name"
                className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
              />
              <input
                value={restForm.tagline}
                onChange={(e) =>
                  setRestForm({ ...restForm, tagline: e.target.value })
                }
                placeholder="Tagline / logo label"
                className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={restForm.etaMinutes}
                  onChange={(e) =>
                    setRestForm({
                      ...restForm,
                      etaMinutes: Number(e.target.value),
                    })
                  }
                  placeholder="Delivery time"
                  className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
                />
                <input
                  type="number"
                  step="0.1"
                  value={restForm.deliveryFee}
                  onChange={(e) =>
                    setRestForm({
                      ...restForm,
                      deliveryFee: Number(e.target.value),
                    })
                  }
                  placeholder="Delivery fee"
                  className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <select
                value={restForm.cuisineId}
                onChange={(e) =>
                  setRestForm({ ...restForm, cuisineId: e.target.value })
                }
                className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
              >
                {CUISINES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={restForm.coverGradient}
                onChange={(e) =>
                  setRestForm({ ...restForm, coverGradient: e.target.value })
                }
                className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
              >
                {COVER_PRESETS.map((g, i) => (
                  <option key={g} value={g}>
                    Cover preset {i + 1}
                  </option>
                ))}
              </select>
              <select
                value={restForm.logoGradient}
                onChange={(e) =>
                  setRestForm({ ...restForm, logoGradient: e.target.value })
                }
                className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
              >
                {LOGO_PRESETS.map((g, i) => (
                  <option key={g} value={g}>
                    Logo preset {i + 1}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setRestForm({ ...restForm, active: !restForm.active })
                }
                className={`w-full rounded-xl py-2.5 text-sm font-bold ${
                  restForm.active
                    ? "bg-accent/20 text-accent"
                    : "bg-primary/20 text-primary"
                }`}
              >
                Status: {restForm.active ? "Active" : "Inactive"}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!restForm.name.trim()) return;
                    const eta = Number(restForm.etaMinutes);
                    const fee = Number(restForm.deliveryFee);
                    if (!Number.isFinite(eta) || eta <= 0) return;
                    if (!Number.isFinite(fee) || fee < 0) return;
                    upsertRestaurant({
                      ...restForm,
                      etaMinutes: eta,
                      deliveryFee: fee,
                    });
                    setRestForm(null);
                  }}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setRestForm(null)}
                  className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "dishes" && (
        <section className="space-y-3 pb-8">
          <button
            type="button"
            onClick={() =>
              setDishForm({
                id: createDishId(),
                restaurantId: restaurants[0]?.id ?? "",
                name: "",
                description: "",
                price: 8,
                category: "General",
                available: true,
                isHot: false,
                gradient: COVER_PRESETS[0],
              })
            }
            className="no-select touch-target flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-white"
          >
            <Plus className="size-4" /> Add dish
          </button>

          {dishes.map((d) => (
            <div key={d.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{d.name}</p>
                  <p className="text-xs text-foreground-muted">
                    {restaurants.find((r) => r.id === d.restaurantId)?.name} · $
                    {d.price.toFixed(2)} · {d.category}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDishForm(d)}
                    className="touch-target flex size-10 items-center justify-center rounded-xl"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete dish "${d.name}"?`)) {
                        deleteDish(d.id);
                      }
                    }}
                    className="touch-target flex size-10 items-center justify-center rounded-xl text-primary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {dishForm && (
            <div className="glass space-y-2 rounded-2xl p-4">
              <p className="font-bold">
                {dishes.some((d) => d.id === dishForm.id)
                  ? "Edit dish"
                  : "New dish"}
              </p>
              <input
                value={dishForm.name}
                onChange={(e) =>
                  setDishForm({ ...dishForm, name: e.target.value })
                }
                placeholder="Name"
                className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
              />
              <input
                value={dishForm.description}
                onChange={(e) =>
                  setDishForm({ ...dishForm, description: e.target.value })
                }
                placeholder="Description"
                className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={dishForm.price}
                  onChange={(e) =>
                    setDishForm({
                      ...dishForm,
                      price: Number(e.target.value),
                    })
                  }
                  placeholder="Price"
                  className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
                />
                <input
                  value={dishForm.category}
                  onChange={(e) =>
                    setDishForm({ ...dishForm, category: e.target.value })
                  }
                  placeholder="Category"
                  className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <select
                value={dishForm.restaurantId}
                onChange={(e) =>
                  setDishForm({ ...dishForm, restaurantId: e.target.value })
                }
                className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  setDishForm({
                    ...dishForm,
                    available: !dishForm.available,
                  })
                }
                className={`w-full rounded-xl py-2.5 text-sm font-bold ${
                  dishForm.available
                    ? "bg-accent/20 text-accent"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {dishForm.available ? "In Stock" : "Out of Stock"}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!dishForm.name.trim() || !dishForm.restaurantId) return;
                    const price = Number(dishForm.price);
                    if (!Number.isFinite(price) || price < 0) return;
                    upsertDish({ ...dishForm, price });
                    setDishForm(null);
                  }}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setDishForm(null)}
                  className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {tab === "promos" && (
        <section className="space-y-3 pb-8">
          <button
            type="button"
            onClick={() =>
              setPromoForm({ code: "", percentOff: 10, active: true })
            }
            className="no-select touch-target flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-white"
          >
            <Plus className="size-4" /> Add promo
          </button>

          {promoCodes.map((p) => (
            <div key={p.code} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold tracking-wide">{p.code}</p>
                  <p className="text-xs text-accent">
                    {p.percentOff}% · {p.active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPromoForm(p)}
                    className="touch-target flex size-10 items-center justify-center rounded-xl"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete promo ${p.code}?`)) {
                        deletePromoCode(p.code);
                      }
                    }}
                    className="touch-target flex size-10 items-center justify-center rounded-xl text-primary"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {promoForm && (
            <div className="glass space-y-2 rounded-2xl p-4">
              <input
                value={promoForm.code}
                onChange={(e) =>
                  setPromoForm({
                    ...promoForm,
                    code: e.target.value.toUpperCase(),
                  })
                }
                placeholder="CODE"
                className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
              />
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
                className="w-full rounded-xl border border-glass-border bg-secondary px-3 py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  setPromoForm({ ...promoForm, active: !promoForm.active })
                }
                className={`w-full rounded-xl py-2.5 text-sm font-bold ${
                  promoForm.active
                    ? "bg-accent/20 text-accent"
                    : "bg-primary/20 text-primary"
                }`}
              >
                {promoForm.active ? "Active" : "Inactive"}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!promoForm.code.trim()) return;
                    const percent = Number(promoForm.percentOff);
                    if (!Number.isFinite(percent) || percent < 1 || percent > 100)
                      return;
                    upsertPromo({ ...promoForm, percentOff: percent });
                    setPromoForm(null);
                  }}
                  className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setPromoForm(null)}
                  className="flex-1 rounded-xl bg-white/5 py-3 text-sm font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
