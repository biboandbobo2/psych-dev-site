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
          muted: 'var(--accent-muted)',
          deep: 'var(--accent-deep)',
        },
        mark: "var(--mark)",
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          faint: 'var(--ink-faint)',
        },
        'border-cool': 'var(--border-cool)',
        pastel: {
          sage: 'var(--pastel-sage)',
          ochre: 'var(--pastel-ochre)',
          blue: 'var(--pastel-blue)',
          'blue-deep': 'var(--pastel-blue-deep)',
          terracotta: 'var(--pastel-terracotta)',
          lilac: 'var(--pastel-lilac)',
          cream: 'var(--pastel-cream)',
          plain: 'var(--pastel-plain)',
        },
        dom: {
          green: { DEFAULT: '#6d8134', hover: '#7f983a', active: '#46512a' },
          red: { DEFAULT: '#ce164d', hover: '#bb1345' },
          cream: '#f5f1eb',
          gray: { 900: '#111827', 700: '#374151', 500: '#6b7280', 300: '#d1d5db', 200: '#e5e7eb' },
        },
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
        dom: [
          "Sofia Sans Variable",
          "Sofia Sans",
          "system-ui",
          "sans-serif",
        ],
        display: ["Georgia", "Times New Roman", "serif"],
      },
      maxWidth: {
        measure: "72ch",
      },
    },
  },
  plugins: [aspectRatio],
};
