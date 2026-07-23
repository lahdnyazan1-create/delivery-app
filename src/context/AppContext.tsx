"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ADMIN_PIN,
  COVER_PRESETS,
  INITIAL_DISHES,
  INITIAL_PROMOS,
  INITIAL_RESTAURANTS,
  LOGO_PRESETS,
  type CartItem,
  type Dish,
  type Order,
  type OrderLineItem,
  type OrderStatus,
  type PromoCode,
  type Restaurant,
  type UserProfile,
} from "@/data/mockData";

const STORAGE_KEY = "zest-app-v3";
const ADMIN_SESSION_KEY = "zest-admin-unlocked";

export type FlyPayload = {
  id: string;
  gradient: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
};

export type CartConflict = {
  dishId: string;
  from: { x: number; y: number; w: number; h: number } | null;
  currentRestaurantId: string;
  nextRestaurantId: string;
};

type PersistedState = {
  restaurants: Restaurant[];
  dishes: Dish[];
  cart: CartItem[];
  cartRestaurantId: string | null;
  appliedPromo: string | null;
  unlockedPromos: string[];
  promoCodes: PromoCode[];
  orders: Order[];
  activeOrderId: string | null;
  scratchRevealed: boolean;
  user: UserProfile | null;
};

type RuntimeState = PersistedState & {
  hydrated: boolean;
  adminUnlocked: boolean;
  cartPopKey: number;
  fly: FlyPayload | null;
  cartConflict: CartConflict | null;
  storageError: string | null;
};

function normalizeRestaurant(r: Restaurant): Restaurant {
  return {
    ...r,
    active: r.active !== false,
    etaMinutes: finite(r.etaMinutes, 25),
    deliveryFee: finite(r.deliveryFee, 0),
    rating: finite(r.rating, 4.5),
    coverGradient: r.coverGradient || COVER_PRESETS[0],
    logoGradient: r.logoGradient || LOGO_PRESETS[0],
  };
}

function normalizeDish(d: Dish): Dish {
  return {
    ...d,
    category: d.category || "General",
    available: d.available !== false,
    price: finite(d.price, 0),
    gradient: d.gradient || COVER_PRESETS[0],
  };
}

function normalizePromo(p: PromoCode): PromoCode {
  return {
    ...p,
    code: String(p.code || "").toUpperCase(),
    percentOff: Math.min(100, Math.max(1, finite(p.percentOff, 10))),
    active: p.active !== false,
  };
}

function finite(n: unknown, fallback: number) {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function normalizeOrder(o: Order): Order {
  const items: OrderLineItem[] = (o.items || []).map((item) => {
    const legacy = item as OrderLineItem & CartItem;
    return {
      dishId: legacy.dishId,
      name: legacy.name || legacy.dishId,
      price: finite(legacy.price, 0),
      quantity: Math.max(1, finite(legacy.quantity, 1)),
    };
  });
  return {
    ...o,
    items,
    status: o.status ?? "Pending",
    subtotal: finite(o.subtotal, 0),
    discount: finite(o.discount, 0),
    total: finite(o.total, 0),
    customerName: o.customerName ?? "",
    customerPhone: o.customerPhone ?? "",
    deliveryAddress: o.deliveryAddress ?? "",
    deliveryLat: o.deliveryLat ?? null,
    deliveryLng: o.deliveryLng ?? null,
  };
}

function defaults(): RuntimeState {
  return {
    restaurants: INITIAL_RESTAURANTS.map(normalizeRestaurant),
    dishes: INITIAL_DISHES.map(normalizeDish),
    cart: [],
    cartRestaurantId: null,
    appliedPromo: null,
    unlockedPromos: [],
    promoCodes: INITIAL_PROMOS.map(normalizePromo),
    orders: [],
    activeOrderId: null,
    scratchRevealed: false,
    user: null,
    hydrated: false,
    adminUnlocked: false,
    cartPopKey: 0,
    fly: null,
    cartConflict: null,
    storageError: null,
  };
}

function loadPersisted(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return null;
  }
}

function mergePersisted(saved: Partial<PersistedState> | null): RuntimeState {
  const base = defaults();
  if (!saved) {
    return {
      ...base,
      hydrated: true,
      adminUnlocked:
        typeof window !== "undefined" &&
        sessionStorage.getItem(ADMIN_SESSION_KEY) === "1",
    };
  }
  return {
    ...base,
    restaurants: (
      saved.restaurants?.length ? saved.restaurants : INITIAL_RESTAURANTS
    ).map(normalizeRestaurant),
    dishes: (saved.dishes?.length ? saved.dishes : INITIAL_DISHES).map(
      normalizeDish,
    ),
    cart: saved.cart ?? [],
    cartRestaurantId: saved.cartRestaurantId ?? null,
    appliedPromo: saved.appliedPromo ?? null,
    unlockedPromos: saved.unlockedPromos ?? [],
    promoCodes: (
      saved.promoCodes?.length ? saved.promoCodes : INITIAL_PROMOS
    ).map(normalizePromo),
    orders: (saved.orders ?? []).map(normalizeOrder),
    activeOrderId: saved.activeOrderId ?? null,
    scratchRevealed: saved.scratchRevealed ?? false,
    user: saved.user ?? null,
    hydrated: true,
    adminUnlocked:
      typeof window !== "undefined" &&
      sessionStorage.getItem(ADMIN_SESSION_KEY) === "1",
  };
}

function persist(state: RuntimeState) {
  try {
    const payload: PersistedState = {
      restaurants: state.restaurants,
      dishes: state.dishes,
      cart: state.cart,
      cartRestaurantId: state.cartRestaurantId,
      appliedPromo: state.appliedPromo,
      unlockedPromos: state.unlockedPromos,
      promoCodes: state.promoCodes,
      orders: state.orders,
      activeOrderId: state.activeOrderId,
      scratchRevealed: state.scratchRevealed,
      user: state.user,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return null;
  } catch {
    return "تعذر حفظ البيانات محلياً (مساحة التخزين ممتلئة أو محظورة)";
  }
}

function calcTotals(
  cart: CartItem[],
  dishes: Dish[],
  appliedPromo: string | null,
  promoCodes: PromoCode[],
) {
  const subtotal = cart.reduce((sum, item) => {
    const dish = dishes.find((d) => d.id === item.dishId);
    if (!dish) return sum;
    return sum + dish.price * item.quantity;
  }, 0);

  const promo = appliedPromo
    ? promoCodes.find((p) => p.code === appliedPromo && p.active)
    : null;
  const discount = promo ? (subtotal * promo.percentOff) / 100 : 0;
  return { subtotal, discount, total: Math.max(0, subtotal - discount) };
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}

function isLoggedIn(user: UserProfile | null): user is UserProfile {
  return Boolean(
    user &&
      user.fullName.trim().length >= 2 &&
      isValidPhone(user.phone),
  );
}

function hasDeliveryLocation(user: UserProfile) {
  return Boolean(user.address.trim() || user.locationLabel.trim());
}

function rectPayload(fromRect?: DOMRect) {
  if (!fromRect) return null;
  return {
    x: fromRect.left,
    y: fromRect.top,
    w: fromRect.width,
    h: fromRect.height,
  };
}

/* ——— external store (localStorage-safe hydration) ——— */
const SERVER_SNAPSHOT = defaults();
let memory = defaults();
let hydratedOnce = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function getServerSnapshot(): RuntimeState {
  return SERVER_SNAPSHOT;
}

function getSnapshot(): RuntimeState {
  return memory;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!hydratedOnce && typeof window !== "undefined") {
    hydratedOnce = true;
    memory = mergePersisted(loadPersisted());
    queueMicrotask(emit);
  }
  return () => listeners.delete(listener);
}

function patch(updater: (prev: RuntimeState) => RuntimeState) {
  memory = updater(memory);
  if (memory.hydrated) {
    const err = persist(memory);
    if (err) memory = { ...memory, storageError: err };
  }
  emit();
}

type AppContextValue = {
  hydrated: boolean;
  storageError: string | null;
  restaurants: Restaurant[];
  dishes: Dish[];
  cart: CartItem[];
  cartRestaurantId: string | null;
  cartRestaurant: Restaurant | null;
  cartCount: number;
  subtotal: number;
  discount: number;
  total: number;
  appliedPromo: string | null;
  unlockedPromos: string[];
  promoCodes: PromoCode[];
  orders: Order[];
  activeOrder: Order | null;
  scratchRevealed: boolean;
  cartPopKey: number;
  fly: FlyPayload | null;
  cartConflict: CartConflict | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  adminUnlocked: boolean;
  loginUser: (fullName: string, phone: string) => { ok: boolean; message: string };
  logoutUser: () => void;
  updateUserLocation: (patch: Partial<UserProfile>) => { ok: boolean; message: string };
  unlockAdmin: (pin: string) => boolean;
  lockAdmin: () => void;
  addToCart: (dishId: string, fromRect?: DOMRect) => { ok: boolean; message?: string };
  confirmClearCartAndAdd: () => void;
  dismissCartConflict: () => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  removeFromCart: (dishId: string) => void;
  clearCart: () => void;
  applyPromo: (code: string) => { ok: boolean; message: string };
  unlockPromoFromScratch: () => void;
  placeOrder: () => { ok: true; order: Order } | { ok: false; message: string };
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  upsertRestaurant: (restaurant: Restaurant) => { ok: boolean; message: string };
  deleteRestaurant: (id: string) => void;
  upsertDish: (dish: Dish) => { ok: boolean; message: string };
  deleteDish: (id: string) => void;
  upsertPromo: (promo: PromoCode) => { ok: boolean; message: string };
  deletePromoCode: (code: string) => void;
  clearFly: () => void;
  getDish: (id: string) => Dish | undefined;
  getRestaurant: (id: string) => Restaurant | undefined;
  getDishesByRestaurant: (restaurantId: string) => Dish[];
  createRestaurantId: () => string;
  createDishId: () => string;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const stateRef = useRef(state);
  stateRef.current = state;

  const cartRestaurant = useMemo(
    () =>
      state.restaurants.find((r) => r.id === state.cartRestaurantId) ?? null,
    [state.restaurants, state.cartRestaurantId],
  );

  const { subtotal, discount, total } = useMemo(
    () =>
      calcTotals(
        state.cart,
        state.dishes,
        state.appliedPromo,
        state.promoCodes,
      ),
    [state.cart, state.dishes, state.appliedPromo, state.promoCodes],
  );

  const cartCount = useMemo(
    () =>
      state.cart.reduce((n, i) => {
        if (!state.dishes.some((d) => d.id === i.dishId)) return n;
        return n + i.quantity;
      }, 0),
    [state.cart, state.dishes],
  );

  const activeOrder = useMemo(
    () => state.orders.find((o) => o.id === state.activeOrderId) ?? null,
    [state.orders, state.activeOrderId],
  );

  const getDish = useCallback(
    (id: string) => stateRef.current.dishes.find((d) => d.id === id),
    [],
  );
  const getRestaurant = useCallback(
    (id: string) => stateRef.current.restaurants.find((r) => r.id === id),
    [],
  );
  const getDishesByRestaurant = useCallback(
    (restaurantId: string) =>
      stateRef.current.dishes.filter((d) => d.restaurantId === restaurantId),
    [],
  );

  const createRestaurantId = useCallback(
    () => `rest-${Date.now().toString(36)}`,
    [],
  );
  const createDishId = useCallback(
    () => `dish-${Date.now().toString(36)}`,
    [],
  );

  const loginUser = useCallback((fullName: string, phone: string) => {
    const name = fullName.trim();
    const phoneTrim = phone.trim();
    if (name.length < 2) return { ok: false, message: "أدخل الاسم الكامل" };
    if (!isValidPhone(phoneTrim)) {
      return { ok: false, message: "رقم الجوال غير صالح" };
    }
    patch((prev) => ({
      ...prev,
      user: {
        fullName: name,
        phone: phoneTrim,
        address: prev.user?.address ?? "",
        lat: prev.user?.lat ?? null,
        lng: prev.user?.lng ?? null,
        locationLabel: prev.user?.locationLabel ?? "",
      },
    }));
    return { ok: true, message: "تم تسجيل الدخول" };
  }, []);

  const logoutUser = useCallback(() => {
    patch((prev) => ({ ...prev, user: null }));
  }, []);

  const updateUserLocation = useCallback((patchLoc: Partial<UserProfile>) => {
    const prev = stateRef.current;
    if (!isLoggedIn(prev.user)) {
      return {
        ok: false,
        message: "سجّل الدخول أولاً قبل حفظ العنوان",
      };
    }
    patch((s) => ({
      ...s,
      user: s.user ? { ...s.user, ...patchLoc } : s.user,
    }));
    return { ok: true, message: "تم حفظ العنوان" };
  }, []);

  const unlockAdmin = useCallback((pin: string) => {
    if (pin.trim() !== ADMIN_PIN) return false;
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    patch((prev) => ({ ...prev, adminUnlocked: true }));
    return true;
  }, []);

  const lockAdmin = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    patch((prev) => ({ ...prev, adminUnlocked: false }));
  }, []);

  const triggerFly = useCallback((dish: Dish, fromRect?: DOMRect | null) => {
    const cartEl = document.getElementById("cart-icon");
    if (fromRect && cartEl) {
      const to = cartEl.getBoundingClientRect();
      patch((prev) => ({
        ...prev,
        fly: {
          id: `${dish.id}-${Date.now()}`,
          gradient: dish.gradient,
          from: {
            x: fromRect.left + fromRect.width / 2,
            y: fromRect.top + fromRect.height / 2,
          },
          to: { x: to.left + to.width / 2, y: to.top + to.height / 2 },
        },
      }));
    } else {
      patch((prev) => ({ ...prev, cartPopKey: prev.cartPopKey + 1 }));
    }
  }, []);

  const pushToCart = useCallback(
    (dish: Dish, fromRect?: DOMRect | null) => {
      patch((prev) => {
        const existing = prev.cart.find((i) => i.dishId === dish.id);
        const cart = existing
          ? prev.cart.map((i) =>
              i.dishId === dish.id
                ? { ...i, quantity: i.quantity + 1 }
                : i,
            )
          : [...prev.cart, { dishId: dish.id, quantity: 1 }];
        return { ...prev, cartRestaurantId: dish.restaurantId, cart };
      });
      triggerFly(dish, fromRect);
    },
    [triggerFly],
  );

  const addToCart = useCallback(
    (dishId: string, fromRect?: DOMRect) => {
      const { dishes, restaurants, cart, cartRestaurantId } = stateRef.current;
      const dish = dishes.find((d) => d.id === dishId);
      if (!dish?.available) {
        return { ok: false, message: "هذا الصنف غير متوفر" };
      }
      const restaurant = restaurants.find((r) => r.id === dish.restaurantId);
      if (!restaurant?.active) {
        return { ok: false, message: "هذا المطعم غير متاح حالياً" };
      }
      if (
        cart.length > 0 &&
        cartRestaurantId &&
        cartRestaurantId !== dish.restaurantId
      ) {
        patch((prev) => ({
          ...prev,
          cartConflict: {
            dishId,
            from: rectPayload(fromRect),
            currentRestaurantId: cartRestaurantId,
            nextRestaurantId: dish.restaurantId,
          },
        }));
        return { ok: false, message: "conflict" };
      }
      pushToCart(dish, fromRect ?? null);
      return { ok: true };
    },
    [pushToCart],
  );

  const confirmClearCartAndAdd = useCallback(() => {
    const conflict = stateRef.current.cartConflict;
    if (!conflict) return;
    const dish = stateRef.current.dishes.find((d) => d.id === conflict.dishId);
    patch((prev) => ({
      ...prev,
      cart: [],
      appliedPromo: null,
      cartRestaurantId: null,
      cartConflict: null,
    }));
    if (!dish?.available) return;
    const from = conflict.from
      ? new DOMRect(
          conflict.from.x,
          conflict.from.y,
          conflict.from.w,
          conflict.from.h,
        )
      : null;
    pushToCart(dish, from);
  }, [pushToCart]);

  const dismissCartConflict = useCallback(() => {
    patch((prev) => ({ ...prev, cartConflict: null }));
  }, []);

  const clearFly = useCallback(() => {
    patch((prev) => ({
      ...prev,
      fly: null,
      cartPopKey: prev.cartPopKey + 1,
    }));
  }, []);

  const updateQuantity = useCallback((dishId: string, quantity: number) => {
    patch((prev) => {
      const cart =
        quantity <= 0
          ? prev.cart.filter((i) => i.dishId !== dishId)
          : prev.cart.map((i) =>
              i.dishId === dishId ? { ...i, quantity } : i,
            );
      return {
        ...prev,
        cart,
        cartRestaurantId: cart.length ? prev.cartRestaurantId : null,
      };
    });
  }, []);

  const removeFromCart = useCallback((dishId: string) => {
    patch((prev) => {
      const cart = prev.cart.filter((i) => i.dishId !== dishId);
      return {
        ...prev,
        cart,
        cartRestaurantId: cart.length ? prev.cartRestaurantId : null,
      };
    });
  }, []);

  const clearCart = useCallback(() => {
    patch((prev) => ({
      ...prev,
      cart: [],
      cartRestaurantId: null,
      appliedPromo: null,
    }));
  }, []);

  const applyPromo = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    const promo = stateRef.current.promoCodes.find(
      (p) => p.code === normalized && p.active,
    );
    if (!promo) return { ok: false, message: "كود غير صالح أو غير مفعّل" };
    patch((prev) => ({ ...prev, appliedPromo: normalized }));
    return { ok: true, message: `${promo.percentOff}% off applied` };
  }, []);

  const unlockPromoFromScratch = useCallback(() => {
    patch((prev) => {
      const has = prev.promoCodes.some((p) => p.code === "ZEST30");
      const promoCodes = has
        ? prev.promoCodes.map((p) =>
            p.code === "ZEST30" ? { ...p, active: true } : p,
          )
        : [...prev.promoCodes, { code: "ZEST30", percentOff: 30, active: true }];
      return {
        ...prev,
        scratchRevealed: true,
        unlockedPromos: prev.unlockedPromos.includes("ZEST30")
          ? prev.unlockedPromos
          : [...prev.unlockedPromos, "ZEST30"],
        promoCodes,
        appliedPromo: "ZEST30",
      };
    });
  }, []);

  const placeOrder = useCallback(() => {
    const s = stateRef.current;
    if (s.cart.length === 0 || !s.cartRestaurantId) {
      return { ok: false as const, message: "السلة فارغة" };
    }
    if (!isLoggedIn(s.user)) {
      return { ok: false as const, message: "سجّل الدخول أولاً" };
    }
    if (!hasDeliveryLocation(s.user)) {
      return { ok: false as const, message: "أضف عنوان التوصيل" };
    }
    const restaurant = s.restaurants.find((r) => r.id === s.cartRestaurantId);
    if (!restaurant?.active) {
      return { ok: false as const, message: "المطعم غير متاح" };
    }

    const lines: OrderLineItem[] = [];
    for (const item of s.cart) {
      const dish = s.dishes.find((d) => d.id === item.dishId);
      if (!dish) continue;
      lines.push({
        dishId: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: item.quantity,
      });
    }
    if (lines.length === 0) {
      return { ok: false as const, message: "لا توجد أصناف صالحة في السلة" };
    }

    const totals = calcTotals(s.cart, s.dishes, s.appliedPromo, s.promoCodes);
    const order: Order = {
      id: `ord-${Date.now().toString(36)}`,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      items: lines,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total + restaurant.deliveryFee,
      promoCode: s.appliedPromo,
      status: "Pending",
      createdAt: Date.now(),
      etaMinutes: restaurant.etaMinutes,
      customerName: s.user.fullName,
      customerPhone: s.user.phone,
      deliveryAddress: s.user.address || s.user.locationLabel,
      deliveryLat: s.user.lat,
      deliveryLng: s.user.lng,
    };

    patch((prev) => ({
      ...prev,
      orders: [order, ...prev.orders],
      activeOrderId: order.id,
      cart: [],
      cartRestaurantId: null,
      appliedPromo: null,
    }));

    return { ok: true as const, order };
  }, []);

  const updateOrderStatus = useCallback(
    (orderId: string, status: OrderStatus) => {
      patch((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === orderId ? { ...o, status } : o,
        ),
      }));
    },
    [],
  );

  const upsertRestaurant = useCallback((restaurant: Restaurant) => {
    const name = restaurant.name.trim();
    if (!name) return { ok: false, message: "اسم المطعم مطلوب" };
    const clean = normalizeRestaurant({ ...restaurant, name });
    patch((prev) => {
      const exists = prev.restaurants.some((r) => r.id === clean.id);
      return {
        ...prev,
        restaurants: exists
          ? prev.restaurants.map((r) => (r.id === clean.id ? clean : r))
          : [clean, ...prev.restaurants],
      };
    });
    return { ok: true, message: "Saved" };
  }, []);

  const deleteRestaurant = useCallback((id: string) => {
    patch((prev) => {
      const dishes = prev.dishes.filter((d) => d.restaurantId !== id);
      const dishIds = new Set(dishes.map((d) => d.id));
      const cart = prev.cart.filter((i) => dishIds.has(i.dishId));
      return {
        ...prev,
        restaurants: prev.restaurants.filter((r) => r.id !== id),
        dishes,
        cart,
        cartRestaurantId:
          prev.cartRestaurantId === id || cart.length === 0
            ? null
            : prev.cartRestaurantId,
      };
    });
  }, []);

  const upsertDish = useCallback((dish: Dish) => {
    const name = dish.name.trim();
    if (!name) return { ok: false, message: "اسم الصنف مطلوب" };
    if (!dish.restaurantId) return { ok: false, message: "اختر مطعماً" };
    if (!Number.isFinite(dish.price) || dish.price < 0) {
      return { ok: false, message: "السعر غير صالح" };
    }
    const clean = normalizeDish({ ...dish, name });
    patch((prev) => {
      const exists = prev.dishes.some((d) => d.id === clean.id);
      return {
        ...prev,
        dishes: exists
          ? prev.dishes.map((d) => (d.id === clean.id ? clean : d))
          : [clean, ...prev.dishes],
      };
    });
    return { ok: true, message: "Saved" };
  }, []);

  const deleteDish = useCallback((id: string) => {
    patch((prev) => {
      const cart = prev.cart.filter((i) => i.dishId !== id);
      return {
        ...prev,
        dishes: prev.dishes.filter((d) => d.id !== id),
        cart,
        cartRestaurantId: cart.length ? prev.cartRestaurantId : null,
      };
    });
  }, []);

  const upsertPromo = useCallback((promo: PromoCode) => {
    const code = promo.code.trim().toUpperCase();
    if (!code) return { ok: false, message: "الكود مطلوب" };
    if (!Number.isFinite(promo.percentOff) || promo.percentOff < 1) {
      return { ok: false, message: "النسبة غير صالحة" };
    }
    const clean = normalizePromo({ ...promo, code });
    patch((prev) => {
      const exists = prev.promoCodes.some((p) => p.code === code);
      return {
        ...prev,
        promoCodes: exists
          ? prev.promoCodes.map((p) => (p.code === code ? clean : p))
          : [...prev.promoCodes, clean],
      };
    });
    return { ok: true, message: "Saved" };
  }, []);

  const deletePromoCode = useCallback((code: string) => {
    patch((prev) => ({
      ...prev,
      promoCodes: prev.promoCodes.filter((p) => p.code !== code),
      appliedPromo: prev.appliedPromo === code ? null : prev.appliedPromo,
      unlockedPromos: prev.unlockedPromos.filter((c) => c !== code),
    }));
  }, []);

  const value: AppContextValue = {
    hydrated: state.hydrated,
    storageError: state.storageError,
    restaurants: state.restaurants,
    dishes: state.dishes,
    cart: state.cart,
    cartRestaurantId: state.cartRestaurantId,
    cartRestaurant,
    cartCount,
    subtotal,
    discount,
    total,
    appliedPromo: state.appliedPromo,
    unlockedPromos: state.unlockedPromos,
    promoCodes: state.promoCodes,
    orders: state.orders,
    activeOrder,
    scratchRevealed: state.scratchRevealed,
    cartPopKey: state.cartPopKey,
    fly: state.fly,
    cartConflict: state.cartConflict,
    user: state.user,
    isAuthenticated: isLoggedIn(state.user),
    adminUnlocked: state.adminUnlocked,
    loginUser,
    logoutUser,
    updateUserLocation,
    unlockAdmin,
    lockAdmin,
    addToCart,
    confirmClearCartAndAdd,
    dismissCartConflict,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyPromo,
    unlockPromoFromScratch,
    placeOrder,
    updateOrderStatus,
    upsertRestaurant,
    deleteRestaurant,
    upsertDish,
    deleteDish,
    upsertPromo,
    deletePromoCode,
    clearFly,
    getDish,
    getRestaurant,
    getDishesByRestaurant,
    createRestaurantId,
    createDishId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
