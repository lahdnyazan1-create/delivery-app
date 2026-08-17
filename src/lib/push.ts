// src/lib/push.ts
// ============================================================================
// تفعيل الإشعارات الفورية (FCM) لدى العميل:
//  1) طلب صلاحية الإشعارات من المستخدم
//  2) توليد توكن الجهاز وحفظه في users/{uid}.fcmTokens (مصفوفة تدعم عدة أجهزة)
//  3) مستمع الرسائل أثناء عمل التطبيق في المقدمة (الخلفية يتولاها الـ SW)
// ملاحظة iOS: يتطلب إضافة الموقع للشاشة الرئيسية (PWA) قبل ظهور طلب
// صلاحية الإشعارات — قيد من Apple نفسها.
// ============================================================================

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import app from "./firebase";
import { db } from "./firebase";
import { useAuthStore } from "@/store/useAuthStore";

let foregroundListenerAttached = false;

export async function enablePushNotifications(): Promise<{
  ok: boolean;
  message: string;
}> {
  const uid = useAuthStore.getState().user?.uid;
  if (!uid) return { ok: false, message: "يجب تسجيل الدخول أولاً" };

  if (typeof window === "undefined" || !("Notification" in window)) {
    return { ok: false, message: "جهازك أو متصفحك لا يدعم الإشعارات" };
  }

  const supported = await isSupported();
  if (!supported) {
    return { ok: false, message: "هذا المتصفح لا يدعم الإشعارات الفورية (جرّب Chrome)" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, message: "لم يتم منح صلاحية الإشعارات — يمكنك تفعيلها من إعدادات المتصفح" };
  }

  try {
    const messaging = getMessaging(app);
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || undefined;
    const swRegistration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });
    if (!token) {
      return { ok: false, message: "تعذّر توليد مفتاح الإشعارات لهذا الجهاز" };
    }

    // حفظ التوكن — arrayUnion يمنع التكرار ويحفظ أجهزة المستخدم كلها
    await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });

    attachForegroundListener();
    return { ok: true, message: "تم تفعيل الإشعارات على هذا الجهاز ✅" };
  } catch (error: any) {
    return {
      ok: false,
      message: `تعذّر التفعيل: ${error?.message || "خطأ غير معروف"}`,
    };
  }
}

/**رسائل أثناء فتح التطبيق — تنبيه Toast بدل إشعار نظام (التطبيق ظاهر أصلاً)*/
export function attachForegroundListener() {
  if (foregroundListenerAttached || typeof window === "undefined") return;
  foregroundListenerAttached = true;

  isSupported().then((supported) => {
    if (!supported) return;
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title;
      const body = payload.notification?.body;
      if (title) {
        // استيراد ديناميكي لتفادي دورة استيراد مع المخازن
        import("@/store/useToastStore").then(({ useToastStore }) => {
          useToastStore.getState().info(body ? `${title} — ${body}` : title);
        });
        navigator.vibrate?.([40, 40, 100]);
      }
    });
  });
}
