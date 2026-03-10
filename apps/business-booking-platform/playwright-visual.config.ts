import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests/visual",
	testMatch: "**/*.spec.ts",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: [
		["html", { outputFolder: "playwright-report/visual" }],
		["json", { outputFile: "test-results/visual-results.json" }],
		["list"],
	],

	use: {
		baseURL: "http://localhost:5173",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",

		// Visual regression specific settings
		ignoreHTTPSErrors: true,

		// Ensure consistent rendering
		deviceScaleFactor: 1,
		hasTouch: false,
		isMobile: false,
		javascriptEnabled: true,
		locale: "en-US",
		timezoneId: "America/New_York",

		// Reduce flakiness
		actionTimeout: 10000,
		navigationTimeout: 30000,
	},

	projects: [
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				// Ensure consistent rendering across machines
				launchOptions: {
					args: [
						"--font-render-hinting=none",
						"--disable-skia-text",
						"--disable-font-subpixel-positioning",
						"--disable-lcd-text",
					],
				},
			},
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
		{
			name: "mobile-chrome",
			use: { ...devices["Pixel 5"] },
		},
		{
			name: "mobile-safari",
			use: { ...devices["iPhone 12"] },
		},
		{
			name: "tablet",
			use: { ...devices["iPad Pro"] },
		},
	],

	webServer: {
		command: "npm run preview",
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},

	expect: {
		// Visual regression thresholds
		toHaveScreenshot: {
			// Maximum difference in pixels
			maxDiffPixels: 100,

			// Threshold for pixel difference (0-1)
			threshold: 0.2,

			// Animation handling
			animations: "disabled",

			// CSS animations to disable
			caret: "hide",
		},
	},
});
