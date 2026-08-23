// src/lib/server-data.ts
// ============================================================================
// جلب جهة الخادم لبيانات صفحة المطعم (SSR/SEO). يعيد null عند أي فشل —
// المكوّن العميل يملك مسار تراجع كاملاً عبر اشتراكات Firestore المباشرة.
//
// ملاحظة هامة: مستندات Admin SDK تحوي كائنات من كلاسات (Timestamp/GeoPoint)
// ولا يقبل Next.js تمريرها من Server إلى Client Components — لذلك تُحوَّل
// كل القيم إلى أنواع JSON صرفة قبل الإرجاع (serializeForClient).
// ============================================================================

import { getAdminDb } from "./firebase-admin";
import type { Restaurant, Dish } from "@/types/database";

export interface RestaurantPageData {
  restaurant: Restaurant;
  dishes: Dish[];
}

// يحوّل أي قيمة (مستند/مصفوفة) إلى أنواع JSON صرفة فقط.
// Timestamp → millisecond number (متوافق مع معالجة Client SDK في firestore.ts)
// GeoPoint  → { lat, lng }
export function serializeForClient(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();

  const anyVal = value as any;

  // Firestore Timestamp (يملك toMillis في الـ Client والـ Admin SDK معاً)
  if (typeof anyVal.toMillis === "function") return anyVal.toMillis();

  // Firestore GeoPoint
  if ("latitude" in anyVal && "longitude" in anyVal) {
    return { lat: anyVal.latitude, lng: anyVal.longitude };
  }

  if (Array.isArray(value)) return value.map(serializeForClient);

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = val === undefined ? null : serializeForClient(val);
  }
  return out;
}

export async function fetchRestaurantPageData(
  restaurantId: string,
): Promise<RestaurantPageData | null> {
  const db = getAdminDb();
  if (!db) return null;

  try {
    const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
    if (!restaurantSnap.exists) return null;

    // التسلسل قبل النشر إلى مكوّن العميل — يمنع خطأ
    // "Only plain objects ... can be passed to Client Components"
    const restaurant = {
      id: restaurantSnap.id,
      ...(serializeForClient(restaurantSnap.data()) as Omit<Restaurant, "id">),
    } as Restaurant;

    const dishesSnap = await db
      .collection("dishes")
      .where("restaurantId", "==", restaurantId)
      .get();

    const dishes = dishesSnap.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...(serializeForClient(doc.data()) as Omit<Dish, "id">),
        } as Dish),
    );

    return { restaurant, dishes };
  } catch (error) {
    console.warn("[server-data] فشل جلب بيانات المطعم من الخادم:", error);
    return null;
  }
}
