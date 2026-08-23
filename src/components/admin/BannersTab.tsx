// src/components/admin/BannersTab.tsx
// تبويب "الإعلانات" — إضافة/تعديل/حذف من الأدمن
"use client";

import React, { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";
import {
  fetchAllBanners,
  addBanner,
  updateBanner,
  deleteBannerDoc,
} from "@/lib/firestore";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { inputClass, labelClass } from "./shared";

type BannerListItem = {
  id: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  gradient?: string;
  imageUrl?: string;
  order: number;
  active: boolean;
};

const emptyBannerForm = {
  title: "",
  subtitle: "",
  ctaText: "",
  ctaLink: "",
  imageUrl: "",
  order: 0,
};

export function BannersTab() {
  // ---------------- Banners state ----------------
  const [bannersList, setBannersList] = useState<BannerListItem[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [bannerForm, setBannerForm] = useState(emptyBannerForm);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerBusy, setBannerBusy] = useState(false);

  const loadBanners = async () => {
    setBannersLoading(true);
    try {
      const list = (await fetchAllBanners()) as any[];
      setBannersList(list);
    } catch (error) {
      console.error("Failed to load banners", error);
    } finally {
      setBannersLoading(false);
    }
  };

  // المكوّن يُركَّب فقط عند تفعيل التبويب — التحميل عند التركيب يحافظ
  // على نفس السلوك الكسول (lazy) القديم المرتبط بتفعيل التبويب
  useEffect(() => {
    loadBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEditBanner = (banner: BannerListItem) => {
    setEditingBannerId(banner.id);
    setBannerForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      ctaText: banner.ctaText || "",
      ctaLink: banner.ctaLink || "",
      imageUrl: banner.imageUrl || "",
      order: Number(banner.order ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) return;
    setBannerBusy(true);
    try {
      // ✅ تعديل: فارغ يعني إزالة الحقل تماماً
      const strOrDelete = (value: string) => value.trim();

      if (editingBannerId) {
        const payload: Parameters<typeof updateBanner>[1] = {
          title: bannerForm.title.trim(),
          order: Number(bannerForm.order),
          imageUrl: strOrDelete(bannerForm.imageUrl),
          gradient: "from-primary to-red-600",
        };
        await updateBanner(editingBannerId, payload);
        setEditingBannerId(null);
        setBannerForm(emptyBannerForm);
        useToastStore.getState().success("تم حفظ تعديلات الإعلان");
        await loadBanners();
        return;
      }

      const payload: Parameters<typeof addBanner>[0] = {
        title: bannerForm.title.trim(),
        gradient: "from-primary to-red-600",
        order: Number(bannerForm.order),
        active: true,
      };
      if (bannerForm.subtitle.trim()) payload.subtitle = bannerForm.subtitle.trim();
      if (bannerForm.ctaText.trim()) payload.ctaText = bannerForm.ctaText.trim();
      if (bannerForm.ctaLink.trim()) payload.ctaLink = bannerForm.ctaLink.trim();
      if (bannerForm.imageUrl.trim()) payload.imageUrl = bannerForm.imageUrl.trim();
      await addBanner(payload);
      setBannerForm(emptyBannerForm);
      useToastStore.getState().success("تمت إضافة الإعلان");
      await loadBanners();
    } catch (error: any) {
      useToastStore.getState().error(
        `فشل الحفظ: ${error?.message || "خطأ غير معروف"}`,
      );
    } finally {
      setBannerBusy(false);
    }
  };

  const handleToggleBannerActive = async (id: string, active: boolean) => {
    await updateBanner(id, { active: !active });
    await loadBanners();
  };

  const handleDeleteBanner = async (id: string) => {
    const ok = await useToastStore.getState().confirm({
      title: "حذف هذا الإعلان؟",
      message: "سيُحذف الإعلان نهائياً ولا يمكن التراجع.",
      confirmText: "حذف",
      danger: true,
    });
    if (!ok) return;
    await deleteBannerDoc(id);
    await loadBanners();
  };

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <div className="glass h-fit rounded-2xl p-6">
        <h2 className="mb-1 text-lg font-bold text-primary">
          {editingBannerId ? "تعديل الإعلان" : "إضافة إعلان جديد"}
        </h2>
        <p className="mb-4 text-xs text-foreground-muted">
          رابط الصورة اختياري — إن تُرك فارغاً يظهر تدرج لوني بدلاً منه.
        </p>
        <form onSubmit={handleAddBanner} className="space-y-4">
          <div>
            <label className={labelClass}>العنوان *</label>
            <input
              type="text"
              required
              value={bannerForm.title}
              onChange={(e) =>
                setBannerForm({ ...bannerForm, title: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>العنوان الفرعي</label>
            <input
              type="text"
              value={bannerForm.subtitle}
              onChange={(e) =>
                setBannerForm({ ...bannerForm, subtitle: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>نص الزر</label>
              <input
                type="text"
                value={bannerForm.ctaText}
                onChange={(e) =>
                  setBannerForm({ ...bannerForm, ctaText: e.target.value })
                }
                className={inputClass}
                placeholder="اطلب الآن"
              />
            </div>
            <div>
              <label className={labelClass}>رابط الزر</label>
              <input
                type="text"
                value={bannerForm.ctaLink}
                onChange={(e) =>
                  setBannerForm({ ...bannerForm, ctaLink: e.target.value })
                }
                className={inputClass}
                placeholder="/restaurant/xyz"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>صورة الإعلان</label>
            <ImageUploader
              folder="banners"
              entityId={bannerForm.title.trim() || `temp-${Date.now()}`}
              currentUrl={bannerForm.imageUrl}
              onUploaded={(url) =>
                setBannerForm({ ...bannerForm, imageUrl: url })
              }
            />
          </div>
          <div>
            <label className={labelClass}>أو رابط صورة خارجي</label>
            <input
              type="text"
              value={bannerForm.imageUrl}
              onChange={(e) =>
                setBannerForm({ ...bannerForm, imageUrl: e.target.value })
              }
              className={inputClass}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className={labelClass}>الترتيب</label>
            <input
              type="number"
              value={bannerForm.order}
              onChange={(e) =>
                setBannerForm({
                  ...bannerForm,
                  order: Number(e.target.value),
                })
              }
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={bannerBusy}
            className="mt-2 w-full rounded-xl bg-primary py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {bannerBusy
              ? "جارٍ الحفظ…"
              : editingBannerId
                ? "حفظ التعديلات"
                : "إضافة الإعلان"}
          </button>
          {editingBannerId && (
            <button
              type="button"
              onClick={() => {
                setEditingBannerId(null);
                setBannerForm(emptyBannerForm);
              }}
              className="w-full rounded-xl border border-glass-border bg-secondary py-2.5 text-sm font-bold text-foreground-muted"
            >
              إلغاء التعديل
            </button>
          )}
        </form>
      </div>

      <div className="space-y-4 md:col-span-2">
        <h2 className="text-lg font-bold">
          الإعلانات الحالية ({bannersList.length})
        </h2>
        {bannersLoading ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            جارٍ التحميل...
          </div>
        ) : bannersList.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-foreground-muted">
            لا توجد إعلانات بعد
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {bannersList.map((banner) => (
              <div key={banner.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold">{banner.title}</p>
                    {banner.subtitle && (
                      <p className="text-xs text-foreground-muted">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleBannerActive(banner.id, banner.active)
                    }
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                      banner.active
                        ? "bg-accent/10 text-accent"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {banner.active ? "نشط" : "معطّل"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEditBanner(banner)}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-white/5 py-1.5 text-xs font-bold text-foreground-muted hover:text-primary"
                  >
                    <Pencil className="size-3" aria-hidden /> تعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs font-bold text-foreground-muted hover:text-danger"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
