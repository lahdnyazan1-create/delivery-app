export type CuisineId = string;

export type Cuisine = {
  id: CuisineId;
  label: string;
};

export type Restaurant = {
  id: string;
  name: string;
  cuisineId: CuisineId;
  rating: number;
  etaMinutes: number;
  deliveryFee: number;
  coverGradient: string;
  logoGradient: string;
  tagline: string;
  active: boolean;
};

export type Dish = {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  gradient: string;
  isHot?: boolean;
};

export type PromoCode = {
  code: string;
  percentOff: number;
  active: boolean;
};

export type OrderStatus =
  | "Pending"
  | "Preparing"
  | "Out for Delivery"
  | "Delivered";

export type CartItem = {
  dishId: string;
  quantity: number;
};

export type OrderLineItem = {
  dishId: string;
  name: string;
  price: number;
  quantity: number;
};

export type UserProfile = {
  fullName: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  locationLabel: string;
};

export type Order = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  status: OrderStatus;
  createdAt: number;
  etaMinutes: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
};

export const ADMIN_PIN = "1234";

export const CUISINES: Cuisine[] = [
  { id: "burgers", label: "Burgers" },
  { id: "pizza", label: "Pizza" },
  { id: "other", label: "Other" },
];

export const COVER_PRESETS = [
  "from-[#FF6B35] via-[#FF8F66] to-[#1A2B4C]",
  "from-[#C4A484] via-[#2A3F66] to-[#0F1729]",
  "from-[#00C853]/70 via-[#1A2B4C] to-[#0F1729]",
  "from-[#2A3F66] via-[#1A2B4C] to-[#0F1729]",
] as const;

export const LOGO_PRESETS = [
  "from-[#FF6B35] to-[#c44a1a]",
  "from-[#00C853] to-[#1A2B4C]",
  "from-[#FF8F66] to-[#1A2B4C]",
  "from-[#C4A484] to-[#2A3F66]",
] as const;

export const INITIAL_RESTAURANTS: Restaurant[] = [
  {
    id: "flame-burger",
    name: "Flame Burger Co",
    cuisineId: "burgers",
    rating: 4.8,
    etaMinutes: 25,
    deliveryFee: 1.5,
    coverGradient: COVER_PRESETS[0],
    logoGradient: LOGO_PRESETS[0],
    tagline: "Smash burgers & fries",
    active: true,
  },
  {
    id: "nonnas",
    name: "Nonna's Kitchen",
    cuisineId: "pizza",
    rating: 4.7,
    etaMinutes: 30,
    deliveryFee: 2.0,
    coverGradient: COVER_PRESETS[1],
    logoGradient: LOGO_PRESETS[1],
    tagline: "Wood-fired Italian",
    active: true,
  },
];

export const INITIAL_DISHES: Dish[] = [
  {
    id: "fb-burger",
    restaurantId: "flame-burger",
    name: "Classic Burger",
    description: "Beef patty, cheddar, pickles, house sauce",
    price: 9.5,
    category: "Burgers",
    available: true,
    isHot: true,
    gradient: "from-[#FF6B35]/90 via-[#FF8F66]/45 to-[#1A2B4C]",
  },
  {
    id: "fb-fries",
    restaurantId: "flame-burger",
    name: "Loaded Fries",
    description: "Crispy fries, cheddar melt, jalapeños",
    price: 5.25,
    category: "Sides",
    available: true,
    isHot: true,
    gradient: "from-[#FF8F66] via-[#2A3F66] to-[#0F1729]",
  },
  {
    id: "nn-pizza",
    restaurantId: "nonnas",
    name: "Truffle Pizza",
    description: "Wood-fired crust, mozzarella, black truffle oil",
    price: 14.0,
    category: "Pizza",
    available: true,
    isHot: true,
    gradient: "from-[#FF6B35] via-[#2A3F66] to-[#0F1729]",
  },
  {
    id: "nn-pasta",
    restaurantId: "nonnas",
    name: "Pasta Alfredo",
    description: "Creamy parmesan sauce, fettuccine, cracked pepper",
    price: 11.25,
    category: "Pasta",
    available: true,
    isHot: true,
    gradient: "from-[#C4A484]/85 via-[#1A2B4C] to-[#0F1729]",
  },
];

export const INITIAL_PROMOS: PromoCode[] = [
  { code: "ZEST30", percentOff: 30, active: true },
];

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Preparing",
  "Out for Delivery",
  "Delivered",
];

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plateNumber: string;
}

export const INITIAL_DRIVERS: Driver[] = [
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
