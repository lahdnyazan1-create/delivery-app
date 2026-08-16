// src/store/useOrderStore.ts
// ============================================================================
// التعديلات:
// - ✅ حُذفت الكتابة المباشرة (updateDoc) من claimOrder/assignDriverToOrder.
// - ✅ كل تغييرات الحالة تمر الآن عبر src/lib/orders.ts (Cloud Functions).
// - ✅ placeOrder يقبل الآن zoneId + deliveryAddressDetails + paymentMethod.
// ============================================================================

import { create } from "zustand";
import { Order, OrderStatus, ActiveOrder, CartItem, PaymentMethod } from "@/types/database";
import {
  placeOrder as placeOrderApi,
  updateOrderStatus as updateOrderStatusApi,
  claimOrder as claimOrderApi,
  assignDriverToOrder as assignDriverToOrderApi,
} from "@/lib/orders";
import { subscribeOrders, subscribeAllOrders, subscribeCourierOrders } from "@/lib/firestore";
import type { Unsubscribe } from "firebase/firestore";

interface OrderState {
  orders: Order[];
  activeOrder: ActiveOrder | null;
  _orderUnsub: Unsubscribe | null;

  // Actions
  subscribeToOrders: (userId: string, role?: string) => void;
  unsubscribeFromOrders: () => void;
  placeOrder: (params: {
    cart: CartItem[];
    restaurantId: string | null;
    promoCode: string | null;
    zoneId: string;
    deliveryAddressDetails: string;
    orderNotes?: string;
    paymentMethod?: PaymentMethod;
    customerLat?: number | null;
    customerLng?: number | null;
  }) => Promise<{ ok: boolean; orderId?: string; message?: string }>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
  ) => Promise<{ ok: boolean; message?: string }>;
  claimOrder: (orderId: string) => Promise<{ ok: boolean; message: string }>;
  assignDriverToOrder: (
    orderId: string,
    driverId: string,
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
    } else if (role === "courier") {
      unsub = subscribeCourierOrders(userId, (orders) => {
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

  placeOrder: async ({
    cart,
    restaurantId,
    promoCode,
    zoneId,
    deliveryAddressDetails,
    orderNotes,
    paymentMethod,
    customerLat,
    customerLng,
  }) => {
    if (!restaurantId) return { ok: false, message: "لم يتم تحديد مطعم" };

    const result = await placeOrderApi({
      restaurantId,
      cart,
      promoCode,
      zoneId,
      deliveryAddressDetails,
      orderNotes,
      paymentMethod,
      customerLat,
      customerLng,
    });

    if (!result.ok) return { ok: false, message: result.message };

    set((state) => ({
      orders: [result.order, ...state.orders],
      activeOrder: result.order,
    }));

    return { ok: true, orderId: result.orderId };
  },

  updateOrderStatus: async (orderId, status) => {
    const result = await updateOrderStatusApi(orderId, status);
    if (!result.ok) return { ok: false, message: result.message };

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
  },

  claimOrder: async (orderId) => {
    const result = await claimOrderApi(orderId);
    if (result.ok) {
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { ...o, status: "OutForDelivery" as OrderStatus }
            : o,
        ),
      }));
    }
    return result;
  },

  assignDriverToOrder: async (orderId, driverId) => {
    const result = await assignDriverToOrderApi(orderId, driverId);
    if (result.ok) {
      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { ...o, courierId: driverId, status: "OutForDelivery" as OrderStatus }
            : o,
        ),
      }));
    }
    return result;
  },

  setActiveOrder: (order) => set({ activeOrder: order }),

  updateActiveOrderStatus: (status) => {
    const { activeOrder } = get();
    if (activeOrder) {
      set({ activeOrder: { ...activeOrder, status } });
    }
  },
}));
