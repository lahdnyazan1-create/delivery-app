"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { playScratchNoise, vibrate } from "@/lib/feedback";
import { useCartStore } from "@/store/useCartStore";

type ScratchCardProps = {
  className?: string;
};

export function ScratchCard({ className = "" }: ScratchCardProps) {
  const { appliedPromo, applyPromo } = useCartStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratching = useRef(false);
  const lastSound = useRef(0);
  const rafId = useRef<number>(0);
  const pendingChecks = useRef(0);

  const [localCleared, setLocalCleared] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("scratch_revealed") === "true";
    }
    return false;
  });

  const done = localCleared || appliedPromo === "ZEST30";

  // ✅ احترام إعدادات الحركة
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || done) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#c0c7d1");
    grad.addColorStop(0.5, "#e8ecf1");
    grad.addColorStop(1, "#9aa3b2");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(26,43,76,0.55)";
    ctx.font = "bold 14px Cairo, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("اخدش لكشف العرض", w / 2, h / 2);
  }, [done]);

  // ✅ فحص الكشف باستخدام requestAnimationFrame (أداء أحسن)
  const checkReveal = useCallback(
    (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      if (pendingChecks.current > 0) return;
      pendingChecks.current++;

      rafId.current = requestAnimationFrame(() => {
        pendingChecks.current = 0;
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let cleared = 0;
        const step = 64; // ✅ فحص كل 64 بكسل بدل 32 (أقل استهلاك)
        for (let i = 3; i < data.length; i += step * 4) {
          if (data[i] < 40) cleared++;
        }
        const samples = Math.ceil(data.length / (step * 4));
        if (cleared / samples > 0.42) {
          setLocalCleared(true);
          localStorage.setItem("scratch_revealed", "true");
          applyPromo("ZEST30");
          if (!prefersReducedMotion) {
            vibrate([20, 30, 40]);
          }
        }
      });
    },
    [applyPromo, prefersReducedMotion],
  );

  const scratchAt = useCallback(
    (clientX: number, clientY: number) => {
      if (done) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      if (!prefersReducedMotion) {
        vibrate(5);
        const now = Date.now();
        if (now - lastSound.current > 80) {
          // ✅ أقل تكرار للصوت
          playScratchNoise(30);
          lastSound.current = now;
        }
      }

      checkReveal(ctx, canvas);
    },
    [done, checkReveal, prefersReducedMotion],
  );

  // تنظيف RAF عند فك التركيب
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <div className={`glass overflow-hidden rounded-3xl ${className}`}>
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            عرض محدود
          </p>
          <h3 className="text-base font-bold text-foreground">
            اخدش واربح
          </h3>
        </div>
        {appliedPromo === "ZEST30" && (
          <span className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-bold text-accent">
            مُفعّل
          </span>
        )}
      </div>

      <div className="relative m-4 h-28 overflow-hidden rounded-2xl bg-secondary">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <p className="text-xs font-medium text-foreground-muted">كودك</p>
          <p className="text-2xl font-extrabold tracking-[0.2em] text-primary">
            {done ? "ZEST30" : "••••••"}
          </p>
          <p className="text-xs font-semibold text-accent">خصم 30% عند الدفع</p>
        </div>

        {!done && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none cursor-crosshair"
            onPointerDown={(e) => {
              scratching.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              scratchAt(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!scratching.current) return;
              scratchAt(e.clientX, e.clientY);
            }}
            onPointerUp={() => {
              scratching.current = false;
            }}
            onPointerCancel={() => {
              scratching.current = false;
            }}
          />
        )}
      </div>
    </div>
  );
}
