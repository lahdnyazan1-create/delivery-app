// src/components/brand/DaghriLogo.tsx
// ============================================================================
// شعار دُغْري (Daghri) — قفل أفقي ثنائي اللغة: علامة سكوتر التوصيل على تدرج
// برتقالي #FF6B4E، مع الاسم العربي «دُغْري» والتسمية اللاتينية DAGHRI بلون
// تيل الثقة #26A69A — وفق دليل الهوية Brand/Brand.md.
// ============================================================================

type DaghriLogoProps = {
  /** حجم علامة السكوتر بالمربع (px) */
  markSize?: number;
  /** إخفاء كلمة DAGHRI اللاتينية عند الحاجة لنسخ أضيق */
  showLatin?: boolean;
  className?: string;
};

/** علامة السكوتر — نفس هندسة أيقونة التطبيق public/brand/daghri-mark.svg */
function ScooterMark({ size }: { size: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-soft shadow-[var(--shadow-glow)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 64 64" fill="none" style={{ width: size * 0.78, height: size * 0.78 }}>
        <g stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round">
          <path d="M36.5 36.5 L47 16.5" />
          <path d="M23.5 36.5 L39 36.5" />
          <path d="M37 15.5 L55 15.5" />
          <path d="M17 32.5 L17 37.5" />
        </g>
        <circle cx="17.5" cy="43.5" r="9" stroke="#FFFFFF" strokeWidth="3.4" />
        <circle cx="17.5" cy="43.5" r="3.2" fill="#1A2B45" />
        <circle cx="44" cy="43.5" r="9" stroke="#FFFFFF" strokeWidth="3.4" />
        <circle cx="44" cy="43.5" r="3.2" fill="#1A2B45" />
        <rect x="9" y="18.5" width="16" height="14" rx="3" fill="#FFFFFF" />
        <rect x="15.7" y="19.5" width="2.6" height="12" fill="#1A2B45" />
      </svg>
    </span>
  );
}

export function DaghriLogo({ markSize = 40, showLatin = true, className = "" }: DaghriLogoProps) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <ScooterMark size={markSize} />
      <span className="flex flex-col leading-none">
        <span className="text-gradient text-2xl font-black tracking-tight">دُغْري</span>
        {showLatin && (
          <span
            className="mt-1 text-[10px] font-bold text-teal"
            dir="ltr"
            style={{ letterSpacing: "0.3em" }}
          >
            DAGHRI
          </span>
        )}
      </span>
    </span>
  );
}
