import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ✅ كل الألوان مربوطة بمتغيرات CSS (صيغة قنوات RGB) كي تتبدل
        //    تلقائياً مع data-theme=light/dark، مع دعم معدّلات الشفافية
        //    مثل bg-primary/15 — سابقاً كانت قيم hex ثابتة فبقيت ألوان
        //    الثيم الداكن في الوضع الفاتح (نص فاتح على خلفية فاتحة).
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        "primary-soft": "rgb(var(--color-primary-soft) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        "secondary-muted": "rgb(var(--color-secondary-muted) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--color-accent-soft) / <alpha-value>)",
        // 🎨 تيل الثقة #26A69A — لون هوية دُغْري الثانوي (شارات الثقة
        //    والعناصر المكمّلة) مضاف بجانب الكحلي كـ secondary البنيوي
        teal: "rgb(var(--color-teal) / <alpha-value>)",
        "teal-soft": "rgb(var(--color-teal-soft) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        "background-elevated": "rgb(var(--background-elevated) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        "foreground-muted": "rgb(var(--foreground-muted) / <alpha-value>)",
        glass: "var(--glass)",
        "glass-border": "var(--glass-border)",
        "glass-strong": "var(--glass-strong)",
      },
      fontFamily: {
        // 🎨 هوية دُغْري: Poppins للنص اللاتيني (خط الجسم في دليل الهوية)
        //    والقاهرة للنص العربي — الترتيب مهم: محارف Poppins لاتينية فقط
        //    فيسقط النص العربي تلقائياً إلى القاهرة التالية في المكدس.
        sans: ["var(--font-poppins)", "var(--font-cairo)", "ui-sans-serif", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
