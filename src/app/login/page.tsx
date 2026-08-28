"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { signInWithCustomToken, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { AppShell } from "@/components/layout/AppShell";
import { auth, db } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";
import { applyReferralCode } from "@/lib/orders";

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

/** يعرض الرقم بعد تحويله إلى E.164 في عنوان خطوة إدخال الرمز */
function e164Preview(raw: string): string {
  try {
    return normalizePhoneE164(raw);
  } catch {
    return raw;
  }
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/profile";
  const { completePhoneLogin } = useAppStore();

  // خطوات الدخول: إدخال الرقم ← إدخال رمز WhatsApp ← الاسم (لأول مرة فقط)
  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  // ✅ كود دعوة الشوفير — اختياري، يُربط بالحساب مرة واحدة عند أول تسجيل
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // الرقم بصيغة E.164 المثبتة بعد الإرسال، ومستخدم أول مرة ينتظر إدخال اسمه
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pendingUser, setPendingUser] = useState<FirebaseUser | null>(null);

  const finishLogin = async (
    firebaseUser: FirebaseUser,
    name: string,
    withInviteCode?: string,
  ) => {
    const result = await completePhoneLogin(firebaseUser, name);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    // ✅ كود الدعوة (أول تسجيل فقط): يُربط بالحساب قبل التحويل حتى تتوجه
    //    كل طلبات الزبون للشوفير صاحب الكود. عند فشل الربط يبقى المستخدم
    //    في هذه الشاشة ليصحح الكود أو يمسحه ويتابع بدونه
    if (withInviteCode && withInviteCode.trim()) {
      const applied = await applyReferralCode(withInviteCode);
      if (!applied.ok) {
        setError(`${applied.message} — صحّح الكود أو امسحه للمتابعة بدونه`);
        return;
      }
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

  /** إرسال رمز التحقق عبر WhatsApp من خلال مسار الخادم */
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const e164Phone = normalizePhoneE164(phone);
    if (!/^\+\d{8,15}$/.test(e164Phone)) {
      setError("رقم غير صالح — أدخله بالصيغة 05XXXXXXXX أو +970XXXXXXXXX");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: e164Phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.error || "تعذّر إرسال الرمز — أعد المحاولة");
        return;
      }
      setPhoneNumber(e164Phone);
      setCode("");
      setStep("code");
    } catch (err) {
      console.error("[Login] فشل إرسال الرمز:", err);
      setError("تعذّر الاتصال بالخادم — تحقق من الإنترنت وأعد المحاولة");
    } finally {
      setLoading(false);
    }
  };

  /** التحقق من الرمز ثم الدخول بـ Custom Token من الخادم */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.trim().length !== 6) {
      setError("أدخل رمز التحقق كاملا (6 أرقام)");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code: code.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.customToken) {
        setError(data?.error || "رمز التحقق غير صحيح — تأكد من الأرقام الستة");
        return;
      }

      // الدخول في Firebase Auth مباشرة بالرمز المخصص
      const credential = await signInWithCustomToken(auth, data.customToken);
      const existingSnap = await getDoc(doc(db, "users", credential.user.uid));
      if (existingSnap.exists()) {
        // ✅ تمرير نص فارغ آمن تماما للمستخدمين الحاليين
        await finishLogin(credential.user, "");
      } else {
        setPendingUser(credential.user);
        setStep("name");
      }
    } catch (err) {
      console.error("[Login] فشل التحقق من الرمز:", err);
      setError("تعذّر إتمام الدخول — أعد المحاولة أو أرسل رمزا جديدا");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setCode("");
    setError("");
    setStep("phone");
  };

  const handleSubmitName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) {
      setError("الرجاء إدخال الاسم الكامل");
      return;
    }
    if (!pendingUser) {
      setError("انتهت الجلسة، الرجاء البدء من جديد");
      setStep("phone");
      return;
    }
    setLoading(true);
    try {
      await finishLogin(pendingUser, fullName.trim(), inviteCode);
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
        {step === "phone" && "أدخل رقم جوالك، وسنرسل لك رمز تحقق عبر واتساب"}
        {step === "code" && `أدخل رمز التحقق المرسل عبر واتساب إلى ${e164Preview(phoneNumber || phone)}`}
        {step === "name" && "أهلاً بك لأول مرة! ما اسمك الكامل؟"}
      </p>

      {step === "phone" && (
        <form onSubmit={handleSendOTP} className="glass mt-6 space-y-3 rounded-3xl p-5">
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
            {loading ? "جارِ الإرسال..." : "إرسال رمز التحقق عبر واتساب"}
          </button>
          {/* ✅ مطلوب لمراجعة Google OAuth: إفصاح بأن المتابعة موافقة على
              الشروط والسياسة، مع روابط فعلية قابلة للفتح */}
          <p className="text-center text-[11px] leading-relaxed text-foreground-muted">
            متابعة التسجيل تعني موافقتك على{" "}
            <a
              href="https://zest-delivery-97e51.web.app/terms.html"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-primary"
            >
              شروط الاستخدام
            </a>{" "}
            و{" "}
            <a
              href="https://zest-delivery-97e51.web.app/privacy.html"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-primary"
            >
              سياسة الخصوصية
            </a>
          </p>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyOTP} className="glass mt-6 space-y-3 rounded-3xl p-5">
          <label className="block text-xs font-semibold text-foreground-muted">
            رمز التحقق (6 أرقام)
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
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
          {/* ✅ كود دعوة الشوفير — اختياري ولمرة واحدة: بعده تُوجَّه كل طلبات
              هذا الزبون تلقائيا للشوفير صاحب الكود */}
          <label className="block text-xs font-semibold text-foreground-muted">
            كود الدعوة (اختياري)
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="mt-1.5 w-full rounded-xl border border-glass-border bg-secondary px-3 py-3 text-center text-sm font-bold tracking-widest text-foreground outline-none"
              placeholder="مثال: DRV1A2B3C4D"
              dir="ltr"
              maxLength={16}
            />
          </label>
          <p className="text-[11px] leading-relaxed text-foreground-muted">
            إذا سجّلت عبر شوفير معيّن أدخل كوده هنا لتصل طلباتك إليه تلقائيا في كل مرة
          </p>
          {error && <p className="text-xs font-semibold text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60">
            {loading ? "جارِ الحفظ..." : "متابعة"}
          </button>
        </form>
      )}
    </div>
  );
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
