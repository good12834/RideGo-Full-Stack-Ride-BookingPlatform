/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        // Brand palette
        primary: {
          50: "#fff8ed",
          100: "#ffefd4",
          200: "#ffdba8",
          300: "#ffc070",
          400: "#ff9a37",
          500: "#ff7d0a",
          600: "#f06402",
          700: "#c74a06",
          800: "#9e3a0c",
          900: "#7f300d",
          950: "#451503",
        },
        night: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5d9e2",
          300: "#b1b9cb",
          400: "#8792af",
          500: "#677497",
          600: "#515c7d",
          700: "#424b65",
          800: "#394054",
          900: "#333947",
          950: "#16181d",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 8px 24px -12px rgb(0 0 0 / 0.15)",
        glow: "0 0 0 1px rgb(255 125 10 / 0.2), 0 8px 40px -12px rgb(255 125 10 / 0.45)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition: "700px 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};
