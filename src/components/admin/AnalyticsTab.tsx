// src/components/admin/AnalyticsTab.tsx
// تبويب "الإحصائيات" — إيرادات/طلبات + ✅ مرآة التقييمات الفعلية:
// متوسط تقييم كل مطعم وعدد تقييماته وآخر التعليقات — كل تقييم هنا جاء
// من عميل قُبل طلبه فعلاً (rateOrder Cloud Function تفرض ذلك).
"use client";

import { useEffect, useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { fetchAllRatings, type RatingDoc } from "@/lib/firestore";
import { formatPrice } from "@/constants/currency";

export function AnalyticsTab() {
  const { orders, restaurants } = useAppStore();

  const [ratings, setRatings] = useState<RatingDoc[]>([]);
  const [ratingsLoading, setRatingsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setRatingsLoading(true);
    fetchAllRatings()
      .then((list) => alive && setRatings(list))
      .catch((err) => console.error("Failed to load ratings", err))
      .finally(() => alive && setRatingsLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const totalRevenue = orders
    .filter((o) => o.status === "Delivered")
    .reduce((acc, curr) => acc + curr.total, 0);

  const activeOrders = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled",
  );

  const avgAll =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)
      : "0.0";

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

      {/* ✅ مرآة التقييمات: متوسط كل مطعم + آخر التعليقات الحقيقية */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">تقييمات المطاعم الفعلية</h3>
          <span className="flex items-center gap-1.5 rounded-xl bg-white/5 px-2.5 py-1 text-xs font-bold text-accent-soft">
            <Star className="size-3.5 fill-current" aria-hidden />
            متوسط عام {avgAll} ({ratings.length} تقييم)
          </span>
        </div>

        {ratingsLoading ? (
          <p className="py-4 text-center text-sm text-foreground-muted">جارٍ تحميل التقييمات…</p>
        ) : ratings.length === 0 ? (
          <p className="py-4 text-center text-sm text-foreground-muted">
            لا توجد تقييمات بعد — تظهر تلقائياً هنا بعد أن يقيّم العملاء طلباتهم المُسلَّمة.
          </p>
        ) : (
          <>
            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              {restaurants.map((r) => {
                const restRatings = ratings.filter((x) => x.restaurantId === r.id);
                if (restRatings.length === 0) return null;
                const avg =
                  restRatings.reduce((s, x) => s + x.stars, 0) / restRatings.length;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border border-glass-border bg-secondary px-3 py-2"
                  >
                    <span className="truncate text-sm font-bold">{r.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-accent-soft">
                      <Star className="size-3.5 fill-current" aria-hidden />
                      {avg.toFixed(1)} ({restRatings.length})
                    </span>
                  </div>
                );
              })}
            </div>

            <ul className="space-y-2">
              {ratings
                .filter((r) => r.comment)
                .slice(0, 8)
                .map((r) => (
                  <li key={r.id} className="rounded-xl bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-xs font-bold text-foreground">
                        <MessageSquare className="size-3.5 text-primary" aria-hidden />
                        {restaurants.find((x) => x.id === r.restaurantId)?.name || "مطعم"}
                      </span>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`size-3 ${i < r.stars ? "fill-amber-400 text-amber-400" : "text-foreground-muted/30"}`}
                            aria-hidden
                          />
                        ))}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-foreground-muted">
                      {r.comment}
                    </p>
                    <p className="mt-1 text-[10px] text-foreground-muted">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("ar-EG") : ""}
                    </p>
                  </li>
                ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
