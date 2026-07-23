"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useSyncExternalStore,
} from "react";

import {
  Restaurant,
  Dish,
  Driver,
  Order,
  OrderItem,
  OrderStatus,
  PromoCode,
  UserProfile,
} from "@/types/database";

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export interface CartItem {
  dishId: string;
  quantity: number;
  notes?: string;
}

// ==========================================
// 2. STATE & ACTIONS
// ==========================================

interface AppState {
  restaurants: Restaurant[];
  dishes: Dish[];
  drivers: Driver[];
  cart: CartItem[];
  cartRestaurantId: string | null;
  appliedPromo: string | null;
  promoCodes: PromoCode[];
  orders: Order[];
  user: UserProfile;
}

type Action =
  | { type: "ADD_TO_CART"; payload: { dishId: string; restaurantId: string } }
  | { type: "REMOVE_FROM_CART"; payload: { dishId: string } }
  | { type: "UPDATE_QUANTITY"; payload: { dishId: string; quantity: number } }
  | { type: "CLEAR_CART" }
  | { type: "APPLY_PROMO"; payload: string }
  | { type: "REMOVE_PROMO" }
  | { type: "CREATE_ORDER"; payload: Order }
  | { type: "ASSIGN_DRIVER"; payload: { orderId: string; driver: Driver } }
  | { type: "UPDATE_ORDER_STATUS"; payload: { orderId: string; status: OrderStatus } }
  | { type: "UPDATE_USER_PROFILE"; payload: Partial<UserProfile> }
  | { type: "ADD_RESTAURANT"; payload: Restaurant }
  | { type: "TOGGLE_RESTAURANT_ACTIVE"; payload: string };

// ==========================================
// 3. INITIAL MOCK DATA
// ==========================================

const INITIAL_DRIVERS: Driver[] = [
  {
    id: "drv-101",
    name: "أحمد ياسين",
    phone: "0599000111",
    vehicle: "سكوتر SYM Joymax",
    plateNumber: "6-8921-99",
  },
  {
    id: "drv-102",
    name: "محمود خليل",
    phone: "0599000222",
    vehicle: "سيارة هيونداي Getz",
    plateNumber: "6-1234-98",
  },
];

const INITIAL_RESTAURANTS: Restaurant[] = [
  {
    id: "rest-1",
    name: "Pizza Heaven",
    cuisine: "إيطالي / بيتزا",
    rating: 4.8,
    deliveryFee: 10,
    etaMinutes: 30,
    image: "/images/pizza.jpg",
    address: "الشارع الرئيسي - وسط المدينة",
    active: true,
  },
  {
    id: "rest-2",
    name: "Burger Craft",
    cuisine: "وجبات سريعة / برجر",
    rating: 4.6,
    deliveryFee: 8,
    etaMinutes: 25,
    image: "/images/burger.jpg",
    address: "شارع الجامعة",
    active: true,
  },
];

const INITIAL_DISHES: Dish[] = [
  {
    id: "dish-1",
    restaurantId: "rest-1",
    name: "بيتزا مارجريتا",
    description: "صلصة طماطم طازجة، جبنة موزاريلا، وريدان طازج",
    price: 35,
    image: "/images/margherita.jpg",
    category: "بيتزا",
    available: true,
  },
  {
    id: "dish-2",
    restaurantId: "rest-1",
    name: "بيتزا ببروني",
    description: "شرائح الببروني البقري مع جبنة الموزاريلا الغنية",
    price: 45,
    image: "/images/pepperoni.jpg",
    category: "بيتزا",
    available: true,
  },
  {
    id: "dish-3",
    restaurantId: "rest-2",
    name: "كلاسيك برجر",
    description: "شريحة بلدي 150غم، جبنة شيدر، خس، طماطم، وصلصة خاصة",
    price: 28,
    image: "/images/burger-classic.jpg",
    category: "برجر",
    available: true,
  },
];

const INITIAL_PROMOS: PromoCode[] = [
  { code: "SAVE10", percentOff: 10, active: true },
  { code: "HEAVEN20", percentOff: 20, active: true },
];

const INITIAL_STATE: AppState = {
  restaurants: INITIAL_RESTAURANTS,
  dishes: INITIAL_DISHES,
  drivers: INITIAL_DRIVERS,
  cart: [],
  cartRestaurantId: null,
  appliedPromo: null,
  promoCodes: INITIAL_PROMOS,
  orders: [],
  user: {
    uid: "user-1",
    phone: "0590000000",
    displayName: "يزن",
    role: "customer",
    address: "حي الرفيديا",
    createdAt: Date.now(),
  },
};

// ==========================================
// 4. HELPER CALCULATIONS
// ==========================================

export function calcTotals(
  cart: CartItem[],
  dishes: Dish[],
  appliedPromo: string | null,
  promoCodes: PromoCode[],
  deliveryFee: number = 0
) {
  const subtotal = cart.reduce((sum, item) => {
    const dish = dishes.find((d) => d.id === item.dishId);
    if (!dish) return sum;
    return sum + dish.price * item.quantity;
  }, 0);

  const promo = appliedPromo
    ? promoCodes.find((p) => p.code === appliedPromo && p.active)
    : null;
  const discount = promo ? (subtotal * promo.percentOff) / 100 : 0;
  const totalAfterDiscount = Math.max(0, subtotal - discount);

  const finalDeliveryFee = cart.length > 0 ? deliveryFee : 0;

  return {
    subtotal,
    discount,
    deliveryFee: finalDeliveryFee,
    total: totalAfterDiscount + finalDeliveryFee,
  };
}

// ==========================================
// 5. REDUCER
// ==========================================

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "ADD_TO_CART": {
      const { dishId, restaurantId } = action.payload;
      const isDifferentRestaurant =
        state.cartRestaurantId && state.cartRestaurantId !== restaurantId;
      const currentCart = isDifferentRestaurant ? [] : state.cart;

      const existingIndex = currentCart.findIndex((i) => i.dishId === dishId);
      let updatedCart: CartItem[];

      if (existingIndex > -1) {
        updatedCart = currentCart.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updatedCart = [...currentCart, { dishId, quantity: 1 }];
      }

      return {
        ...state,
        cart: updatedCart,
        cartRestaurantId: restaurantId,
      };
    }

    case "REMOVE_FROM_CART": {
      const updatedCart = state.cart.filter((i) => i.dishId !== action.payload.dishId);
      return {
        ...state,
        cart: updatedCart,
        cartRestaurantId: updatedCart.length === 0 ? null : state.cartRestaurantId,
        appliedPromo: updatedCart.length === 0 ? null : state.appliedPromo,
      };
    }

    case "UPDATE_QUANTITY": {
      const { dishId, quantity } = action.payload;
      if (quantity <= 0) {
        return appReducer(state, { type: "REMOVE_FROM_CART", payload: { dishId } });
      }
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.dishId === dishId ? { ...item, quantity } : item
        ),
      };
    }

    case "CLEAR_CART":
      return {
        ...state,
        cart: [],
        cartRestaurantId: null,
        appliedPromo: null,
      };

    case "APPLY_PROMO":
      return {
        ...state,
        appliedPromo: action.payload,
      };

    case "REMOVE_PROMO":
      return {
        ...state,
        appliedPromo: null,
      };

    case "CREATE_ORDER":
      return {
        ...state,
        orders: [action.payload, ...state.orders],
        cart: [],
        cartRestaurantId: null,
        appliedPromo: null,
      };

    case "ASSIGN_DRIVER":
      return {
        ...state,
        orders: state.orders.map((ord) =>
          ord.id === action.payload.orderId
            ? { ...ord, driver: action.payload.driver, courierId: action.payload.driver.id, status: "OutForDelivery" }
            : ord
        ),
      };

    case "UPDATE_ORDER_STATUS":
      return {
        ...state,
        orders: state.orders.map((ord) =>
          ord.id === action.payload.orderId
            ? { ...ord, status: action.payload.status }
            : ord
        ),
      };

    case "UPDATE_USER_PROFILE":
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case "ADD_RESTAURANT":
      return {
        ...state,
        restaurants: [action.payload, ...state.restaurants],
      };

    case "TOGGLE_RESTAURANT_ACTIVE":
      return {
        ...state,
        restaurants: state.restaurants.map((r) =>
          r.id === action.payload ? { ...r, active: !r.active } : r
        ),
      };

    default:
      return state;
  }
}

// ==========================================
// 6. CONTEXT & PROVIDER
// ==========================================

interface AppContextType {
  state: AppState;
  restaurants: Restaurant[];
  orders: Order[];
  drivers: Driver[];
  cartRestaurant: Restaurant | null;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  addToCart: (dishId: string, restaurantId: string) => void;
  removeFromCart: (dishId: string) => void;
  updateQuantity: (dishId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string) => { ok: boolean; message: string };
  removePromo: () => void;
  placeOrder: () => { ok: boolean; orderId?: string; message?: string };
  assignDriverToOrder: (orderId: string, driverId: string) => boolean;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  addRestaurant: (restaurant: Restaurant) => void;
  toggleRestaurantActive: (id: string) => void;
  getDish: (dishId: string) => Dish | undefined;
  getRestaurant: (id: string) => Restaurant | undefined;
  getDishesByRestaurant: (restaurantId: string) => Dish[];
}

const AppContext = createContext<AppContextType | null>(null);

const emptySubscribe = () => () => {};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

  const isServer = useSyncExternalStore(
    emptySubscribe,
    () => false,
    () => true
  );

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const cartRestaurant = useMemo(() => {
    if (!state.cartRestaurantId) return null;
    return state.restaurants.find((r) => r.id === state.cartRestaurantId) || null;
  }, [state.cartRestaurantId, state.restaurants]);

  const { subtotal, discount, deliveryFee, total } = useMemo(
    () =>
      calcTotals(
        state.cart,
        state.dishes,
        state.appliedPromo,
        state.promoCodes,
        cartRestaurant?.deliveryFee ?? 0
      ),
    [state.cart, state.dishes, state.appliedPromo, state.promoCodes, cartRestaurant]
  );

  // --- ACTIONS ---

  const addToCart = useCallback((dishId: string, restaurantId: string) => {
    dispatch({ type: "ADD_TO_CART", payload: { dishId, restaurantId } });
  }, []);

  const removeFromCart = useCallback((dishId: string) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: { dishId } });
  }, []);

  const updateQuantity = useCallback((dishId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { dishId, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const applyPromo = useCallback((code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = stateRef.current.promoCodes.find(
      (p) => p.code === cleanCode && p.active
    );
    if (!found) {
      return { ok: false, message: "كوبون الخصم غير فعال أو غير صحيح" };
    }
    dispatch({ type: "APPLY_PROMO", payload: cleanCode });
    return { ok: true, message: `تم تطبيق خصم ${found.percentOff}%` };
  }, []);

  const removePromo = useCallback(() => {
    dispatch({ type: "REMOVE_PROMO" });
  }, []);

  const placeOrder = useCallback(() => {
    const s = stateRef.current;
    if (s.cart.length === 0 || !s.cartRestaurantId) {
      return { ok: false, message: "السلة فارغة" };
    }

    const restaurant = s.restaurants.find((r) => r.id === s.cartRestaurantId);
    if (!restaurant) {
      return { ok: false, message: "المطعم غير متاح حالياً" };
    }

    const lines: OrderItem[] = [];
    for (const item of s.cart) {
      const dish = s.dishes.find((d) => d.id === item.dishId);
      if (dish) {
        lines.push({
          dishId: dish.id,
          name: dish.name,
          price: dish.price,
          quantity: item.quantity,
        });
      }
    }

    const totals = calcTotals(
      s.cart,
      s.dishes,
      s.appliedPromo,
      s.promoCodes,
      restaurant.deliveryFee
    );

    const randomDriver =
      s.drivers.length > 0
        ? s.drivers[Math.floor(Math.random() * s.drivers.length)]
        : null;

    const newOrder: Order = {
      id: `ord-${Date.now().toString(36)}`,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      items: lines,
      subtotal: totals.subtotal,
      discount: totals.discount,
      deliveryFee: totals.deliveryFee,
      total: totals.total,
      promoCode: s.appliedPromo,
      status: "Pending",
      createdAt: Date.now(),
      etaMinutes: restaurant.etaMinutes,
      customerName: s.user.displayName || "عميل",
      customerPhone: s.user.phone,
      deliveryAddress: s.user.address || "العنوان الأساسي",
      driver: randomDriver,
      courierId: randomDriver?.id,
    };

    dispatch({ type: "CREATE_ORDER", payload: newOrder });
    return { ok: true, orderId: newOrder.id };
  }, []);

  const assignDriverToOrder = useCallback((orderId: string, driverId: string) => {
    const s = stateRef.current;
    const driver = s.drivers.find((d) => d.id === driverId);
    if (!driver) return false;

    dispatch({
      type: "ASSIGN_DRIVER",
      payload: { orderId, driver },
    });
    return true;
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    dispatch({ type: "UPDATE_ORDER_STATUS", payload: { orderId, status } });
  }, []);

  const updateUserProfile = useCallback((profile: Partial<UserProfile>) => {
    dispatch({ type: "UPDATE_USER_PROFILE", payload: profile });
  }, []);

  const addRestaurant = useCallback((restaurant: Restaurant) => {
    dispatch({ type: "ADD_RESTAURANT", payload: restaurant });
  }, []);

  const toggleRestaurantActive = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_RESTAURANT_ACTIVE", payload: id });
  }, []);

  // --- GETTERS ---

  const getDish = useCallback(
    (dishId: string) => state.dishes.find((d) => d.id === dishId),
    [state.dishes]
  );

  const getRestaurant = useCallback(
    (id: string) => state.restaurants.find((r) => r.id === id),
    [state.restaurants]
  );

  const getDishesByRestaurant = useCallback(
    (restaurantId: string) =>
      state.dishes.filter((d) => d.restaurantId === restaurantId),
    [state.dishes]
  );

  const contextValue = useMemo(
    () => ({
      state,
      restaurants: state.restaurants,
      orders: state.orders,
      drivers: state.drivers,
      cartRestaurant,
      subtotal,
      discount,
      deliveryFee,
      total,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      applyPromo,
      removePromo,
      placeOrder,
      assignDriverToOrder,
      updateOrderStatus,
      updateUserProfile,
      addRestaurant,
      toggleRestaurantActive,
      getDish,
      getRestaurant,
      getDishesByRestaurant,
    }),
    [
      state,
      cartRestaurant,
      subtotal,
      discount,
      deliveryFee,
      total,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      applyPromo,
      removePromo,
      placeOrder,
      assignDriverToOrder,
      updateOrderStatus,
      updateUserProfile,
      addRestaurant,
      toggleRestaurantActive,
      getDish,
      getRestaurant,
      getDishesByRestaurant,
    ]
  );

  if (isServer) {
    return null;
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
