"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { ChevronRight, Check } from "lucide-react";
import { playSuccessChime, vibrate } from "@/lib/feedback";

type SwipeButtonProps = {
  disabled?: boolean;
  label?: string;
  onConfirm: () => boolean | void | Promise<boolean | void>;
};

export function SwipeButton({
  disabled = false,
  label = "Swipe to confirm",
  onConfirm,
}: SwipeButtonProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [maxX, setMaxX] = useState(0);
  const [complete, setComplete] = useState(false);
  const [burst, setBurst] = useState(false);
  const [busy, setBusy] = useState(false);
  const confirmed = useRef(false);

  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      setMaxX(Math.max(0, trackRef.current.offsetWidth - 56));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const progress = useTransform(x, (v) =>
    maxX <= 0 ? 0 : Math.min(1, Math.max(0, v / maxX)),
  );
  const bg = useTransform(
    progress,
    [0, 1],
    ["rgb(42, 63, 102)", "rgb(0, 200, 83)"],
  );

  const reset = () => {
    confirmed.current = false;
    setComplete(false);
    setBurst(false);
    setBusy(false);
    void animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
  };

  const onDragEnd = () => {
    if (confirmed.current || disabled || busy) {
      reset();
      return;
    }
    if (x.get() > maxX * 0.82) {
      setBusy(true);
      void animate(x, maxX, { type: "spring", stiffness: 420, damping: 30 });
      void Promise.resolve(onConfirm()).then((ok) => {
        if (ok === false) {
          reset();
          return;
        }
        confirmed.current = true;
        setComplete(true);
        setBurst(true);
        setBusy(false);
        vibrate([40, 40, 100]);
        playSuccessChime();
      });
    } else {
      reset();
    }
  };

  return (
    <div className="relative">
      {burst && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-visible">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 size-2 rounded-full bg-accent"
                initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                animate={{
                  opacity: 0,
                  x: Math.cos(angle) * 70,
                  y: Math.sin(angle) * 50,
                  scale: 0,
                }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            );
          })}
        </div>
      )}

      <motion.div
        ref={trackRef}
        style={{ backgroundColor: bg }}
        className={`no-select relative flex h-14 items-center overflow-hidden rounded-full px-1 touch-pan-y ${
          disabled ? "opacity-50" : ""
        }`}
      >
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-white/90">
          {complete ? "Order placed!" : busy ? "Confirming…" : label}
        </p>

        <motion.button
          type="button"
          drag={disabled || complete || busy ? false : "x"}
          dragConstraints={{ left: 0, right: maxX }}
          dragElastic={0.04}
          dragMomentum={false}
          dragDirectionLock
          style={{ x }}
          onDragEnd={onDragEnd}
          disabled={disabled || complete || busy}
          className="touch-target relative z-10 flex size-12 items-center justify-center rounded-full bg-white text-secondary shadow-md"
          aria-label={label}
        >
          {complete ? (
            <Check className="size-5 text-accent" aria-hidden />
          ) : (
            <ChevronRight className="size-5" aria-hidden />
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
