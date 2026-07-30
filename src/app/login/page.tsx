"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";

/**
 * تحويل رقم محلي إلى صيغة E.164
 * - يزيل المسافات والرموز
 * - يحتفظ بكود الدولة إذا كان موجوداً مسبقاً
 * - يضيف كود الدولة الافتراضي إذا لم يكن موجوداً
 */
function toE164(localPhone: string, countryCode = "+970"): string {
  const digits = localPhone.replace(/[^\d+]/g, "");

  // إذا كان الرقم يبدأ بـ +، نفترض أنه يحتوي على كود دولة
  if (digits.startsWith("+")) {
    return digits;
  }

  // إذا كان الرقم يبدأ بكود دولة بدون + (مثل 970)
  if (
    digits.startsWith("970") ||
    digits.startsWith("972") ||
    digits.startsWith("966")
  ) {
    return `+${digits}`;
  }

  // إزالة الصفر البادئ فقط إذا كان الرقم المحلي
  const withoutLeadingZero = digits.replace(/^0/, "");
  return `${countryCode}${withoutLeadingZero}`;
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/profile";
  const { completePhoneLogin } = useAppStore();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

  const ensureRecaptcha = () => {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        },
      );
    }
    return recaptchaRef.current;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("الرجاء إدخال الاسم الكامل");
      return;
    }
    setLoading(true);
    try {
      const verifier = ensureRecaptcha();
      const e164Phone = toE164(phone);
      const confirmation = await signInWithPhoneNumber(
        auth,
        e164Phone,
        verifier,
      );
      confirmationRef.current = confirmation;
      setStep("otp");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "تعذّر إرسال رمز التحقق";
      setError(message);
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!confirmationRef.current) {
      setError("انتهت الجلسة، الرجاء إعادة إرسال الرمز");
      setStep("phone");
      return;
    }
    setLoading(true);
    try {
      const credential = await confirmationRef.current.confirm(otp);
      const result = await completePhoneLogin(credential.user, fullName);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // ✅ حماية من Open Redirect
      const allowedPaths = [
        "/",
        "/profile",
        "/cart",
        "/order-tracking",
        "/admin",
        "/driver",
        "/restaurant",
      ];
      const safeNext = allowedPaths.some((p) => next.startsWith(p))
        ? next
        : "/profile";
      router.replace(safeNext);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "رمز التحقق غير صحيح";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-safe" dir="rtl">
      <button
        type="button"
        onClick={() => router.back()}
        className="no-select touch-target mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted"
      >
        <ArrowLeft className="size-4" /> رجوع
      </button>

      <h1 className="text-2xl font-extrabold">تسجيل الدخول</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        {step === "phone"
          ? "أدخل اسمك ورقم جوالك، وسنرسل لك رمز تحقق عبر رسالة نصية"
          : `أدخل رمز التحقق المرسل إلى ${phone}`}
      </p>

      {step === "phone" ? (
        <form
          onSubmit={handleSendCode}
          className="glass mt-6 space-y-3 rounded-3xl p-5"
        >
          <label className="block text-xs font-semibold text-foreground-muted">
            الاسم الكامل
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-glass-border bg-secondary px-3 py-3 text-sm text-foreground outline-none"
              placeholder="مثال: يزيد اللهالي"
              autoComplete="name"
              required
            />
          </label>
          <label className="block text-xs font-semibold text-foreground-muted">
            رقم الجوال
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-glass-border bg-secondary px-3 py-3 text-sm text-foreground outline-none"
              placeholder="05XXXXXXXX"
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </label>
          {error && <p className="text-xs text-primary">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? "جارِ الإرسال..." : "إرسال رمز التحقق"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleVerifyCode}
          className="glass mt-6 space-y-3 rounded-3xl p-5"
        >
          <label className="block text-xs font-semibold text-foreground-muted">
            رمز التحقق (6 أرقام)
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-glass-border bg-secondary px-3 py-3 text-center text-lg tracking-[0.5em] text-foreground outline-none"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              required
            />
          </label>
          {error && <p className="text-xs text-primary">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? "جارِ التحقق..." : "تأكيد ودخول"}
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="w-full text-center text-xs font-semibold text-foreground-muted"
          >
            تغيير رقم الجوال
          </button>
        </form>
      )}

      <div id="recaptcha-container" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AppShell hideNav hideHeader>
      <Suspense
        fallback={
          <p className="pt-safe text-sm text-foreground-muted">Loading…</p>
        }
      >
        <LoginForm />
      </Suspense>
    </AppShell>
  );
}
