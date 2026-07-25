import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  UserProfile, 
  Restaurant, 
  Dish, 
  Driver, 
  CartItem, 
  Order, 
  OrderStatus, 
  PromoCode,
  ActiveOrder
} from '@/types/database';
import { 
  fetchDrivers, 
  subscribeOrders,
  updateOrderStatus as updateOrderStatusFirestore,
  createOrder as createOrderFirestore,
  fetchPromoCodes,
  updateUserProfile as updateUserProfileFirestore,
  addRestaurant as addRestaurantFirestore,
  toggleRestaurantActive as toggleRestaurantActiveFirestore,
} from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { 
  doc, setDoc, getDoc, 
  collection, onSnapshot, 
  updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { calcTotals } from '@/lib/calcTotals';

interface AppState {
  // بيانات أساسية
  restaurants: Restaurant[];
  dishes: Dish[];
  drivers: Driver[];
  promoCodes: PromoCode[];
  user: UserProfile | null;
  isAuthenticated: boolean;
  
  // السلة
  cart: CartItem[];
  cartRestaurantId: string | null;
  appliedPromo: string | null;
  
  // الطلبات
  orders: Order[];
  activeOrder: ActiveOrder | null;
  
  // حالة التحميل
  loading: boolean;
  error: string | null;
  
  // الإجراءات
  loadInitialData: () => Promise<void>;
  loginUser: (fullName: string, phone: string) => Promise<{ ok: boolean; message: string }>;
  logoutUser: () => void;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<{ ok: boolean; message: string }>;
  updateUserLocation: (location: { address?: string; locationLabel?: string; lat?: number; lng?: number }) => Promise<{ ok: boolean; message: string }>;
  addToCart: (dishId: string, restaurantId: string) => { ok: boolean; message?: string };
  removeFromCart: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string) => { ok: boolean; message: string };
  removePromo: () => void;
  placeOrder: () => Promise<{ ok: boolean; orderId?: string; message?: string }>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<{ ok: boolean; message?: string }>;
  assignDriverToOrder: (orderId: string, driverId: string) => Promise<{ ok: boolean; message?: string }>;
  setActiveOrder: (order: ActiveOrder | null) => void;
  getDish: (dishId: string) => Dish | undefined;
  getRestaurant: (id: string) => Restaurant | undefined;
  getDishesByRestaurant: (restaurantId: string) => Dish[];
  getCartTotal: () => { subtotal: number; discount: number; deliveryFee: number; total: number };
  updateActiveOrderStatus: (status: OrderStatus) => void;
  toggleRestaurantActive: (id: string) => Promise<void>;
  addRestaurant: (restaurant: Omit<Restaurant, 'id'>) => Promise<string>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      restaurants: [],
      dishes: [],
      drivers: [],
      promoCodes: [],
      user: null,
      isAuthenticated: false,
      cart: [],
      cartRestaurantId: null,
      appliedPromo: null,
      orders: [],
      activeOrder: null,
      loading: false,
      error: null,

      loadInitialData: async () => {
        set({ loading: true, error: null });
        try {
          // جلب السائقين وأكواد الخصم مرة واحدة (لأنها قليلة التغيير)
          const [drivers, promoCodes] = await Promise.all([
            fetchDrivers(),
            fetchPromoCodes()
          ]);
          set({ drivers, promoCodes, loading: false });

          // الاشتراك في التحديثات الفورية للمطاعم
          const unsubRestaurants = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
            const restaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
            set({ restaurants });
          });

          // الاشتراك في التحديثات الفورية للأطباق
          const unsubDishes = onSnapshot(collection(db, 'dishes'), (snapshot) => {
            const dishes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dish));
            set({ dishes });
          });

          // الاشتراك في الطلبات (موجود مسبقاً في الدالة)
          subscribeOrders((orders) => {
            set({ orders });
            const { activeOrder } = get();
            if (activeOrder) {
              const updated = orders.find(o => o.id === activeOrder.id);
              if (updated) set({ activeOrder: updated });
            }
          });

          // تخزين دوال إلغاء الاشتراك (اختياري)
          // يمكنك إضافتها إلى state إذا أردت تنظيفها عند الخروج
          // لكننا سنكتفي بهذا.
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      loginUser: async (fullName, phone) => {
        try {
          const userRef = doc(db, 'users', phone);
          const userSnap = await getDoc(userRef);
          let userData: UserProfile;
          if (userSnap.exists()) {
            userData = userSnap.data() as UserProfile;
          } else {
            const newUser: UserProfile = {
              uid: phone,
              phone,
              displayName: fullName,
              role: 'customer',
              address: '',
              createdAt: Date.now()
            };
            await setDoc(userRef, newUser);
            userData = newUser;
          }
          set({ user: userData, isAuthenticated: true });
          return { ok: true, message: 'تم تسجيل الدخول بنجاح' };
        } catch (error: any) {
          return { ok: false, message: error.message };
        }
      },

      logoutUser: () => {
        set({ user: null, isAuthenticated: false, activeOrder: null });
      },

      updateUserProfile: async (profile) => {
        const { user } = get();
        if (!user) return { ok: false, message: 'يجب تسجيل الدخول أولاً' };
        try {
          const updated = { ...user, ...profile };
          await updateUserProfileFirestore(user.uid, profile);
          set({ user: updated });
          return { ok: true, message: 'تم تحديث الملف الشخصي' };
        } catch (error: any) {
          return { ok: false, message: error.message };
        }
      },

      updateUserLocation: async (location) => {
        const { user } = get();
        if (!user) return { ok: false, message: 'يجب تسجيل الدخول أولاً' };
        try {
          const updated = { ...user, ...location };
          await updateUserProfileFirestore(user.uid, location);
          set({ user: updated });
          return { ok: true, message: 'تم تحديث الموقع' };
        } catch (error: any) {
          return { ok: false, message: error.message };
        }
      },

      addToCart: (dishId, restaurantId) => {
        const state = get();
        if (state.cartRestaurantId && state.cartRestaurantId !== restaurantId) {
          return { ok: false, message: 'لا يمكن إضافة أطباق من مطعم آخر' };
        }
        const existing = state.cart.find(item => item.dishId === dishId);
        let newCart;
        if (existing) {
          newCart = state.cart.map(item =>
            item.dishId === dishId ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          newCart = [...state.cart, { dishId, quantity: 1 }];
        }
        set({ cart: newCart, cartRestaurantId: restaurantId });
        return { ok: true };
      },

      removeFromCart: (dishId) => {
        const { cart } = get();
        const newCart = cart.filter(item => item.dishId !== dishId);
        set({
          cart: newCart,
          cartRestaurantId: newCart.length === 0 ? null : get().cartRestaurantId
        });
      },

      updateQuantity: (dishId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(dishId);
          return;
        }
        const { cart } = get();
        const newCart = cart.map(item =>
          item.dishId === dishId ? { ...item, quantity } : item
        );
        set({ cart: newCart });
      },

      clearCart: () => {
        set({ cart: [], cartRestaurantId: null, appliedPromo: null });
      },

      applyPromo: (code) => {
        const { promoCodes } = get();
        const promo = promoCodes.find(p => p.code === code && p.active);
        if (!promo) return { ok: false, message: 'كود غير صالح' };
        set({ appliedPromo: code });
        return { ok: true, message: `تم تطبيق خصم ${promo.percentOff}%` };
      },

      removePromo: () => set({ appliedPromo: null }),

      placeOrder: async () => {
        const { cart, cartRestaurantId, appliedPromo, user, restaurants, dishes, promoCodes } = get();
        if (cart.length === 0) return { ok: false, message: 'السلة فارغة' };
        if (!cartRestaurantId) return { ok: false, message: 'لم يتم تحديد مطعم' };
        if (!user) return { ok: false, message: 'يجب تسجيل الدخول' };
        const restaurant = restaurants.find(r => r.id === cartRestaurantId);
        if (!restaurant || !restaurant.active) return { ok: false, message: 'المطعم غير متاح' };
        
        const { subtotal, discount, deliveryFee, total } = calcTotals(
          cart,
          dishes,
          appliedPromo,
          promoCodes,
          restaurant.deliveryFee
        );

        const items = cart.map(c => {
          const dish = dishes.find(d => d.id === c.dishId);
          return {
            dishId: c.dishId,
            name: dish?.name || 'غير معروف',
            price: dish?.price || 0,
            quantity: c.quantity
          };
        });

        const newOrder: Omit<Order, 'id'> = {
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          items,
          subtotal,
          discount,
          deliveryFee,
          total,
          promoCode: appliedPromo,
          status: 'Pending',
          createdAt: Date.now(),
          customerName: user.displayName || user.phone,
          customerPhone: user.phone,
          deliveryAddress: user.address || 'عنوان غير محدد',
          userId: user.uid,
        };

        try {
          const result = await createOrderFirestore(newOrder);
          if (!result.success) return { ok: false, message: 'فشل إنشاء الطلب' };
          const orderWithId: Order = { ...newOrder, id: result.id! };
          set(state => ({
            orders: [orderWithId, ...state.orders],
            activeOrder: orderWithId,
            cart: [],
            cartRestaurantId: null,
            appliedPromo: null
          }));
          return { ok: true, orderId: result.id };
        } catch (error: any) {
          return { ok: false, message: error.message };
        }
      },

      updateOrderStatus: async (orderId, status) => {
        try {
          const result = await updateOrderStatusFirestore(orderId, status);
          if (!result.success) return { ok: false, message: 'فشل التحديث' };
          set(state => ({
            orders: state.orders.map(o =>
              o.id === orderId ? { ...o, status, updatedAt: Date.now() } : o
            )
          }));
          const { activeOrder } = get();
          if (activeOrder && activeOrder.id === orderId) {
            set({ activeOrder: { ...activeOrder, status, updatedAt: Date.now() } });
          }
          return { ok: true };
        } catch (error: any) {
          return { ok: false, message: error.message };
        }
      },

      assignDriverToOrder: async (orderId, driverId) => {
        try {
          const driver = get().drivers.find(d => d.id === driverId);
          if (!driver) return { ok: false, message: 'السائق غير موجود' };

          // تحديث في Firestore
          const ref = doc(db, 'orders', orderId);
          await updateDoc(ref, {
            courierId: driverId,
            driver: driver,
            status: 'OutForDelivery',
            updatedAt: serverTimestamp()
          });

          // تحديث الحالة المحلية
          set(state => ({
            orders: state.orders.map(o =>
              o.id === orderId
                ? { ...o, courierId: driverId, driver, status: 'OutForDelivery' }
                : o
            )
          }));

          const { activeOrder } = get();
          if (activeOrder && activeOrder.id === orderId) {
            set({
              activeOrder: { ...activeOrder, courierId: driverId, driver, status: 'OutForDelivery' }
            });
          }
          return { ok: true };
        } catch (error: any) {
          return { ok: false, message: error.message };
        }
      },

      setActiveOrder: (order) => set({ activeOrder: order }),

      getDish: (dishId) => get().dishes.find(d => d.id === dishId),
      getRestaurant: (id) => get().restaurants.find(r => r.id === id),
      getDishesByRestaurant: (restaurantId) => get().dishes.filter(d => d.restaurantId === restaurantId),

      getCartTotal: () => {
        const { cart, dishes, appliedPromo, promoCodes, cartRestaurantId, restaurants } = get();
        const restaurant = restaurants.find(r => r.id === cartRestaurantId);
        const deliveryFee = restaurant ? restaurant.deliveryFee : 0;
        return calcTotals(cart, dishes, appliedPromo, promoCodes, deliveryFee);
      },

      updateActiveOrderStatus: (status) => {
        const { activeOrder } = get();
        if (activeOrder) {
          set({ activeOrder: { ...activeOrder, status } });
        }
      },

      toggleRestaurantActive: async (id) => {
        const restaurant = get().restaurants.find(r => r.id === id);
        if (!restaurant) return;
        await toggleRestaurantActiveFirestore(id, !restaurant.active);
        // التحديث سيكون تلقائياً عبر onSnapshot
      },

      addRestaurant: async (restaurant) => {
        const id = await addRestaurantFirestore(restaurant);
        // التحديث سيكون تلقائياً عبر onSnapshot
        return id;
      },
    }),
    {
      name: 'zest-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        cart: state.cart,
        cartRestaurantId: state.cartRestaurantId,
        appliedPromo: state.appliedPromo,
      }),
    }
  )
);
