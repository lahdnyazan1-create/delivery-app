// src/app/api/push-config/route.ts
// ============================================================================
// يخدم إعدادات Firebase العامة لـ Service Worker الخاص بالإشعارات
// (firebase-messaging-sw.js لا يستطيع قراءة متغيرات البيئة، فيجلبها
// من هنا). هذه الإعدادات عامة أصلاً وغير سرية.
// ============================================================================

import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}
