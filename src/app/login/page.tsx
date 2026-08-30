"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { AppShell } from "@/components/layout/AppShell";
import { auth } from "@/lib/firebase";
import { useAppStore } from "@/store/useAppStore";
import { applyReferralCode } from "@/lib/orders";
import type { UserGender } from "@/types/database";

/**
 * تسجيل الدخول/الاشتراك بحساب مستخدم عادي — إيميل + كلمة سر عبر Firebase.
 * استُبدل به نظام رموز WhatsApp المؤقت (OTP) الذي كان مكلفاً ويتعطل كثيراً؛
 * رقم الهاتف يُدخل يدوياً ضمن بيانات الملف دون أي تحقق عبر الرسائل.
 */

/** ترجمة أخطاء Firebase Auth لرسائل عربية واضحة */
const AUTH_ERRORS: Record<string, string> = {
  "auth/email-already-in-use": "هذا البريد مسجّل مسبقاً — جرّب تسجيل الدخول",
  "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة",
  "auth/weak-password": "كلمة السر ضعيفة — استخدم 6 أحرف على الأقل",
  "auth/missing-password": "أدخل كلمة السر",
  "auth/wrong-password": "كلمة السر غير صحيحة",
  "auth/user-not-found": "لا يوجد حساب بهذا البريد — أنشئ حساباً جديداً",
  "auth/invalid-credential": "البريد أو كلمة السر غير صحيحة",
  "auth/invalid-login-credentials": "البريد أو كلمة السر غير صحيحة",
  "auth/too-many-requests": "محاولات كثيرة فاشلة — انتظر قليلاً ثم أعد المحاولة",
  "auth/network-request-failed": "تعذّر الاتصال بالخادم — تحقق من الإنترنت",
  "auth/operation-not-allowed":
    "تسجيل الدخول بالبريد غير مفعّل في Firebase Console — فعّل Email/Password",
};

function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  return AUTH_ERRORS[code] || "تعذّر إتمام العملية — أعد المحاولة";
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/profile";
  const { completeLogin } = useAppStore();

  // وضعان: تسجيل دخول (signin) أو إنشاء حساب جديد (signup)
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"" | UserGender>("");
  // ✅ كود دعوة الشوفير — اختياري، يُربط بالحساب مرة واحدة عند أول تسجيل
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (nextMode: "signin" | "signup") => {
    setMode(nextMode);
    setError("");
  };

  const finishLogin = async (
    firebaseUser: FirebaseUser,
    profile: { displayName?: string; phone?: string; age?: number; gender?: UserGender; email?: string },
    withInviteCode?: string,
  ) => {
    const result = await completeLogin(firebaseUser, profile);
    if (!result.ok) {
      setError(result.message);
      return false;
    }

    // ✅ كود الدعوة (أول تسجيل فقط): يُربط بالحساب قبل التحويل حتى تتوجه
    //    كل طلبات الزبون للشوفير صاحب الكود. عند فشل الربط يبقى المستخدم
    //    في هذه الشاشة ليصحح الكود أو يمسحه ويتابع بدونه
    if (withInviteCode && withInviteCode.trim()) {
      const applied = await applyReferralCode(withInviteCode);
      if (!applied.ok) {
        setError(`${applied.message} — صحّح الكود أو امسحه للمتابعة بدونه`);
        return false;
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
    return true;
  };

  /** تسجيل الدخول — إيميل + كلمة سر فقط */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      );
      // ملف المستخدم موجود عادة؛ completeLogin ينشئه احتياطاً إن غاب (حسابات قديمة)
      const done = await finishLogin(credential.user, { email: credential.user.email ?? "" });
      if (!done) setLoading(false);
    } catch (err) {
      console.error("[Login] فشل تسجيل الدخول:", err);
      setError(authErrorMessage(err));
      setLoading(false);
    }
  };

  /** إنشاء حساب جديد — الاسم والإيميل وكلمة السر والهاتف والعمر والجنس (+ كود دعوة اختياري) */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("الرجاء إدخال الاسم الكامل");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setError("أدخل رقم هاتف صحيح (7 أرقام على الأقل) — للتواصل عند التوصيل فقط، دون أي تحقق");
      return;
    }
    const ageNum = Number(age);
    if (!age || Number.isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
      setError("أدخل عمراً صحيحاً (10 - 100 سنة)");
      return;
    }
    if (!gender) {
      setError("الرجاء اختيار الجنس");
      return;
    }
    if (password.length < 6) {
      setError("كلمة السر يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      );
      // اسم العرض في Firebase Auth (يسهل إدارة الحسابات من الكونسول)
      await updateProfile(credential.user, { displayName: fullName.trim() }).catch(() => {});

      const done = await finishLogin(
        credential.user,
        {
          displayName: fullName.trim(),
          email: credential.user.email ?? email.trim().toLowerCase(),
          phone: phoneDigits,
          age: ageNum,
          gender,
        },
        inviteCode,
      );
      if (!done) setLoading(false);
    } catch (err) {
      console.error("[Login] فشل إنشاء الحساب:", err);
      setError(authErrorMessage(err));
      setLoading(false);
    }
  };

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-glass-border bg-secondary px-3 py-3 text-sm text-foreground outline-none focus:border-primary";

  return (
    <div className="pt-safe" dir="rtl">
      <button type="button" onClick={() => router.back()} className="no-select touch-target mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted">
        <ArrowLeft className="size-4" /> رجوع
      </button>

      <h1 className="text-2xl font-extrabold">
        {mode === "signin" ? "تسجيل الدخول" : "حساب جديد"}
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        {mode === "signin"
          ? "أدخل بريدك الإلكتروني وكلمة السر للمتابعة"
          : "أنشئ حسابك ببريدك وكلمة سر — بياناتك محفوظة لتوصيل طلباتك"}
      </p>

      {/* مبدّل الدخول/التسجيل */}
      <div className="glass mt-5 flex rounded-2xl p-1">
        <button
          type="button"
          onClick={() => switchMode("signin")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
            mode === "signin" ? "bg-primary text-white" : "text-foreground-muted"
          }`}
        >
          دخول
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
            mode === "signup" ? "bg-primary text-white" : "text-foreground-muted"
          }`}
        >
          حساب جديد
        </button>
      </div>

      {mode === "signin" ? (
        <form onSubmit={handleSignIn} className="glass mt-5 space-y-3 rounded-3xl p-5">
          <label className="block text-xs font-semibold text-foreground-muted">
            البريد الإلكتروني
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="example@mail.com"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              autoFocus
              required
            />
          </label>
          <label className="block text-xs font-semibold text-foreground-muted">
            كلمة السر
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
              autoComplete="current-password"
              dir="ltr"
              minLength={6}
              required
            />
          </label>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-[11px] font-semibold text-foreground-muted">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="size-3.5 accent-primary"
            />
            إظهار كلمة السر
          </label>
          {error && <p className="text-xs font-semibold text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-60">
            {loading ? "جارِ الدخول..." : "دخول"}
          </button>
          {/* ✅ إفصاح الموافقة على الشروط والسياسة — مطلوب لمراجعة Google */}
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
      ) : (
        <form onSubmit={handleSignUp} className="glass mt-5 space-y-3 rounded-3xl p-5">
          <label className="block text-xs font-semibold text-foreground-muted">
            الاسم الكامل
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="مثال: يزيد اللهالي"
              autoComplete="name"
              autoFocus
              required
            />
          </label>
          <label className="block text-xs font-semibold text-foreground-muted">
            البريد الإلكتروني
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="example@mail.com"
              inputMode="email"
              autoComplete="email"
              dir="ltr"
              required
            />
          </label>
          <label className="block text-xs font-semibold text-foreground-muted">
            كلمة السر (6 أحرف على الأقل)
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
              autoComplete="new-password"
              dir="ltr"
              minLength={6}
              required
            />
          </label>
          <label className="flex w-fit cursor-pointer items-center gap-2 text-[11px] font-semibold text-foreground-muted">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="size-3.5 accent-primary"
            />
            إظهار كلمة السر
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-foreground-muted">
              رقم الهاتف
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="05XXXXXXXX"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                required
              />
            </label>
            <label className="block text-xs font-semibold text-foreground-muted">
              العمر
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={inputClass}
                placeholder="25"
                inputMode="numeric"
                min={10}
                max={100}
                dir="ltr"
                required
              />
            </label>
          </div>
          <div>
            <span className="block text-xs font-semibold text-foreground-muted">الجنس</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`no-select touch-target rounded-xl border py-3 text-sm font-bold transition ${
                  gender === "male"
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-glass-border bg-secondary text-foreground-muted"
                }`}
              >
                ذكر
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`no-select touch-target rounded-xl border py-3 text-sm font-bold transition ${
                  gender === "female"
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-glass-border bg-secondary text-foreground-muted"
                }`}
              >
                أنثى
              </button>
            </div>
          </div>
          {/* ✅ كود دعوة الشوفير — اختياري ولمرة واحدة: بعده تُوجَّه كل طلبات
              هذا الزبون تلقائيا للشوفير صاحب الكود */}
          <label className="block text-xs font-semibold text-foreground-muted">
            كود الدعوة (اختياري)
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="mt-1.5 w-full rounded-xl border border-glass-border bg-secondary px-3 py-3 text-center text-sm font-bold tracking-widest text-foreground outline-none focus:border-primary"
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
            {loading ? "جارِ إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
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
