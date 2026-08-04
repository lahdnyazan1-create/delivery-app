// src/store/useAppStore.ts
// ============================================================================
// التعديل: placeOrder يقرأ zoneId + deliveryAddressDetails تلقائياً من
// useCartStore (بدل تمريرهما يدوياً بكل استدعاء)، تماشياً مع الشكل الأصلي
// البسيط الذي كانت تستخدمه شاشة السلة (placeOrder() بدون معطيات).
// تم أيضاً تعريض zones + selectedZoneId + setSelectedZoneId +
// deliveryAddressDetails + setDeliveryAddressDetails لاستخدامها في الواجهة.
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
  const cart = useCartStore();
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
    cart: cart.cart,
    cartRestaurantId: cart.cartRestaurantId,
    appliedPromo: cart.appliedPromo,
    selectedZoneId: cart.selectedZoneId,
    deliveryAddressDetails: cart.deliveryAddressDetails,
    setSelectedZoneId: cart.setSelectedZoneId,
    setDeliveryAddressDetails: cart.setDeliveryAddressDetails,
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
     * ✅ يقرأ zoneId وdeliveryAddressDetails تلقائياً من useCartStore
     * (اختارهما المستخدم مسبقاً في شاشة السلة عبر setSelectedZoneId /
     * setDeliveryAddressDetails). يمكن تمرير paymentMethod اختيارياً فقط.
     */
    placeOrder: async (paymentMethod?: PaymentMethod) => {
      const { selectedZoneId, deliveryAddressDetails } = cart;

      if (!selectedZoneId) {
        return { ok: false, message: "يرجى اختيار منطقة التوصيل" };
      }
      if (!deliveryAddressDetails || deliveryAddressDetails.trim().length < 3) {
        return { ok: false, message: "يرجى إدخال تفاصيل عنوان التوصيل" };
      }

      const result = await order.placeOrder({
        cart: cart.cart,
        restaurantId: cart.cartRestaurantId,
        promoCode: cart.appliedPromo,
        zoneId: selectedZoneId,
        deliveryAddressDetails,
        paymentMethod,
      });
      if (result.ok) {
        cart.clearCart();
      }
      return result;
    },

    updateOrderStatus: order.updateOrderStatus,
    claimOrder: (orderId: string) => order.claimOrder(orderId),
    assignDriverToOrder: (orderId: string, driverId: string) =>
      order.assignDriverToOrder(orderId, driverId),
    setActiveOrder: order.setActiveOrder,
    updateActiveOrderStatus: order.updateActiveOrderStatus,

    // Admin & Management Helpers
    toggleRestaurantActive: async (id: string) => {
      const restaurant = data.restaurants.find((r) => r.id === id);
      if (!restaurant) return;
      await toggleRestaurantActiveFirestore(id, !restaurant.active);
    },
    addRestaurant: async (restaurant: Omit<Restaurant, "id">) => {
      return await addRestaurantFirestore(restaurant);
    },
  };
};
