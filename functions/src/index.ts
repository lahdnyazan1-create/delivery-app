import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

interface PlaceOrderItem {
  dishId: string;
  quantity: number;
}

interface PlaceOrderInput {
  restaurantId: string;
  items: PlaceOrderItem[];
  promoCode?: string | null;
  idempotencyKey?: string; // لمنع الطلبات المكررة
}

export const placeOrder = onCall<PlaceOrderInput>(
  {
    region: "europe-west1", // عدّل حسب منطقتك
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "يجب تسجيل الدخول لإتمام الطلب");
    }

    const { restaurantId, items, promoCode, idempotencyKey } =
      request.data || {};

    if (!restaurantId || !Array.isArray(items) || items.length === 0) {
      throw new HttpsError("invalid-argument", "بيانات الطلب غير مكتملة");
    }

    if (items.length > 50) {
      throw new HttpsError("invalid-argument", "لا يمكن طلب أكثر من 50 صنفاً");
    }

    const result = await db.runTransaction(async (t) => {
      // ✅ فحص Idempotency عبر Firestore (يعمل عبر instances متعددة)
      let idemRef: FirebaseFirestore.DocumentReference | null = null;
      if (idempotencyKey) {
        idemRef = db.doc(`idempotencyKeys/${idempotencyKey}`);
        const idemSnap = await t.get(idemRef);
        if (idemSnap.exists) {
          throw new HttpsError("already-exists", "تم معالجة هذا الطلب مسبقاً");
        }
      }

      // 1) المستخدم
      const userRef = db.doc(`users/${uid}`);
      const userSnap = await t.get(userRef);
      if (!userSnap.exists) {
        throw new HttpsError("failed-precondition", "الملف الشخصي غير موجود");
      }
      const userData = userSnap.data()!;

      // 2) المطعم
      const restaurantRef = db.doc(`restaurants/${restaurantId}`);
      const restaurantSnap = await t.get(restaurantRef);
      if (!restaurantSnap.exists || restaurantSnap.data()?.active !== true) {
        throw new HttpsError("failed-precondition", "المطعم غير متاح حالياً");
      }
      const restaurant = restaurantSnap.data()!;

      // 3) الأطباق — السعر الحقيقي من Firestore
      const dishIds = [...new Set(items.map((i) => i.dishId))];
      const dishRefs = dishIds.map((id) => db.doc(`dishes/${id}`));
      const dishSnaps = await t.getAll(...dishRefs);

      const dishMap = new Map<string, FirebaseFirestore.DocumentData>();
      dishSnaps.forEach((snap) => {
        if (snap.exists) dishMap.set(snap.id, snap.data()!);
      });

      const orderItems: {
        dishId: string;
        name: string;
        price: number;
        quantity: number;
      }[] = [];
      let subtotal = 0;

      for (const item of items) {
        const dish = dishMap.get(item.dishId);
        const quantity = Math.max(1, Math.floor(Number(item.quantity) || 0));

        if (!dish) {
          throw new HttpsError(
            "invalid-argument",
            `طبق غير موجود: ${item.dishId}`,
          );
        }
        if (dish.restaurantId !== restaurantId) {
          throw new HttpsError("invalid-argument", "الطبق لا يتبع هذا المطعم");
        }
        if (dish.available !== true) {
          throw new HttpsError(
            "failed-precondition",
            `الطبق غير متوفر حالياً: ${dish.name}`,
          );
        }
        if (quantity <= 0 || quantity > 50) {
          throw new HttpsError("invalid-argument", "كمية غير منطقية");
        }

        subtotal += dish.price * quantity;
        orderItems.push({
          dishId: item.dishId,
          name: dish.name,
          price: dish.price,
          quantity,
        });
      }

      // 4) كود الخصم
      let discount = 0;
      let validatedPromoCode: string | null = null;
      if (promoCode) {
        const promoRef = db.doc(`promoCodes/${promoCode}`);
        const promoSnap = await t.get(promoRef);
        if (promoSnap.exists && promoSnap.data()?.active === true) {
          const promo = promoSnap.data()!;
          discount = (subtotal * (promo.percentOff || 0)) / 100;
          validatedPromoCode = promoCode;
        }
      }

      const deliveryFee =
        orderItems.length > 0 ? restaurant.deliveryFee || 0 : 0;
      const total = Math.max(0, subtotal - discount) + deliveryFee;

      const orderRef = db.collection("orders").doc();
      const now = FieldValue.serverTimestamp();

      const newOrder = {
        restaurantId,
        restaurantName: restaurant.name,
        items: orderItems,
        subtotal,
        discount,
        deliveryFee,
        total,
        promoCode: validatedPromoCode,
        status: "Pending" as const,
        createdAt: now,
        updatedAt: now,
        customerName: userData.displayName || userData.phone,
        customerPhone: userData.phone,
        deliveryAddress: userData.address || "عنوان غير محدد",
        userId: uid,
      };

      t.set(orderRef, newOrder);
      if (idemRef) {
        t.set(idemRef, { createdAt: now, uid, orderId: orderRef.id });
      }

      return { orderId: orderRef.id, order: newOrder };
    });

    return { ok: true, orderId: result.orderId, order: result.order };
  },
);
