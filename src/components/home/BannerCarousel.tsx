"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useDataStore } from "@/store/useDataStore";

export function BannerCarousel() {
  const banners = useDataStore((s) => s.banners)
    .filter((b) => b.active)
    .sort((a, b) => a.order - b.order);

  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const restart = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (banners.length > 1) {
      timerRef.current = setInterval(() => {
        setIndex((i) => (i + 1) % banners.length);
      }, 4500);
    }
  };

  useEffect(() => {
    restart();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[index];

  const content = (
    <div
      className={`relative aspect-[16/9] overflow-hidden rounded-3xl bg-gradient-to-br ${
        banner.gradient || "from-primary to-secondary"
      }`}
    >
      {banner.imageUrl && (
        <Image
          src={banner.imageUrl}
          alt={banner.title}
          fill
          priority={index === 0}
          sizes="(max-width: 512px) 100vw, 512px"
          className="object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-secondary/85 via-secondary/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 space-y-1 p-4">
        <h3 className="text-lg font-extrabold text-white">{banner.title}</h3>
        {banner.subtitle && (
          <p className="text-xs text-white/85">{banner.subtitle}</p>
        )}
        {banner.ctaText && (
          <span className="mt-2 inline-flex rounded-xl bg-white px-4 py-2 text-xs font-bold text-secondary">
            {banner.ctaText}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={banner.id}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) {
              setIndex((i) => (i + 1) % banners.length);
              restart();
            } else if (info.offset.x > 60) {
              setIndex((i) => (i - 1 + banners.length) % banners.length);
              restart();
            }
          }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          {banner.ctaLink ? <Link href={banner.ctaLink}>{content}</Link> : content}
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setIndex(i);
                restart();
              }}
              aria-label={`الإعلان ${i + 1}`}
              className="group p-0.5"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-primary" : "w-1.5 bg-white/25 group-hover:bg-white/40"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
