// PostCSS config for Tailwind CSS v4
// IMPORTANT: Use ONLY @tailwindcss/postcss here, NOT @tailwindcss/vite in vite.config.ts
// Running both will cause layout utilities to break!
export default {
	plugins: {
		"@tailwindcss/postcss": {},
		autoprefixer: {},
	},
};
