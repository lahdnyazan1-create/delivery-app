import { create } from "zustand";
import { Restaurant, Dish, Driver, PromoCode, Category, Banner } from "@/types/database";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  limit,
  orderBy,
  type Unsubscribe,
} from "firebase/firestore";
import { fetchDrivers, fetchPromoCodes } from "@/lib/firestore";

interface DataState {
  restaurants: Restaurant[];
  dishes: Dish[];
  drivers: Driver[];
  promoCodes: PromoCode[];
  categories: Category[];
  banners: Banner[];
  loading: boolean;
  error: string | null;
  _unsubs: Unsubscribe[];

  loadInitialData: () => Promise<void>;
  cleanupListeners: () => void;
  getRestaurant: (id: string) => Restaurant | undefined;
  getDish: (dishId: string) => Dish | undefined;
  getDishesByRestaurant: (restaurantId: string) => Dish[];
}

export const useDataStore = create<DataState>((set, get) => ({
  restaurants: [],
  dishes: [],
  drivers: [],
  promoCodes: [],
  categories: [],
  banners: [],
  loading: false,
  error: null,
  _unsubs: [],

  cleanupListeners: () => {
    const { _unsubs } = get();
    _unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    });
    set({ _unsubs: [] });
  },

  loadInitialData: async () => {
    get().cleanupListeners();
    set({ loading: true, error: null });

    try {
      const [drivers, promoCodes] = await Promise.all([
        fetchDrivers(),
        fetchPromoCodes(),
      ]);

      set({ drivers, promoCodes, loading: false });

      const unsubs: Unsubscribe[] = [];

      const restaurantsQuery = query(collection(db, "restaurants"), limit(50));
      unsubs.push(
        onSnapshot(
          restaurantsQuery,
          (snapshot) => {
            const restaurants = snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() }) as Restaurant,
            );
            set({ restaurants });
          },
          (err) => console.error("Restaurants listener error:", err),
        ),
      );

      const dishesQuery = query(collection(db, "dishes"), limit(200));
      unsubs.push(
        onSnapshot(
          dishesQuery,
          (snapshot) => {
            const dishes = snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() }) as Dish,
            );
            set({ dishes });
          },
          (err) => console.error("Dishes listener error:", err),
        ),
      );

      const categoriesQuery = query(
        collection(db, "categories"),
        orderBy("order", "asc"),
      );
      unsubs.push(
        onSnapshot(
          categoriesQuery,
          (snapshot) => {
            const categories = snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() }) as Category,
            );
            set({ categories });
          },
          (err) => console.error("Categories listener error:", err),
        ),
      );

      const bannersQuery = query(
        collection(db, "banners"),
        orderBy("order", "asc"),
      );
      unsubs.push(
        onSnapshot(
          bannersQuery,
          (snapshot) => {
            const banners = snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() }) as Banner,
            );
            set({ banners });
          },
          (err) => console.error("Banners listener error:", err),
        ),
      );

      set({ _unsubs: unsubs });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  getRestaurant: (id) => get().restaurants.find((r) => r.id === id),
  getDish: (dishId) => get().dishes.find((d) => d.id === dishId),
  getDishesByRestaurant: (restaurantId) =>
    get().dishes.filter((d) => d.restaurantId === restaurantId),
}));
