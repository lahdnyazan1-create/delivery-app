#!/bin/bash
# ============================================================================
# أوامر النشر الآمن للتطبيق
# ============================================================================

echo "🔍 التحقق من وجود Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI غير مثبت. قم بتثبيته بالأمر:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI موجود"

echo ""
echo "📋 حالة الملفات قبل النشر:"
echo "--------------------------"
echo "📄 firestore.rules: $(wc -l < firestore.rules) سطر"
echo "📄 storage.rules: $(wc -l < storage.rule) سطر"
echo "📄 firestore.indexes.json: $(cat firestore.indexes.json | grep -c '"fieldPath"') حقول مفهرسة"
echo "📄 functions/src/index.ts: $(wc -l < functions/src/index.ts) سطر"
echo ""

echo "🚀 بدء النشر..."
echo "================"
echo ""

# نشر قواعد Firestore
echo "🔐 نشر قواعد Firestore الأمنية..."
firebase deploy --only firestore:rules
if [ $? -ne 0 ]; then
    echo "❌ فشل نشر قواعد Firestore"
    exit 1
fi
echo "✅ تم نشر قواعد Firestore بنجاح"
echo ""

# نشر فهارس Firestore
echo "📑 نشر فهارس Firestore..."
firebase deploy --only firestore:indexes
if [ $? -ne 0 ]; then
    echo "❌ فشل نشر الفهارس"
    exit 1
fi
echo "✅ تم نشر الفهارس بنجاح"
echo ""

# نشر قواعد Storage
echo "🗄️ نشر قواعد Storage..."
firebase deploy --only storage:rules
if [ $? -ne 0 ]; then
    echo "❌ فشل نشر قواعد Storage"
    exit 1
fi
echo "✅ تم نشر قواعد Storage بنجاح"
echo ""

# نشر Cloud Functions
echo "⚡ نشر Cloud Functions..."
firebase deploy --only functions
if [ $? -ne 0 ]; then
    echo "❌ فشل نشر Cloud Functions"
    exit 1
fi
echo "✅ تم نشر Cloud Functions بنجاح"
echo ""

echo "🎉 اكتمل النشر بنجاح!"
echo "===================="
echo ""
echo "📝 الخطوات التالية:"
echo "1. فعّل Firebase App Check من Firebase Console"
echo "2. اختبر السيناريوهات الحرجة (انظر PRE_LAUNCH_CHECKLIST.md)"
echo "3. راقب الأخطاء في Cloud Functions Logs"
echo ""
