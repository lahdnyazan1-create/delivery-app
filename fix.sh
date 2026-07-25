#!/bin/bash

# =============================================
# 1. حذف الملفات والمجلدات غير المستخدمة
# =============================================
rm -f merge_files.py project_context_report.txt
rm -rf src/components/cart

# =============================================
# 2. إنشاء مجلد constants ونقل الثوابت
# =============================================
mkdir -p src/constants

# كتابة ملف cuisines.ts
cat > src/constants/cuisines.ts << 'EOF'
export type CuisineId = "all" | "pizza" | "burger" | "oriental" | "sushi" | "sweets";

export const CUISINES = [
  { id: "all" as const, label: "All", icon: "🍽️" },
  { id: "pizza", label: "بيتزا", icon: "🍕" },
  { id: "burger", label: "برغر", icon: "🍔" },
  { id: "oriental", label: "شرقي", icon: "🥙" },
  { id: "sushi", label: "سوشي", icon: "🍣" },
  { id: "sweets", label: "حلويات", icon: "🍰" },
];
EOF

# كتابة ملف orderStatuses.ts
cat > src/constants/orderStatuses.ts << 'EOF'
import { OrderStatus } from "@/types/database";

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Preparing",
  "OutForDelivery",
  "Delivered",
  "Cancelled",
];
EOF

# =============================================
# 3. تحديث imports في المكونات
# =============================================

# CuisineSlider
sed -i 's|import { CUISINES, type CuisineId } from "@/data/mockData";|import { CUISINES, type CuisineId } from "@/constants/cuisines";|' src/components/home/CuisineSlider.tsx

# page.tsx و search/page.tsx
sed -i 's|import type { CuisineId } from "@/data/mockData";|import type { CuisineId } from "@/constants/cuisines";|' src/app/page.tsx
sed -i 's|import type { CuisineId } from "@/data/mockData";|import type { CuisineId } from "@/constants/cuisines";|' src/app/search/page.tsx

# OrderHistory - إضافة import مفقود
sed -i '/^import.*from.*$/a import { Order } from "@/types/database";' src/components/profile/OrderHistory.tsx

# OrderStageTracker - تغيير نوع OrderStatus وتصحيح OutForDelivery
sed -i 's|import type { OrderStatus } from "@/data/mockData";|import type { OrderStatus } from "@/types/database";|' src/components/tracking/OrderStageTracker.tsx
sed -i 's|"Out for Delivery"|"OutForDelivery"|g' src/components/tracking/OrderStageTracker.tsx

# driver و restaurant - استخدام ORDER_STATUSES من constants
sed -i 's|import { ORDER_STATUSES, type OrderStatus } from "@/types/database";|import { ORDER_STATUSES } from "@/constants/orderStatuses";\nimport type { OrderStatus } from "@/types/database";|' src/app/driver/page.tsx
sed -i 's|import { ORDER_STATUSES, type OrderStatus } from "@/types/database";|import { ORDER_STATUSES } from "@/constants/orderStatuses";\nimport type { OrderStatus } from "@/types/database";|' src/app/restaurant/page.tsx

# =============================================
# 4. حذف mockData.ts بعد نقل كل ما يحتاجه
# =============================================
rm -f src/data/mockData.ts

echo "✅ تم التنظيف والتعديلات الأساسية."
echo "⚠️  يرجى تنفيذ التعديلات اليدوية المذكورة في التعليمات."
