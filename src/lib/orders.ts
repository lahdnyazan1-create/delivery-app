// src/lib/orders.ts
// ============================================================================
// غلاف نظيف لاستدعاء Cloud Functions الخاصة بدورة حياة الطلب من مكوّنات
// Next.js (Client Components). يُستخدم بدل الكتابة المباشرة على Firestore
// عبر updateDoc/setDoc التي كانت موجودة سابقاً في lib/firestore.ts +
// useOrderStore.ts (claimOrder/assignDriverToOrder/updateOrderStatus).
//
// ⚠️ ملاحظة مهمة: الدوال منشورة على region "europe-west1"، لذا يجب الحصول
// على instance من Functions محدَّد الـ region، وليس الافتراضي (us-central1)
// كما كان يحدث سابقاً في lib/firebase.ts.
// ============================================================================

import { getFunctions, httpsCallable } from "firebase/functions";
import app from "./firebase";
import type {
  Order,
  OrderStatus,
  CartItem,
  PaymentMethod,
} from "@/types/database";

const FUNCTIONS_REGION = "europe-west1";
const functionsRegional = getFunctions(app, FUNCTIONS_REGION);

// ----------------------------------------------------------------------------
// placeOrder
// ----------------------------------------------------------------------------

export interface PlaceOrderPayload {
  restaurantId: string;
  items: { dishId: string; quantity: number; notes?: string }[];
  promoCode?: string | null;
  idempotencyKey: string;
  zoneId: string;
  deliveryAddressDetails: string;
  orderNotes?: string;
  paymentMethod?: PaymentMethod;
  customerLat?: number | null;
  customerLng?: number | null;
}

export interface PlaceOrderResponse {
  ok: boolean;
  orderId: string;
  order: Order;
}

const placeOrderFn = httpsCallable<PlaceOrderPayload, PlaceOrderResponse>(
  functionsRegional,
  "placeOrder",
);

/**
 * ينشئ طلباً جديداً عبر placeOrder Cloud Function.
 * يبني idempotencyKey فريداً تلقائياً (UUID) لتفادي تكرار الطلب عند إعادة
 * الإرسال (double-tap / إعادة محاولة الشبكة)، بدل الاعتماد على Date.now()
 * وحده كما في التنفيذ السابق.
 */
export async function placeOrder(params: {
  restaurantId: string;
  cart: CartItem[];
  promoCode?: string | null;
  zoneId: string;
  deliveryAddressDetails: string;
  orderNotes?: string;
  paymentMethod?: PaymentMethod;
  customerLat?: number | null;
  customerLng?: number | null;
  /** مرّر نفس المفتاح عند إعادة محاولة نفس عملية الدفع بالضبط */
  idempotencyKey?: string;
}): Promise<
  | { ok: true; orderId: string; order: Order }
  | { ok: false; message: string }
> {
  const {
    restaurantId,
    cart,
    promoCode = null,
    zoneId,
    deliveryAddressDetails,
    orderNotes,
    paymentMethod = "CASH",
    customerLat = null,
    customerLng = null,
    idempotencyKey,
  } = params;

  if (cart.length === 0) return { ok: false, message: "السلة فارغة" };
  if (!restaurantId) return { ok: false, message: "لم يتم تحديد مطعم" };
  if (!zoneId) return { ok: false, message: "يجب اختيار منطقة التوصيل" };
  if (!deliveryAddressDetails || deliveryAddressDetails.trim().length < 3) {
    return { ok: false, message: "يرجى إدخال تفاصيل العنوان" };
  }

  try {
    const response = await placeOrderFn({
      restaurantId,
      items: cart.map((c) => ({ dishId: c.dishId, quantity: c.quantity, notes: c.notes || "" })),
      promoCode,
      idempotencyKey: idempotencyKey || generateIdempotencyKey(),
      zoneId,
      deliveryAddressDetails: deliveryAddressDetails.trim(),
      orderNotes: orderNotes?.trim() || "",
      paymentMethod,
      customerLat,
      customerLng,
    });

    const { orderId, order } = response.data;
    return { ok: true, orderId, order };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "فشل إنشاء الطلب") };
  }
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // fallback بيئات لا تدعم crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ----------------------------------------------------------------------------
// updateOrderStatus
// ----------------------------------------------------------------------------

export interface UpdateOrderStatusPayload {
  orderId: string;
  newStatus: OrderStatus;
  targetDriverId?: string;
}

export interface UpdateOrderStatusResponse {
  ok: boolean;
}

const updateOrderStatusFn = httpsCallable<
  UpdateOrderStatusPayload,
  UpdateOrderStatusResponse
>(functionsRegional, "updateOrderStatus");

/**
 * يستبدل كل الاستدعاءات المباشرة القديمة:
 * - updateOrderStatus() في lib/firestore.ts (كانت تكتب مباشرة على Firestore)
 * - claimOrder() و assignDriverToOrder() في useOrderStore.ts
 * كلها الآن تمر عبر هذه الدالة الواحدة المحمية بالكامل من السيرفر.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
): Promise<{ ok: boolean; message?: string }> {
  try {
    await updateOrderStatusFn({ orderId, newStatus });
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "فشل تحديث الحالة") };
  }
}

/** اختصار مخصص لاستلام مندوب لطلب متاح (Ready -> OutForDelivery) */
export async function claimOrder(
  orderId: string,
): Promise<{ ok: boolean; message: string }> {
  const result = await updateOrderStatus(orderId, "OutForDelivery");
  return {
    ok: result.ok,
    message: result.ok ? "تم استلام الطلب" : result.message || "فشل الاستلام",
  };
}

/** اختصار مخصص لإسناد الإدارة لطلب لمندوب محدد (Ready -> OutForDelivery) */
export async function assignDriverToOrder(
  orderId: string,
  driverId: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    await updateOrderStatusFn({
      orderId,
      newStatus: "OutForDelivery",
      targetDriverId: driverId,
    });
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "فشل إسناد المندوب") };
  }
}

// ----------------------------------------------------------------------------
// settleDriverCash
// ----------------------------------------------------------------------------

export interface SettleDriverCashPayload {
  driverId: string;
}

const settleDriverCashFn = httpsCallable<
  SettleDriverCashPayload,
  { ok: boolean }
>(functionsRegional, "settleDriverCash");

/** تصفير محفظة كاش المندوب — للإدارة فقط (تُفرَض الصلاحية داخل الدالة نفسها) */
export async function settleDriverCash(
  driverId: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    await settleDriverCashFn({ driverId });
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "فشلت التسوية") };
  }
}

// ----------------------------------------------------------------------------
// Helper
// ----------------------------------------------------------------------------

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return fallback;
}
