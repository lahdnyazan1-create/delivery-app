import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const OTP_TTL_MS = 5 * 60 * 1000; // صلاحية الرمز 5 دقائق

/**
 * تنظيف الرقم واستخراج الرقم بدون مقدمة محليّة
 */
function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("05")) cleaned = cleaned.slice(1);
  return cleaned;
}

/**
 * جلب chatId الصحيح للواتساب مع اعتماد 972 كافتراضي
 */
async function getWhatsAppChatId(
  rawPhone: string,
  idInstance: string,
  tokenInstance: string
): Promise<string> {
  let cleaned = rawPhone.replace(/[\s\-\(\)\+]/g, "");
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);

  // إذا أدخل المستخدم المقدمة بيده صراحة (+970 أو +972)
  if (cleaned.startsWith("970")) return `${cleaned}@c.us`;
  if (cleaned.startsWith("972")) return `${cleaned}@c.us`;

  const baseNumber = cleanPhoneNumber(rawPhone);

  // فحص الحساب عبر Green API لارسال الرمز للمقدمة الشغالة فعلياً
  const checkUrl = `https://7107.api.greenapi.com/waInstance${idInstance}/checkWhatsApp/${tokenInstance}`;

  // 1) الفحص على 972 أولاً (الافتراضي)
  try {
    const res972 = await fetch(checkUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: `972${baseNumber}` }),
    });
    const data972 = await res972.json();
    if (data972?.existsWhatsApp) return `972${baseNumber}@c.us`;
  } catch (e) {}

  // 2) الفحص على 970 كخيار ثانٍ
  try {
    const res970 = await fetch(checkUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: `970${baseNumber}` }),
    });
    const data970 = await res970.json();
    if (data970?.existsWhatsApp) return `970${baseNumber}@c.us`;
  } catch (e) {}

  // 3) الافتراضي النهائي: 972
  return `972${baseNumber}@c.us`;
}

export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin غير مهيأ" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const rawPhone = body.phoneNumber?.trim() ?? "";

    if (!rawPhone) {
      return NextResponse.json(
        { success: false, error: "رقم الهاتف مطلوب" },
        { status: 400 }
      );
    }

    const idInstance = process.env.GREEN_API_ID_INSTANCE || "710722720854";
    const tokenInstance =
      process.env.GREEN_API_TOKEN_INSTANCE ||
      "a24617774db045c89faf404a141868036548e27145d9498baf";

    // تحديد الـ chatId مع جعل 972 هو الافتراضي
    const chatId = await getWhatsAppChatId(
      rawPhone,
      idInstance,
      tokenInstance
    );

    // توليد رمز تحقق عشوائي
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // حفظ الرمز في Firestore
    const now = Date.now();
    await adminDb.collection("otp_codes").doc(rawPhone).set({
      code,
      createdAt: now,
      expiresAt: now + OTP_TTL_MS,
    });

    // إرسال الرسالة عبر Green API
    const sendUrl = `https://7107.api.greenapi.com/waInstance${idInstance}/sendMessage/${tokenInstance}`;

    const response = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: chatId,
        message: `رمز التحقق الخاص بك في Zest هو: ${code}`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Green API Error]:", data);
      return NextResponse.json(
        { success: false, error: "فشل إرسال الرسالة عبر Green API" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, targetChatId: chatId });
  } catch (error) {
    console.error("[send-otp Error]:", error);
    const message = error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json(
      { success: false, error: `تعذّر إرسال الرمز: ${message}` },
      { status: 500 }
    );
  }
}
