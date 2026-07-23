import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zest.app"),
  title: {
    default: "Zest — Food Delivery",
    template: "%s · Zest",
  },
  description:
    "Order from local restaurants with living micro-interactions. Zest PWA.",
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
    title: "Zest — Food Delivery",
    description: "Local restaurants, tactile checkout, live order stages.",
    type: "website",
    locale: "en_US",
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
    <html lang="en" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
