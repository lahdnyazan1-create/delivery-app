import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types/database";
import { calcTotals } from "@/lib/calcTotals";
import { useDataStore } from "./useDataStore";

interface CartState {
  cart: CartItem[];
  cartRestaurantId: string | null;
  appliedPromo: string | null;

  // Actions
  addToCart: (
    dishId: string,
    restaurantId: string,
  ) => { ok: boolean; message?: string };
  removeFromCart: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string) => { ok: boolean; message: string };
  removePromo: () => void;
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

      addToCart: (dishId, restaurantId) => {
        const state = get();
        if (state.cartRestaurantId && state.cartRestaurantId !== restaurantId) {
          return { ok: false, message: "لا يمكن إضافة أطباق من مطعم آخر" };
        }
        const existing = state.cart.find((item) => item.dishId === dishId);
        let newCart;
        if (existing) {
          newCart = state.cart.map((item) =>
            item.dishId === dishId
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          );
        } else {
          newCart = [...state.cart, { dishId, quantity: 1 }];
        }
        set({ cart: newCart, cartRestaurantId: restaurantId });
        return { ok: true };
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

      getCartTotal: () => {
        const { cart, appliedPromo } = get();
        const { dishes, promoCodes, restaurants } = useDataStore.getState();
        const { cartRestaurantId } = get();
        const restaurant = restaurants.find((r) => r.id === cartRestaurantId);
        const deliveryFee = restaurant ? restaurant.deliveryFee : 0;
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
      }),
      skipHydration: true,
    },
  ),
);
