'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Utensils, Bike, CheckCircle2, Heart, Clock, ArrowRight } from 'lucide-react';

interface OrderData {
  id: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  mood: string;
  address: string;
  createdAt: string;
  status: 'PREPARING' | 'ON_WAY' | 'DELIVERED';
}

const STAGES = [
  { id: 'PREPARING', label: 'جاري التحضير بحب', icon: Utensils, note: 'الشيف يضع لمساته الخاصة الآن 🍳' },
  { id: 'ON_WAY', label: 'في الطريق إليك', icon: Bike, note: 'الكابتن انطلق بسرعة وحذر 🛵' },
  { id: 'DELIVERED', label: 'وصلت السعادة!', icon: CheckCircle2, note: 'بالهناء والشفاء! نتمنى لك وجبة ممتعة 🧡' },
];

export default function OrderTrackerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('id');

  const [order, setOrder] = useState<OrderData | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    // جلب بيانات الطلب من localStorage
    const savedOrder = localStorage.getItem('active_order');
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder);
      setOrder(parsed);
    }

    // محاكاة تقدم حالة الطلب تلقائياً لغايات العرض التفاعلي
    const timer1 = setTimeout(() => setCurrentStageIndex(1), 5000); // الانتقال للإنطلاق بعد 5 ثوانٍ
    const timer2 = setTimeout(() => setCurrentStageIndex(2), 12000); // الوصول بعد 12 ثانية

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
        <p className="text-zinc-400 mb-4">لا يوجد طلب نشط حالياً</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-amber-500 text-zinc-950 font-bold rounded-xl"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 max-w-lg mx-auto flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-2">
        <button
          onClick={() => router.push('/')}
          className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
          رقم الطلب: {order.id}
        </span>
      </div>

      {/* Hero Animation / Status */}
      <div className="my-8 text-center space-y-4">
        <motion.div
          key={currentStageIndex}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-24 h-24 mx-auto bg-amber-500/10 border-2 border-amber-400/40 rounded-full flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10"
        >
          {(() => {
            const Icon = STAGES[currentStageIndex].icon;
            return <Icon className="w-10 h-10 animate-bounce" />;
          })()}
        </motion.div>

        <div>
          <h1 className="text-2xl font-bold text-white">
            {STAGES[currentStageIndex].label}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {STAGES[currentStageIndex].note}
          </p>
        </div>
      </div>

      {/* Progress Line */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 my-4">
        <div className="relative flex justify-between items-center">
          {/* Connecting Line */}
          <div className="absolute top-1/2 right-4 left-4 -translate-y-1/2 h-1 bg-zinc-800 -z-0">
            <motion.div
              className="h-full bg-amber-400 transition-all duration-700"
              style={{
                width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Stage Nodes */}
          {STAGES.map((stage, idx) => {
            const isPassed = idx <= currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const NodeIcon = stage.icon;

            return (
              <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isPassed
                      ? 'bg-amber-400 text-zinc-950 font-bold shadow-lg shadow-amber-400/20'
                      : 'bg-zinc-800 text-zinc-500'
                  } ${isCurrent ? 'ring-4 ring-amber-400/30 scale-110' : ''}`}
                >
                  <NodeIcon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-semibold ${isPassed ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {stage.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details Summary */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center text-xs text-zinc-400 pb-2 border-b border-zinc-800">
          <span>عنوان التوصيل: <strong className="text-zinc-200">{order.address}</strong></span>
          <span className="flex items-center gap-1 text-amber-400">
            <Clock className="w-3.5 h-3.5" /> ~20 دقيقة
          </span>
        </div>

        <div className="space-y-1.5">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs text-zinc-300">
              <span>{item.quantity}x {item.name}</span>
              <span>{item.price * item.quantity} شيكل</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-bold">
          <span>الإجمالي المدفوع:</span>
          <span className="text-amber-400">{order.totalAmount} شيكل</span>
        </div>
      </div>

      {/* Emotional Footer Message */}
      <div className="mt-auto pt-6 text-center">
        <p className="text-xs text-zinc-500 flex items-center justify-center gap-1">
          تم التجهيز بكل <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> خصيصاً لك
        </p>
      </div>
    </div>
  );
}
