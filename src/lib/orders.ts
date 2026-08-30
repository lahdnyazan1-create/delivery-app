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
  paymentMethod?: PaymentMethod;
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
  paymentMethod?: PaymentMethod;
  customerLat?: number | null;
  customerLng?: number | null;
  idempotencyKey?: string;
}): Promise<{ ok: true; orderId: string; order: Order } | { ok: false; message: string }> {
  const { restaurantId, cart, promoCode = null, zoneId, deliveryAddressDetails, orderNotes, paymentMethod, customerLat = null, customerLng = null, idempotencyKey } = params;

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

// ----------------------------------------------------------------------------
// ✅ التحقق من كود خصم — بديل قراءة مجموعة promoCodes من العميل
// ----------------------------------------------------------------------------

const checkPromoFn = httpsCallable<{ code: string }, { ok: boolean; code: string; percentOff: number }>(
  functionsRegional,
  "checkPromo",
);

export async function checkPromoCode(
  code: string,
): Promise<{ ok: true; percentOff: number } | { ok: false; message: string }> {
  try {
    const res = await checkPromoFn({ code });
    return { ok: true, percentOff: res.data.percentOff };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "تعذّر التحقق من الكود") };
  }
}

// ----------------------------------------------------------------------------
// ✅ نظام كود الإحالة — أولوية استلام الطلب لسائق مفضل
// ----------------------------------------------------------------------------

const rateOrderFn = httpsCallable<
  { orderId: string; stars: number; comment?: string },
  { ok: boolean; restaurantId: string }
>(functionsRegional, "rateOrder");

/** تقييم طلب مُسلَّم (نجوم 1-5 + تعليق اختياري) — مرة واحدة لكل طلب */
export async function rateOrder(
  orderId: string,
  stars: number,
  comment?: string,
): Promise<{ ok: true; restaurantId: string } | { ok: false; message: string }> {
  try {
    const res = await rateOrderFn({ orderId, stars, comment: comment?.trim() || "" });
    return { ok: true, restaurantId: res.data.restaurantId };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "تعذّر إرسال التقييم") };
  }
}

export interface RestaurantRatingEntry {
  id: string;
  stars: number;
  comment: string;
  createdAt: number;
  customerName: string;
}

const getRatingsFn = httpsCallable<
  { restaurantId: string },
  { ok: boolean; ratings: RestaurantRatingEntry[] }
>(functionsRegional, "getRestaurantRatings");

/** آخر تقييمات مطعم مع تعليقاتها وأسماء أصحابها */
export async function getRestaurantRatings(
  restaurantId: string,
): Promise<{ ok: true; ratings: RestaurantRatingEntry[] } | { ok: false; message: string }> {
  try {
    const res = await getRatingsFn({ restaurantId });
    return { ok: true, ratings: res.data.ratings || [] };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "تعذّر جلب التقييمات") };
  }
}

const generateReferralFn = httpsCallable<Record<string, never>, { ok: boolean; referralCode: string }>(
  functionsRegional,
  "generateCourierReferralCode",
);

/** يجلب كود دعوة السائق أو يولّده أول مرة (للسائق المسجل فقط) */
export async function getMyReferralCode(): Promise<{ ok: boolean; referralCode?: string; message?: string }> {
  try {
    const res = await generateReferralFn({});
    return { ok: true, referralCode: res.data.referralCode };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "تعذّر توليد الكود") };
  }
}

const respondInviteFn = httpsCallable<{ orderId: string; accept: boolean }, { ok: boolean }>(
  functionsRegional,
  "respondToCourierInvite",
);

/** قبول/رفض دعوة أولوية الاستلام الموجهة للسائق */
export async function respondToCourierInvite(
  orderId: string,
  accept: boolean,
): Promise<{ ok: boolean; message?: string }> {
  try {
    await respondInviteFn({ orderId, accept });
    return { ok: true, message: accept ? "تم قبول الدعوة" : "تم رفض الدعوة" };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "تعذّر تنفيذ الرد") };
  }
}

const applyReferralFn = httpsCallable<{ code: string }, { ok: boolean; courierName?: string }>(
  functionsRegional,
  "applyReferralCode",
);

/**
 * ربط كود دعوة الزبون بحسابه — مرة واحدة عند التسجيل لأول مرة.
 * بعده تُوجَّه كل طلبات الزبون تلقائياً للشوفير صاحب الكود.
 */
export async function applyReferralCode(
  code: string,
): Promise<{ ok: true; courierName?: string } | { ok: false; message: string }> {
  try {
    const res = await applyReferralFn({ code: code.trim().toUpperCase() });
    return { ok: true, courierName: res.data.courierName };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "تعذّر ربط كود الدعوة") };
  }
}

// ----------------------------------------------------------------------------
// ✅ "اطلب مندوب" — المطعم يطلب مندوب دلفري لطلب جاهز
// ----------------------------------------------------------------------------

const requestCourierFn = httpsCallable<{ orderId: string }, { ok: boolean; notified: number }>(
  functionsRegional,
  "requestCourier",
);

export async function requestCourierForOrder(
  orderId: string,
): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await requestCourierFn({ orderId });
    return { ok: true, message: `تم إرسال الطلب إلى ${res.data.notified} مندوب 🛵` };
  } catch (error: unknown) {
    return { ok: false, message: extractErrorMessage(error, "تعذّر إرسال الطلب") };
  }
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return fallback;
}
