"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useToastStore, type ToastType } from "@/store/useToastStore";

const TOAST_STYLES: Record<ToastType, { icon: typeof Info; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: "text-accent" },
  error: { icon: AlertCircle, iconClass: "text-danger" },
  info: { icon: Info, iconClass: "text-primary" },
};

function ToastStack() {
  const { toasts, dismiss } = useToastStore();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-safe"
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const { icon: Icon, iconClass } = TOAST_STYLES[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              className="glass pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border border-glass-border p-3.5 shadow-lg"
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${iconClass}`} aria-hidden />
              <p className="flex-1 text-sm font-bold leading-5 text-foreground">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="إغلاق التنبيه"
                className="touch-target -m-1 rounded-lg p-1 text-foreground-muted hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function ConfirmDialog() {
  const { confirmState, resolveConfirm } = useToastStore();
  const cancelRef = useRef<HTMLButtonElement>(null);

  //Escape يُلغي الحوار — سلوك متوقع من نوافذ التأكيد
  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resolveConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    cancelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmState, resolveConfirm]);

  if (!confirmState) return null;
  const { options } = confirmState;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => resolveConfirm(false)}
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="glass w-full max-w-sm rounded-3xl p-5"
        >
          <h3 id="confirm-title" className="text-base font-extrabold text-foreground">
            {options.title}
          </h3>
          {options.message && (
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              {options.message}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={() => resolveConfirm(false)}
              className="touch-target flex-1 rounded-xl border border-glass-border bg-secondary py-2.5 text-sm font-bold text-foreground transition active:scale-95"
            >
              {options.cancelText ?? "إلغاء"}
            </button>
            <button
              type="button"
              onClick={() => resolveConfirm(true)}
              className={`touch-target flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition active:scale-95 ${
                options.danger ? "bg-danger hover:bg-danger/90" : "bg-primary hover:bg-primary/90"
              }`}
            >
              {options.confirmText ?? "تأكيد"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**يُركَّب مرة واحدة في الـ layout — يعرض التنبيهات وحوارات التأكيد*/
export function ToastHost() {
  return (
    <>
      <ToastStack />
      <ConfirmDialog />
    </>
  );
}
