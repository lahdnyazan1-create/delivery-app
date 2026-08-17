import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "لا يوجد اتصال" };

/**
 * ✅ صفحة Offline — يعرضها Service Worker عند فشل تنقل بلا شبكة ولا كاش.
 *    كانت النتيجة السابقة صفحة المتصفح الافتراضية (الديناصور).
 */
export default function OfflinePage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground"
    >
      <div className="glass flex size-16 items-center justify-center rounded-2xl">
        <WifiOff className="size-8 text-primary" aria-hidden />
      </div>
      <h1 className="text-xl font-extrabold">لا يوجد اتصال بالإنترنت</h1>
      <p className="max-w-xs text-sm leading-6 text-foreground-muted">
        تحقق من شبكتك وحاول مجدداً — ستلاحظ عودة الخدمة تلقائياً بمجرد عودة الاتصال.
      </p>
      <Link
        href="/"
        className="touch-target mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white transition active:scale-95"
      >
        إعادة المحاولة
      </Link>
    </main>
  );
}
