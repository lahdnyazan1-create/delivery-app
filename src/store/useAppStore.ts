// src/store/useAppStore.ts
// ============================================================================
// واجهة موحّدة فوق المخازن الأربعة (auth/data/cart/order) مع نفس الشكل
// العام الذي تستخدمه كل الصفحات.
//
// ✅ التعديل المهم: كل حقل يُقرأ الآن بمحدّد دقيق بدل الاشتراك الكامل في
// المخازن الأربعة (كان الاستدعاء بلا محدد يعيد كائناً جديداً كل render
// ويعيد رسم كل الـ 18 مكوّناً المستهلك عند أي تغيير في أي مخزن — الآن
// كل مكوّن يُعاد رسمه فقط عندما تتغير الشرائح التي يقرأها فعلاً).
// واجهة الاستخدام العامة لم تتغير إطلاقاً.
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
  // ---------------- Auth ----------------
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authReady = useAuthStore((s) => s.authReady);
  const authLoading = useAuthStore((s) => s.loading);
  const authError = useAuthStore((s) => s.error);
  const hasSeenOnboarding = useAuthStore((s) => s.hasSeenOnboarding);
  const completeLogin = useAuthStore((s) => s.completeLogin);
  const logoutUser = useAuthStore((s) => s.logoutUser);
  const initAuthListener = useAuthStore((s) => s.initAuthListener);
  const updateUserProfile = useAuthStore((s) => s.updateUserProfile);
  const updateUserLocation = useAuthStore((s) => s.updateUserLocation);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  // ---------------- Data ----------------
  const restaurants = useDataStore((s) => s.restaurants);
  const dishes = useDataStore((s) => s.dishes);
  const drivers = useDataStore((s) => s.drivers);
  const promoCodes = useDataStore((s) => s.promoCodes);
  const zones = useDataStore((s) => s.zones);
  const dataLoading = useDataStore((s) => s.loading);
  const dataError = useDataStore((s) => s.error);
  const loadInitialData = useDataStore((s) => s.loadInitialData);
  const cleanupListeners = useDataStore((s) => s.cleanupListeners);
  const getRestaurant = useDataStore((s) => s.getRestaurant);
  const getDish = useDataStore((s) => s.getDish);
  const getDishesByRestaurant = useDataStore((s) => s.getDishesByRestaurant);
  const getZone = useDataStore((s) => s.getZone);

  // ---------------- Cart ----------------
  const cart = useCartStore((s) => s.cart);
  const cartRestaurantId = useCartStore((s) => s.cartRestaurantId);
  const appliedPromo = useCartStore((s) => s.appliedPromo);
  const selectedZoneId = useCartStore((s) => s.selectedZoneId);
  const deliveryAddressDetails = useCartStore((s) => s.deliveryAddressDetails);
  const orderNotes = useCartStore((s) => s.orderNotes);
  const setSelectedZoneId = useCartStore((s) => s.setSelectedZoneId);
  const setDeliveryAddressDetails = useCartStore((s) => s.setDeliveryAddressDetails);
  const setOrderNotes = useCartStore((s) => s.setOrderNotes);
  const addToCart = useCartStore((s) => s.addToCart);
  const replaceCartAndAdd = useCartStore((s) => s.replaceCartAndAdd);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const applyPromo = useCartStore((s) => s.applyPromo);
  const removePromo = useCartStore((s) => s.removePromo);
  const getCartTotal = useCartStore((s) => s.getCartTotal);

  // ---------------- Orders ----------------
  const orders = useOrderStore((s) => s.orders);
  const activeOrder = useOrderStore((s) => s.activeOrder);
  const subscribeToOrders = useOrderStore((s) => s.subscribeToOrders);
  const unsubscribeFromOrders = useOrderStore((s) => s.unsubscribeFromOrders);
  const placeOrderInStore = useOrderStore((s) => s.placeOrder);
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);
  const claimOrder = useOrderStore((s) => s.claimOrder);
  const assignDriverToOrder = useOrderStore((s) => s.assignDriverToOrder);
  const setActiveOrder = useOrderStore((s) => s.setActiveOrder);
  const updateActiveOrderStatus = useOrderStore((s) => s.updateActiveOrderStatus);

  return {
    // Auth Module
    user,
    isAuthenticated,
    authReady,
    hasSeenOnboarding,
    completeLogin,
    logoutUser,
    initAuthListener,
    updateUserProfile,
    updateUserLocation,
    completeOnboarding,

    // Data Module
    restaurants,
    dishes,
    drivers,
    promoCodes,
    zones,
    loading: dataLoading || authLoading,
    error: dataError ?? authError,
    loadInitialData,
    cleanupListeners,
    getRestaurant,
    getDish,
    getDishesByRestaurant,
    getZone,

    // Cart Module
    cart,
    cartRestaurantId,
    appliedPromo,
    selectedZoneId,
    deliveryAddressDetails,
    orderNotes,
    setSelectedZoneId,
    setDeliveryAddressDetails,
    setOrderNotes,
    addToCart,
    replaceCartAndAdd,
    removeFromCart,
    updateQuantity,
    clearCart,
    applyPromo,
    removePromo,
    getCartTotal,

    // Orders Module
    orders,
    activeOrder,
    subscribeToOrders,
    unsubscribeFromOrders,

    /**
     * ✅ يقرأ zoneId وdeliveryAddressDetails تلقائياً من useCartStore
     * (اختارهما المستخدم مسبقاً في شاشة السلة عبر setSelectedZoneId /
     * setDeliveryAddressDetails). يمكن تمرير paymentMethod اختيارياً فقط.
     */
    placeOrder: async (paymentMethod?: PaymentMethod) => {
      if (!selectedZoneId) {
        return { ok: false, message: "يرجى اختيار منطقة التوصيل" };
      }
      if (!deliveryAddressDetails || deliveryAddressDetails.trim().length < 3) {
        return { ok: false, message: "يرجى إدخال تفاصيل عنوان التوصيل" };
      }

      const result = await placeOrderInStore({
        cart,
        restaurantId: cartRestaurantId,
        promoCode: appliedPromo,
        zoneId: selectedZoneId,
        deliveryAddressDetails,
        orderNotes,
        paymentMethod,
        // ✅ إحداثيات GPS المحفوظة بالبروفايل (إن وُجدت) تُرفق تلقائياً
        // لزيادة موثوقية الموقع لدى المندوب، دون إجبار المستخدم على أي خطوة إضافية
        customerLat: user?.lat ?? null,
        customerLng: user?.lng ?? null,
      });
      if (result.ok) {
        clearCart();
      }
      return result;
    },

    updateOrderStatus,
    claimOrder,
    assignDriverToOrder,
    setActiveOrder,
    updateActiveOrderStatus,

    // Admin & Management Helpers
    toggleRestaurantActive: async (id: string) => {
      const restaurant = restaurants.find((r) => r.id === id);
      if (!restaurant) return;
      await toggleRestaurantActiveFirestore(id, !restaurant.active);
    },
    addRestaurant: async (restaurant: Omit<Restaurant, "id">) => {
      return await addRestaurantFirestore(restaurant);
    },
  };
};
