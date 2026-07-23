// src/components/profile/OrderHistory.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { subscribeToOrders } from '@/lib/orders';
import { playSound, triggerHaptic } from '@/lib/sound-haptics';
import { Order } from '@/types/database';

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    // الاستماع للطلبات في الوقت الفعلي
    const unsubscribe = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // دالة الطلب بنقرة واحدة (إعادة إضافة العناصر للسلة والانتقال)
  const handleQuickReOrder = (orderItems: any[]) => {
    playSound('add');
    triggerHaptic('heavy');

    // تفريغ السلة الحالية وإضافة عناصر الطلب المحدد
    clearCart();
    orderItems.forEach((item) => {
      // التعامل مع إضافة العناصر حسب هيكلية CartItem
      for (let i = 0; i < (item.quantity || 1); i++) {
        addItem({
          id: item.id || item.menuItemId,
          name: item.name,
          price: item.price,
          image: item.image,
          note: item.note,
        });
      }
    });

    alert('تم نقل الطلب إلى السلة بنجاح! 🚀');
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">جاري تحميل سجل الطلبات...</div>;
  }

  return (
    <div className="p-4 space-y-4 select-none">
      <h2 className="text-xl font-bold text-gray-800">سجل طلباتك السابقة 📜</h2>
      
      {orders.length === 0 ? (
        <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-2xl">
          لا توجد طلبات سابقة حتى الآن.
        </div>
      ) : (
        orders.map((order) => (
          <div 
            key={order.id} 
            className="border border-gray-100 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
          >
            <div className="flex justify-between items-start border-b border-gray-100 pb-2">
              <div>
                <p className="font-bold text-gray-800">طلب #{order.id.slice(0, 6)}</p>
                <p className="text-xs text-gray-400">
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-EG') : 'منذ فترة'}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-orange-100 text-orange-600">
                {order.status || 'مكتمل'}
              </span>
            </div>

            {/* تفاصيل عناصر الطلب */}
            <div className="space-y-1">
              {order.items && order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm text-gray-600">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{(item.price * item.quantity).toFixed(2)} ₪</span>
                </div>
              ))}
            </div>

            {/* زر إعادة الطلب الفوري */}
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-base text-gray-900">
                الإجمالي: {order.totalAmount || order.totalPrice} ₪
              </span>
              <button
                onClick={() => handleQuickReOrder(order.items)}
                className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <span>إعادة الطلب</span>
                <span>⚡</span>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
