export default function Loading() {
  return (
    <div className="app-gradient flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <div className="relative">
        <div className="size-12 rounded-full border-4 border-glass-border border-t-primary animate-spin" />
      </div>
      <p className="text-sm font-semibold text-foreground-muted animate-pulse">
        جاري التحميل...
      </p>
    </div>
  );
}
