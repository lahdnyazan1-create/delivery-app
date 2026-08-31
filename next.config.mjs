/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      // ✅ روابط صور خارجية يضيفها الأدمن يدويا عبر ImageUploader
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            // ✅ connect-src يشمل *.cloudfunctions.net — بدونه يُحجب الاتصال
            //    بكل Cloud Functions (placeOrder/checkPromo/rateOrder…)
            //    في الإنتاج ويفشل إنشاء الطلب مع رسالة CSP في الكونسول.
            //    subdomain wildcard مطلوب لأن المنطقة جزء من النطاق:
            //    europe-west1-<project>.cloudfunctions.net
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://*.firebaseio.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https://*.googleapis.com https://*.cloudfunctions.net https://*.firebaseio.com wss://*.firebaseio.com https://www.google.com https://www.gstatic.com; frame-src https://www.google.com https://www.gstatic.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
