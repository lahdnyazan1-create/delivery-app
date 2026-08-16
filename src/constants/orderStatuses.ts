import { OrderStatus } from "@/types/database";

/**
 * ✅ المصدر الوحيد لحالات الطلب وترجمتها العربية.
 * كان "Accepted" مفقوداً من هذه القائمة فتعرض لوحة المطعم خيارات
 * غير قانونية ولا تتيح قبول طلب Pending، وكانت التسميات العربية
 * معرّفة نسخاً منفصلة في admin وvendor وorder-tracking.
 */
export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "OutForDelivery",
  "Delivered",
  "Cancelled",
];

export const STATUS_LABELS_AR: Record<OrderStatus, string> = {
  Pending: "قيد الانتظار",
  Accepted: "مقبول من المطعم",
  Preparing: "قيد التحضير",
  Ready: "جاهز — بانتظار مندوب",
  OutForDelivery: "في الطريق للعميل",
  Delivered: "تم التسليم",
  Cancelled: "ملغى",
};
