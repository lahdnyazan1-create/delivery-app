// src/components/ui/ImageUploader.tsx
// ============================================================================
// مكوّن رفع صورة واحدة إلى Firebase Storage. يعرض معاينة فورية، شريط تقدّم،
// ثم يستدعي onUploaded(url) بالرابط المباشر بعد اكتمال الرفع لتخزينه في
// حقل image/imageUrl بمستند Firestore المناسب (مطعم/طبق/إعلان).
// ============================================================================

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

type ImageUploaderProps = {
  /** مسار المجلد بـ Storage، مثال: "restaurants" أو "dishes" أو "banners" */
  folder: "restaurants" | "dishes" | "banners";
  /** معرّف فريد (اسم المطعم/الطبق المؤقت أو id فعلي) لتنظيم الملفات */
  entityId: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
  className?: string;
};

const MAX_SIZE_MB = 5;

export function ImageUploader({
  folder,
  entityId,
  currentUrl,
  onUploaded,
  className = "",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");


  // ✅ تنظيف ذاكرة المعاينة المحلية لتسريب الذاكرة (Memory Leak)
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFile = (file: File | null) => {
    if (!file) return;
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("الملف يجب أن يكون صورة (jpg, png, webp...)");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`الحجم أكبر من ${MAX_SIZE_MB}MB — اختر صورة أصغر`);
      return;
    }

    // معاينة فورية محلية أثناء الرفع
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
    const path = `${folder}/${entityId}/${safeName}`;
    const fileRef = storageRef(storage, path);
    const task = uploadBytesResumable(fileRef, file);

    setProgress(0);
    task.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        );
        setProgress(pct);
      },
      (err) => {
        console.error("Upload failed", err);
        setError(
          err?.code === "storage/unauthorized"
            ? "تم الرفض — تأكد من نشر storage.rules ومن أن حسابك admin"
            : "فشل الرفع، حاول مجدداً",
        );
        setProgress(null);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setProgress(null);
        onUploaded(url);
      },
    );
  };

  return (
    <div className={className}>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-glass-border bg-secondary transition hover:border-primary"
      >
        {preview ? (
          // ✅ معاينة محلية (data URL) — next/image محذوف التحسين لهذا النوع
          <Image
            src={preview}
            alt="معاينة"
            fill
            unoptimized
            sizes="400px"
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-foreground-muted">
            <ImagePlus className="size-6" />
            <span className="text-xs font-bold">اضغط لرفع صورة</span>
          </div>
        )}

        {progress !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary/80 backdrop-blur-sm">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-xs font-bold text-foreground">
              {progress}%
            </span>
          </div>
        )}

        {preview && progress === null && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              onUploaded("");
            }}
            className="absolute left-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
            aria-label="إزالة الصورة"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />

      {error && (
        <p className="mt-1.5 text-xs font-semibold text-danger">{error}</p>
      )}
      <p className="mt-1 text-[10px] text-foreground-muted">
        حتى {MAX_SIZE_MB}MB — JPG أو PNG أو WEBP
      </p>
    </div>
  );
}
