// src/lib/imageCompress.ts
// ============================================================================
// تصغير وضغط الصور في المتصفح قبل رفعها إلى Firebase Storage — باستخدام
// canvas الأصلي (بدون مكتبات إضافية). الهدف: صور أطباق/مطاعم/إعلانات خفيفة
// لا تتجاوز ~150KB حتى لو كان الملف الأصلي من كاميرا الهاتف (5-12MB).
// ============================================================================

export interface CompressOptions {
  /** أقصى عرض أو ارتفاع بالبكسل — تُصغَّر الصورة مع الحفاظ على النسبة */
  maxDimension?: number;
  /** جودة الضغط 0..1 */
  quality?: number;
}

/**
 * يضغط الصورة ويعيد Blob جاهزاً للرفع.
 * إن فشل فك الترميز (مثل HEIC) أو كانت النتيجة أكبر من الأصل يعيد الملف
 * الأصلي كما هو — يتم إسقاط الجودة عند استخدام JPEG إذا فشل WebP.
 * يرمي خطأً برسالة عربية جاهزة للعرض إن كان الملف قابلاً للقراءة كصورة
 * في المتصفح.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<Blob> {
  const { maxDimension = 800, quality = 0.82 } = options;

  const img = await loadImage(file);

  // أبعاد ما بعد التصغير مع الحفاظ على نسبة العرض/الارتفاع
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file; // بيئة بلا canvas — نرفع الأصل

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const toBlob = (type: string): Promise<Blob | null> =>
    new Promise((resolve) => canvas.toBlob(resolve, type, quality));

  // webp أصغر حجماً بجودة أعلى — نحاوله أولاً ثم JPEG كخيار رجعي
  let blob = await toBlob("image/webp");
  if (!blob || blob.size >= file.size) {
    blob = await toBlob("image/jpeg");
  }

  // إن شارف الضغط حجم الأصل (صورة صغيرة أصلاً) لا فائدة — نرفع الأصل
  if (!blob || blob.size >= file.size) return file;
  return blob;
}

/** اسم ملف بامتداد يطابق صيغة الـ Blob الناتجة */
export function fileNameForBlob(baseName: string, blob: Blob): string {
  const ext =
    blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  return baseName.replace(/\.[a-zA-Z0-9]+$/, "").slice(0, 60) + "." + ext;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // SVG متجهي — لا حاجة لتصغيره عبر canvas (يفقد الدقة)
    if (file.type === "image/svg+xml") {
      reject(
        new Error(
          "صور SVG غير مدعومة للرفع — استخدم JPG أو PNG أو WEBP",
        ),
      );
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (!img.width || !img.height) {
        reject(new Error("الصيغة غير مدعومة — حوّل الصورة إلى JPG أو PNG"));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // يحدث غالباً مع صور HEIC من آيفون — المتصفح لا يفكّ ترميزها
      reject(
        new Error(
          "تعذّر قراءة الصورة (HEIC غير مدعومة غالباً) — التقطها بصيغة JPG أو PNG",
        ),
      );
    };
    img.src = url;
  });
}
