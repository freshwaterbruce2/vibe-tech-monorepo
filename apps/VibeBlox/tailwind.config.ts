import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				// Roblox-inspired color palette
				"blue-primary": "#0066FF",
				"blue-dark": "#0044AA",
				"blue-light": "#4D94FF",
				"green-primary": "#00CC66",
				"green-dark": "#009944",
				"green-light": "#33FF99",
				"red-primary": "#FF3333",
				"red-dark": "#CC0000",
				"red-light": "#FF6666",
				"bg-dark": "#0a0a0f",
				"bg-card": "#12121a",
				"bg-elevated": "#1a1a24",
				"border-subtle": "#2a2a3a",
				"text-primary": "#FFFFFF",
				"text-secondary": "#A0A0B0",
				"text-muted": "#606070",
				gold: "#FFD700",
				"gold-dark": "#B8860B",
				purple: "#9933FF",
				orange: "#FF9900",
				// shadcn/ui compatibility
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
			},
			fontFamily: {
				sans: ["Inter", "system-ui", "sans-serif"],
				heading: ["Russo One", "system-ui", "sans-serif"],
				mono: ["Courier New", "monospace"],
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
				"coin-bounce": {
					"0%, 100%": { transform: "translateY(0) rotate(0deg)" },
					"50%": { transform: "translateY(-20px) rotate(180deg)" },
				},
				celebrate: {
					"0%": { transform: "scale(1)", opacity: "1" },
					"50%": { transform: "scale(1.2)", opacity: "0.8" },
					"100%": { transform: "scale(1)", opacity: "1" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"coin-bounce": "coin-bounce 1s ease-in-out",
				celebrate: "celebrate 0.6s ease-in-out",
			},
		},
	},
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
