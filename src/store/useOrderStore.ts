import { create } from "zustand";
import { Order, OrderStatus, ActiveOrder, CartItem } from "@/types/database";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { updateOrderStatus as updateOrderStatusFirestore } from "@/lib/firestore";
import { subscribeOrders, subscribeAllOrders } from "@/lib/firestore";
import type { Unsubscribe } from "firebase/firestore";

interface OrderState {
  orders: Order[];
  activeOrder: ActiveOrder | null;
  _orderUnsub: Unsubscribe | null;

  // Actions
  subscribeToOrders: (userId: string, role?: string) => void;
  unsubscribeFromOrders: () => void;
  placeOrder: (
    cart: CartItem[],
    cartRestaurantId: string | null,
    appliedPromo: string | null,
    userId: string,
  ) => Promise<{ ok: boolean; orderId?: string; message?: string }>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
  ) => Promise<{ ok: boolean; message?: string }>;
  claimOrder: (
    orderId: string,
    userId: string,
    role: string,
  ) => Promise<{ ok: boolean; message: string }>;
  assignDriverToOrder: (
    orderId: string,
    driverId: string,
    drivers: any[],
  ) => Promise<{ ok: boolean; message?: string }>;
  setActiveOrder: (order: ActiveOrder | null) => void;
  updateActiveOrderStatus: (status: OrderStatus) => void;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  activeOrder: null,
  _orderUnsub: null,

  subscribeToOrders: (userId, role) => {
    get().unsubscribeFromOrders();

    let unsub: Unsubscribe;

    if (role === "admin") {
      unsub = subscribeAllOrders((orders) => {
        set({ orders });
        const { activeOrder } = get();
        if (activeOrder) {
          const updated = orders.find((o) => o.id === activeOrder.id);
          if (updated) set({ activeOrder: updated });
        }
      });
    } else {
      unsub = subscribeOrders(userId, (orders) => {
        set({ orders });
        const { activeOrder } = get();
        if (activeOrder) {
          const updated = orders.find((o) => o.id === activeOrder.id);
          if (updated) set({ activeOrder: updated });
        }
      });
    }

    set({ _orderUnsub: unsub });
  },

  unsubscribeFromOrders: () => {
    const { _orderUnsub } = get();
    if (_orderUnsub) {
      try {
        _orderUnsub();
      } catch {
        /* ignore */
      }
      set({ _orderUnsub: null });
    }
  },

  placeOrder: async (cart, cartRestaurantId, appliedPromo, userId) => {
    if (cart.length === 0) return { ok: false, message: "السلة فارغة" };
    if (!cartRestaurantId) return { ok: false, message: "لم يتم تحديد مطعم" };
    if (!userId) return { ok: false, message: "يجب تسجيل الدخول" };

    try {
      const placeOrderFn = httpsCallable<
        {
          restaurantId: string;
          items: { dishId: string; quantity: number }[];
          promoCode: string | null;
          idempotencyKey: string;
        },
        { ok: boolean; orderId: string; order: Order }
      >(functions, "placeOrder");

      const idempotencyKey = `${userId}-${Date.now()}-${cart.map((c) => c.dishId).join("-")}`;

      const response = await placeOrderFn({
        restaurantId: cartRestaurantId,
        items: cart.map((c) => ({ dishId: c.dishId, quantity: c.quantity })),
        promoCode: appliedPromo,
        idempotencyKey,
      });

      const { orderId, order } = response.data;

      set((state) => ({
        orders: [order, ...state.orders],
        activeOrder: order,
      }));

      return { ok: true, orderId };
    } catch (error: any) {
      return { ok: false, message: error.message || "فشل إنشاء الطلب" };
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      const result = await updateOrderStatusFirestore(orderId, status);
      if (!result.success) return { ok: false, message: "فشل التحديث" };

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, status, updatedAt: Date.now() } : o,
        ),
      }));

      const { activeOrder } = get();
      if (activeOrder && activeOrder.id === orderId) {
        set({ activeOrder: { ...activeOrder, status, updatedAt: Date.now() } });
      }

      return { ok: true };
    } catch (error: any) {
      return { ok: false, message: error.message };
    }
  },

  claimOrder: async (orderId, userId, role) => {
    if (!userId || role !== "courier") {
      return { ok: false, message: "هذا الإجراء متاح للمندوبين فقط" };
    }
    try {
      await updateDoc(doc(db, "orders", orderId), {
        courierId: userId,
        status: "OutForDelivery",
        updatedAt: Date.now(),
      });
      return { ok: true, message: "تم استلام الطلب" };
    } catch (error: any) {
      return { ok: false, message: error.message };
    }
  },

  assignDriverToOrder: async (orderId, driverId, drivers) => {
    try {
      const driver = drivers.find((d: any) => d.id === driverId);
      if (!driver) return { ok: false, message: "السائق غير موجود" };

      const ref = doc(db, "orders", orderId);
      await updateDoc(ref, {
        courierId: driverId,
        driver: driver,
        status: "OutForDelivery",
        updatedAt: serverTimestamp(),
      });

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { ...o, courierId: driverId, driver, status: "OutForDelivery" }
            : o,
        ),
      }));

      const { activeOrder } = get();
      if (activeOrder && activeOrder.id === orderId) {
        set({
          activeOrder: {
            ...activeOrder,
            courierId: driverId,
            driver,
            status: "OutForDelivery",
          },
        });
      }

      return { ok: true };
    } catch (error: any) {
      return { ok: false, message: error.message };
    }
  },

  setActiveOrder: (order) => set({ activeOrder: order }),

  updateActiveOrderStatus: (status) => {
    const { activeOrder } = get();
    if (activeOrder) {
      set({ activeOrder: { ...activeOrder, status } });
    }
  },
}));
