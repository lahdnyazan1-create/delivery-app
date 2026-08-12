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

function toE164(localPhone: string, countryCode = "+970"): string {
  const digits = localPhone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (
    digits.startsWith("970") ||
    digits.startsWith("972") ||
    digits.startsWith("966")
  ) {
    return `+${digits}`;
  }
  const withoutLeadingZero = digits.replace(/^0/, "");
  return `${countryCode}${withoutLeadingZero}`;
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

  // ✅ تهيئة reCAPTCHA مرة واحدة فقط عند تحميل الصفحة لتفادي خطأ -39
  useEffect(() => {
    try {
      // ✅ تمرير مفتاح reCAPTCHA v2 لحل مشكلة النطاقات المخصصة (Vercel)
      const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "normal",
        callback: () => {},
        "expired-callback": () => {
          setError("انتهت صلاحية التحقق، يرجى تحديث الصفحة والمحاولة مجدداً.");
        }
      }, siteKey as string);
      
      // يجب استدعاء render صراحةً لضمان ظهور الكابتشا في المتصفح
      if (typeof recaptchaRef.current.render === "function") {
        recaptchaRef.current.render().catch((err) => console.error(err));
      }      
    } catch (e) {
      console.error("Recaptcha initialization error:", e);
    }

    return () => {
      // تنظيف الكائن عند مغادرة الصفحة فقط
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch (e) {}
        recaptchaRef.current = null;
      }
    };
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
    const safeNext = allowedPaths.some((p) => next.startsWith(p))
      ? next
      : "/profile";
    router.replace(safeNext);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const verifier = recaptchaRef.current;
      if (!verifier) {
        setError("خطأ في تحميل حماية الدخول. يرجى تحديث الصفحة.");
        setLoading(false);
        return;
      }
      
      const e164Phone = toE164(phone);
      const confirmation = await signInWithPhoneNumber(auth, e164Phone, verifier);
      confirmationRef.current = confirmation;
      setStep("otp");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "تعذّر إرسال رمز التحقق";
      setError(message);
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

      const existingSnap = await getDoc(doc(db, "users", credential.user.uid));
      if (existingSnap.exists()) {
        await finishLogin(credential.user, "");
      } else {
        pendingUserRef.current = credential.user;
        setStep("name");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "رمز التحقق غير صحيح";
      setError(message);
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
        {step === "phone" && "أدخل رقم جوالك، وسنرسل لك رمز تحقق عبر رسالة نصية"}
        {step === "otp" && `أدخل رمز التحقق المرسل إلى ${phone}`}
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
              placeholder="05XXXXXXXX"
              inputMode="tel"
              autoComplete="tel"
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
          {error && <p className="text-xs text-primary">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {loading ? "جارِ الحفظ..." : "متابعة"}
          </button>
        </form>
      )}

      {/* حاوية الكابتشا يجب أن تبقى في الـ DOM دائماً */}
      <div id="recaptcha-container" className="mt-4"></div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AppShell hideNav hideHeader>
      <Suspense
        fallback={<p className="pt-safe text-sm text-foreground-muted">جارِ التحميل…</p>}
      >
        <LoginForm />
      </Suspense>
    </AppShell>
  );
}
