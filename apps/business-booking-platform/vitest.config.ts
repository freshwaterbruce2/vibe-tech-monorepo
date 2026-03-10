import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/__tests__/setup.ts"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/build-website-example/**",
			"**/tests/e2e/**",
			"**/*.spec.ts",
		],
		deps: {
			inline: ["react-router-dom"],
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
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
