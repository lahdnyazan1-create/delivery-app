// src/lib/firebase-admin.ts
// ============================================================================
// تهيئة محمية لـ Firebase Admin SDK لجهة خادم Next.js فقط (Server
// Components / Route Handlers). تُستخدم لجلب بيانات عامة (مطاعم/أطباق)
// أثناء الـ SSR لتحسين SEO وسرعة الطلاء الأول.
//
// بيانات الاعتماد — أحد الخيارين:
//  1) FIREBASE_SERVICE_ACCOUNT: سلسلة JSON للمفتاح كاملاً (موصى به في الإنتاج)
//  2) GOOGLE_APPLICATION_CREDENTIALS: مسار ملف المفتاح (applicationDefault)
// إن غابا أو فشلت التهيئة تُرجع null — والصفحات تتراجع لجلب العميل كالسابق،
// فلا يتعطل التطبيق أبداً بسبب الإعدادات.
// ============================================================================

import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let dbInstance: Firestore | null = null;
let attempted = false;

export function getAdminDb(): Firestore | null {
  if (attempted) return dbInstance;
  attempted = true;

  try {
    if (!getApps().length) {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (serviceAccountJson) {
        initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
      } else {
        // تلقائي: يقرأ GOOGLE_APPLICATION_CREDENTIALS أو بيانات بيئة GCP
        initializeApp({ credential: applicationDefault() });
      }
    }
    dbInstance = getFirestore();
  } catch (error) {
    console.warn(
      "[firebase-admin] تعذّرت التهيئة — سيتم الاعتماد على جلب البيانات من العميل:",
      error instanceof Error ? error.message : error,
    );
    dbInstance = null;
  }

  return dbInstance;
}
