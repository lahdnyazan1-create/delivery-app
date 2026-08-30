// src/components/restaurant/RatingDialog.tsx
// ============================================================================
// نافذة تقييم الطلب بعد استلامه — نجوم قابلة للتعبئة باللمس مع تدرج
// الأحجام، تعليق اختياري، ورسالة احتفالية عند الإرسال. تظهر تلقائياً
// عندما يصل الطلب لحالة Delivered ولم يُقيَّم بعد (rateOrder يضمن على
// الخادم تقييماً واحداً لكل طلب من صاحبه فقط).
// ============================================================================

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Send } from "lucide-react";
import { rateOrder } from "@/lib/orders";
import { useToastStore } from "@/store/useToastStore";
import { playSuccessChime, vibrate } from "@/lib/feedback";

type RatingDialogProps = {
  orderId: string;
  restaurantName: string;
  open: boolean;
  onClose: () => void;
};

const STAR_HINTS = ["", "لم يعجبني", "مقبول", "جيد", "جيد جداً!", "ممتاز! 🎉"];

export function RatingDialog({ orderId, restaurantName, open, onClose }: RatingDialogProps) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // تصفير الحالة عند كل فتح
  useEffect(() => {
    if (open) {
      setStars(0);
      setHover(0);
      setComment("");
      setBusy(false);
      setDone(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = async () => {
    if (stars < 1 || busy) return;
    setBusy(true);
    const result = await rateOrder(orderId, stars, comment);
    setBusy(false);
    if (result.ok) {
      setDone(true);
      vibrate([40, 40, 100]);
      playSuccessChime();
      // نغلق تلقائياً بعد لحظة الاحتفال
      setTimeout(onClose, 1800);
    } else {
      useToastStore.getState().error(result.message);
    }
  };

  const shown = hover || stars;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={busy ? undefined : onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rating-title"
            className="glass-strong max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl"
            dir="rtl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="rating-title" className="text-lg font-extrabold">
                {done ? "شكراً لك! 💚" : "قيّم تجربتك"}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="إغلاق"
                className="touch-target rounded-lg p-1 text-foreground-muted hover:text-foreground"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {done ? (
              <div className="relative overflow-hidden py-6 text-center">
                {/* قطع احتفالية */}
                {Array.from({ length: 14 }).map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute top-0 text-lg"
                    style={{ left: `${6 + i * 6.6}%` }}
                    initial={{ y: -20, opacity: 1 }}
                    animate={{ y: 240, opacity: 0, rotate: 540 }}
                    transition={{ duration: 1.6, delay: i * 0.04 }}
                  >
                    {["🎉", "⭐", "🎊", "✨"][i % 4]}
                  </motion.span>
                ))}
                <motion.div
                  className="text-5xl"
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  {stars >= 4 ? "🥳" : "😊"}
                </motion.div>
                <p className="mt-3 text-sm font-bold text-foreground">
                  تقييمك لـ {restaurantName} انعكس على نجمته فوراً
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-foreground-muted">
                  كيف كانت تجربتك مع <span className="font-bold text-foreground">{restaurantName}</span>؟
                  تقييمك يساعد غيرك على الاختيار.
                </p>

                {/* النجوم */}
                <div
                  className="my-5 flex items-center justify-center gap-1.5"
                  onMouseLeave={() => setHover(0)}
                  role="radiogroup"
                  aria-label="التقييم بالنجوم"
                >
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = n <= shown;
                    return (
                      <motion.button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={stars === n}
                        aria-label={`${n} نجوم`}
                        onMouseEnter={() => setHover(n)}
                        onClick={() => {
                          setStars(n);
                          vibrate(15);
                        }}
                        whileTap={{ scale: 0.75 }}
                        className="no-select touch-target"
                      >
                        <motion.span
                          animate={{ scale: filled ? 1.15 : 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          className="block"
                        >
                          <Star
                            className={`size-9 transition-colors ${
                              filled ? "fill-amber-400 text-amber-400" : "text-foreground-muted/40"
                            }`}
                            aria-hidden
                          />
                        </motion.span>
                      </motion.button>
                    );
                  })}
                </div>
                <p className="mb-4 h-5 text-center text-xs font-bold text-primary">
                  {stars > 0 ? STAR_HINTS[stars] : "اضغط على النجوم"}
                </p>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="شاركنا رأيك (اختياري): سرعة التوصيل، طعم الطعام…"
                  rows={2}
                  maxLength={300}
                  disabled={busy}
                  className="mb-4 w-full resize-none rounded-xl border border-glass-border bg-secondary p-3 text-sm outline-none focus:border-primary"
                />

                <button
                  type="button"
                  onClick={submit}
                  disabled={stars < 1 || busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Send className="size-4" aria-hidden />
                  {busy ? "جارٍ الإرسال…" : "إرسال التقييم"}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
