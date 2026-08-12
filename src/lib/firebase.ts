// src/lib/firebase.ts
// ============================================================================
// التعديل: إضافة تصدير storage (Firebase Storage) لدعم رفع صور المطاعم
// والمنتجات فعلياً بدل الاعتماد على روابط خارجية (Google Drive وغيره).
// يتطلب أن يكون NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET معرّفاً بملف .env.local
// (كان معرّفاً أصلاً بـ firebaseConfig تحت، فقط لم يكن يُستخدم).
// ============================================================================

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// ✅ App Check — يحمي المفاتيح العامة من الاستخدام الخارجي
// يتطلب إعداد reCAPTCHA v3 في Firebase Console
let appCheckInitialized = false;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// ✅ تهيئة App Check (async — لا تمنع التطبيق من العمل)
export async function initAppCheck() {
  if (appCheckInitialized || typeof window === "undefined") return;

  try {
    const { initializeAppCheck, ReCaptchaV3Provider } =
      await import("firebase/app-check");

    // استخدم متغير بيئة للمفتاح
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    // ⚠️ تم تعطيل App Check مؤقتاً لحل تعارض reCAPTCHA مع تسجيل الدخول
    /*
    if (siteKey) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckInitialized = true;
      console.log("✅ App Check initialized");
    } else {
      console.warn(
        "⚠️ App Check skipped: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set",
      );
    }
  } catch (err) {
    console.warn("⚠️ App Check failed:", err);
  }
}

export default app;
