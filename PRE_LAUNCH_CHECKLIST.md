# ✅ قائمة التحقق قبل إطلاق التطبيق (Pre-Launch Checklist)

## 🔴 إجراءات إلزامية (لا يمكن الإطلاق بدونها)

### 1. نشر قواعد الأمان
```bash
# قم بتنفيذ هذه الأوامر بالترتيب:
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only firestore:indexes
firebase deploy --only functions
```

### 2. تفعيل Firebase App Check (حماية إضافية)
- اذهب إلى Firebase Console → App Check
- فعّل App Check لـ Web و Cloud Functions
- استخدم reCAPTCHA v3 أو debug token للتطوير

### 3. إعداد Rate Limiting (حماية من DDoS)
- في `functions/src/index.ts`، أضف تحقق من عدد الطلبات لكل مستخدم
- استخدم Redis أو Firestore لتخزين عداد الطلبات

### 4. اختبار السيناريوهات الحرجة
- [ ] طلب بنفس كود الخصم مرتين (يجب أن يرفض الثاني)
- [ ] مطعم يحاول تحديث حالة إلى "Delivered" مباشرة (يجب أن يرفض)
- [ ] سائق يحاول رؤية محفظة سائق آخر (يجب أن يرفض)
- [ ] مستخدم عادي يحاول إنشاء مستخدم جديد بدور "admin" (يجب أن يرفض)

---

## 🟡 تحسينات مستحبة (قبل الإنتاج)

### 1. إضافة نظام المخزون (Inventory)
- أضف حقل `stock` للأطباق في `dishes` collection
- تحقق من المخزون داخل Transaction في `placeOrder`

### 2. تحسين رسائل الخطأ للمستخدم
- في `src/app/cart/page.tsx`، حوّل الأخطاء التقنية لرسائل إنسانية
- مثال: "المطعم مغلق الآن" بدل "failed-precondition"

### 3. إضافة تنبيه صوتي للمطعم
- في `src/app/vendor/page.tsx`، أضف `<audio>` للتنبيه عند وصول طلب جديد

### 4. عرض رصيد السائق بوضوح
- في `src/app/driver/page.tsx`، أضف بطاقة تعرض `totalCashInHand`

---

## 🟢 اختبارات الأداء

### 1. اختبار الحمل (Load Testing)
- استخدم أدوات مثل k6 أو Artillery.io
- اختبر 100 طلب متزامن على `placeOrder`

### 2. مراقبة الأخطاء
- فعّل Sentry أو Firebase Crashlytics
- راقب نسبة الأخطاء في Cloud Functions

### 3. اختبار الفهارس
- تحقّق من أن جميع الاستعلامات تستخدم الفهارس المنشورة
- راقب Firestore → Indexes في Firebase Console

---

## 📝 ملاحظات مهمة

1. **قواعد Firestore الحالية آمنة** ولكن يجب نشرها على مشروعك الفعلي
2. **IdempotencyKeys محمية** بقاعدة `allow write: if false` في القواعد الحالية
3. **الخصومات تُتحقق منها** داخل Transaction لمنع Race Conditions
4. **محافظ السائقين محمية** ولا يقرأها إلا صاحبها والأدمن

---

## 🚀 أمر النشر الشامل (كل شيء دفعة واحدة)

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage:rules,functions
```

**ملاحظة:** قد يستغرق النشر بضع دقائق. انتظر حتى ترى "Deploy complete!"
