// src/lib/firebase-admin.ts
// ============================================================================
// تهيئة Firebase Admin SDK لجهة الخادم فقط (Route Handlers / Server
// Components) — تُستخدم لإرسال رموز التحقق عبر WhatsApp (Twilio) وإصدار
// Custom Tokens لتسجيل الدخول، بالإضافة لجلب البيانات العامة أثناء SSR.
//
// بيانات الاعتماد عبر متغيرات البيئة:
//  - FIREBASE_ADMIN_PROJECT_ID
//  - FIREBASE_ADMIN_CLIENT_EMAIL
//  - FIREBASE_ADMIN_PRIVATE_KEY (مع تحويل \n إلى سطور فعلية)
// وإن غابا يتراجع إلى FIREBASE_SERVICE_ACCOUNT أو GOOGLE_APPLICATION_CREDENTIALS.
// إن فشلت التهيئة تُرجع المخارج null — والصفحات تتراجع لجلب العميل كالسابق،
// فلا يتعطل التطبيق أبداً بسبب الإعدادات.
// ============================================================================

import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let attempted = false;

/** يهيئ التطبيق مرة واحدة فقط إن لم يكن مهيأً بعد (admin.apps.length === 0) */
function ensureAdminInit(): boolean {
  if (attempted) return authInstance !== null && dbInstance !== null;
  attempted = true;

  try {
    if (getApps().length === 0) {
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

      if (projectId && clientEmail && privateKey) {
        initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
      } else {
        // تلقائي: يقرأ GOOGLE_APPLICATION_CREDENTIALS أو بيانات بيئة GCP
        initializeApp({ credential: applicationDefault() });
      }
    }
    authInstance = getAuth();
    dbInstance = getFirestore();
  } catch (error) {
    console.warn(
      "[firebase-admin] تعذّرت التهيئة — سيتم الاعتماد على جلب البيانات من العميل:",
      error instanceof Error ? error.message : error,
    );
    authInstance = null;
    dbInstance = null;
  }

  return authInstance !== null && dbInstance !== null;
}

// تهيئة فورية عند الاستيراد كي تكون المخارج جاهزة للمسارات
ensureAdminInit();

/** مصادقة Firebase Admin — null إذا فشلت التهيئة (تحقق قبل الاستخدام) */
export const adminAuth: Auth | null = authInstance;

/** Firestore بصلاحيات Admin — null إذا فشلت التهيئة (تحقق قبل الاستخدام) */
export const adminDb: Firestore | null = dbInstance;

/**
 * واجهة متوافقة مع الاستهلاك القديم في server-data.ts:
 * تعيد Firestore أو null، وتعيد محاولة التهيئة إن لم تُجرَّب بعد.
 */
export function getAdminDb(): Firestore | null {
  ensureAdminInit();
  return dbInstance;
}
