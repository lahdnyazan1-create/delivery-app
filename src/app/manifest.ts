import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "دُغْري — Daghri | توصيل مباشر",
    short_name: "دُغْري Daghri",
    description: "دُغْري (Daghri): أسرع وأسهل توصيل مباشر — اطلب من أفضل المطاعم المحلية وتابع طلبك لحظة بلحظة.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1A2B45",
    theme_color: "#FF6B4E",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
