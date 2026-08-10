// src/store/useCartStore.ts
// ============================================================================
// التعديلات:
// - ✅ إضافة selectedZoneId + deliveryAddressDetails (تُحفظان محلياً/persisted)
// - ✅ getCartTotal يحسب رسوم التوصيل من zone.deliveryFee بدل restaurant.deliveryFee
// ============================================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types/database";
import { calcTotals } from "@/lib/calcTotals";
import { useDataStore } from "./useDataStore";

interface CartState {
  cart: CartItem[];
  cartRestaurantId: string | null;
  appliedPromo: string | null;
  selectedZoneId: string | null;
  deliveryAddressDetails: string;
  orderNotes: string;

  // Actions
  addToCart: (
    dishId: string,
    restaurantId: string,
    notes?: string,
  ) => { ok: boolean; message?: string; conflict?: boolean };
  /** يفرّغ السلة الحالية ثم يضيف الطبق الجديد مباشرة — لحالة تعارض المطعم */
  replaceCartAndAdd: (dishId: string, restaurantId: string, notes?: string) => void;
  removeFromCart: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string) => { ok: boolean; message: string };
  removePromo: () => void;
  setSelectedZoneId: (zoneId: string | null) => void;
  setDeliveryAddressDetails: (details: string) => void;
  setOrderNotes: (notes: string) => void;
  getCartTotal: () => {
    subtotal: number;
    discount: number;
    deliveryFee: number;
    total: number;
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      cartRestaurantId: null,
      appliedPromo: null,
      selectedZoneId: null,
      deliveryAddressDetails: "",
      orderNotes: "",

      addToCart: (dishId, restaurantId, notes = "") => {
        const state = get();
        if (state.cartRestaurantId && state.cartRestaurantId !== restaurantId) {
          // ✅ conflict:true يسمح للواجهة بعرض تأكيد واضح بدل تجاهل الفشل بصمت
          return {
            ok: false,
            message: "سلتك تحتوي أصناف من مطعم آخر",
            conflict: true,
          };
        }
        // ✅ التحقق مما إذا كان الطبق موجوداً بنفس الملاحظات لزيادة الكمية
        const existingIndex = state.cart.findIndex(
          (item) => item.dishId === dishId && (item.notes || "") === notes,
        );
        let newCart;
        if (existingIndex !== -1) {
          newCart = state.cart.map((item, index) =>
            index === existingIndex
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        } else {
          newCart = [...state.cart, { dishId, quantity: 1, notes }];
        }
        set({ cart: newCart, cartRestaurantId: restaurantId });
        return { ok: true };
      },

      replaceCartAndAdd: (dishId, restaurantId, notes = "") => {
        set({
          cart: [{ dishId, quantity: 1, notes }],
          cartRestaurantId: restaurantId,
          appliedPromo: null,
        });
      },

      removeFromCart: (dishId) => {
        const { cart } = get();
        const newCart = cart.filter((item) => item.dishId !== dishId);
        set({
          cart: newCart,
          cartRestaurantId:
            newCart.length === 0 ? null : get().cartRestaurantId,
        });
      },

      updateQuantity: (dishId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(dishId);
          return;
        }
        const { cart } = get();
        const newCart = cart.map((item) =>
          item.dishId === dishId ? { ...item, quantity } : item,
        );
        set({ cart: newCart });
      },

      clearCart: () => {
        // ✅ نُبقي على selectedZoneId بعد تفريغ السلة (تفضيل المستخدم على
        // الأرجح يبقى نفسه لطلبه القادم)، ونمسح فقط محتوى السلة والبرومو.
        set({ cart: [], cartRestaurantId: null, appliedPromo: null });
      },

      applyPromo: (code) => {
        const { promoCodes } = useDataStore.getState();
        const promo = promoCodes.find((p) => p.code === code && p.active);
        if (!promo) return { ok: false, message: "كود غير صالح" };
        set({ appliedPromo: code });
        return { ok: true, message: `تم تطبيق خصم ${promo.percentOff}%` };
      },

      removePromo: () => set({ appliedPromo: null }),

      setSelectedZoneId: (zoneId) => set({ selectedZoneId: zoneId }),
      setDeliveryAddressDetails: (details) =>
        set({ deliveryAddressDetails: details }),
      setOrderNotes: (notes) => set({ orderNotes: notes }),

      getCartTotal: () => {
        const { cart, appliedPromo, selectedZoneId } = get();
        const { dishes, promoCodes, zones } = useDataStore.getState();
        const zone = zones.find((z) => z.id === selectedZoneId);
        // ✅ الرسوم الآن من المنطقة المختارة، وليس من المطعم
        const deliveryFee = zone ? zone.deliveryFee : 0;
        return calcTotals(cart, dishes, appliedPromo, promoCodes, deliveryFee);
      },
    }),
    {
      name: "zest-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
        cartRestaurantId: state.cartRestaurantId,
        appliedPromo: state.appliedPromo,
        selectedZoneId: state.selectedZoneId,
        deliveryAddressDetails: state.deliveryAddressDetails,
        orderNotes: state.orderNotes,
      }),
    },
  ),
);

