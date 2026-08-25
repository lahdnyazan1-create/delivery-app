// src/app/api/auth/send-otp/route.ts
// ============================================================================
// يرسل رمز تحقق (OTP) من 6 أرقام عبر WhatsApp باستخدام Twilio، ويخزنه في
// Firestore ضمن مجموعة otp_codes (مع صلاحية 5 دقائق) ليتحقق منه مسار
// /api/auth/verify-otp لاحقاً.
// ============================================================================

import { NextResponse } from "next/server";
import twilio from "twilio";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

/** صلاحية رمز التحقق: 5 دقائق */
const OTP_TTL_MS = 5 * 60 * 1000;

/** يبقي الرقم بصيغة E.164 الدولية فقط (+ ثم 8-15 رقماً) */
function isValidE164(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone);
}

export async function POST(request: Request) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin غير مهيأ على الخادم — تحقق من متغيرات البيئة" },
        { status: 500 },
      );
    }

    let body: { phoneNumber?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "جسم الطلب غير صالح — يجب أن يكون JSON" },
        { status: 400 },
      );
    }

    const phoneNumber = body.phoneNumber?.trim() ?? "";
    if (!isValidE164(phoneNumber)) {
      return NextResponse.json(
        { success: false, error: "رقم الهاتف غير صالح — يجب أن يكون بالصيغة الدولية مثل +970598531267" },
        { status: 400 },
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const rawWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (!accountSid || !authToken || !rawWhatsAppNumber) {
      return NextResponse.json(
        { success: false, error: "إعدادات Twilio ناقصة على الخادم" },
        { status: 500 },
      );
    }

    // 1) توليد رمز من 6 أرقام
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // 2) تخزين الرمز في Firestore بصلاحية 5 دقائق
    const now = Date.now();
    await adminDb.collection("otp_codes").doc(phoneNumber).set({
      code,
      createdAt: now,
      expiresAt: now + OTP_TTL_MS,
    });

    // 3) إرسال الرمز عبر WhatsApp (المتغير قد يحوي البادئة مسبقاً أو لا)
    const from = rawWhatsAppNumber.startsWith("whatsapp:")
      ? rawWhatsAppNumber
      : `whatsapp:${rawWhatsAppNumber}`;
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      from,
      to: `whatsapp:${phoneNumber}`,
      body: `رمز التحقق الخاص بك هو: ${code} — صالح لمدة 5 دقائق. لا تشاركه مع أحد.`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[send-otp] فشل إرسال الرمز:", error);
    const message = error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json(
      { success: false, error: `تعذّر إرسال رمز التحقق: ${message}` },
      { status: 500 },
    );
  }
}
