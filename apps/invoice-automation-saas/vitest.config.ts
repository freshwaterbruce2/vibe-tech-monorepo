import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"src/__tests__/",
				"*.config.*",
				"src/vite-env.d.ts",
				"src/main.tsx",
				"dist/",
				".husky/",
				"scripts/",
			],
			thresholds: {
				global: {
					branches: 50,
					functions: 50,
					lines: 50,
					statements: 50,
				},
			},
		},
		include: ["src/**/*.test.{ts,tsx}", "server/src/**/*.test.ts"],
		exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
		mockReset: true,
		restoreMocks: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
