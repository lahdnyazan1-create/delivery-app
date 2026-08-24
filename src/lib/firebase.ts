import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// تهيئة تطبيق Firebase ومنع التكرار
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// تفعيل App Check فقط في متصفح العميل (Client-side)
if (typeof window !== "undefined") {
  // تفعيل التوثيق في بيئة التطوير المحلية localhost (اختياري للـ Debugging)
  if (process.env.NODE_ENV === "development") {
    (self as any).FIREBASE_APPCHECK_EXECUTE_IN_SW = true;
    (self as any).self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (recaptchaSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "europe-west1");
export const storage = getStorage(app);

export default app;
