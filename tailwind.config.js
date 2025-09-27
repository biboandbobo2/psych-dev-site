/* eslint-env node */
import aspectRatio from "@tailwindcss/aspect-ratio";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        border: "var(--border)",
        card: "var(--card)",
        card2: "var(--card-2)",
        accent: {
          DEFAULT: 'var(--accent)',
          100: 'var(--accent-100)',
        },
        mark: "var(--mark)",
      },
      borderRadius: {
        "2xl": "var(--radius)",
      },
      boxShadow: {
        brand: "0 22px 45px -24px rgba(17, 24, 39, 0.25)",
      },
      fontFamily: {
        sans: [
          "Manrope Variable",
          "Inter",
          "system-ui",
          "Segoe UI",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        measure: "72ch",
      },
    },
  },
  plugins: [aspectRatio],
};
