// src/components/profile/OrderHistory.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { subscribeToOrders } from '@/lib/orders';
import { playSound, triggerHaptic } from '@/lib/sound-haptics';
import { Order } from '@/types/database';
import { RotateCcw, PackageCheck } from 'lucide-react';

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    // جلب واستماع الطلبات الفورية من Firestore
    const unsubscribe = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // دالة الطلب بنقرة واحدة (Quick Re-Order)
  const handleQuickReOrder = (orderItems: Order['items']) => {
    playSound('add');
    triggerHaptic('heavy');

    // مسح السلة الحالية وإضافة عناصر الطلب المحدد إليها
    clearCart();

    orderItems.forEach((item) => {
      // التكرار بحسب الكمية لإضافتها بشكل صحيح لـ Zustand
      for (let i = 0; i < item.quantity; i++) {
        addItem({
          id: item.id,
          name: item.name,
          price: item.price,
        });
      }
    });

    alert('تم إضافة مكونات الطلب إلى سلتك بنجاح! 🚀');
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-xs text-foreground-muted">
        جاري تحميل سجل الطلبات...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 text-center" dir="rtl">
        <PackageCheck className="mx-auto mb-2 size-8 text-foreground-muted opacity-50" />
        <p className="text-sm font-bold">لا توجد طلبات سابقة حتى الآن</p>
        <p className="text-xs text-foreground-muted">اطلب وجبتك الأولى لتظهر هنا!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <h3 className="text-sm font-bold px-1">سجل الطلبات وإعادة الطلب السريع 📜</h3>
      {orders.map((order) => (
        <div
          key={order.id}
          className="glass rounded-2xl p-4 transition-all hover:bg-white/5"
        >
          {/* رأس الكرت */}
          <div className="flex items-center justify-between border-b border-glass-border pb-2 mb-3">
            <div>
              <span className="text-xs font-bold text-primary block">
                طلب #{order.id ? order.id.slice(0, 6) : '---'}
              </span>
              <span className="text-[10px] text-foreground-muted">
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString('ar-EG')
                  : 'مؤخراً'}
              </span>
            </div>
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
              {order.status}
            </span>
          </div>

          {/* تفاصيل العناصر */}
          <ul className="mb-3 space-y-1">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex justify-between text-xs text-foreground-muted">
                <span>
                  {item.quantity}x {item.name}
                </span>
                <span>{(item.price * item.quantity).toFixed(2)} ₪</span>
              </li>
            ))}
          </ul>

          {/* أسفل الكرت مع زر إعادة الطلب السريع */}
          <div className="flex items-center justify-between border-t border-glass-border pt-2">
            <div>
              <span className="text-[10px] text-foreground-muted block">المجموع</span>
              <span className="text-sm font-extrabold text-foreground">
                {order.totalAmount.toFixed(2)} ₪
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleQuickReOrder(order.items)}
              className="no-select touch-target flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-all"
            >
              <RotateCcw className="size-3.5" />
              <span>إعادة الطلب ⚡</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
