// src/store/useDataStore.ts
// ============================================================================
// التعديل: إضافة اشتراك real-time بمجموعة zones (مطلوبة الآن لاختيار منطقة
// التوصيل في شاشة السلة قبل إتمام الطلب).
// ============================================================================

import { create } from "zustand";
import { Restaurant, Dish, Driver, PromoCode, Category, Banner, Zone } from "@/types/database";
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
  zones: Zone[];
  loading: boolean;
  error: string | null;
  _unsubs: Unsubscribe[];

  loadInitialData: () => Promise<void>;
  cleanupListeners: () => void;
  getRestaurant: (id: string) => Restaurant | undefined;
  getDish: (dishId: string) => Dish | undefined;
  getDishesByRestaurant: (restaurantId: string) => Dish[];
  getZone: (zoneId: string) => Zone | undefined;
}

export const useDataStore = create<DataState>((set, get) => ({
  restaurants: [],
  dishes: [],
  drivers: [],
  promoCodes: [],
  categories: [],
  banners: [],
  zones: [],
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

    // 1) المستمعات العامة (المسار الحرج) — لا تتطلب صلاحيات خاصة.
    //    مهم: لا نربطها بجلب drivers/promoCodes لأن "Rules ليست فلاتر":
    //    fetchDrivers يُرفض لغير الأدمن، وقيامه داخل نفس try كان يجهض
    //    تسجيل كل المستمعات فيترك التطبيق فارغاً للعملاء.
    const unsubs: Unsubscribe[] = [];

    try {
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

      // كل المناطق مرتبة بالاسم (نفلتر active==true بجهة العميل لتفادي
      // الحاجة لفهرس مركّب where+orderBy؛ عدد المناطق عادة صغير)
      const zonesQuery = query(collection(db, "zones"), orderBy("name", "asc"));
      unsubs.push(
        onSnapshot(
          zonesQuery,
          (snapshot) => {
            const zones = snapshot.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }) as Zone)
              .filter((z) => z.active);
            set({ zones });
          },
          (err) => console.error("Zones listener error:", err),
        ),
      );

      set({ _unsubs: unsubs, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return;
    }

    // 2) بيانات إدارية غير حرجة — كل استدعاء مستقل بمعالجة خطأ خاصة به،
    //    وفشله (permission-denied لغير الأدمن مثلاً) لا يجهض أي شيء آخر.
    fetchDrivers()
      .then((drivers) => set({ drivers }))
      .catch((err) => {
        console.warn("Drivers fetch skipped:", err?.code || err?.message);
        set({ drivers: [] });
      });

    fetchPromoCodes()
      .then((promoCodes) => set({ promoCodes }))
      .catch((err) => {
        console.warn("Promo codes fetch skipped:", err?.code || err?.message);
        set({ promoCodes: [] });
      });
  },

  getRestaurant: (id) => get().restaurants.find((r) => r.id === id),
  getDish: (dishId) => get().dishes.find((d) => d.id === dishId),
  getDishesByRestaurant: (restaurantId) =>
    get().dishes.filter((d) => d.restaurantId === restaurantId),
  getZone: (zoneId) => get().zones.find((z) => z.id === zoneId),
}));
