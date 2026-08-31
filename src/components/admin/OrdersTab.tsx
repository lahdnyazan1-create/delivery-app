// src/components/admin/OrdersTab.tsx
// تبويب "الطلبات" — متابعة حية + إسناد سائق + تغيير حالة + إلغاء
"use client";

import { useAppStore } from "@/store/useAppStore";
import { useToastStore } from "@/store/useToastStore";
import { STATUS_LABELS_AR as STATUS_LABELS } from "@/constants/orderStatuses";
import { OrderStatus, STATUS_TRANSITIONS } from "@/types/database";
import { formatPrice } from "@/constants/currency";
import { statusBadgeClass } from "./shared";

export function OrdersTab() {
  const { orders, drivers, updateOrderStatus, assignDriverToOrder } =
    useAppStore();

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    // ✅ حارس ضد الخيار الفارغ — سابقاً كان يرسل targetDriverId:"" للخادم
    if (!driverId) return;
    const result = await assignDriverToOrder(orderId, driverId);
    if (result.ok) {
      useToastStore.getState().success("تم إسناد الطلب للمندوب");
    } else {
      useToastStore.getState().error(result.message || "تعذّر الإسناد");
    }
  };

  // ✅ تغيير الحالة مع إبلاغ النتيجة — سابقاً كانت fire-and-forget تفشل بصمت
  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    const result = await updateOrderStatus(orderId, status);
    if (!result.ok) {
      useToastStore.getState().error(result.message || "تعذّر تغيير الحالة");
    }
  };

  // ✅ إلغاء طلب من الأدمن — يمر عبر Cloud Function نفسه الذي تستخدمه
  // واجهة الزبون (تحقق صلاحيات + انتقالات صالحة في Transaction)
  const handleCancelOrder = async (orderId: string) => {
    const ok = await useToastStore.getState().confirm({
      title: "إلغاء هذا الطلب؟",
      message: "سيُعلَّم الطلب ملغياً — لا يمكن التراجع.",
      confirmText: "إلغاء الطلب",
      danger: true,
    });
    if (!ok) return;
    const result = await updateOrderStatus(orderId, "Cancelled");
    if (result.ok) {
      useToastStore.getState().success("تم إلغاء الطلب");
    } else {
      useToastStore.getState().error(result.message || "تعذّر الإلغاء");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="mb-4 text-xl font-bold">متابعة الطلبات المباشرة</h2>
      {orders.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
          لا يوجد طلبات حالية
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="glass space-y-4 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between border-b border-glass-border pb-3">
                <div>
                  <span className="font-mono text-xs text-primary">
                    #{order.id.slice(-6)}
                  </span>
                  <h3 className="text-lg font-bold">
                    {order.restaurantName}
                  </h3>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      order.paymentMethod === "CASH"
                        ? "bg-amber-500/15 text-amber-500"
                        : "bg-emerald-500/15 text-emerald-500"
                    }`}
                  >
                    {order.paymentMethod === "CASH"
                      ? "كاش"
                      : "مدفوع مسبقاً"}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-sm text-foreground">
                <p>
                  <span className="text-foreground-muted">العميل:</span>{" "}
                  {order.customerName} ({order.customerPhone})
                </p>
                <p>
                  <span className="text-foreground-muted">العنوان:</span>{" "}
                  {order.deliveryAddressDetails ||
                    order.deliveryAddress ||
                    "—"}
                </p>
                {/* ✅ اسم المندوب بدل UID الخام — القائمة محملة في نفس التبويب */}
                <p>
                  <span className="text-foreground-muted">
                    المندوب الحالي:
                  </span>{" "}
                  {order.courierId
                    ? drivers.find((d) => d.id === order.courierId)?.name ||
                      order.courierId.slice(-6)
                    : "غير محدد"}
                </p>
                <p>
                  <span className="text-foreground-muted">المجموع:</span>{" "}
                  <strong className="text-primary">
                    {formatPrice(order.total)}
                  </strong>
                </p>
              </div>

              <div className="space-y-1 rounded-xl bg-foreground/5 p-3 text-xs text-foreground-muted">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col py-0.5">
                    <div className="flex justify-between">
                      <span>
                        {item.quantity}× {item.name}
                      </span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    {item.notes && (
                      <span className="text-[10px] text-amber-500 mt-0.5">
                        📝 {item.notes}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-glass-border pt-2">
                <div className="flex items-center gap-2">
                  <label className="w-20 text-xs text-foreground-muted">
                    السائق:
                  </label>
                  <select
                    value={order.courierId || ""}
                    onChange={(e) =>
                      handleAssignDriver(order.id, e.target.value)
                    }
                    disabled={order.status !== "Ready"}
                    className="w-full rounded-lg border border-glass-border bg-secondary p-2 text-xs text-foreground outline-none focus:border-primary disabled:opacity-50"
                  >
                    <option value="">اختر سائق...</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.vehicle})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-20 text-xs text-foreground-muted">
                    الحالة:
                  </label>
                  <select
                    value={order.status}
                    onChange={(e) =>
                      handleStatusChange(
                        order.id,
                        e.target.value as OrderStatus,
                      )
                    }
                    className="w-full rounded-lg border border-glass-border bg-secondary p-2 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option value={order.status}>
                      {STATUS_LABELS[order.status]} (الحالي)
                    </option>
                    {(STATUS_TRANSITIONS[order.status] || []).map(
                      (s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                {/* ⚠️ ملاحظة: الإدارة تملك صلاحية القفز لأي حالة (isAdmin
                    في updateOrderStatus)، لكن ننصح باتباع التسلسل الطبيعي
                    لتفادي أخطاء تشغيلية (مثل تخطي "جاهز" قبل تعيين سائق). */}
              </div>

              {(STATUS_TRANSITIONS[order.status] || []).includes("Cancelled") && (
                <button
                  type="button"
                  onClick={() => handleCancelOrder(order.id)}
                  className="w-full rounded-xl bg-danger/10 py-2.5 text-sm font-bold text-danger transition hover:bg-danger/20"
                >
                  إلغاء الطلب
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
