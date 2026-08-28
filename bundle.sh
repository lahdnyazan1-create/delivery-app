#!/bin/bash

# اسم ملف المخرج النهائي
OUTPUT_FILE="project_context.txt"

# إفراغ أو إنشاء الملف
> "$OUTPUT_FILE"

echo "=== جارٍ تجميع كود المشروع للذكاء الاصطناعي ==="

# قائمة الاستثناءات الدقيقة (استبعاد الملفات الحساسة، الصور، البناء، وحزم التبعيات)
EXCLUDES=(
    -path "*/node_modules*" -o
    -path "*/.next*" -o
    -path "*/.git*" -o
    -path "*/lib*" -o
    -path "*/public/icons*" -o
    -path "*/scripts/serviceAccountKey.json" -o  # استبعاد مفتاح الخادم الحساس
    -name "package-lock.json" -o
    -name "bundle-code.txt" -o
    -name "bundle.js" -o
    -name "$OUTPUT_FILE" -o
    -name "*.png" -o
    -name "*.jpg" -o
    -name "*.ico" -o
    -name "*.svg" -o
    -name "*.patch" -o
    -name "*.sed" -o
    -name "*.tsbuildinfo"
)

# تجميع الملفات البرمجية والإعدادات المهمة فقط
find . -type f \
    \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.mjs" -o -name "*.json" -o -name "*.rules" -o -name "*.css" \) \
    ! \( "${EXCLUDES[@]}" \) | while read -r file; do
        echo "================================================================================" >> "$OUTPUT_FILE"
        echo "// FILE: ${file#./}" >> "$OUTPUT_FILE"
        echo "================================================================================" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
        echo -e "\n\n" >> "$OUTPUT_FILE"
done

echo "تم التجميع بنجاح في الملف: $OUTPUT_FILE"

