import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [
		["html"],
		["json", { outputFile: "test-results/results.json" }],
		["junit", { outputFile: "test-results/junit.xml" }],
	],
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3009",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		timeout: 30000, // Increased timeout for live site testing
	},

	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
		// Test against mobile viewports
		{
			name: "Mobile Chrome",
			use: { ...devices["Pixel 5"] },
		},
		{
			name: "Mobile Safari",
			use: { ...devices["iPhone 12"] },
		},
		{
			name: "iPhone SE",
			use: { ...devices["iPhone SE"] },
		},
		// Tablet viewports
		{
			name: "iPad",
			use: { ...devices["iPad Pro"] },
		},
		{
			name: "iPad Mini",
			use: { ...devices["iPad Mini"] },
		},
		{
			name: "Galaxy Tab",
			use: {
				...devices["Galaxy Tab S4"],
				viewport: { width: 1024, height: 768 },
			},
		},
		// Large desktop for conversion testing
		{
			name: "Desktop Large",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1920, height: 1080 },
			},
		},
	],

	webServer: process.env.PLAYWRIGHT_BASE_URL
		? undefined
		: {
				command: "pnpm run dev",
				port: 3009,
				reuseExistingServer: !process.env.CI,
				timeout: 120 * 1000,
			},
});
