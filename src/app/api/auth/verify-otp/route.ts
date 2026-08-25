// src/app/api/auth/verify-otp/route.ts
// ============================================================================
// يتحقق من رمز OTP المرسل عبر WhatsApp: يقرأ الرمز المخزن في
// otp_codes/${phoneNumber}، يتأكد من الصلاحية والتطابق، يحذفه، ثم يبحث عن
// المستخدم في Firebase Auth (أو ينشئه إن لم يوجد) ويصدر Custom Token
// ليسجل العميل دخوله مباشرة عبر signInWithCustomToken.
// ============================================================================

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin غير مهيأ على الخادم — تحقق من متغيرات البيئة" },
        { status: 500 },
      );
    }

    let body: { phoneNumber?: string; code?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "جسم الطلب غير صالح — يجب أن يكون JSON" },
        { status: 400 },
      );
    }

    const phoneNumber = body.phoneNumber?.trim() ?? "";
    const code = body.code?.trim() ?? "";
    if (!phoneNumber || !/^\+\d{8,15}$/.test(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: "رقم الهاتف غير صالح" },
        { status: 400 },
      );
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, error: "رمز التحقق يجب أن يكون 6 أرقام" },
        { status: 400 },
      );
    }

    // 1) قراءة الرمز المخزن والتحقق من الصلاحية والتطابق
    const otpRef = adminDb.collection("otp_codes").doc(phoneNumber);
    const snap = await otpRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: "لا يوجد رمز تحقق لهذا الرقم — أرسل رمزا جديدا" },
        { status: 400 },
      );
    }

    const data = snap.data() as { code?: string; expiresAt?: number };
    if (!data.expiresAt || Date.now() > data.expiresAt) {
      await otpRef.delete().catch(() => {});
      return NextResponse.json(
        { success: false, error: "انتهت صلاحية الرمز — أرسل رمزا جديدا" },
        { status: 400 },
      );
    }

    if (data.code !== code) {
      return NextResponse.json(
        { success: false, error: "رمز التحقق غير صحيح — تأكد من الأرقام الستة" },
        { status: 400 },
      );
    }

    // 2) الرمز صحيح — احذفه فورا لضمان استخدام واحد فقط
    await otpRef.delete();

    // 3) ابحث عن المستخدم برقم الهاتف أو أنشئه إن لم يوجد
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByPhoneNumber(phoneNumber);
    } catch (err) {
      const errCode = (err as { code?: string })?.code;
      if (errCode === "auth/user-not-found") {
        userRecord = await adminAuth.createUser({ phoneNumber });
      } else {
        throw err;
      }
    }

    // 4) أصدر Custom Token ليسجل العميل دخوله في Firebase Auth
    const customToken = await adminAuth.createCustomToken(userRecord.uid);

    return NextResponse.json({ success: true, customToken });
  } catch (error) {
    console.error("[verify-otp] فشل التحقق:", error);
    const message = error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json(
      { success: false, error: `تعذّر إتمام التحقق: ${message}` },
      { status: 500 },
    );
  }
}
