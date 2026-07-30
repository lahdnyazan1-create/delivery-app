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
        primary: "#ff6b35",
        "primary-soft": "#ff8f66",
        secondary: "#1a2b4c",
        "secondary-muted": "#2a3f66",
        accent: "#00c853",
        "accent-soft": "#69f0ae",
        background: "#0f1729",
        "background-elevated": "#1a2b4c",
        foreground: "#f7f4ef",
        "foreground-muted": "#a8b3c7",
        glass: "rgb(255 255 255 / 0.08)",
        "glass-border": "rgb(255 255 255 / 0.14)",
        "glass-strong": "rgb(255 255 255 / 0.12)",
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "ui-sans-serif", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
