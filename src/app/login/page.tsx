"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useApp } from "@/context/AppContext";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/profile";
  const { user, loginUser } = useApp();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [error, setError] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginUser(fullName, phone);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace(next.startsWith("/") ? next : "/profile");
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
        أدخل اسمك ورقم جوالك للمتابعة
      </p>

      <form onSubmit={onSubmit} className="glass mt-6 space-y-3 rounded-3xl p-5">
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
          className="no-select touch-target w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white"
        >
          حفظ ومتابعة
        </button>
      </form>
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
