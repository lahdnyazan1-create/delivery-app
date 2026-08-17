// src/lib/server-data.ts
// ============================================================================
// جلب جهة الخادم لبيانات صفحة المطعم (SSR/SEO). يعيد null عند أي فشل —
// المكوّن العميل يملك مسار تراجع كاملاً عبر اشتراكات Firestore المباشرة.
// ============================================================================

import { getAdminDb } from "./firebase-admin";
import type { Restaurant, Dish } from "@/types/database";

export interface RestaurantPageData {
  restaurant: Restaurant;
  dishes: Dish[];
}

export async function fetchRestaurantPageData(
  restaurantId: string,
): Promise<RestaurantPageData | null> {
  const db = getAdminDb();
  if (!db) return null;

  try {
    const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
    if (!restaurantSnap.exists) return null;

    const restaurant = {
      id: restaurantSnap.id,
      ...restaurantSnap.data(),
    } as Restaurant;

    const dishesSnap = await db
      .collection("dishes")
      .where("restaurantId", "==", restaurantId)
      .get();

    const dishes = dishesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Dish[];

    return { restaurant, dishes };
  } catch (error) {
    console.warn("[server-data] فشل جلب بيانات المطعم من الخادم:", error);
    return null;
  }
}
