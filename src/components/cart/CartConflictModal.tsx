"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";

export function CartConflictModal() {
  const { cartConflict, confirmClearCartAndAdd, dismissCartConflict } =
    useApp();

  return (
    <AnimatePresence>
      {cartConflict && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-4 sm:items-center"
          dir="rtl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissCartConflict}
        >
          <motion.div
            role="alertdialog"
            aria-labelledby="cart-conflict-title"
            aria-describedby="cart-conflict-desc"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="glass-strong w-full max-w-sm rounded-3xl p-5 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="cart-conflict-title"
              className="text-lg font-extrabold leading-snug text-foreground"
            >
              مطعم واحد في السلة
            </h2>
            <p
              id="cart-conflict-desc"
              className="mt-3 text-sm leading-relaxed text-foreground-muted"
            >
              لا يمكنك الطلب من أكثر من مطعم في نفس الوقت لحماية جودة التوصيل.
              هل تريد تفريغ السلة والبدء بطلب جديد؟
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmClearCartAndAdd}
                className="no-select touch-target rounded-2xl bg-primary py-3.5 text-sm font-bold text-white"
              >
                تفريغ السلة والبدء
              </button>
              <button
                type="button"
                onClick={dismissCartConflict}
                className="no-select touch-target rounded-2xl bg-white/5 py-3.5 text-sm font-bold text-foreground-muted"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
