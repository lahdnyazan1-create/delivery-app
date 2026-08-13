import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

interface PlaceOrderItem { dishId: string; quantity: number; notes?: string; selectedAddons?: { id: string; name: string; price: number }[]; }
interface PlaceOrderInput {
  restaurantId: string; items: PlaceOrderItem[]; promoCode?: string | null; idempotencyKey?: string;
  zoneId: string; deliveryAddressDetails: string; orderNotes?: string; paymentMethod?: string;
  customerLat?: number | null; customerLng?: number | null;
}

export const placeOrder = onCall<PlaceOrderInput>(
  { region: "europe-west1", memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول");

    const { restaurantId, items, promoCode, idempotencyKey, zoneId, deliveryAddressDetails } = request.data || {};
    if (!restaurantId || !Array.isArray(items) || items.length === 0 || !zoneId) throw new HttpsError("invalid-argument", "بيانات الطلب غير مكتملة");

    // ✅ حل مشكلة Idempotency: التحقق قبل بدء المعاملة
    if (idempotencyKey) {
      const idemSnap = await db.doc(`idempotencyKeys/${idempotencyKey}`).get();
      if (idemSnap.exists) throw new HttpsError("already-exists", "تم معالجة هذا الطلب مسبقاً");
    }

    const result = await db.runTransaction(async (t) => {
      const userRef = db.doc(`users/${uid}`);
      const userSnap = await t.get(userRef);
      if (!userSnap.exists) throw new HttpsError("failed-precondition", "الملف الشخصي غير موجود");
      const userData = userSnap.data()!;

      const restaurantRef = db.doc(`restaurants/${restaurantId}`);
      const restaurantSnap = await t.get(restaurantRef);
      if (!restaurantSnap.exists || restaurantSnap.data()?.active !== true) throw new HttpsError("failed-precondition", "المطعم غير متاح حالياً");
      const restaurant = restaurantSnap.data()!;

      const zoneRef = db.doc(`zones/${zoneId}`);
      const zoneSnap = await t.get(zoneRef);
      if (!zoneSnap.exists || zoneSnap.data()?.active !== true) throw new HttpsError("failed-precondition", "منطقة التوصيل غير متاحة");
      const zone = zoneSnap.data()!;

      const dishIds = [...new Set(items.map((i) => i.dishId))];
      const dishSnaps = await t.getAll(...dishIds.map((id) => db.doc(`dishes/${id}`)));
      const dishMap = new Map();
      dishSnaps.forEach((snap) => { if (snap.exists) dishMap.set(snap.id, snap.data()!); });

      const orderItems = [];
      let subtotal = 0;

      for (const item of items) {
        const dish = dishMap.get(item.dishId);
        const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0));
        if (!dish) throw new HttpsError("invalid-argument", `طبق غير موجود: ${item.dishId}`);
        if (dish.restaurantId !== restaurantId) throw new HttpsError("invalid-argument", "الطبق لا يتبع هذا المطعم");
        if (dish.available !== true) throw new HttpsError("failed-precondition", `الطبق غير متوفر: ${dish.name}`);

        let addonsPrice = 0;
        if (item.selectedAddons && Array.isArray(item.selectedAddons)) {
          addonsPrice = item.selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
        }
        subtotal += (dish.price + addonsPrice) * quantity;
        orderItems.push({ dishId: item.dishId, name: dish.name, price: dish.price, quantity, notes: item.notes || "", selectedAddons: item.selectedAddons || [], addonsPrice });
      }

      let discount = 0;
      let validatedPromoCode = null;
      if (promoCode) {
        const promoRef = db.doc(`promoCodes/${promoCode}`);
        const promoSnap = await t.get(promoRef);
        if (promoSnap.exists && promoSnap.data()?.active === true) {
          const promo = promoSnap.data()!;
          // ✅ منع إساءة استخدام الخصم: التحقق إذا استخدمه المستخدم مسبقاً
          if (promo.usedBy && Array.isArray(promo.usedBy) && promo.usedBy.includes(uid)) {
            throw new HttpsError("failed-precondition", "لقد قمت باستخدام كود الخصم هذا مسبقاً");
          }
          discount = (subtotal * (promo.percentOff || 0)) / 100;
          validatedPromoCode = promoCode;
        }
      }

      const deliveryFee = zone.deliveryFee || 0;
      const total = Math.max(0, subtotal - discount) + deliveryFee;
      const orderRef = db.collection("orders").doc();
      const now = FieldValue.serverTimestamp();

      const newOrder = {
        restaurantId, restaurantName: restaurant.name, items: orderItems, subtotal, discount, deliveryFee, total,
        promoCode: validatedPromoCode, status: "Pending", createdAt: now, updatedAt: now,
        customerName: userData.displayName || userData.phone, customerPhone: userData.phone,
        deliveryAddress: userData.address || deliveryAddressDetails, deliveryAddressDetails, zoneId, userId: uid,
      };

      t.set(orderRef, newOrder);
      
      if (idempotencyKey) t.set(db.doc(`idempotencyKeys/${idempotencyKey}`), { createdAt: now, uid, orderId: orderRef.id });
      
      // ✅ تسجيل من استخدم الكود
      if (validatedPromoCode) {
        t.update(db.doc(`promoCodes/${validatedPromoCode}`), { usedBy: FieldValue.arrayUnion(uid) });
      }

      return { orderId: orderRef.id, order: newOrder };
    });

    return { ok: true, orderId: result.orderId, order: result.order };
  }
);

// ✅ State Machine: منع القفز العشوائي بين الحالات
const validTransitions: Record<string, string[]> = {
  "Pending": ["Accepted", "Cancelled"],
  "Accepted": ["Preparing", "Cancelled"],
  "Preparing": ["Ready"],
  "Ready": ["OutForDelivery"],
  "OutForDelivery": ["Delivered", "Cancelled"],
  "Delivered": [],
  "Cancelled": []
};

export const updateOrderStatus = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "غير مصرح");

    const { orderId, newStatus } = request.data;
    const orderRef = db.doc(`orders/${orderId}`);
    const orderSnap = await orderRef.get();
    
    if (!orderSnap.exists) throw new HttpsError("not-found", "الطلب غير موجود");
    
    const currentStatus = orderSnap.data()?.status;
    const allowed = validTransitions[currentStatus] || [];
    
    if (!allowed.includes(newStatus)) {
      throw new HttpsError("failed-precondition", `لا يمكن تغيير الحالة من ${currentStatus} إلى ${newStatus}`);
    }

    if (newStatus === "Delivered") {
      const orderData = orderSnap.data();
      if (orderData?.courierId) {
        await db.doc(`driverWallets/${orderData.courierId}`).set({
          balance: FieldValue.increment(orderData.total),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }

    await orderRef.update({ status: newStatus, updatedAt: FieldValue.serverTimestamp() });
    return { ok: true };
  }
);

export const settleDriverCash = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "غير مصرح");

    const { driverId } = request.data;
    const userSnap = await db.doc(`users/${uid}`).get();
    if (userSnap.data()?.role !== 'admin') throw new HttpsError("permission-denied", "الإدارة فقط");

    await db.doc(`driverWallets/${driverId}`).set({ balance: 0, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  }
);
