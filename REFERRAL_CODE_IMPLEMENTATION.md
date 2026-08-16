# 📋 دليل تطبيق نظام كود الدعوة (Referral Code System)

## ✅ ما تم إنجازه آلياً

### 1. تعديل قواعد Firestore (`firestore.rules`)
- ✅ السماح للجميع بقراءة بيانات السائقين لرؤية كود الدعوة
- ✅ منع تغيير كود الدعوة بعد إنشائه
- ✅ السماح للسائقين برؤية الطلبات الجاهزة (Ready) والطلبات الموجهة لهم عبر `preferredCourierId`
- ✅ إضافة صلاحيات تحديث الحالة للسائق (Accepted → PickedUp → Delivered)

### 2. تعديل فهارس قاعدة البيانات (`firestore.indexes.json`)
أضيفت الفهارس التالية:
```json
{
  "collectionGroup": "orders",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "preferredCourierId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "orders",
  "fields": [
    { "fieldPath": "preferredCourierId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "users",
  "fields": [
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "referralCode", "order": "ASCENDING" }
  ]
}
```

### 3. دوال Cloud Functions الجديدة (`functions/src/index.ts`)

#### أ. `placeOrder` - تم تعديلها
- ✅ تقبل معامل `referralCode` اختياري
- ✅ تتحقق من صحة كود الدعوة وتربط الطلب بالشوفير صاحب الكود
- ✅ تتحقق من صحة إحداثيات GPS (-90 إلى 90، -180 إلى 180)
- ✅ تضيف الحقول الجديدة للطلب:
  - `preferredCourierId`: معرف الشوفير المفضل
  - `courierInviteStatus`: حالة الدعوة (pending/accepted/rejected/expired)
  - `courierInviteExpiresAt`: انتهاء صلاحية الدعوة (5 دقائق)
- ✅ ترسل إشعاراً للشuffling المفضل عند إنشاء الطلب

#### ب. `respondToCourierInvite` - دالة جديدة
- **الوصف**: يسمح للشuffling بالقبول أو الرفض للدعوات ذات الأولوية
- **المعاملات**: 
  - `orderId`: معرف الطلب
  - `accept`: boolean (true للقبول، false للرفض)
- **النتيجة**:
  - إذا قبل: يُعيّن الطلب للشuffling ويتغير статусه إلى "Accepted"
  - إذا رفض: يُحرر الطلب للجميع (`preferredCourierId = null`)

#### ج. `checkExpiredCourierInvites` - دالة مجدولة
- **الوصف**: تعمل كل دقيقة لتحويل الطلبات منتهية الصلاحية إلى عامة
- **الجدول**: كل 1 دقيقة
- **الإجراء**: تبحث عن الطلبات التي انتهت صلاحية دعوتها وتحررها للجميع

#### د. `generateCourierReferralCode` - دالة جديدة
- **الوصف**: تولد كود دعوة فريد للشuffling
- **الكود**: بصيغة `DRV` + 8 أحرف سداسية عشوائية (مثال: `DRVA1B2C3D4`)
- **الاستخدام**: يستدعيها السائق مرة واحدة للحصول على كوده

---

## 🔧 التعديلات اليدوية المطلوبة

### 1. نشر قواعد Firestore
```bash
cd /workspace
firebase deploy --only firestore:rules
```

### 2. نشر فهارس Firestore
```bash
cd /workspace
firebase deploy --only firestore:indexes
```
⚠️ **ملاحظة**: بناء الفهارس قد يستغرق عدة دقائق إلى ساعات حسب حجم البيانات.

### 3. نشر Cloud Functions
```bash
cd /workspace/functions
npm run build
firebase deploy --only functions:placeOrder,functions:updateOrderStatus,functions:settleDriverCash,functions:respondToCourierInvite,functions:checkExpiredCourierInvites,functions:generateCourierReferralCode
```

### 4. تمكين Cloud Scheduler API
الدالة المجدولة `checkExpiredCourierInvites` تتطلب تفعيل Cloud Scheduler:
```bash
gcloud services enable cloudscheduler.googleapis.com --project=<YOUR_PROJECT_ID>
```

### 5. تحديث واجهة المستخدم (Frontend)

#### أ. صفحة تسجيل السائق
- إضافة زر "إنشاء كود دعوة" يستدعي `generateCourierReferralCode`
- عرض الكود للمستخدم بعد الإنشاء مع زر لنسخه

#### ب. صفحة طلب الزبون
- إضافة حقل اختياري لإدخال "كود دعوة الشuffling"
- عند الإرسال، يمرر `referralCode` لدالة `placeOrder`

#### ج. واجهة السائق
- صفحة تعرض الطلبات الموجهة له فقط (`preferredCourierId == uid`)
- زران لكل طلب: "قبول" و "رفض"
  - "قبول" يستدعي `respondToCourierInvite({ orderId, accept: true })`
  - "رفض" يستدعي `respondToCourierInvite({ orderId, accept: false })`
- عداد تنازلي يظهر الوقت المتبقي لانتهاء صلاحية الدعوة

#### د. واجهة الزبون
- إشعار يظهر عند قبول شuffling للطلب
- حالة الطلب تُحدّث تلقائياً

---

## 📊 هيكلية البيانات الجديدة

### مجموعة `users`
```typescript
{
  // ... الحقول الموجودة
  role: 'courier' | 'customer' | 'admin' | 'vendor',
  referralCode?: string | null  // جديد: كود الدعوة (للسائقين فقط)
}
```

### مجموعة `orders`
```typescript
{
  // ... الحقول الموجودة
  preferredCourierId?: string | null,      // جديد: الشuffling المفضل
  courierInviteStatus?: 'pending' | 'accepted' | 'rejected' | 'expired' | null,  // جديد
  courierInviteExpiresAt?: Timestamp | null  // جديد: انتهاء الصلاحية
}
```

---

## 🔄 تدفق العمل الكامل

### السيناريو 1: الزبون يستخدم كود دعوة والشuffling يقبل
1. الزبون يسجل دخول ويبدأ طلب جديد
2. يدخل كود الدعوة (مثال: `DRVA1B2C3D4`)
3. النظام يتحقق من الكود ويجد الشuffling المرتبط به
4. يُنشأ الطلب بـ `preferredCourierId` و `courierInviteStatus: 'pending'`
5. يُرسَل إشعار للشuffling: "طلب جديد من زبونك!"
6. الشuffling يفتح التطبيق ويرى الطلب في قسم "الطلبات الموجهة إلي"
7. يضغط "قبول"
8. النظام يُعيّن `courierId` و `status: 'Accepted'`
9. يُرسَل إشعار للزبون: "تم قبول طلبك!"

### السيناريو 2: الشuffling يرفض أو لا يرد
1. نفس الخطوات 1-5
2. الشuffling يضغط "رفض" **أو** تنتهي صلاحية 5 دقائق بدون رد
3. النظام يحرر الطلب: `preferredCourierId = null`, `courierInviteStatus: 'rejected'/'expired'`
4. يظهر الطلب لجميع السائقين في قائمة "الطلبات الجاهزة"
5. أي سائق يمكنه استلامه

### السيناريو 3: زبون بدون كود دعوة
1. الزبون ينشئ طلب بدون إدخال كود
2. `preferredCourierId = null`
3. الطلب يظهر مباشرة لجميع السائقين

---

## 🔐 الأمان والصلاحيات

### من يمكنه رؤية كود الدعوة؟
- ✅ الجميع (للسماح للزبائن بإدخاله)
- ❌ لا يمكن تعديله بعد الإنشاء (إلا من الأدمن)

### من يمكنه رؤية الطلبات ذات الأولوية؟
- ✅ الشuffling المفضل فقط (`preferredCourierId`)
- ✅ الأدمن
- ❌ السائقون الآخرون (حتى تنتهي الصلاحية)

### من يمكنه قبول/رفض الدعوة؟
- ✅ الشuffling المفضل فقط
- ❌ أي شخص آخر

---

## ⚠️ ملاحظات هامة

1. **انتهاء الصلاحية**: الدعوات تنتهي بعد 5 دقائق تلقائياً عبر الدالة المجدولة
2. **كود فريد**: كل سائق يمكنه الحصول على كود واحد فقط
3. **عدم الإجبار**: استخدام كود الدعوة اختياري تماماً
4. **الأولوية لا تضمن التسليم**: إذا رفض الشuffling أو لم يرد، ينتقل الطلب للعامة
5. **الإشعارات**: تأكد من إعداد Firebase Cloud Messaging (FCM) في التطبيق

---

## 🧪 الاختبار المطلوب

### اختبار 1: إنشاء كود دعوة
```javascript
// في Console المتصفح
const generateCourierReferralCode = httpsCallable(functions, 'generateCourierReferralCode');
const result = await generateCourierReferralCode();
console.log(result.data.referralCode); // DRVxxxxxxxx
```

### اختبار 2: طلب مع كود دعوة
```javascript
const placeOrder = httpsCallable(functions, 'placeOrder');
const result = await placeOrder({
  restaurantId: '...',
  items: [...],
  zoneId: '...',
  deliveryAddressDetails: '...',
  referralCode: 'DRVXXXXXXXX'  // كود الدعوة
});
console.log(result.data.order.preferredCourierId); // يجب أن يكون معرف الشuffling
```

### اختبار 3: قبول الدعوة
```javascript
const respondToCourierInvite = httpsCallable(functions, 'respondToCourierInvite');
const result = await respondToCourierInvite({
  orderId: '...',
  accept: true
});
console.log(result.data.ok); // true
```

---

## 📞 الدعم الفني

إذا واجهت أي مشكلة أثناء التطبيق:
1. تحقق من سجلات Cloud Functions في Firebase Console
2. تأكد من نشر الفهارس وانتظر اكتمال بنائها
3. تحقق من صلاحيات المستخدم في Firestore Rules
