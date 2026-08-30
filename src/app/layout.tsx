import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AppInitializer } from "@/components/layout/AppInitializer";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { SWUpdatePrompt } from "@/components/layout/SWUpdatePrompt";
import { ToastHost } from "@/components/ui/Toast";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { FloatingCartBar } from "@/components/checkout/FloatingCartBar";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zest.app"),
  title: { default: "Zest — توصيل الطعام", template: "%s · Zest" },
  description: "اطلب من أفضل المطاعم المحلية بتجربة سلسة وتفاعلية.",
  applicationName: "Zest",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Zest" },
  formatDetection: { telephone: false },
  openGraph: { title: "Zest — توصيل الطعام", description: "مطاعم محلية، تجربة دفع سلسة، وتتبع مباشر للطلب.", type: "website", locale: "ar_AR" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }] },
};

export const viewport: Viewport = {
  themeColor: "#FF6B35",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <head>
        {/* ✅ استرجاع الثيم قبل الرسم — كي لا تومض الصفحة باللون الخاطئ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('zest-theme');document.documentElement.dataset.theme=(t==='light'?'light':'dark');}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full font-sans text-foreground">
        <AppInitializer />
        <ServiceWorkerRegister />
        <SWUpdatePrompt />
        <ToastHost />
        <OfflineBanner />
        {children}
        <FloatingCartBar />
      </body>
    </html>
  );
}
