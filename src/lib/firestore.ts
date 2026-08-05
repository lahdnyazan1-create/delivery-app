// src/lib/firestore.ts
// ============================================================================
// التعديلات (تراكمية):
// - ✅ حُذفت updateOrderStatus() القديمة — كل تغيير حالة يمر عبر lib/orders.ts
// - ✅ subscribeRestaurantOrders() للوحة الفيندور
// - ✅ جديد: addZone / updateZone / fetchAllZones لإدارة مناطق التوصيل من الأدمن
// - ✅ جديد: fetchDriverWallets لعرض أرصدة كاش المندوبين بلوحة الأدمن
// ============================================================================

import { db } from "./firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import {
  Restaurant,
  Dish,
  Driver,
  Order,
  PromoCode,
  UserProfile,
  Zone,
  DriverWallet,
} from "@/types/database";

export const fetchRestaurants = async (): Promise<Restaurant[]> => {
  const snapshot = await getDocs(collection(db, "restaurants"));
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Restaurant,
  );
};

export const fetchDishes = async (): Promise<Dish[]> => {
  const snapshot = await getDocs(collection(db, "dishes"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Dish);
};

export const fetchDrivers = async (): Promise<Driver[]> => {
  const snapshot = await getDocs(collection(db, "drivers"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Driver);
};

export const fetchPromoCodes = async (): Promise<PromoCode[]> => {
  const snapshot = await getDocs(collection(db, "promoCodes"));
  return snapshot.docs.map(
    (doc) => ({ code: doc.id, ...doc.data() }) as PromoCode,
  );
};

/**
 * ✅ مقيدة بالمستخدم — تجلب فقط طلبات المستخدم المسجل
 */
export const subscribeOrders = (
  userId: string,
  callback: (orders: Order[]) => void,
): Unsubscribe => {
  const q = query(
    collection(db, "orders"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt,
          updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt,
        } as Order;
      });
      callback(orders);
    },
    (error) => {
      console.error("Orders subscription error:", error);
      callback([]);
    },
  );
};

/**
 * ✅ اشتراك عام للمشرفين — يجلب كل الطلبات
 */
export const subscribeAllOrders = (
  callback: (orders: Order[]) => void,
): Unsubscribe => {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt,
          updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt,
        } as Order;
      });
      callback(orders);
    },
    (error) => {
      console.error("All orders subscription error:", error);
      callback([]);
    },
  );
};

/**
 * ✅ اشتراك خاص بلوحة الفيندور: يجلب فقط طلبات مطعم واحد.
 */
export const subscribeRestaurantOrders = (
  restaurantId: string,
  callback: (orders: Order[]) => void,
): Unsubscribe => {
  const q = query(
    collection(db, "orders"),
    where("restaurantId", "==", restaurantId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt,
          updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt,
        } as Order;
      });
      callback(orders);
    },
    (error) => {
      console.error("Restaurant orders subscription error:", error);
      callback([]);
    },
  );
};

export const updateUserProfile = async (
  uid: string,
  profile: Partial<UserProfile>,
) => {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { ...profile, updatedAt: serverTimestamp() });
};

// إضافات لإدارة المطاعم والأطباق (للأدمن)
export const addRestaurant = async (
  restaurant: Omit<Restaurant, "id">,
): Promise<string> => {
  const ref = await addDoc(collection(db, "restaurants"), restaurant);
  return ref.id;
};

export const toggleRestaurantActive = async (
  restaurantId: string,
  active: boolean,
) => {
  const ref = doc(db, "restaurants", restaurantId);
  await updateDoc(ref, { active });
};

export const addDish = async (dish: Omit<Dish, "id">): Promise<string> => {
  const ref = await addDoc(collection(db, "dishes"), dish);
  return ref.id;
};

export const updateDish = async (dishId: string, dish: Partial<Dish>) => {
  const ref = doc(db, "dishes", dishId);
  await updateDoc(ref, { ...dish, updatedAt: serverTimestamp() });
};

export const addDriver = async (
  driver: Omit<Driver, "id">,
): Promise<string> => {
  const ref = await addDoc(collection(db, "drivers"), driver);
  return ref.id;
};

export const updateDriver = async (
  driverId: string,
  driver: Partial<Driver>,
) => {
  const ref = doc(db, "drivers", driverId);
  await updateDoc(ref, { ...driver, updatedAt: serverTimestamp() });
};

// ✅ ترقية دور مستخدم موجود (يُستخدم من لوحة الأدمن فقط، القواعد تفرض ذلك)
export const setUserRole = async (
  uid: string,
  role: UserProfile["role"],
) => {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { role, updatedAt: serverTimestamp() });
};

// ✅ إنشاء/تحديث بروفايل سائق بمعرّف مطابق تماماً لـ uid حساب المستخدم
export const upsertDriverProfile = async (
  uid: string,
  driver: Omit<Driver, "id">,
) => {
  const ref = doc(db, "drivers", uid);
  await setDoc(ref, { ...driver, updatedAt: serverTimestamp() }, { merge: true });
};

// ✅ تحديث عام لبيانات مطعم (يُستخدم هنا لربط ownerId بمالك المطعم)
export const updateRestaurant = async (
  restaurantId: string,
  data: Partial<Restaurant>,
) => {
  const ref = doc(db, "restaurants", restaurantId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

// ----------------------------------------------------------------------------
// ✅ جديد — Zones (مناطق التوصيل)
// ----------------------------------------------------------------------------

/** يجلب كل المناطق (فعّالة وغير فعّالة) — لعرضها وإدارتها بلوحة الأدمن */
export const fetchAllZones = async (): Promise<Zone[]> => {
  const snapshot = await getDocs(collection(db, "zones"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Zone);
};

export const addZone = async (
  zone: Omit<Zone, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
  const ref = await addDoc(collection(db, "zones"), {
    ...zone,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateZone = async (
  zoneId: string,
  data: Partial<Omit<Zone, "id">>,
) => {
  const ref = doc(db, "zones", zoneId);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

export const toggleZoneActive = async (zoneId: string, active: boolean) => {
  await updateZone(zoneId, { active });
};

// ----------------------------------------------------------------------------
// ✅ جديد — Driver Wallets (محافظ كاش المندوبين)
// ----------------------------------------------------------------------------

/** يجلب كل محافظ المندوبين مرة واحدة — تُستخدم بلوحة الأدمن لعرض الأرصدة */
export const fetchDriverWallets = async (): Promise<DriverWallet[]> => {
  const snapshot = await getDocs(collection(db, "driverWallets"));
  return snapshot.docs.map(
    (doc) => ({ driverId: doc.id, ...doc.data() }) as DriverWallet,
  );
};

// ----------------------------------------------------------------------------
// ✅ جديد — أكواد الخصم الحقيقية (PromoCode) — منفصلة تماماً عن promoTag
// الزخرفي على المطعم. هذه هي التي تُطبَّق فعلياً على حساب السعر عبر
// calcTotals عند إدخال العميل للكود في شاشة السلة.
// ----------------------------------------------------------------------------

/** معرّف المستند = نص الكود نفسه (بأحرف كبيرة) لضمان عدم التكرار */
export const addPromoCode = async (
  code: string,
  percentOff: number,
): Promise<void> => {
  const ref = doc(db, "promoCodes", code.trim().toUpperCase());
  await setDoc(ref, {
    percentOff: Number(percentOff),
    active: true,
    createdAt: serverTimestamp(),
  });
};

export const updatePromoCode = async (
  code: string,
  data: Partial<{ percentOff: number; active: boolean }>,
) => {
  const ref = doc(db, "promoCodes", code);
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
};

export const deletePromoCodeDoc = async (code: string) => {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "promoCodes", code));
};

// ----------------------------------------------------------------------------
// ✅ جديد — Categories (فئات الرئيسية)
// ----------------------------------------------------------------------------

export const fetchAllCategories = async () => {
  const snapshot = await getDocs(
    query(collection(db, "categories"), orderBy("order", "asc")),
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addCategory = async (category: {
  label: string;
  icon: string;
  order: number;
  visible: boolean;
}): Promise<string> => {
  const ref = await addDoc(collection(db, "categories"), category);
  return ref.id;
};

export const updateCategory = async (
  categoryId: string,
  data: Partial<{
    label: string;
    icon: string;
    order: number;
    visible: boolean;
  }>,
) => {
  const ref = doc(db, "categories", categoryId);
  await updateDoc(ref, data);
};

export const deleteCategoryDoc = async (categoryId: string) => {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "categories", categoryId));
};

// ----------------------------------------------------------------------------
// ✅ جديد — Banners (إعلانات الرئيسية)
// ----------------------------------------------------------------------------

export const fetchAllBanners = async () => {
  const snapshot = await getDocs(
    query(collection(db, "banners"), orderBy("order", "asc")),
  );
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const addBanner = async (banner: {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  gradient?: string;
  imageUrl?: string;
  order: number;
  active: boolean;
}): Promise<string> => {
  const ref = await addDoc(collection(db, "banners"), banner);
  return ref.id;
};

export const updateBanner = async (
  bannerId: string,
  data: Partial<{
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    gradient: string;
    imageUrl: string;
    order: number;
    active: boolean;
  }>,
) => {
  const ref = doc(db, "banners", bannerId);
  await updateDoc(ref, data);
};

export const deleteBannerDoc = async (bannerId: string) => {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "banners", bannerId));
};
