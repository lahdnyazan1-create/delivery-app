import { redirect } from "next/navigation";

/**
 * ✅ لوحة المطعم القديمة حُذفت — كانت نسخة مكررة من /vendor مع
 * قائمة حالات ناقصة (لا تتيح قبول طلب Pending). أي رابط قديم
 * أو إشارة مرجعية تُحوَّل تلقائياً إلى اللوحة المعتمدة.
 * ملاحظة: صفحة قائمة الطعام للعميل /restaurant/[id] غير متأثرة.
 */
export default function LegacyRestaurantDashboard() {
  redirect("/vendor");
}
