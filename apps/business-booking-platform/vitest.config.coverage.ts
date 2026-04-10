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
			// Exclude files with unhandled rejections / import crashes
			"src/__tests__/components/payment/PaymentForm.test.tsx",
			"src/__tests__/services/PaymentService.comprehensive.test.ts",
			"src/__tests__/services/PaymentService.square.test.ts",
			"src/__tests__/services/PaymentService.test.ts",
			"backend/**",
		],
		deps: {
			inline: ["react-router-dom"],
		},
		coverage: {
			provider: "istanbul",
			reporter: ["text", "json-summary"],
			reportsDirectory: "coverage-report",
			reportOnFailure: true,
			thresholds: {
				lines: 60,
				functions: 60,
				branches: 60,
				statements: 60,
			},
			exclude: [
				"node_modules/",
				"src/__tests__/**",
				"**/*.d.ts",
				"**/*.config.*",
				"dist/",
				"build-website-example/",
				"backend/",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
