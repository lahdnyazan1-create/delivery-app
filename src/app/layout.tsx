import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AppInitializer } from "@/components/layout/AppInitializer";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { SWUpdatePrompt } from "@/components/layout/SWUpdatePrompt";
import { ToastHost } from "@/components/ui/Toast";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { FloatingCartBar } from "@/components/checkout/FloatingCartBar";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

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
      <body className="min-h-full font-sans text-foreground">
        <AppInitializer />
        <ServiceWorkerRegister />
        <SWUpdatePrompt />
        <ToastHost />
        <OfflineBanner />
        {children}
        <FloatingCartBar />
        
        {/* ✅ تم رفع الزر للأعلى لتفادي التداخل مع السلة العائمة */}
        <Link
          href="https://wa.me/970599000000" 
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-44 left-4 z-40 flex size-11 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:bg-green-600 md:bottom-6 md:left-6"
          aria-label="الدعم الفني"
        >
          <MessageCircle className="size-5" />
        </Link>
      </body>
    </html>
  );
}
