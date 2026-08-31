"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Check } from "lucide-react";
import type { Dish } from "@/types/database";
import { useAppStore } from "@/store/useAppStore";
import { useToastStore } from "@/store/useToastStore";
import { formatPrice } from "@/constants/currency";

type DishModalProps = {
  dish: Dish | null;
  isOpen: boolean;
  onClose: () => void;
};

export function DishModal({ dish, isOpen, onClose }: DishModalProps) {
  const { addToCart, replaceCartAndAdd } = useAppStore();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  // ✅ تصفير الحالة عند الإغلاق — سابقاً كانت الكمية/الملاحظات/الإضافات
  //    تتسرب للطبق التالي إذا أُغلق النافذة دون إضافة
  useEffect(() => {
    if (!isOpen) {
      setQuantity(1);
      setNotes("");
      setSelectedAddons([]);
      setError("");
    }
  }, [isOpen]);

  // ✅ Escape يغلق الحوار + تركيز أولي على زر الإغلاق (دلالات حوار كاملة)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!dish) return null;

  // حساب السعر الإجمالي للمنتج بناءً على الإضافات
  const addonsPrice = selectedAddons.reduce((sum, id) => {
    const addon = dish.addons?.find((a) => a.id === id);
    return sum + (addon?.price || 0);
  }, 0);
  const totalItemPrice = (dish.price + addonsPrice) * quantity;

  const handleToggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleAddToCart = async () => {
    const addonsData = selectedAddons
      .map((id) => dish.addons?.find((a) => a.id === id))
      .filter(Boolean);

    // ✅ تمرير الكمية المختارة — سابقاً كانت الواجهة تعرض سعر الكمية
    //    كاملة بينما addToCart يضيف 1 فقط
    const result = addToCart(dish.id, dish.restaurantId, notes, addonsData as any, quantity);

    if (!result.ok) {
      if (result.conflict) {
        // ✅ حوار تأكيد غير حاجب بدل window.confirm
        const replace = await useToastStore.getState().confirm({
          title: "سلتك تحتوي أصنافاً من مطعم آخر",
          message: "هل تريد إفراغها وإضافة هذا الصنف؟",
          confirmText: "إفراغ وإضافة",
          danger: true,
        });
        if (!replace) return;
        replaceCartAndAdd(dish.id, dish.restaurantId, notes, addonsData as any, quantity);
      } else {
        setError(result.message || "فشل الإضافة للسلة");
        return;
      }
    }

    setQuantity(1);
    setNotes("");
    setSelectedAddons([]);
    setError("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dish-modal-title"
            className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-5 sm:rounded-3xl"
            dir="rtl"
          >
            <div className="mb-4 flex justify-end">
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="إغلاق"
                className="touch-target rounded-lg p-1 text-foreground-muted hover:text-foreground"
              >
                <X className="size-6" aria-hidden />
              </button>
            </div>

            <div className="mb-4">
              <h2 id="dish-modal-title" className="text-2xl font-extrabold text-foreground">{dish.name}</h2>
              <p className="mt-1 text-sm text-foreground-muted">{dish.description}</p>
              <p className="mt-2 text-lg font-bold text-primary">{formatPrice(dish.price)}</p>
            </div>

            {/* قسم الإضافات */}
            {dish.addons && dish.addons.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-sm font-bold text-foreground">إضافات اختيارية:</h3>
                <div className="space-y-2">
                  {dish.addons.map((addon) => {
                    const selected = selectedAddons.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => handleToggleAddon(addon.id)}
                        aria-pressed={selected}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-xl border p-3 text-right transition ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-glass-border bg-secondary"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={`flex size-5 items-center justify-center rounded-md border ${selected ? "bg-primary text-white" : "border-glass-border"}`}
                          >
                            {selected && <Check className="size-3" />}
                          </span>
                          <span className="text-sm text-foreground">{addon.name}</span>
                        </span>
                        <span className="text-xs font-bold text-foreground-muted">+ {formatPrice(addon.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* قسم الملاحظات */}
            <div className="mb-4">
              <label htmlFor="dish-notes" className="mb-2 block text-sm font-bold text-foreground">
                ملاحظات خاصة بالطبق:
              </label>
              <textarea
                id="dish-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: بدون بصل، حار جداً..."
                rows={2}
                className="w-full resize-none rounded-xl border border-glass-border bg-secondary p-3 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* قسم الكمية وزر الإضافة */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 rounded-xl bg-secondary p-2">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="إنقاص الكمية"
                  disabled={quantity <= 1}
                  className="flex size-8 items-center justify-center rounded-lg bg-foreground/10 text-foreground disabled:opacity-40"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <span className="w-8 text-center font-bold text-foreground" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="زيادة الكمية"
                  className="flex size-8 items-center justify-center rounded-lg bg-foreground/10 text-foreground"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!dish.available}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                أضف للسلة - {formatPrice(totalItemPrice)}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-center text-xs text-danger" role="alert">
                {error}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
