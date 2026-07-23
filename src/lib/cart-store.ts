// src/lib/cart-store.ts
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { playSound, triggerHaptic } from './sound-haptics';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  note?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (newItem) => {
        playSound('add');
        triggerHaptic('light');
        const items = get().items;
        const existing = items.find((i) => i.id === newItem.id);
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          });
        } else {
          set({ items: [...items, { ...newItem, quantity: 1 }] });
        }
      },
      removeItem: (id) => {
        triggerHaptic('medium');
        set({ items: get().items.filter((i) => i.id !== id) });
      },
      updateQuantity: (id, delta) => {
        playSound('click');
        triggerHaptic('light');
        const items = get().items;
        set({
          items: items
            .map((i) => {
              if (i.id === id) {
                const newQty = i.quantity + delta;
                return newQty > 0 ? { ...i, quantity: newQty } : null;
              }
              return i;
            })
            .filter(Boolean) as CartItem[],
        });
      },
      clearCart: () => set({ items: [] }),
      getTotalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'zest-cart-storage',
    }
  )
);
