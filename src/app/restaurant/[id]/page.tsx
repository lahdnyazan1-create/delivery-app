// src/app/restaurant/[id]/page.tsx
// ============================================================================
// صفحة خادم (Server Component) — تجلب المطعم وقائمته بـ Firebase Admin
// أثناء الطلب فتصبح بياناتها قابلة للفهرسة (SEO) ويكون الطلاء الأول
// فورياً دون انتظار اشتغال Firestore في المتصفح.
// إن تعذّرت تهيئة Admin (لا مفاتيح خادم) تعمل الصفحة كالسابق عبر
// تراجع المكوّن العميل لاشتراكاته الحيّة.
// ============================================================================

import type { Metadata } from "next";
import { RestaurantMenu } from "@/components/restaurant/RestaurantMenu";
import { fetchRestaurantPageData } from "@/lib/server-data";

type PageProps = {
  params: { id: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchRestaurantPageData(params.id);
  if (!data) {
    return { title: "مطعم غير موجود" };
  }

  const { restaurant } = data;
  const description =
    restaurant.tagline || `اطلب من ${restaurant.name} — توصيل خلال ${restaurant.etaMinutes}–${restaurant.etaMinutes + 10} دقيقة.`;

  return {
    title: restaurant.name,
    description,
    openGraph: {
      title: restaurant.name,
      description,
      type: "website",
      images: restaurant.image ? [{ url: restaurant.image }] : undefined,
    },
  };
}

export default async function RestaurantMenuPage({ params }: PageProps) {
  const data = await fetchRestaurantPageData(params.id);

  return (
    <RestaurantMenu
      id={params.id}
      initialRestaurant={data?.restaurant ?? null}
      initialDishes={data?.dishes ?? []}
    />
  );
}
