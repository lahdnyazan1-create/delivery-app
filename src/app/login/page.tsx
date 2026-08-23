"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { AppShell } from "@/components/layout/AppShell";
import { auth, db } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";

/**
 * معيار رقم الهاتف الدولي E.164
 * - رقم يبدأ بـ 0 (مثل 0598531267)            → +970598531267
 * - رقم يبدأ بـ 00 (مثل 00970598531267)       → +970598531267
 * - رقم يبدأ بـ +970/+972/+966                 → يبقى دون تغيير
 * - رمز الدولة الافتراضي: +970 (فلسطين)
 */
function normalizePhoneE164(input: string, defaultCountryCode = "+970"): string {
  const trimmed = input.trim();
  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");

  if (hadPlus) return `+${digits}`;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^(970|972|966)/.test(digits)) return `+${digits}`;
  digits = digits.replace(/^0+/, "");
  return `${defaultCountryCode}${digits}`;
}

/** ترجمة أكواد أخطاء Firebase Auth إلى رسائل عربية مفهومة */
function friendlyAuthError(err: unknown): string {
  const anyErr = err as { code?: string; message?: string };
  const code = anyErr?.code || "";
  console.error("[Login] فشل تسجيل الدخول — التفاصيل الكاملة:", err);

  switch (code) {
    case "auth/invalid-phone-number":
      return "رقم الجوال غير صالح — تأكد من الصيغة الدولية (+970)";
    case "auth/too-many-requests":
      return "محاولات كثيرة جدا — انتظر قليلا ثم أعد المحاولة";
    case "auth/quota-exceeded":
      return "تم استنفاد حصة الرسائل اليوم — أعِد المحاولة لاحقا";
    case "auth/captcha-check-failed":
      return "فشل التحقق الأمني (reCAPTCHA) — أعد المحاولة";
    case "auth/invalid-app-credential":
      return "خطأ في تهيئة مفتاح التطبيق — تواصل مع الدعم";
    case "auth/code-expired":
      return "انتهت صلاحية الرمز — أرسل رمزا جديدا";
    case "auth/invalid-verification-code":
      return "رمز التحقق غير صحيح — تأكد من الأرقام الستة";
    case "auth/internal-error":
      return "خطأ داخلي من الخادم — تأكد من الإعدادات ثم أعد المحاولة";
    case "auth/unauthorized-domain":
      return "النطاق غير مصرح به في Firebase Console";
    default:
      return anyErr?.message || "تعذّر إتمام العملية — أعد المحاولة";
  }
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/profile";
  const { completePhoneLogin } = useAppStore();

  const [step, setStep] = useState<"phone" | "otp" | "name">("phone");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const pendingUserRef = useRef<FirebaseUser | null>(null);
  // ✅ يمنع Strict Mode من إنشاء أكثر من متحقق واحد عند إعادة التركيب السريع
  const creatingRef = useRef(false);

  const RECAPTCHA_ID = "recaptcha-container";

  /**
   * ✅ متحقق reCAPTCHA خفي (invisible) — تُنشأ نسخة واحدة فقط على العنصر
   * الثابت id=recaptcha-container، وتُستبدل بنسخة جديدة بعد كل فشل
   * (المتحقق القديم بعد الفشل يرفض إعادة الاستخدام في SDK الحديث)
   */
  const ensureVerifier = (): RecaptchaVerifier | null => {
    if (typeof window === "undefined") return null;
    if (recaptchaRef.current) return recaptchaRef.current;
    const container = document.getElementById(RECAPTCHA_ID);
    if (!container) {
      console.error(`[Login] عنصر الحاوية #${RECAPTCHA_ID} غير موجود في DOM`);
      return null;
    }
    // تفريغ أي بقاياกราฟية من متحقق سابق (إن وجدت)
    container.innerHTML = "";
    try {
      creatingRef.current = true;
      recaptchaRef.current = new RecaptchaVerifier(auth, container, {
        size: "invisible",
      });
      return recaptchaRef.current;
    } catch (err) {
      console.error("[Login] فشل إنشاء متحقق reCAPTCHA:", err);
      return null;
    } finally {
      creatingRef.current = false;
    }
  };

  /** يمسح المتحقق الحالي بعد فشل الطلب ليتمكن المستخدم من الإعادة */
  const clearVerifier = () => {
    if (!recaptchaRef.current) return;
    try {
      recaptchaRef.current.clear();
    } catch (err) {
      console.warn("[Login] تنظيف reCAPTCHA رمى خطأ:", err);
    }
    recaptchaRef.current = null;
  };

  useEffect(() => {
    // إنشاء مبكر ليكتمل تحميل سكربت reCAPTCHA قبل ضغط المستخدم
    ensureVerifier();
    return () => {
      // ✅ StrictMode/HMR: نظف نسخة هذه الجلسة فقط عند التفكيك
      try {
        recaptchaRef.current?.clear();
      } catch {
        /* تجاهل أخطاء التنظيف أثناء التفكيك */
      }
      recaptchaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishLogin = async (firebaseUser: FirebaseUser, name: string) => {
    const result = await completePhoneLogin(firebaseUser, name);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const allowedPaths = [
      "/",
      "/profile",
      "/cart",
      "/order-tracking",
      "/admin",
      "/driver",
      "/vendor",
    ];
    const safeNext = allowedPaths.some((p) => next.startsWith(p)) ? next : "/profile";
    router.replace(safeNext);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // 1) معيار E.164 قبل أي شيء آخر
    const e164Phone = normalizePhoneE164(phone);
    if (!/^\+\d{8,15}$/.test(e164Phone)) {
      setError("رقم غير صالح — أدخله بالصيغة 05XXXXXXXX أو +970XXXXXXXXX");
      setLoading(false);
      return;
    }

    const verifier = ensureVerifier();
    if (!verifier) {
      console.error("[Login] لا يوجد متحقق reCAPTCHA — قد يكون عنصر الحاوية مفقودا");
      setError("تعذّر تحميل حماية الدخول — حدّث الصفحة وأعد المحاولة");
      setLoading(false);
      return;
    }

    try {
      const confirmation = await signInWithPhoneNumber(auth, e164Phone, verifier);
      confirmationRef.current = confirmation;
      setStep("otp");
    } catch (err: unknown) {
      // ✅ طباعة الخطأ التفصيلي للمطور + رسالة مفهومة للمستخدم
      console.error("[Login] فشل إرسال الرمز:", err);
      setError(friendlyAuthError(err));
      // ✅ المتحقق المستهلك بعد الفشل لا يصلح لإعادة الاستخدام — استبدله
      clearVerifier();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOtp("");
    setError("");
    setStep("phone");
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!confirmationRef.current) {
      setError("انتهت الجلسة، الرجاء إعادة إرسال الرمز");
      setStep("phone");
      return;
    }
    if (otp.trim().length < 6) {
      setError("أدخل رمز التحقق كاملا (6 أرقام)");
      return;
    }
    setLoading(true);
    try {
      const credential = await confirmationRef.current.confirm(otp.trim());
      const existingSnap = await getDoc(doc(db, "users", credential.user.uid));
      if (existingSnap.exists()) {
        // ✅ تمرير نص فارغ آمن تماما للمستخدمين الحاليين
        await finishLogin(credential.user, "");
      } else {
        pendingUserRef.current = credential.user;
        setStep("name");
      }
    } catch (err: unknown) {
      console.error("[Login] فشل التحقق من الرمز:", err);
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("الرجاء إدخال الاسم الكامل");
      return;
    }
    if (!pendingUserRef.current) {
      setError("انتهت الجلسة، الرجاء البدء من جديد");
      setStep("phone");
      return;
    }
    setLoading(true);
    try {
      await finishLogin(pendingUserRef.current, fullName.trim());
    } catch (err) {
      console.error("[Login] فشل إكمال إنشاء الحساب:", err);
      setError("تعذّر حفظ الاسم — أعد المحاولة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-safe" dir="rtl">
      <button type="button" onClick={() => router.back()} className="no-select touch-target mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted">
        <ArrowLeft className="size-4" /> رجوع
      </button>

      <h1 className="text-2xl font-extrabold">تسجيل الدخول</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        {step === "phone" && "أدخل رقم جوالك، وسنرسل لك رمز تحقق عبر رسالة نصية"}
        {step === "otp" && `أدخل رمز التحقق المرسل إلى ${e164Preview(phone)}`}
        {step === "name" && "أهلاً بك لأول مرة! ما اسمك الكامل؟"}
      </p>

      {step === "phone" && (
        <form onSubmit={handleSendCode} className="glass mt-6 space-y-3 rounded-3xl p-5">
          <label className="block text-xs font-semibold text-foreground-muted">
            رقم الجوال
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-glass-border bg-secondary px-3 py-3 text-sm text-foreground outline-none"
              placeholder="05XXXXXXXX أو +970..."
              inputMode="tel"
              autoComplete="tel"
              autoFocus
              required
            />
          </label>
          {error && <p className="text-xs font-semibold text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60">
            {loading ? "جارِ الإرسال..." : "إرسال رمز التحقق"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyCode} className="glass mt-6 space-y-3 rounded-3xl p-5">
          <label className="block text-xs font-semibold text-foreground-muted">
            رمز التحقق (6 أرقام)
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="mt-1.5 w-full rounded-xl border border-glass-border bg-secondary px-3 py-3 text-center text-lg tracking-[0.5em] text-foreground outline-none"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              required
            />
          </label>
          {error && <p className="text-xs font-semibold text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60">
            {loading ? "جارِ التحقق..." : "تأكيد ودخول"}
          </button>
          <button type="button" onClick={handleResend} className="w-full text-center text-xs font-semibold text-foreground-muted">
            تغيير الرقم / إعادة إرسال الرمز
          </button>
        </form>
      )}

      {step === "name" && (
        <form onSubmit={handleSubmitName} className="glass mt-6 space-y-3 rounded-3xl p-5">
          <label className="block text-xs font-semibold text-foreground-muted">
            الاسم الكامل
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-glass-border bg-secondary px-3 py-3 text-sm text-foreground outline-none"
              placeholder="مثال: يزيد اللهالي"
              autoComplete="name"
              autoFocus
              required
            />
          </label>
          {error && <p className="text-xs font-semibold text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60">
            {loading ? "جارِ الحفظ..." : "متابعة"}
          </button>
        </form>
      )}

      {/* ✅ عنصر HTML ثابت لمتحقق reCAPTCHA الخفي — يجب أن يبقى موجوداً
          في كل خطوات الصفحة ودون أي شروط عرض أو إخفاء */}
      <div id="recaptcha-container" aria-hidden="true"></div>
    </div>
  );
}

/** يعرض الرقم بعد تحويله إلى E.164 في عنوان الخطوة الثانية */
function e164Preview(raw: string): string {
  try {
    return normalizePhoneE164(raw);
  } catch {
    return raw;
  }
}

export default function LoginPage() {
  return (
    <AppShell hideNav hideHeader>
      <Suspense fallback={<p className="pt-safe text-sm text-foreground-muted">جارِ التحميل…</p>}>
        <LoginForm />
      </Suspense>
    </AppShell>
  );
}
