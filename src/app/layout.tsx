import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AppInitializer } from "@/components/layout/AppInitializer";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { FloatingCartBar } from "@/components/checkout/FloatingCartBar";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zest.app"),
  title: {
    default: "Zest — توصيل الطعام",
    template: "%s · Zest",
  },
  description: "اطلب من أفضل المطاعم المحلية بتجربة سلسة وتفاعلية.",
  applicationName: "Zest",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zest",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Zest — توصيل الطعام",
    description: "مطاعم محلية، تجربة دفع سلسة، وتتبع مباشر للطلب.",
    type: "website",
    locale: "ar_AR",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B35",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-foreground">
        <AppInitializer />
        <OfflineBanner />
        {children}
        <FloatingCartBar />
      </body>
    </html>
  );
}
