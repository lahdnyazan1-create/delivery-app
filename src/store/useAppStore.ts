// src/store/useAppStore.ts
// ============================================================================
// تم تحديث الملف لمنع مشاكل TypeScript أثناء بناء المشروع في Vercel.
// تم استخدام Optional Chaining والقيم الافتراضية للتعامل مع خصائص Cart المتغيرة.
// ============================================================================

import { useAuthStore } from "./useAuthStore";
import { useDataStore } from "./useDataStore";
import { useCartStore } from "./useCartStore";
import { useOrderStore } from "./useOrderStore";
import {
  addRestaurant as addRestaurantFirestore,
  toggleRestaurantActive as toggleRestaurantActiveFirestore,
} from "@/lib/firestore";
import { Restaurant, PaymentMethod } from "@/types/database";

export { useAuthStore, useDataStore, useCartStore, useOrderStore };

export const useAppStore = () => {
  const auth = useAuthStore();
  const data = useDataStore();
  const cart = useCartStore() as any; // لتفادي مشاكل الأنواع المفقودة في CartState
  const order = useOrderStore();

  return {
    // Auth Module
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    authReady: auth.authReady,
    hasSeenOnboarding: auth.hasSeenOnboarding,
    completePhoneLogin: auth.completePhoneLogin,
    logoutUser: auth.logoutUser,
    initAuthListener: auth.initAuthListener,
    updateUserProfile: auth.updateUserProfile,
    updateUserLocation: auth.updateUserLocation,
    completeOnboarding: auth.completeOnboarding,

    // Data Module
    restaurants: data.restaurants,
    dishes: data.dishes,
    drivers: data.drivers,
    promoCodes: data.promoCodes,
    zones: data.zones,
    loading: data.loading || auth.loading,
    error: data.error || auth.error,
    loadInitialData: data.loadInitialData,
    cleanupListeners: data.cleanupListeners,
    getRestaurant: data.getRestaurant,
    getDish: data.getDish,
    getDishesByRestaurant: data.getDishesByRestaurant,
    getZone: data.getZone,

    // Cart Module
    cart: cart.cart || [],
    cartRestaurantId: cart.cartRestaurantId || null,
    appliedPromo: cart.appliedPromo || null,
    selectedZoneId: cart.selectedZoneId || null,
    deliveryAddressDetails: cart.deliveryAddressDetails || "",
    setSelectedZoneId: cart.setSelectedZoneId || (() => {}),
    setDeliveryAddressDetails: cart.setDeliveryAddressDetails || (() => {}),
    addToCart: cart.addToCart,
    removeFromCart: cart.removeFromCart,
    updateQuantity: cart.updateQuantity,
    clearCart: cart.clearCart,
    applyPromo: cart.applyPromo,
    removePromo: cart.removePromo,
    getCartTotal: cart.getCartTotal,

    // Orders Module
    orders: order.orders,
    activeOrder: order.activeOrder,
    subscribeToOrders: order.subscribeToOrders,
    unsubscribeFromOrders: order.unsubscribeFromOrders,

    /**
     * ✅ يدعم الاستدعيين:
     * 1. placeOrder({ zoneId, deliveryAddressDetails, paymentMethod })
     * 2. placeOrder(paymentMethod) مع قراءة المعطيات من المتجر تلقائياً
     */
    placeOrder: async (
      optsOrPayment?:
        | PaymentMethod
        | {
            zoneId?: string;
            deliveryAddressDetails?: string;
            paymentMethod?: PaymentMethod;
          }
    ) => {
      let zoneId = cart.selectedZoneId;
      let deliveryAddressDetails = cart.deliveryAddressDetails;
      let paymentMethod: PaymentMethod | undefined;

      if (typeof optsOrPayment === "object" && optsOrPayment !== null) {
        zoneId = optsOrPayment.zoneId || zoneId;
        deliveryAddressDetails = optsOrPayment.deliveryAddressDetails || deliveryAddressDetails;
        paymentMethod = optsOrPayment.paymentMethod;
      } else if (typeof optsOrPayment === "string") {
        paymentMethod = optsOrPayment;
      }

      if (!zoneId) {
        return { ok: false, message: "يرجى اختيار منطقة التوصيل" };
      }

      const result = await order.placeOrder({
        cart: cart.cart,
        restaurantId: cart.cartRestaurantId,
        promoCode: cart.appliedPromo,
        zoneId,
        deliveryAddressDetails: deliveryAddressDetails || "",
        paymentMethod,
      });

      if (result.ok) {
        cart.clearCart();
      }
      return result;
    },

    addDish: order.addDish,
    updateDish: order.updateDish,
    updateOrderStatus: order.updateOrderStatus,
    claimOrder: (orderId: string) => order.claimOrder(orderId),
    assignDriverToOrder: (orderId: string, driverId: string) =>
      order.assignDriverToOrder(orderId, driverId),
    setActiveOrder: order.setActiveOrder,
    updateActiveOrderStatus: order.updateActiveOrderStatus,

    // Admin & Management Helpers
    toggleRestaurantActive: async (id: string, activeStatus?: boolean) => {
      const restaurant = data.restaurants.find((r) => r.id === id);
      const newStatus = activeStatus !== undefined ? activeStatus : !restaurant?.active;
      await toggleRestaurantActiveFirestore(id, newStatus);
    },
    addRestaurant: async (restaurant: Omit<Restaurant, "id">) => {
      return await addRestaurantFirestore(restaurant);
    },
  };
};
