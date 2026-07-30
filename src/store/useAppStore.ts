/**
 * ✅ useAppStore.ts — Aggregator Pattern (Optimized)
 *
 * تم تقسيم الـ Store إلى 4 وحدات مستقلة:
 * - useAuthStore: المصادقة والمستخدم
 * - useDataStore: المطاعم والأطباق والسائقين
 * - useCartStore: السلة والخصومات
 * - useOrderStore: الطلبات والتتبع
 *
 * يوفر هذا الهوك واجهة مجمعة تدعم التوافقية العكسية (Backward Compatibility)
 * مع تمكين المكونات من استدعاء الـ Stores المنفصلة للحد من الـ Re-renders.
 */

import { useAuthStore } from "./useAuthStore";
import { useDataStore } from "./useDataStore";
import { useCartStore } from "./useCartStore";
import { useOrderStore } from "./useOrderStore";
import {
  addRestaurant as addRestaurantFirestore,
  toggleRestaurantActive as toggleRestaurantActiveFirestore,
} from "@/lib/firestore";
import { Restaurant } from "@/types/database";

// Re-export individual stores
export { useAuthStore, useDataStore, useCartStore, useOrderStore };

// Backward-compatible hook
export const useAppStore = () => {
  const auth = useAuthStore();
  const data = useDataStore();
  const cart = useCartStore();
  const order = useOrderStore();

  return {
    // Auth Module
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
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
    loading: data.loading || auth.loading,
    error: data.error || auth.error,
    loadInitialData: data.loadInitialData,
    cleanupListeners: data.cleanupListeners,
    getRestaurant: data.getRestaurant,
    getDish: data.getDish,
    getDishesByRestaurant: data.getDishesByRestaurant,

    // Cart Module
    cart: cart.cart,
    cartRestaurantId: cart.cartRestaurantId,
    appliedPromo: cart.appliedPromo,
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
    placeOrder: async () => {
      const orderId = await order.placeOrder(
        cart.cart,
        cart.cartRestaurantId,
        cart.appliedPromo,
        auth.user?.uid || "",
      );
      if (orderId) {
        cart.clearCart();
      }
      return orderId;
    },
    updateOrderStatus: order.updateOrderStatus,
    claimOrder: (orderId: string) =>
      order.claimOrder(orderId, auth.user?.uid || "", auth.user?.role || ""),
    assignDriverToOrder: (orderId: string, driverId: string) =>
      order.assignDriverToOrder(orderId, driverId, data.drivers),
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
