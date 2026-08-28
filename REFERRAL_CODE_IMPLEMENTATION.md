# 📋 نظام كود الدعوة (Referral Code System) — الربط عند التسجيل

> **تحديث 2026-08**: الآلية الحالية تربط كود الدعوة بحساب الزبون **مرة واحدة عند
> التسجيل لأول مرة** (خطوة إدخال الاسم)، وليس عند كل طلب. كل طلبات الزبون
> المرتبط توجَّه تلقائياً للشوفير صاحب الكود.

## 🔄 فكرة النظام

التطبيق تجمّع لشوفيرية التوصيل:

1. كل شوفير لديه **كود دعوة** خاص (بصيغة `DRVxxxxxxxx`) يوزعه على زبائنه.
2. الزبون الجديد عند إدخال اسمه لأول مرة يجد خانة **اختيارية** لكود الدعوة.
3. إن أدخل الكود: يُربط حسابه بالشوفير صاحب الكود نهائياً، وكل طلباته توجَّه
   إليه أولاً.
4. الشوفير لديه **مهلة 5 دقائق** لقبول الطلب، ويمكنه رفضه.
5. إن رفض أو انتهت المهلة: يتحرر الطلب تلقائياً لجميع المندوبين المتاحين.
6. الزبون بدون كود: طلبه يُرسل مباشرة لأي سائق متاح.

## 🧩 المكونات

### Cloud Functions (`functions/src/index.ts`)

| الدالة | الدور |
| --- | --- |
| `generateCourierReferralCode` | يولّد/يعيد كود الدعوة للشوفير (مرة واحدة، `DRV` + 8 أحرف hex) |
| `applyReferralCode` | **جديد**: يربط كود الدعوة بحساب الزبون عند أول تسجيل — يتحقق من صحة الكود ومن أن الحساب غير مرتبط مسبقاً، ثم يحفظ `referredByCourierId` ويرسل إشعاراً للشوفير |
| `placeOrder` | يحدد الشوفير المفضل: أولاً `referredByCourierId` من ملف الزبون (مع التأكد أن حساب الشوفير ما زال قائماً)، ثم الكود الممرر مع الطلب كتوافق قديم. ينشئ الطلب بحقل `preferredCourierId` + `courierInviteStatus: pending` + `courierInviteExpiresAt` (5 دقائق) ويشعر الشوفير |
| `respondToCourierInvite` | قبول/رفض الدعوة: القبول يسنده (`courierId` + `Accepted`، مع رفض السائق المشغول برحلة نشطة)، والرفض يحرر الطلب للجميع |
| `checkExpiredCourierInvites` | مجدولة كل دقيقة: تحرر الطلبات التي انقضت مهلتها (`courierInviteStatus: expired`) |

### الواجهة الأمامية

| الملف | الدور |
| --- | --- |
| `src/app/login/page.tsx` | خطوة الاسم (أول مرة) تتضمن خانة كود الدعوة الاختيارية — بعد إنشاء الحساب يستدعي `applyReferralCode`، وعند فشل الربط يبقى المستخدم ليصحح الكود أو يتابع بدونه |
| `src/lib/orders.ts` | غلاف `applyReferralCode(code)` + `getMyReferralCode()` + `respondToCourierInvite()` |
| `src/app/driver/page.tsx` | بطاقة كود الدعوة مع نسخ، قسم الدعوات المعلقة بزرَّي قبول/رفض + **عداد تنازلي حي** للمهلة المتبقية |

## 📊 هيكلية البيانات

### مجموعة `users`
```typescript
{
  role: 'courier' | 'customer' | 'admin' | 'vendor',
  referralCode?: string,          // للسائقين فقط — يُولَّد عبر generateCourierReferralCode
  referredByCourierId?: string,   // للزبائن — الشوفير المرتبط (يُكتب عبر applyReferralCode فقط)
  referredByCode?: string,        // الكود المستخدم عند الربط
}
```

### مجموعة `orders`
```typescript
{
  preferredCourierId?: string | null,       // الشوفير المفضل
  courierInviteStatus?: 'pending' | 'accepted' | 'rejected' | 'expired' | null,
  courierInviteExpiresAt?: Timestamp | null // انتهاء المهلة (5 دقائق)
}
```

## 🔐 الأمان والصلاحيات

- كتابة `referralCode` و`referredByCourierId` تتم حصراً عبر Cloud Functions
  (Admin SDK يتجاوز القواعد) — قواعد Firestore تمنع العميل من تعيينهما مباشرة
  حتى لا ينتحل سائق كود سائق آخر أو يغيّر الزبون شوفيره المرتبط.
- الدعوة يقبلها/يرفضها الشوفير المدعو فقط (`respondToCourierInvite` يتحقق من
  `preferredCourierId == uid`).
- السائقون لا يرون الطلبات الموجهة لغيرهم حتى تتحرر (قراءة `orders` مقيدة).

## 🗂️ الفهارس المطلوبة (`firestore.indexes.json` — موجودة)

- `orders`: `preferredCourierId` + `createdAt`
- `orders`: `status` + `preferredCourierId` + `createdAt`
- `orders`: `courierInviteStatus` + `courierInviteExpiresAt`
- `users`: `role` + `referralCode`

## 🚀 خطوات النشر

```bash
# 1) الدوال (تتضمن applyReferralCode الجديدة)
cd functions && npm run build
firebase deploy --only functions

# 2) القواعد والفهارس (إن تغيّرت)
firebase deploy --only firestore:rules,firestore:indexes
```

⚠️ الدالة المجدولة `checkExpiredCourierInvites` تتطلب تفعيل Cloud Scheduler:
```bash
gcloud services enable cloudscheduler.googleapis.com --project=<YOUR_PROJECT_ID>
```

## 🔄 سيناريوهات العمل

**زبون بكود دعوة والشوفير يقبل**: التسجيل بالكود → كل طلب يُنشأ بـ
`preferredCourierId` → إشعار فوري للشوفير → قبول خلال 5 دقائق → الطلب له.

**الشوفير يرفض أو يتأخر**: يتحرر الطلب (`preferredCourierId = null`،
`courierInviteStatus: rejected/expired`) ويظهر لكل المندوبين في تبويب
"طلبات متاحة" — أي سائق يستلمه.

**زبون بدون كود**: الطلب بلا `preferredCourierId` ويظهر مباشرة لجميع
المندوبين المتاحين.

## 🗑️ ما أُلغي من التصميم القديم

- حقل "كود دعوة مندوب مفضل" لكل طلب في صفحة السلة — استُبدل بالربط الدائم
  عند التسجيل (الخادم ما زال يقبل معامل `referralCode` في `placeOrder` كتوافق
  قديم للزبائن غير المرتبطين).
