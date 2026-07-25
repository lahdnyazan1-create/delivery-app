export type UserRole = "customer" | "admin" | "courier";

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
  name: string;
  cuisineId?: string;
  cuisine?: string;
  rating: number;
  deliveryFee: number;
  etaMinutes: number;
  coverGradient?: string;
  logoGradient?: string;
  image?: string;
  tagline?: string;
  address?: string;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
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

export type OrderStatus =
  | "Pending"
  | "Preparing"
  | "OutForDelivery"
  | "Delivered"
  | "Cancelled";

export interface OrderItem {
  dishId?: string;
  id?: string;
  name: string;
  price: number;
  quantity: number;
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
  courierId?: string;
  driver?: Driver | null;
  createdAt: number;
  updatedAt?: number;
  etaMinutes?: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
}

export interface PromoCode {
  code: string;
  percentOff: number;
  active: boolean;
}

export interface CartItem {
  dishId: string;
  quantity: number;
  notes?: string;
}

export type ActiveOrder = Order;
