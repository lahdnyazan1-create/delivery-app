"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-extrabold text-foreground">
        حدث خطأ غير متوقع
      </h1>
      <p className="mt-2 max-w-sm text-sm text-foreground-muted">
        {error.message || "حدث خطأ غير متوقع، حاول مجدداً."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
