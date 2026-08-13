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

  addToCart: (dishId: string, restaurantId: string, notes?: string, selectedAddons?: any[]) => { ok: boolean; message?: string; conflict?: boolean };
  replaceCartAndAdd: (dishId: string, restaurantId: string, notes?: string, selectedAddons?: any[]) => void;
  removeFromCart: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string) => { ok: boolean; message: string };
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
        set({ cart: [{ dishId, quantity: 1, notes, selectedAddons }], cartRestaurantId: restaurantId, appliedPromo: null });
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

      clearCart: () => { set({ cart: [], cartRestaurantId: null, appliedPromo: null }); },

      applyPromo: (code) => {
        const { promoCodes } = useDataStore.getState();
        const promo = promoCodes.find((p) => p.code === code && p.active);
        if (!promo) return { ok: false, message: "كود غير صالح" };
        set({ appliedPromo: code });
        return { ok: true, message: `تم تطبيق خصم ${promo.percentOff}%` };
      },

      removePromo: () => set({ appliedPromo: null }),
      setSelectedZoneId: (zoneId) => set({ selectedZoneId: zoneId }),
      setDeliveryAddressDetails: (details) => set({ deliveryAddressDetails: details }),
      setOrderNotes: (notes) => set({ orderNotes: notes }),

      getCartTotal: () => {
        const { cart, appliedPromo, selectedZoneId } = get();
        const { dishes, promoCodes, zones } = useDataStore.getState();
        const zone = zones.find((z) => z.id === selectedZoneId);
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
