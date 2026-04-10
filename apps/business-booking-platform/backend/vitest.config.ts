import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./src/__tests__/setup.ts"],
		exclude: ["**/node_modules/**", "**/dist/**", "**/*.e2e.test.ts"],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			thresholds: {
				lines: 60,
				functions: 60,
				branches: 60,
				statements: 60,
			},
		},
	},
	esbuild: {
		target: "node18",
	},
});
