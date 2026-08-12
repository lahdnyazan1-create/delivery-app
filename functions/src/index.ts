// functions/src/index.ts
// ============================================================================
// التعديلات:
// 1) placeOrder: يقبل zoneId + deliveryAddressDetails + paymentMethod،
//    ويجلب رسوم التوصيل من zones/{zoneId} داخل الـ transaction بدل restaurant.deliveryFee
// 2) updateOrderStatus (جديد): State Machine محمي بالسيرفر بالكامل + تسوية كاش المندوب
// 3) onOrderStatusChanged (جديد): trigger لإشعارات تغيّر الحالة
// 4) settleDriverCash (جديد): تصفير محفظة المندوب من قِبل الإدارة فقط
// ============================================================================

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

const REGION = "europe-west1";

type OrderStatus =
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Ready"
  | "OutForDelivery"
  | "Delivered"
  | "Cancelled";

type PaymentMethod = "CASH" | "CARD";

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Pending: ["Accepted", "Cancelled"],
  Accepted: ["Preparing", "Cancelled"],
  Preparing: ["Ready", "Cancelled"],
  Ready: ["OutForDelivery", "Cancelled"],
  OutForDelivery: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

const STATUS_MESSAGES_AR: Record<OrderStatus, string> = {
  Pending: "بانتظار موافقة المطعم",
  Accepted: "تم قبول طلبك من المطعم",
  Preparing: "المطعم يجهّز طلبك الآن",
  Ready: "طلبك جاهز بانتظار المندوب",
  OutForDelivery: "طلبك في الطريق إليك",
  Delivered: "تم تسليم طلبك، بالهنا والشفا",
  Cancelled: "تم إلغاء الطلب",
};

// ============================================================================
// 1) placeOrder
// ============================================================================

interface PlaceOrderAddon {
  id: string;
  name: string;
  price: number;
}

interface PlaceOrderItem {
  dishId: string;
  quantity: number;
  notes?: string;
  selectedAddons?: PlaceOrderAddon[];
}

interface PlaceOrderInput {
  restaurantId: string;
  items: PlaceOrderItem[];
  promoCode?: string | null;
  idempotencyKey?: string;
  zoneId: string;
  deliveryAddressDetails: string;
  orderNotes?: string;
  paymentMethod?: PaymentMethod;
  /** إحداثيات اختيارية لزيادة موثوقية تحديد الموقع — لا تُغني عن العنوان النصي */
  customerLat?: number | null;
  customerLng?: number | null;
}

export const placeOrder = onCall<PlaceOrderInput>(
  {
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "يجب تسجيل الدخول لإتمام الطلب");
    }

    const {
      restaurantId,
      items,
      promoCode,
      idempotencyKey,
      zoneId,
      deliveryAddressDetails,
      orderNotes,
      paymentMethod,
      customerLat,
      customerLng,
    } = request.data || {};

    if (!restaurantId || !Array.isArray(items) || items.length === 0) {
      throw new HttpsError("invalid-argument", "بيانات الطلب غير مكتملة");
    }
    if (!zoneId || typeof zoneId !== "string") {
      throw new HttpsError("invalid-argument", "يجب تحديد منطقة التوصيل (zoneId)");
    }
    if (
      !deliveryAddressDetails ||
      typeof deliveryAddressDetails !== "string" ||
      deliveryAddressDetails.trim().length < 3
    ) {
      throw new HttpsError("invalid-argument", "يجب إدخال تفاصيل عنوان صحيحة");
    }
    if (items.length > 50) {
      throw new HttpsError("invalid-argument", "لا يمكن طلب أكثر من 50 صنفاً");
    }

    const finalPaymentMethod: PaymentMethod =
      paymentMethod === "CARD" ? "CARD" : "CASH";

    const result = await db.runTransaction(async (t) => {
      // ✅ فحص Idempotency
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

      // 3) المنطقة (Zone) — مصدر الحقيقة الوحيد لرسوم التوصيل الآن
      const zoneRef = db.doc(`zones/${zoneId}`);
      const zoneSnap = await t.get(zoneRef);
      if (!zoneSnap.exists || zoneSnap.data()?.active !== true) {
        throw new HttpsError("failed-precondition", "منطقة التوصيل غير متاحة حالياً");
      }
      const zone = zoneSnap.data()!;

      // 4) الأطباق — السعر الحقيقي من Firestore
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
        basePrice?: number;
        quantity: number;
        notes?: string;
        selectedAddons?: PlaceOrderAddon[];
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

        // ✅ التحقق من الإضافات وحساب سعرها الحقيقي من قاعدة البيانات
        let validatedAddons: PlaceOrderAddon[] = [];
        let itemAddonsPrice = 0;
        if (item.selectedAddons && Array.isArray(item.selectedAddons)) {
          for (const addon of item.selectedAddons) {
            const validAddon = dish.addons?.find((a) => a.id === addon.id);
            if (validAddon) {
              validatedAddons.push(validAddon);
              itemAddonsPrice += validAddon.price;
            }
          }
        }

        const finalItemPrice = dish.price + itemAddonsPrice;
        subtotal += finalItemPrice * quantity;
        orderItems.push({
          dishId: item.dishId,
          name: dish.name,
          price: finalItemPrice,
          basePrice: dish.price,
          quantity,
          notes: item.notes || "",
          selectedAddons: validatedAddons,
        });
      }

      // 5) كود الخصم
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

      // ✅ الرسوم أصبحت من الـ zone وليس من المطعم
      const deliveryFee = orderItems.length > 0 ? zone.deliveryFee || 0 : 0;
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
        courierId: null,
        createdAt: now,
        updatedAt: now,
        customerName: userData.displayName || userData.phone,
        customerPhone: userData.phone,
        zoneId,
        deliveryAddressDetails: deliveryAddressDetails.trim(),
        orderNotes: orderNotes?.trim() || "",
        // نُبقي الحقل القديم متوافقاً مع الواجهات التي لم تُحدَّث بعد
        deliveryAddress: deliveryAddressDetails.trim(),
        paymentMethod: finalPaymentMethod,
        deliveredAt: null,
        userId: uid,
        customerLat: typeof customerLat === "number" ? customerLat : null,
        customerLng: typeof customerLng === "number" ? customerLng : null,
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

// ============================================================================
// 2) updateOrderStatus — State Machine محمي بالكامل من السيرفر
// ============================================================================

interface UpdateOrderStatusInput {
  orderId: string;
  newStatus: OrderStatus;
  /** يُستخدم فقط من الإدارة لإسناد طلب لمندوب محدد عند الانتقال إلى OutForDelivery */
  targetDriverId?: string;
}

export const updateOrderStatus = onCall<UpdateOrderStatusInput>(
  {
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "يجب تسجيل الدخول");
    }

    const { orderId, newStatus, targetDriverId } = request.data || {};

    if (!orderId || typeof orderId !== "string") {
      throw new HttpsError("invalid-argument", "معرّف الطلب مطلوب");
    }
    if (!newStatus || !(newStatus in STATUS_TRANSITIONS)) {
      throw new HttpsError("invalid-argument", "حالة الطلب غير معروفة");
    }

    await db.runTransaction(async (t) => {
      // ---------- القراءات أولاً (قيد Firestore transaction) ----------
      const userRef = db.doc(`users/${uid}`);
      const orderRef = db.doc(`orders/${orderId}`);

      const [userSnap, orderSnap] = await Promise.all([
        t.get(userRef),
        t.get(orderRef),
      ]);

      if (!userSnap.exists) {
        throw new HttpsError("failed-precondition", "الملف الشخصي غير موجود");
      }
      if (!orderSnap.exists) {
        throw new HttpsError("not-found", "الطلب غير موجود");
      }

      const userData = userSnap.data()!;
      const order = orderSnap.data()!;
      const currentStatus: OrderStatus = order.status;
      const role: string = userData.role;

      // ---------- التحقق من صحة الانتقال ضمن خط السير المسموح ----------
      const allowedNext = STATUS_TRANSITIONS[currentStatus] || [];
      // Admins can bypass state machine to fix things, or cancel any order
      if (role !== "admin" && !allowedNext.includes(newStatus)) {
        throw new HttpsError(
          "failed-precondition",
          `لا يمكن الانتقال من "${currentStatus}" إلى "${newStatus}"`,
        );
      }

      // ---------- جلب بيانات المطعم فقط عند الحاجة (لتفويض صاحب المطعم) ----------
      const restaurantVendorStatuses: OrderStatus[] = [
        "Accepted",
        "Preparing",
        "Ready",
      ];
      let restaurantOwnerId: string | undefined;
      if (
        role !== "admin" &&
        role !== "courier" &&
        (restaurantVendorStatuses.includes(newStatus) || newStatus === "Cancelled")
      ) {
        const restaurantSnap = await t.get(
          db.doc(`restaurants/${order.restaurantId}`),
        );
        restaurantOwnerId = restaurantSnap.data()?.ownerId;
      }

      // ---------- تحديد الصلاحية والمنطق حسب نوع الانتقال ----------
      let authorized = false;
      let assignedDriverId: string | undefined;
      let cancelledBy: "admin" | "vendor" | undefined;

      if (role === "admin") {
        authorized = true;
        if (newStatus === "OutForDelivery" && targetDriverId) {
          assignedDriverId = targetDriverId;
        }
        if (newStatus === "Cancelled") cancelledBy = "admin";
      } else if (
        restaurantVendorStatuses.includes(newStatus) &&
        restaurantOwnerId === uid
      ) {
        authorized = true;
      } else if (
        newStatus === "Cancelled" &&
        restaurantOwnerId === uid &&
        (currentStatus === "Pending" || currentStatus === "Accepted")
      ) {
        // صاحب المطعم يستطيع الإلغاء فقط قبل بدء التحضير
        authorized = true;
        cancelledBy = "vendor";
      } else if (
        newStatus === "OutForDelivery" &&
        role === "courier" &&
        !order.courierId
      ) {
        // استلام المندوب لطلب متاح — Transaction تمنع تصادم الاستلام المزدوج تلقائياً
        authorized = true;
        assignedDriverId = uid;
      } else if (
        newStatus === "Delivered" &&
        role === "courier" &&
        order.courierId === uid
      ) {
        authorized = true;
      }

      if (!authorized) {
        throw new HttpsError(
          "permission-denied",
          "لا تملك صلاحية تنفيذ هذا الإجراء على هذا الطلب",
        );
      }

      // ---------- تحضير تحديث الطلب ----------
      const now = FieldValue.serverTimestamp();
      const orderUpdates: Record<string, unknown> = {
        status: newStatus,
        updatedAt: now,
      };
      if (assignedDriverId) orderUpdates.courierId = assignedDriverId;
      if (newStatus === "Delivered") orderUpdates.deliveredAt = now;
      if (newStatus === "Cancelled" && cancelledBy) {
        orderUpdates.cancelledBy = cancelledBy;
      }

      // ---------- تسوية الكاش عند التسليم (Cash Reconciliation) ----------
      // يجب قراءة محفظة المندوب قبل أي كتابة على الـ transaction
      let walletRef: FirebaseFirestore.DocumentReference | null = null;
      let walletExists = false;
      if (newStatus === "Delivered" && order.paymentMethod === "CASH") {
        const driverIdForWallet = order.courierId;
        if (driverIdForWallet) {
          walletRef = db.doc(`driverWallets/${driverIdForWallet}`);
          const walletSnap = await t.get(walletRef);
          walletExists = walletSnap.exists;
        }
      }

      // ---------- الكتابات ----------
      t.update(orderRef, orderUpdates);

      if (walletRef) {
        if (walletExists) {
          t.update(walletRef, {
            totalCashInHand: FieldValue.increment(order.total),
            cashOrdersSinceSettlement: FieldValue.increment(1),
            updatedAt: now,
          });
        } else {
          t.set(walletRef, {
            driverId: order.courierId,
            totalCashInHand: order.total,
            cashOrdersSinceSettlement: 1,
            lastSettlementAt: null,
            updatedAt: now,
          });
        }
      }
    });

    return { ok: true };
  },
);

// ============================================================================
// 3) onOrderStatusChanged — trigger للإشعارات عند تغيّر الحالة
// ============================================================================

export const onOrderStatusChanged = onDocumentUpdated(
  { region: REGION, document: "orders/{orderId}" },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.status === after.status) return;

    const orderId = event.params.orderId;
    const newStatus: OrderStatus = after.status;
    const message = STATUS_MESSAGES_AR[newStatus] || "تم تحديث حالة طلبك";
    const now = FieldValue.serverTimestamp();

    const notifications: Promise<unknown>[] = [];

    // إشعار للعميل صاحب الطلب
    if (after.userId) {
      notifications.push(
        db.collection("notifications").add({
          userId: after.userId,
          orderId,
          type: "order_status",
          status: newStatus,
          message,
          read: false,
          createdAt: now,
        }),
      );
    }

    // إشعار للمندوب عند توفّر طلب جديد للاستلام (Ready بدون مندوب)
    if (newStatus === "Ready" && !after.courierId) {
      notifications.push(
        db.collection("notifications").add({
          audience: "couriers",
          orderId,
          type: "order_available",
          message: "يوجد طلب جديد جاهز للاستلام",
          read: false,
          createdAt: now,
        }),
      );
    }

    // إشعار لصاحب المطعم عند إسناد مندوب (OutForDelivery)
    if (newStatus === "OutForDelivery" && after.restaurantId) {
      notifications.push(
        db.collection("notifications").add({
          restaurantId: after.restaurantId,
          orderId,
          type: "order_status",
          status: newStatus,
          message: "تم استلام الطلب من قِبل المندوب",
          read: false,
          createdAt: now,
        }),
      );
    }

    await Promise.all(notifications);

    // ملاحظة: لإرسال Push فعلي عبر FCM، أضف هنا قراءة fcmToken من
    // users/{after.userId} واستدعِ getMessaging().send({...}) بعد إضافة
    // firebase-admin/messaging. تُركت خارج هذا الملف لتفادي فشل الدالة
    // إن لم تكن FCM مهيأة بعد في المشروع.
  },
);

// ============================================================================
// 4) settleDriverCash — تصفير محفظة المندوب (إدارة فقط)
// ============================================================================

interface SettleDriverCashInput {
  driverId: string;
}

export const settleDriverCash = onCall<SettleDriverCashInput>(
  {
    region: REGION,
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "يجب تسجيل الدخول");
    }

    const { driverId } = request.data || {};
    if (!driverId || typeof driverId !== "string") {
      throw new HttpsError("invalid-argument", "معرّف المندوب مطلوب");
    }

    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists || userSnap.data()?.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "هذا الإجراء متاح للإدارة فقط",
      );
    }

    const walletRef = db.doc(`driverWallets/${driverId}`);
    const now = FieldValue.serverTimestamp();

    await walletRef.set(
      {
        driverId,
        totalCashInHand: 0,
        cashOrdersSinceSettlement: 0,
        lastSettlementAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

    return { ok: true };
  },
);
