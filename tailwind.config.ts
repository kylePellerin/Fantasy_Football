import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "JetBrains Mono",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      colors: {
        // `white/[a]` glass borders + fills are driven by --ink so the theme flips centrally
        white: "rgb(var(--ink) / <alpha-value>)",
        // Light-text slate shades remapped to a dark-ink ramp for the light theme
        slate: {
          50: "rgb(var(--s-1) / <alpha-value>)",
          100: "rgb(var(--s-1) / <alpha-value>)",
          200: "rgb(var(--s-2) / <alpha-value>)",
          300: "rgb(var(--s-3) / <alpha-value>)",
          400: "rgb(var(--s-4) / <alpha-value>)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Light tactile surfaces
        canvas: "#EFF2F7",
        panel: "#FFFFFF",
        "panel-raised": "#F7F9FC",
        // Domain accent tokens — neon semantic lighting
        pulse: {
          start: "#00F59B",
          tossup: "#FFB800",
          sit: "#FF3366",
          bet: "#00E5FF",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "glow-start":
          "0 0 20px rgba(0,245,155,0.15), inset 0 1px 0 rgba(255,255,255,0.04)",
        "glow-tossup":
          "0 0 20px rgba(255,184,0,0.15), inset 0 1px 0 rgba(255,255,255,0.04)",
        "glow-sit":
          "0 0 20px rgba(255,51,102,0.15), inset 0 1px 0 rgba(255,255,255,0.04)",
        "glow-bet": "0 0 18px rgba(0,229,255,0.18)",
        panel: "0 12px 32px -16px rgba(15,23,42,0.16), 0 2px 6px -2px rgba(15,23,42,0.06)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        sheen: {
          "0%": { transform: "translateX(-140%)" },
          "100%": { transform: "translateX(240%)" },
        },
        "glow-breathe": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(0,245,155,0.45)" },
          "70%": { boxShadow: "0 0 0 10px rgba(0,245,155,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(0,245,155,0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
        sheen: "sheen 3s ease-in-out infinite",
        "glow-breathe": "glow-breathe 3.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
