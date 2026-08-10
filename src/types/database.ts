// src/types/database.ts
// ============================================================================
// تمت إضافة: Zone, DriverWallet, PaymentMethod, STATUS_TRANSITIONS
// تم توسيع: UserRole, Order (zoneId, deliveryAddressDetails, paymentMethod...)
// تم توسيع: OrderStatus لإضافة "Accepted" (لتطابق خط سير الحالات المطلوب)
// ============================================================================

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
  /**
   * @deprecated لا تُستخدم بعد الآن لحساب رسوم التوصيل الفعلية.
   * الرسوم أصبحت تُجلب ديناميكياً من zones/{zoneId} داخل placeOrder.
   * أبقيناها كقيمة احتياطية/تاريخية فقط لعرضها في واجهات قديمة إن لزم.
   */
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

// ---------------- Zones (جديد) ----------------
export interface Zone {
  id: string;
  name: string;
  /** رسوم التوصيل الثابتة لهذه المنطقة — هذا هو مصدر الحقيقة الوحيد الآن */
  deliveryFee: number;
  estimatedMinutes?: number;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

// ---------------- Driver Wallets (جديد) ----------------
export interface DriverWallet {
  driverId: string;
  /** إجمالي الكاش المتراكم بيد المندوب من طلبات الدفع عند الاستلام */
  totalCashInHand: number;
  /** عدد الطلبات النقدية التي سُلّمت منذ آخر تسوية */
  cashOrdersSinceSettlement: number;
  /** آخر مرة تمت فيها تسوية الحساب (تصفير الكاش) من الإدارة */
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

/**
 * خريطة الانتقالات المسموحة رسمياً بين الحالات.
 * تُستخدم في updateOrderStatus (السيرفر) وأيضاً يمكن استيرادها في الواجهة
 * لتعطيل الخيارات غير المسموحة في الـ <select> بدل الاعتماد على القائمة الكاملة.
 */
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Accepted", "Cancelled"],
  Accepted: ["Preparing", "Cancelled"],
  Preparing: ["Ready", "Cancelled"],
  Ready: ["OutForDelivery", "Cancelled"],
  OutForDelivery: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

export interface OrderItem {
  dishId?: string;
  id?: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
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

  /** @deprecated استُبدل بـ zoneId + deliveryAddressDetails */
  deliveryAddress: string;

  /** معرّف منطقة التوصيل — يُستخدم لجلب رسوم التوصيل من zones/{zoneId} */
  zoneId: string;
  /** تفاصيل العنوان التي يكتبها المستخدم (اسم الشارع، رقم المبنى...) */
  deliveryAddressDetails: string;

  /** ملاحظات عامة يكتبها العميل للمطعم أو السائق */
  orderNotes?: string;

  /**
   * إحداثيات GPS اختيارية للعميل (من صفحة البروفايل أو من السلة مباشرة).
   * تُستخدم لزيادة موثوقية تحديد الموقع للمندوب، بالإضافة للعنوان النصي
   * وليس بدلاً عنه — النص يبقى مطلوباً دائماً.
   */
  customerLat?: number | null;
  customerLng?: number | null;

  paymentMethod: PaymentMethod;

  /** طابع زمني عند وصول الطلب فعلياً — يُملأ فقط عبر updateOrderStatus */
  deliveredAt?: number | null;
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
