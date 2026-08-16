import { getFunctions, httpsCallable } from "firebase/functions";
import app from "./firebase";
import type { Order, OrderStatus, CartItem, PaymentMethod } from "@/types/database";

const FUNCTIONS_REGION = "europe-west1";
const functionsRegional = getFunctions(app, FUNCTIONS_REGION);

export interface PlaceOrderPayload {
  restaurantId: string;
  items: { dishId: string; quantity: number; notes?: string; selectedAddons?: any[] }[];
  promoCode?: string | null;
  idempotencyKey: string;
  zoneId: string;
  deliveryAddressDetails: string;
  orderNotes?: string;
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

export async function placeOrder(params: {
  restaurantId: string;
  cart: CartItem[];
  promoCode?: string | null;
  zoneId: string;
  deliveryAddressDetails: string;
  orderNotes?: string;
  customerLat?: number | null;
  customerLng?: number | null;
  idempotencyKey?: string;
}): Promise<{ ok: true; orderId: string; order: Order } | { ok: false; message: string }> {
  const { restaurantId, cart, promoCode = null, zoneId, deliveryAddressDetails, orderNotes, customerLat = null, customerLng = null, idempotencyKey } = params;

  if (cart.length === 0) return { ok: false, message: "السلة فارغة" };
  if (!restaurantId) return { ok: false, message: "لم يتم تحديد مطعم" };
  if (!zoneId) return { ok: false, message: "يجب اختيار منطقة التوصيل" };
  if (!deliveryAddressDetails || deliveryAddressDetails.trim().length < 3) return { ok: false, message: "يرجى إدخال تفاصيل العنوان" };

  try {
    const response = await placeOrderFn({
      restaurantId,
      // ✅ إرسال الإضافات للسيرفر ليقوم بحساب سعرها الفعلي
      items: cart.map((c) => ({ dishId: c.dishId, quantity: c.quantity, notes: c.notes || "", selectedAddons: c.selectedAddons || [] })),
      promoCode,
      idempotencyKey: idempotencyKey || generateIdempotencyKey(),
      zoneId,
      deliveryAddressDetails: deliveryAddressDetails.trim(),
      orderNotes: orderNotes?.trim() || "",
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
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface UpdateOrderStatusPayload {
  orderId: string;
  newStatus: OrderStatus;
  targetDriverId?: string;
}

export interface UpdateOrderStatusResponse { ok: boolean; }

const updateOrderStatusFn = httpsCallable<UpdateOrderStatusPayload, UpdateOrderStatusResponse>(functionsRegional, "updateOrderStatus");

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<{ ok: boolean; message?: string }> {
  try {
    await updateOrderStatusFn({ orderId, newStatus });
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "فشل تحديث الحالة") };
  }
}

export async function claimOrder(orderId: string): Promise<{ ok: boolean; message: string }> {
  try {
    // ✅ ربط السائق بالطلب عند تغيير الحالة إلى OutForDelivery
    const updateOrderStatusFn = httpsCallable<UpdateOrderStatusPayload, UpdateOrderStatusResponse>(functionsRegional, "updateOrderStatus");
    await updateOrderStatusFn({ orderId, newStatus: "OutForDelivery" });
    return { ok: true, message: "تم استلام الطلب" };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "فشل الاستلام") };
  }
}

export async function assignDriverToOrder(orderId: string, driverId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await updateOrderStatusFn({ orderId, newStatus: "OutForDelivery", targetDriverId: driverId });
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "فشل إسناد المندوب") };
  }
}

export interface SettleDriverCashPayload { driverId: string; }
const settleDriverCashFn = httpsCallable<SettleDriverCashPayload, { ok: boolean }>(functionsRegional, "settleDriverCash");

export async function settleDriverCash(driverId: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await settleDriverCashFn({ driverId });
    return { ok: true };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "فشلت التسوية") };
  }
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return fallback;
}
