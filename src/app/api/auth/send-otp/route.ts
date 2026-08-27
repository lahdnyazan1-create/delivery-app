import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const OTP_TTL_MS = 5 * 60 * 1000;

/**
 * دالة لتنظيف الرقم وإرجاع الصيغة الدولية دون فرض مقدمة واحدة
 */
function cleanPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
}

/**
 * دالة للتحقق من أي المقدمتين (+970 أو +972) لديها حساب واتساب فعّال
 */
async function getValidWhatsAppChatId(
  rawPhone: string,
  idInstance: string,
  tokenInstance: string
): Promise<string> {
  const cleaned = cleanPhoneNumber(rawPhone);

  // إذا أدخل المستخدم الرقم كاملاً بالمقدمة (مثلاً: 97059xxx أو 97259xxx)
  if (cleaned.startsWith("970") || cleaned.startsWith("972")) {
    return `${cleaned}@c.us`;
  }

  // إذا كان الرقم محلياً (يبدأ بـ 05 أو 5)
  const localNum = cleaned.startsWith("05") ? cleaned.slice(1) : cleaned;

  const candidate970 = `970${localNum}`;
  const candidate972 = `972${localNum}`;

  // الاستعلام من Green API للتحقق من أيهما له حساب واتساب
  const checkUrl = `https://7107.api.greenapi.com/waInstance${idInstance}/checkWhatsApp/${tokenInstance}`;

  try {
    // 1. فحص مقدمة 970
    const res970 = await fetch(checkUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: candidate970 }),
    });
    const data970 = await res970.json();

    if (data970?.existsWhatsApp) {
      return `${candidate970}@c.us`;
    }

    // 2. فحص مقدمة 972
    const res972 = await fetch(checkUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber: candidate972 }),
    });
    const data972 = await res972.json();

    if (data972?.existsWhatsApp) {
      return `${candidate972}@c.us`;
    }
  } catch (err) {
    console.error("[Check WhatsApp Failed]:", err);
  }

  // افتراضي في حال عدم الربط أو حدوث خطأ
  return `${candidate970}@c.us`;
}

export async function POST(request: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin غير مهيأ على الخادم" },
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

    // تحديد الـ chatId الصحيح (سواء 970 أو 972)
    const chatId = await getValidWhatsAppChatId(
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

    const payload = {
      chatId: chatId,
      message: `رمز التحقق الخاص بك في Zest هو: ${code}`,
    };

    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Green API Send Error]:", data);
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
