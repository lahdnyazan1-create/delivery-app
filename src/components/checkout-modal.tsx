// src/components/checkout-modal.tsx
'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, ArrowRight, Heart, Sparkles, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const MOOD_OPTIONS = [
  { id: 'tired', label: 'تعبان ومتطلب راحة 😴', note: 'سنوفر لك إشعاراً هادئاً عند الوصول' },
  { id: 'happy', label: 'مبوسط وبدي أحتفل 🎉', note: 'سنضيف لمسة فرح لطلبك!' },
  { id: 'busy', label: 'مشغول جداً ⚡', note: 'توصيل سريع وبدون إزعاج' },
];

export function CheckoutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { items, getTotalPrice, clearCart, updateQuantity } = useCartStore();
  const [selectedMood, setSelectedMood] = useState('happy');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const totalPrice = getTotalPrice();
  const deliveryFee = 5;
  const finalTotal = totalPrice + (items.length > 0 ? deliveryFee : 0);

  const handlePlaceOrder = () => {
    if (items.length === 0 || !address.trim()) return;

    setIsSubmitting(true);

    // محاكاة إرسال الطلب وحفظه في localStorage للـ Tracker
    const orderData = {
      id: `ZEST-${Math.floor(1000 + Math.random() * 9000)}`,
      items,
      totalAmount: finalTotal,
      mood: selectedMood,
      address,
      createdAt: new Date().toISOString(),
      status: 'PREPARING', // PREPARING -> ON_WAY -> DELIVERED
    };

    localStorage.setItem('active_order', JSON.stringify(orderData));

    setTimeout(() => {
      clearCart();
      setIsSubmitting(false);
      onClose();
      router.push(`/order-tracker?id=${orderData.id}`);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 text-white max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-bold">سلة الإنعاش والطلب</h2>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-2 rounded-full hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              <p>السلة فارغة حالياً.. اضف بعض الوجبات المفضلة لمزاجك!</p>
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {/* قائمة العناصر */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-zinc-800/50 p-3 rounded-2xl border border-zinc-800"
                  >
                    <div>
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      <p className="text-xs text-amber-400 font-semibold">{item.price} شيكل</p>
                    </div>
                    <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="text-zinc-400 hover:text-white text-lg font-bold px-1"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="text-zinc-400 hover:text-white text-lg font-bold px-1"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Emotional Touch: اختيار المزاج */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-400" /> كيف تحب أن نتعامل مع طلبك اليوم؟
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood.id}
                      type="button"
                      onClick={() => setSelectedMood(mood.id)}
                      className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-0.5 ${
                        selectedMood === mood.id
                          ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                          : 'border-zinc-800 bg-zinc-800/30 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-sm font-semibold">{mood.label}</span>
                      <span className="text-xs opacity-75">{mood.note}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* العنوان */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400">عنوان التوصيل</label>
                <input
                  type="text"
                  placeholder="مثال: نابلس - رفيديا - بجانب..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-zinc-800/80 border border-zinc-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* الملخص الحسابي */}
              <div className="border-t border-zinc-800 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>مجموع الوجبات:</span>
                  <span>{totalPrice} شيكل</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>رسوم التوصيل:</span>
                  <span>{deliveryFee} شيكل</span>
                </div>
                <div className="flex justify-between font-bold text-base text-white pt-2 border-t border-zinc-800/50">
                  <span>الإجمالي:</span>
                  <span className="text-amber-400">{finalTotal} شيكل</span>
                </div>
              </div>

              {/* زر إرسال الطلب */}
              <button
                disabled={!address.trim() || isSubmitting}
                onClick={handlePlaceOrder}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>تأكيد الطلب وبدء التحضير</span>
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
