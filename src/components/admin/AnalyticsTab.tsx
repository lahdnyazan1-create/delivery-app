// src/components/admin/AnalyticsTab.tsx
// تبويب "الإحصائيات" — منقول كما هو من src/app/admin/page.tsx
"use client";

import { useAppStore } from "@/store/useAppStore";
import { formatPrice } from "@/constants/currency";

export function AnalyticsTab() {
  const { orders } = useAppStore();

  const totalRevenue = orders
    .filter((o) => o.status === "Delivered")
    .reduce((acc, curr) => acc + curr.total, 0);

  const activeOrders = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled",
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-foreground-muted">إجمالي المبيعات المكتملة</p>
          <p className="mt-2 text-3xl font-extrabold text-accent">{formatPrice(totalRevenue)}</p>
        </div>
      <div className="glass rounded-2xl p-6">
        <p className="text-sm text-foreground-muted">
          الطلبات النشطة حالياً
        </p>
        <p className="mt-2 text-3xl font-extrabold text-primary">
          {activeOrders.length}
        </p>
      </div>
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-foreground-muted">إجمالي الطلبات الكلي</p>
          <p className="mt-2 text-3xl font-extrabold text-primary-soft">{orders.length}</p>
        </div>
      </div>

      {/* ✅ رسم بياني لمبيعات آخر 7 أيام */}
      <div className="glass rounded-2xl p-6">
        <h3 className="mb-4 text-lg font-bold text-primary">مبيعات آخر 7 أيام</h3>
        <div className="flex h-40 items-end justify-between gap-2">
          {(() => {
            const days = Array(7).fill(0);
            const today = new Date();
            orders.filter(o => o.status === "Delivered").forEach(o => {
              const diff = Math.floor((today.setHours(23,59,59,999) - (o.createdAt || 0)) / 86400000);
              if (diff >= 0 && diff < 7) days[6 - diff] += o.total;
            });
            const maxSale = Math.max(...days, 1);
            return days.map((sale, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="text-[10px] text-accent">{sale > 0 ? sale.toFixed(0) : ""}</div>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary-soft transition-all"
                  style={{ height: `${(sale / maxSale) * 100}%`, minHeight: sale > 0 ? "4px" : "0" }}
                ></div>
                <div className="text-[10px] text-foreground-muted">{i === 6 ? "اليوم" : `-${6 - i}`}</div>
              </div>
            ));
          })()}
        </div>
      </div>
    </div>
  );
}
