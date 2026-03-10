/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(260 30% 25%)",
        input: "hsl(260 30% 20%)",
        ring: "hsl(180 100% 50%)",
        background: "hsl(260 30% 8%)",
        foreground: "hsl(210 40% 98%)",
        primary: {
          DEFAULT: "hsl(180 100% 50%)",
          foreground: "hsl(260 50% 10%)",
        },
        secondary: {
          DEFAULT: "hsl(270 100% 60%)",
          foreground: "hsl(210 40% 98%)",
        },
        destructive: {
          DEFAULT: "hsl(0 100% 60%)",
          foreground: "hsl(210 40% 98%)",
        },
        muted: {
          DEFAULT: "hsl(260 20% 20%)",
          foreground: "hsl(260 10% 65%)",
        },
        accent: {
          DEFAULT: "hsl(320 100% 50%)",
          foreground: "hsl(210 40% 98%)",
        },
        popover: {
          DEFAULT: "hsl(260 25% 12%)",
          foreground: "hsl(210 40% 98%)",
        },
        card: {
          DEFAULT: "hsl(260 25% 12%)",
          foreground: "hsl(210 40% 98%)",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
};
