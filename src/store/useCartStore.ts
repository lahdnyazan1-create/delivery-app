import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types/database";
import { calcTotals } from "@/lib/calcTotals";
import { checkPromoCode } from "@/lib/orders";
import { useDataStore } from "./useDataStore";

interface CartState {
  cart: CartItem[];
  cartRestaurantId: string | null;
  appliedPromo: string | null;
  /** نسبة الخصم المُتحقَّق منها من الخادم عبر checkPromo — مصدر الحقيقة للحساب */
  appliedPromoPercent: number | null;
  selectedZoneId: string | null;
  deliveryAddressDetails: string;
  orderNotes: string;

  addToCart: (dishId: string, restaurantId: string, notes?: string, selectedAddons?: any[]) => { ok: boolean; message?: string; conflict?: boolean };
  replaceCartAndAdd: (dishId: string, restaurantId: string, notes?: string, selectedAddons?: any[]) => void;
  removeFromCart: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string) => Promise<{ ok: boolean; message: string }>;
  removePromo: () => void;
  setSelectedZoneId: (zoneId: string | null) => void;
  setDeliveryAddressDetails: (details: string) => void;
  setOrderNotes: (notes: string) => void;
  getCartTotal: () => { subtotal: number; discount: number; deliveryFee: number; total: number };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      cartRestaurantId: null,
      appliedPromo: null,
      appliedPromoPercent: null,
      selectedZoneId: null,
      deliveryAddressDetails: "",
      orderNotes: "",

      addToCart: (dishId, restaurantId, notes = "", selectedAddons = []) => {
        const state = get();
        if (state.cartRestaurantId && state.cartRestaurantId !== restaurantId) {
          return { ok: false, message: "سلتك تحتوي أصناف من مطعم آخر", conflict: true };
        }
        
        // ✅ مقارنة الإضافات كمعرّف فريد لمنع دمج أصناف لها إضافات مختلفة
        const addonsKey = JSON.stringify(selectedAddons || []);
        const existingIndex = state.cart.findIndex(
          (item) => item.dishId === dishId && (item.notes || "") === notes && JSON.stringify(item.selectedAddons || []) === addonsKey
        );

        let newCart;
        if (existingIndex !== -1) {
          newCart = state.cart.map((item, index) =>
            index === existingIndex ? { ...item, quantity: item.quantity + 1 } : item,
          );
        } else {
          newCart = [...state.cart, { dishId, quantity: 1, notes, selectedAddons }];
        }
        set({ cart: newCart, cartRestaurantId: restaurantId });
        return { ok: true };
      },

      replaceCartAndAdd: (dishId, restaurantId, notes = "", selectedAddons = []) => {
        // ✅ يجب تصفير النسبة أيضاً — إبقاؤها كان يعرض خصماً وهمياً على السلة
        //    الجديدة لا يعترف به الخادم وقت الطلب
        set({ cart: [{ dishId, quantity: 1, notes, selectedAddons }], cartRestaurantId: restaurantId, appliedPromo: null, appliedPromoPercent: null });
      },

      removeFromCart: (dishId) => {
        const { cart } = get();
        const newCart = cart.filter((item) => item.dishId !== dishId);
        set({ cart: newCart, cartRestaurantId: newCart.length === 0 ? null : get().cartRestaurantId });
      },

      updateQuantity: (dishId, quantity) => {
        if (quantity <= 0) { get().removeFromCart(dishId); return; }
        const { cart } = get();
        const newCart = cart.map((item) => (item.dishId === dishId ? { ...item, quantity } : item));
        set({ cart: newCart });
      },

      clearCart: () => { set({ cart: [], cartRestaurantId: null, appliedPromo: null, appliedPromoPercent: null }); },

      // ✅ التحقق يتم عبر checkPromo Cloud Function — لم تعد قائمة الأكواد
      //    تُقرأ من العميل إطلاقاً (خصوصية + استحالة التعداد)
      applyPromo: async (code) => {
        const trimmed = code.trim().toUpperCase();
        if (!trimmed) return { ok: false, message: "أدخل كود الخصم" };
        const result = await checkPromoCode(trimmed);
        if (!result.ok) return { ok: false, message: result.message };
        set({ appliedPromo: trimmed, appliedPromoPercent: result.percentOff });
        return { ok: true, message: `تم تطبيق خصم ${result.percentOff}%` };
      },

      removePromo: () => set({ appliedPromo: null, appliedPromoPercent: null }),
      setSelectedZoneId: (zoneId) => set({ selectedZoneId: zoneId }),
      setDeliveryAddressDetails: (details) => set({ deliveryAddressDetails: details }),
      setOrderNotes: (notes) => set({ orderNotes: notes }),

      getCartTotal: () => {
        const { cart, appliedPromoPercent, selectedZoneId } = get();
        const { dishes, zones } = useDataStore.getState();
        const zone = zones.find((z) => z.id === selectedZoneId);
        const deliveryFee = zone ? zone.deliveryFee : 0;
        return calcTotals(cart, dishes, appliedPromoPercent, deliveryFee);
      },
    }),
    {
      name: "zest-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
        cartRestaurantId: state.cartRestaurantId,
        appliedPromo: state.appliedPromo,
        appliedPromoPercent: state.appliedPromoPercent,
        selectedZoneId: state.selectedZoneId,
        deliveryAddressDetails: state.deliveryAddressDetails,
        orderNotes: state.orderNotes,
      }),
    },
  ),
);
