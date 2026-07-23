export type UserRole = "customer" | "admin" | "courier";

export interface UserProfile {
  uid: string;
  phone: string;
  displayName?: string;
  role: UserRole;
  address?: string;
  createdAt: number;
}

export type OrderStatus = "pending" | "preparing" | "on_the_way" | "delivered" | "cancelled";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id?: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  courierId?: string;
  createdAt: number;
  updatedAt: number;
}
