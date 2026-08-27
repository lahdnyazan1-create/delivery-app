import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const OTP_TTL_MS = 5 * 60 * 1000; // مدة صلاحية الرمز (5 دقائق)

/**
 * دالة لتنظيف الرقم وتنسيقه حسب صيغة Green API (مثال: 97259xxxxxxx)
 */
function formatPhoneNumberForGreenAPI(phone: string): string {
  // إزالة الأقواس، المسافات، الشرطات، وعلامة +
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");

  // إذا بدأ بـ 00، قم بإزالتها
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }

  // تحويل الأرقام المحلية التي تبدأ بـ 05 إلى المقدمة الدولية 972
  if (cleaned.startsWith("05")) {
    cleaned = "972" + cleaned.slice(1);
  } else if (cleaned.startsWith("5")) {
    cleaned = "972" + cleaned;
  }

  return cleaned;
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

    // 1) تنظيف الرقم وتجهيز الـ chatId الخاص بـ Green API
    const formattedPhone = formatPhoneNumberForGreenAPI(rawPhone);
    const chatId = `${formattedPhone}@c.us`;

    // 2) بيانات الحساب من ملف البيئة .env.local (أو قيم افتراضية)
    const idInstance = process.env.GREEN_API_ID_INSTANCE || "710722720854";
    const tokenInstance =
      process.env.GREEN_API_TOKEN_INSTANCE ||
      "a24617774db045c89faf404a141868036548e27145d9498baf";

    // 3) توليد رمز تحقق عشوائي من 6 أرقام
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // 4) حفظ الرمز في Firestore للتحقق منه لاحقاً
    const now = Date.now();
    await adminDb.collection("otp_codes").doc(rawPhone).set({
      code,
      createdAt: now,
      expiresAt: now + OTP_TTL_MS,
    });

    // 5) إرسال الرسالة عبر Green API (طريقة مطابقة لـ requests في بايثون)
    const url = `https://7107.api.greenapi.com/waInstance${idInstance}/sendMessage/${tokenInstance}`;

    const payload = {
      chatId: chatId,
      message: `رمز التحقق الخاص بك في Zest هو: ${code}`,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Green API Error]:", data);
      return NextResponse.json(
        { success: false, error: "فشل إرسال الرسالة عبر Green API" },
        { status: 500 }
      );
    }

    console.log("[Green API Success]:", data);

    return NextResponse.json({ success: true, phone: formattedPhone });
  } catch (error) {
    console.error("[send-otp Error]:", error);
    const message = error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json(
      { success: false, error: `تعذّر إرسال الرمز: ${message}` },
      { status: 500 }
    );
  }
}
