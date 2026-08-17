import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zest — توصيل الطعام",
    short_name: "Zest",
    description: "اطلب من أفضل المطاعم المحلية بتجربة سلسة وتتبع مباشر لطلبك.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0F1729",
    theme_color: "#FF6B35",
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
