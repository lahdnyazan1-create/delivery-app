export type UserRole = "customer" | "admin" | "courier" | "vendor";

export interface UserProfile {
  uid: string;
  phone: string;
  displayName?: string;
  role: UserRole;
  address?: string;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface Restaurant {
  id: string;
  ownerId?: string;
  name: string;
  cuisineId?: string;
  cuisine?: string;
  rating: number;
  /** @deprecated استُبدل بـ zone.deliveryFee */
  deliveryFee: number;
  etaMinutes: number;
  coverGradient?: string;
  logoGradient?: string;
  image?: string;
  tagline?: string;
  promoTag?: string | null;
  address?: string;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface DishAddon {
  id: string;
  name: string;
  price: number;
}

export interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category: string;
  available: boolean;
  isHot?: boolean;
  gradient?: string;
  addons?: DishAddon[];
  createdAt?: number;
  updatedAt?: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plateNumber: string;
  isAvailable?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Zone {
  id: string;
  name: string;
  deliveryFee: number;
  estimatedMinutes?: number;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface DriverWallet {
  driverId: string;
  totalCashInHand: number;
  cashOrdersSinceSettlement: number;
  lastSettlementAt?: number | null;
  updatedAt?: number;
}

export type PaymentMethod = "CASH" | "CARD";

export type OrderStatus =
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Ready"
  | "OutForDelivery"
  | "Delivered"
  | "Cancelled";

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Accepted", "Cancelled"],
  Accepted: ["Preparing", "Cancelled"],
  Preparing: ["Ready", "Cancelled"],
  Ready: ["OutForDelivery", "Cancelled"],
  OutForDelivery: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

// ✅ إضافة selectedAddons و addonsPrice للواجهة لتطابق ما يحفظه السيرفر
export interface OrderItem {
  dishId?: string;
  id?: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  selectedAddons?: DishAddon[];
  addonsPrice?: number;
}

export interface Order {
  id: string;
  userId?: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  promoCode?: string | null;
  status: OrderStatus;
  courierId?: string | null;
  driver?: Driver | null;
  createdAt: number;
  updatedAt?: number;
  etaMinutes?: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  zoneId: string;
  deliveryAddressDetails: string;
  orderNotes?: string;
  customerLat?: number | null;
  customerLng?: number | null;
  paymentMethod: PaymentMethod;
  deliveredAt?: number | null;
}

export interface PromoCode {
  code: string;
  percentOff: number;
  active: boolean;
  usedBy?: string[];
}

export interface CartItem {
  dishId: string;
  quantity: number;
  notes?: string;
  selectedAddons?: DishAddon[];
}

export type ActiveOrder = Order;

export interface Category {
  id: string;
  label: string;
  icon: string;
  order: number;
  visible: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  gradient?: string;
  imageUrl?: string;
  order: number;
  active: boolean;
}
