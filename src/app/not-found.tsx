import Link from "next/link";

export default function NotFound() {
  return (
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-extrabold">Page not found</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        This route doesn&apos;t exist in Zest.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white"
      >
        Back home
      </Link>
    </div>
  );
}
