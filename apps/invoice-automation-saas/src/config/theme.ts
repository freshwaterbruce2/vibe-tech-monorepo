export const theme = {
	colors: {
		primary: "#667eea",
		primaryDark: "#764ba2",
		secondary: "#10b981",
		secondaryDark: "#059669",
		background: "#ffffff",
		backgroundAlt: "#f9fafb",
		text: "#1f2937",
		textLight: "#6b7280",
		border: "#e5e7eb",
		error: "#ef4444",
		warning: "#f59e0b",
		success: "#10b981",
	},
	spacing: {
		xs: "0.25rem",
		sm: "0.5rem",
		md: "1rem",
		lg: "1.5rem",
		xl: "2rem",
		xxl: "3rem",
	},
	borderRadius: {
		sm: "0.25rem",
		md: "0.5rem",
		lg: "1rem",
		full: "9999px",
	},
	fontSize: {
		xs: "0.75rem",
		sm: "0.875rem",
		base: "1rem",
		lg: "1.125rem",
		xl: "1.25rem",
		"2xl": "1.5rem",
		"3xl": "2rem",
		"4xl": "3rem",
	},
	breakpoints: {
		mobile: "640px",
		tablet: "768px",
		desktop: "1024px",
		wide: "1280px",
	},
} as const;

export type Theme = typeof theme;
