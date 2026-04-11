import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	define: {
		// Override VITE env vars for tests so services use relative /api paths
		'import.meta.env.VITE_API_URL': JSON.stringify(''),
		'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(''),
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/__tests__/setup.ts"],
		env: {
			NODE_ENV: "test",
			LOCAL_SQLITE: "true",
			VITE_API_URL: "",
		},
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/build-website-example/**",
			"**/tests/e2e/**",
			"**/*.spec.ts",
			"**/backend/**",
		],
		deps: {
			inline: ["react-router-dom"],
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			thresholds: {
				lines: 60,
				functions: 60,
				branches: 60,
				statements: 60,
			},
			exclude: [
				"node_modules/",
				"src/__tests__/setup.ts",
				"**/*.d.ts",
				"**/*.config.*",
				"dist/",
				"build-website-example/",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
