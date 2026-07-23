// src/types/database.ts

export type UserRole = "customer" | "admin" | "courier";

// 1. المستخدمين (Users / Profiles)
export interface UserProfile {
  uid: string;
  phone: string;
  displayName?: string;
  role: UserRole;
  address?: string;
  createdAt: number;
}

// 2. المطاعم (Restaurants)
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
}

// 3. الأطباق والوجبات (Dishes)
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
}

// 4. الشوفرية / الكباتن (Drivers / Couriers)
export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plateNumber: string;
  isAvailable?: boolean;
}

// 5. حالات الطلب (Order Statuses)
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

// 6. الطلبات (Orders)
export interface Order {
  id: string;
  userId?: string;
  restaurantId?: string;
  restaurantName: string;
  items: OrderItem[];
  subtotal?: number;
  discount?: number;
  deliveryFee?: number;
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

// 7. أكواد الخصم (Promo Codes)
export interface PromoCode {
  code: string;
  percentOff: number;
  active: boolean;
}
