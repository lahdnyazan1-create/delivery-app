import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import * as crypto from "crypto";

initializeApp();
const db = getFirestore();

interface PlaceOrderItem { dishId: string; quantity: number; notes?: string; selectedAddons?: { id: string; name: string; price: number }[]; }
interface PlaceOrderInput {
  restaurantId: string; items: PlaceOrderItem[]; promoCode?: string | null; idempotencyKey?: string;
  zoneId: string; deliveryAddressDetails: string; orderNotes?: string;
  customerLat?: number | null; customerLng?: number | null;
  referralCode?: string | null; // ✅ كود دعوة الشوفير
}

// ✅ حد أقصى للكمية لمنع الطلبات غير المنطقية
const MAX_QUANTITY_PER_ITEM = 50;

/**
 * توليد كود دعوة فريد للشوفير
 */
function generateReferralCode(): string {
  return 'DRV' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * التحقق من صحة إحداثيات GPS
 */
function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export const placeOrder = onCall<PlaceOrderInput>(
  { region: "europe-west1", memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول");

    const { restaurantId, items, promoCode, idempotencyKey, zoneId, deliveryAddressDetails, referralCode } = request.data || {};
    if (!restaurantId || !Array.isArray(items) || items.length === 0 || !zoneId) throw new HttpsError("invalid-argument", "بيانات الطلب غير مكتملة");

    // ✅ التحقق من صحة إحداثيات GPS
    const { customerLat, customerLng } = request.data;
    if (customerLat !== null && customerLng !== null) {
      if (!isValidCoordinate(customerLat, customerLng)) {
        throw new HttpsError("invalid-argument", "إحداثيات الموقع غير صحيحة");
      }
    }

    const result = await db.runTransaction(async (t) => {
      // ✅ التحقق من IdempotencyKey داخل الـ Transaction لمنع Race Condition
      if (idempotencyKey) {
        const idemRef = db.doc(`idempotencyKeys/${idempotencyKey}`);
        const idemSnap = await t.get(idemRef);
        if (idemSnap.exists) throw new HttpsError("already-exists", "تم معالجة هذا الطلب مسبقاً");
      }

      const userRef = db.doc(`users/${uid}`);
      const userSnap = await t.get(userRef);
      if (!userSnap.exists) throw new HttpsError("failed-precondition", "الملف الشخصي غير موجود");
      const userData = userSnap.data()!;

      // ✅ التحقق من أن المستخدم لديه دور 'customer' قبل السماح بالطلب
      if (userData.role !== 'customer') {
        throw new HttpsError("permission-denied", "فقط الزبائن يمكنهم تقديم الطلبات");
      }

      // ✅ معالجة كود الدعوة: البحث عن الشوفير صاحب الكود
      let preferredCourierId: string | null = null;
      if (referralCode) {
        const couriersQuery = await db.collection('users')
          .where('role', '==', 'courier')
          .where('referralCode', '==', referralCode)
          .limit(1)
          .get();
        
        if (couriersQuery.empty) {
          throw new HttpsError("invalid-argument", "كود الدعوة غير صحيح");
        }
        
        const courierDoc = couriersQuery.docs[0];
        preferredCourierId = courierDoc.id;
      }

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
        
        // ✅ التحقق من عدم تجاوز الحد الأقصى للكمية
        if (quantity > MAX_QUANTITY_PER_ITEM) {
          throw new HttpsError("invalid-argument", `الكمية القصوى المسموحة لكل صنف هي ${MAX_QUANTITY_PER_ITEM}`);
        }
        
        if (!dish) throw new HttpsError("invalid-argument", `طبق غير موجود: ${item.dishId}`);
        if (dish.restaurantId !== restaurantId) throw new HttpsError("invalid-argument", "الطبق لا يتبع هذا المطعم");
        if (dish.available !== true) throw new HttpsError("failed-precondition", `الطبق غير متوفر: ${dish.name}`);

        let addonsPrice = 0;
        if (item.selectedAddons && Array.isArray(item.selectedAddons)) {
          addonsPrice = item.selectedAddons.reduce((sum, a) => sum + (a.price || 0), 0);
        }
        // ✅ الإصلاح: حساب السعر بشكل صحيح (سعر الطبق + الإضافات) × الكمية
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
      const now = Timestamp.now();

      // ✅ الإصلاح: إضافة paymentMethod و customerLat/customerLng للطلب
      // ✅ إضافة preferredCourierId للطلب
      const newOrder = {
        restaurantId, restaurantName: restaurant.name, items: orderItems, subtotal, discount, deliveryFee, total,
        promoCode: validatedPromoCode, status: "Pending", createdAt: now, updatedAt: now,
        customerName: userData.displayName || userData.phone, customerPhone: userData.phone,
        deliveryAddress: userData.address || deliveryAddressDetails, deliveryAddressDetails, zoneId, userId: uid,
        paymentMethod: "CASH", // ✅ ثابت: الدفع عند الاستلام فقط
        customerLat: isValidCoordinate(customerLat, customerLng) ? customerLat : null, // ✅ إحداثيات GPS
        customerLng: isValidCoordinate(customerLat, customerLng) ? customerLng : null, // ✅ إحداثيات GPS
        preferredCourierId, // ✅ الشوفير المفضل عبر كود الدعوة
        courierInviteStatus: preferredCourierId ? "pending" : null, // ✅ حالة دعوة الشوفير
        courierInviteExpiresAt: preferredCourierId ? new Timestamp(now.seconds + 300, 0) : null, // ✅ تنتهي بعد 5 دقائق
      };

      t.set(orderRef, newOrder);
      if (idempotencyKey) t.set(db.doc(`idempotencyKeys/${idempotencyKey}`), { createdAt: now, uid, orderId: orderRef.id });
      if (validatedPromoCode) t.update(db.doc(`promoCodes/${validatedPromoCode}`), { usedBy: FieldValue.arrayUnion(uid) });

      return { orderId: orderRef.id, order: newOrder };
    });

    // ✅ إرسال إشعار للشوفير المفضل إذا وجد
    if (result.order.preferredCourierId) {
      try {
        await db.collection('notifications').add({
          userId: result.order.preferredCourierId,
          title: 'طلب جديد من زبونك!',
          body: `لديك طلب جديد من ${result.order.customerName}. لديك 5 دقائق للقبول.`,
          orderId: result.orderId,
          type: 'priority_courier_invite',
          createdAt: Timestamp.now(),
          read: false
        });
      } catch (e) {
        console.error('فشل إرسال إشعار للشوفير المفضل:', e);
      }
    }

    return { ok: true, orderId: result.orderId, order: result.order };
  }
);

const validTransitions: Record<string, string[]> = {
  "Pending": ["Accepted", "Cancelled"],
  "Accepted": ["Preparing", "Cancelled"],
  "Preparing": ["Ready", "Cancelled"],
  "Ready": ["OutForDelivery"],
  "OutForDelivery": ["Delivered"],
  "Delivered": [],
  "Cancelled": []
};

// ✅ دالة مساعدة لتحديث محفظة السائق عند التسليم
async function updateDriverWallet(driverId: string, orderTotal: number, t: any) {
  const walletRef = db.doc(`driverWallets/${driverId}`);
  const walletSnap = await t.get(walletRef);
  
  if (!walletSnap.exists) {
    // إنشاء محفظة جديدة للسائق إذا لم تكن موجودة
    t.set(walletRef, {
      driverId,
      totalCashInHand: orderTotal,
      cashOrdersSinceSettlement: 1,
      lastSettlementAt: null,
      updatedAt: Timestamp.now()
    });
  } else {
    t.update(walletRef, {
      totalCashInHand: FieldValue.increment(orderTotal),
      cashOrdersSinceSettlement: FieldValue.increment(1),
      updatedAt: Timestamp.now()
    });
  }
}

export const updateOrderStatus = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "غير مصرح");

    const { orderId, newStatus } = request.data;
    if (!orderId || !newStatus) throw new HttpsError("invalid-argument", "بيانات غير مكتملة");

    // ✅ استخدام Transaction لمنع Race Condition
    return await db.runTransaction(async (t) => {
      const orderRef = db.doc(`orders/${orderId}`);
      const orderSnap = await t.get(orderRef);
      
      if (!orderSnap.exists) throw new HttpsError("not-found", "الطلب غير موجود");
      
      const orderData = orderSnap.data()!;
      const currentStatus = orderData.status;
      
      // ✅ التحقق من صلاحية إلغاء الطلب
      if (newStatus === "Cancelled") {
        const userSnap = await t.get(db.doc(`users/${uid}`));
        const role = userSnap.data()?.role;
        
        // فقط الأدمن أو الزبون صاحب الطلب يمكنهم الإلغاء
        if (role !== "admin" && orderData.userId !== uid) {
          throw new HttpsError("permission-denied", "ليس لديك صلاحية إلغاء هذا الطلب");
        }
      }
      
      const allowed = validTransitions[currentStatus] || [];
      
      if (!allowed.includes(newStatus)) {
        throw new HttpsError("failed-precondition", `لا يمكن تغيير الحالة من ${currentStatus} إلى ${newStatus}`);
      }

      // ✅ ربط السائق بالطلب عند استلامه وتحديث المحفظة
      if (newStatus === "OutForDelivery") {
        // إذا كان هناك سائق مرتبط بالفعل، نتحقق أنه السائق الحالي
        if (orderData.courierId && orderData.courierId !== uid) {
          throw new HttpsError("permission-denied", "هذا الطلب مسند لسائق آخر");
        }
        
        const userSnap = await t.get(db.doc(`users/${uid}`));
        const role = userSnap.data()?.role;
        
        // فقط السائق يمكنه تغيير الحالة إلى OutForDelivery
        if (role !== "courier") {
          throw new HttpsError("permission-denied", "فقط المندوبون يمكنهم استلام الطلبات");
        }
        
        t.update(orderRef, { 
          status: newStatus, 
          courierId: uid,
          updatedAt: Timestamp.now() 
        });
        return { ok: true };
      }

      // ✅ عند التسليم، تحديث محفظة السائق
      if (newStatus === "Delivered") {
        const courierId = orderData.courierId;
        if (!courierId) {
          throw new HttpsError("failed-precondition", "لا يوجد سائق مرتبط بهذا الطلب");
        }
        
        // التحقق من أن السائق هو من ينفذ التسليم
        if (orderData.courierId !== uid) {
          const userSnap = await t.get(db.doc(`users/${uid}`));
          const role = userSnap.data()?.role;
          if (role !== "admin") {
            throw new HttpsError("permission-denied", "فقط السائق المسند أو الأدمن يمكنه تأكيد التسليم");
          }
        }
        
        // تحديث حالة الطلب
        t.update(orderRef, { 
          status: newStatus, 
          deliveredAt: Timestamp.now(),
          updatedAt: Timestamp.now() 
        });
        
        // ✅ تحديث محفظة السائق - الإصلاح الرئيسي
        if (orderData.paymentMethod === "CASH") {
          await updateDriverWallet(courierId, orderData.total, t);
        }
        
        return { ok: true };
      }

      // تحديث الحالة للحالات الأخرى
      t.update(orderRef, { status: newStatus, updatedAt: Timestamp.now() });
      return { ok: true };
    });
  }
);

export const settleDriverCash = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "غير مصرح");

    const { driverId } = request.data;
    if (!driverId) throw new HttpsError("invalid-argument", "معرّف السائق مطلوب");
    
    const userSnap = await db.doc(`users/${uid}`).get();
    if (userSnap.data()?.role !== 'admin') throw new HttpsError("permission-denied", "الإدارة فقط");

    // ✅ التحقق من وجود محفظة السائق
    const walletSnap = await db.doc(`driverWallets/${driverId}`).get();
    if (!walletSnap.exists) {
      throw new HttpsError("not-found", "محفظة السائق غير موجودة");
    }

    // ✅ تصفير الحقول الصحيحة
    await db.doc(`driverWallets/${driverId}`).set({
      totalCashInHand: 0,
      cashOrdersSinceSettlement: 0,
      lastSettlementAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }, { merge: true });
    
    return { ok: true };
  }
);

/**
 * ✅ دالة جديدة: قبول أو رفض دعوة الطلب المفضل
 * يستخدمها الشوفير للرد على دعوات الطلبات ذات الأولوية
 */
export const respondToCourierInvite = onCall(
  { region: "europe-west1", memory: "256MiB", timeoutSeconds: 30 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول");

    const { orderId, accept } = request.data;
    if (!orderId || typeof accept !== 'boolean') {
      throw new HttpsError("invalid-argument", "بيانات غير مكتملة");
    }

    return await db.runTransaction(async (t) => {
      const orderRef = db.doc(`orders/${orderId}`);
      const orderSnap = await t.get(orderRef);
      
      if (!orderSnap.exists) {
        throw new HttpsError("not-found", "الطلب غير موجود");
      }

      const orderData = orderSnap.data()!;
      
      // التحقق من أن المستخدم هو الشuffling المدعو
      if (orderData.preferredCourierId !== uid) {
        throw new HttpsError("permission-denied", "لست الشuffling المدعو لهذا الطلب");
      }

      // التحقق من حالة الدعوة
      if (orderData.courierInviteStatus !== 'pending') {
        throw new HttpsError("failed-precondition", "هذه الدعوة لم تعد قيد الانتظار");
      }

      // التحقق من انتهاء صلاحية الدعوة
      if (orderData.courierInviteExpiresAt && orderData.courierInviteExpiresAt.toDate() < new Date()) {
        throw new HttpsError("failed-precondition", "انتهت صلاحية هذه الدعوة");
      }

      if (accept) {
        // ✅ قبول الدعوة: تعيين السائق للطلب وتغيير الحالة
        t.update(orderRef, {
          courierId: uid,
          status: 'Accepted',
          courierInviteStatus: 'accepted',
          courierInviteExpiresAt: null,
          updatedAt: Timestamp.now()
        });

        // إرسال إشعار للزبون بأن شوفيره قبل الطلب
        await db.collection('notifications').add({
          userId: orderData.userId,
          title: 'تم قبول طلبك!',
          body: `${orderData.customerName}, شوفيرك الخاص قبل طلبك وسيبدأ بالتوصيل قريباً.`,
          orderId,
          type: 'courier_accepted',
          createdAt: Timestamp.now(),
          read: false
        });
      } else {
        // ✅ رفض الدعوة: تحرير الطلب للجميع
        t.update(orderRef, {
          preferredCourierId: null,
          courierInviteStatus: 'rejected',
          courierInviteExpiresAt: null,
          updatedAt: Timestamp.now()
        });
      }

      return { ok: true };
    });
  }
);

/**
 * ✅ دالة مجدولة: تحويل الطلبات المعلقة إلى عامة بعد انتهاء الوقت
 * تعمل كل دقيقة للتحقق من الطلبات منتهية الصلاحية
 */
import { onSchedule } from "firebase-functions/v2/scheduler";

export const checkExpiredCourierInvites = onSchedule(
  { schedule: "every 1 minutes", region: "europe-west1", memory: "256MiB" },
  async (event) => {
    const now = Timestamp.now();
    
    // البحث عن الطلبات التي انتهت صلاحية دعوتها
    const expiredOrders = await db.collection('orders')
      .where('courierInviteStatus', '==', 'pending')
      .where('courierInviteExpiresAt', '<=', now)
      .limit(100)
      .get();

    if (expiredOrders.empty) {
      console.log('لا توجد دعوات منتهية الصلاحية');
      return;
    }

    const batch = db.batch();
    let count = 0;

    expiredOrders.forEach((doc) => {
      batch.update(doc.ref, {
        preferredCourierId: null,
        courierInviteStatus: 'expired',
        courierInviteExpiresAt: null,
        updatedAt: now
      });
      count++;
    });

    await batch.commit();
    console.log(`تم تحرير ${count} طلبات للدعوة العامة`);
  }
);

/**
 * ✅ دالة لإنشاء كود دعوة للشوفير عند تحويل حسابه إلى courier
 */
export const generateCourierReferralCode = onCall(
  { region: "europe-west1" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "يجب تسجيل الدخول");

    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", "المستخدم غير موجود");
    }

    const userData = userSnap.data()!;
    
    // التحقق من أن المستخدم سائق
    if (userData.role !== 'courier') {
      throw new HttpsError("permission-denied", "فقط السائقين يمكنهم الحصول على كود دعوة");
    }

    // إذا كان لديه كود بالفعل، إرجاعه
    if (userData.referralCode) {
      return { ok: true, referralCode: userData.referralCode };
    }

    // توليد كود جديد
    const referralCode = generateReferralCode();
    
    await db.doc(`users/${uid}`).update({
      referralCode,
      updatedAt: Timestamp.now()
    });

    return { ok: true, referralCode };
  }
);
