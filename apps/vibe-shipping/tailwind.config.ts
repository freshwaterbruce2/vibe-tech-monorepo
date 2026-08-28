import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
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
        // Walmart specific color tokens
        "walmart-blue": "#0071CE",
        "walmart-blue-dark": "#004C91",
        "walmart-blue-light": "#CCE9FF",
        "walmart-yellow": "#FFC220",
        "walmart-yellow-dark": "#FFBB00",
        "walmart-yellow-light": "#FFEEC1",
        "walmart-gray": "#8E9196",
        "walmart-gray-dark": "#333333",
        "walmart-gray-light": "#F6F6F7",
        "walmart-success": "#248B22",
        "walmart-warning": "#FFC220",
        "walmart-error": "#D11F33",
        // Add Walmart blue color scale for ring utility
        "wal-blue": {
          50: "#e6f3fa",
          100: "#cce8f5",
          200: "#99d0eb",
          300: "#66b9e1",
          400: "#33a1d7",
          500: "#007DC6",
          600: "#0064a1",
          700: "#004b79",
          800: "#003252",
          900: "#00192a",
        },
        "wal-yellow": {
          50: "#fff9e6",
          100: "#fff3cc",
          200: "#ffe799",
          300: "#ffdb66",
          400: "#ffcf33",
          500: "#FFC220",
          600: "#cc9b1a",
          700: "#997513",
          800: "#664e0d",
          900: "#332706",
        },
        // Add neutral-gray color scale to make it available as text-neutral-gray-500
        "neutral-gray": {
          50: "#f7f7f7",
          100: "#efefef", 
          200: "#dfdfdf",
          300: "#cfcfcf",
          400: "#bfbfbf",
          500: "#8E9196",
          600: "#727579",
          700: "#54575a",
          800: "#38393c",
          900: "#1c1c1e",
        },
        // Status colors for trailer status badges
        "status-empty": "#6B7280",    // Gray-500
        "status-25": "#10B981",     // Emerald-500
        "status-50": "#F59E0B",     // Amber-500
        "status-75": "#EF4444",     // Red-500
        "status-partial": "#3B82F6", // Blue-500
        "status-shipload": "#8B5CF6",// Violet-500
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "pulse": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      fontSize: {
        "label": "14px",
        "value": "18px",
        "badge": "22px",
      },
      spacing: {
        "row": "56px",
        "touch": "44px",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
