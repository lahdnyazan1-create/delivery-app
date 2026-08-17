// src/app/admin/page.tsx
// ============================================================================
// التعديلات:
// - ✅ STATUS_LABELS أصبحت تغطي "Accepted" أيضاً (كانت ناقصة فتسبب خطأ عرض)
// - ✅ عرض deliveryAddressDetails بدل deliveryAddress المهجور + شارة طريقة الدفع
// - ✅ "ربط مالك مطعم" صار يضبط role="vendor" تلقائياً (كان يربط ownerId فقط
//   بدون ترقية الدور، فكانت لوحة /vendor ترفض دخوله لأنها تتحقق من الدور)
// - ✅ تبويب "مناطق التوصيل" جديد بالكامل — إضافة/تعديل رسوم/تفعيل وتعطيل
// - ✅ قسم جديد بتبويب "الوصول والفرق" لعرض وتسوية محافظ كاش المندوبين
// ============================================================================
// ملاحظة إعادة الهيكلة: تم تقسيم هذه الصفحة الضخمة إلى مكوّنات مستقلة لكل
// تبويب داخل src/components/admin/ — الصفحة نفسها صارت قشرة رقيقة تحمل
// شريط التبويبات فقط، وكل تبويب يحمّل بياناته ويدير حالته بنفسه دون أي
// تغيير بالسلوك الظاهر للمستخدم.
// ============================================================================

"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { RequireRole } from "@/components/auth/RequireRole";
import { OrdersTab } from "@/components/admin/OrdersTab";
import { RestaurantsTab } from "@/components/admin/RestaurantsTab";
import { ProductsTab } from "@/components/admin/ProductsTab";
import { ZonesTab } from "@/components/admin/ZonesTab";
import { PromoCodesTab } from "@/components/admin/PromoCodesTab";
import { CategoriesTab } from "@/components/admin/CategoriesTab";
import { BannersTab } from "@/components/admin/BannersTab";
import { AccessTab } from "@/components/admin/AccessTab";
import { CustomersTab } from "@/components/admin/CustomersTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";

function AdminDashboardContent() {
  const { restaurants, orders } = useAppStore();

  const [activeTab, setActiveTab] = useState<
    | "orders"
    | "restaurants"
    | "products"
    | "zones"
    | "promocodes"
    | "categories"
    | "banners"
    | "access"
    | "customers"
    | "analytics"
  >("orders");

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <header className="mb-8 flex flex-col justify-between gap-4 border-b border-glass-border pb-6 md:flex-row md:items-center">
        <div>
          <h1 className="bg-gradient-to-r from-primary to-primary-soft bg-clip-text text-3xl font-bold text-transparent">
            لوحة تحكم الإدارة
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            إدارة المطاعم، الطلبات، والعمليات المباشرة
          </p>
        </div>

        <div className="glass flex flex-wrap rounded-xl p-1">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "orders"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الطلبات ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("restaurants")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "restaurants"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            المطاعم ({restaurants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "products"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            المنتجات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("zones")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "zones"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            مناطق التوصيل
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("promocodes")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "promocodes"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            أكواد الخصم
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "categories"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الفئات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("banners")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "banners"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الإعلانات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("access")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "access"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الوصول والفرق
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("customers")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "customers"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            العملاء
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "analytics"
                ? "bg-primary font-bold text-white"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            الإحصائيات
          </button>
        </div>
      </header>

      {activeTab === "orders" && <OrdersTab />}
      {activeTab === "restaurants" && <RestaurantsTab />}
      {activeTab === "products" && <ProductsTab />}
      {activeTab === "zones" && <ZonesTab />}
      {activeTab === "promocodes" && <PromoCodesTab />}
      {activeTab === "categories" && <CategoriesTab />}
      {activeTab === "banners" && <BannersTab />}
      {activeTab === "access" && <AccessTab />}
      {activeTab === "customers" && <CustomersTab />}
      {activeTab === "analytics" && <AnalyticsTab />}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <RequireRole role="admin">
      <AdminDashboardContent />
    </RequireRole>
  );
}
