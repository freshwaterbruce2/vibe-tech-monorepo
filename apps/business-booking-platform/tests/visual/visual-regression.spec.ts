import { expect, test } from "@playwright/test";

// Visual regression test configuration for hotel booking app
const VIEWPORTS = [
	{ name: "mobile", width: 375, height: 667 },
	{ name: "tablet", width: 768, height: 1024 },
	{ name: "desktop", width: 1440, height: 900 },
	{ name: "large-desktop", width: 1920, height: 1080 },
];

// Helper to wait for animations and loading
async function waitForStability(page: any) {
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(500); // Wait for CSS transitions
	await page.evaluate(() => {
		return new Promise((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(resolve);
			});
		});
	});
}

// Helper to mock consistent API responses for visual testing
async function setupMockData(page: any) {
	// Mock hotel search API
	await page.route("**/api/hotels/search**", async (route: any) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				success: true,
				data: {
					hotels: [
						{
							id: "hotel-visual-1",
							name: "Grand Plaza Hotel",
							description:
								"Luxury hotel in downtown with stunning city views and world-class amenities.",
							location: {
								city: "Visual City",
								country: "Test Country",
								neighborhood: "Downtown",
							},
							rating: 4.8,
							reviewCount: 2341,
							priceRange: {
								avgNightly: 299,
								currency: "USD",
							},
							images: [
								{
									url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop",
									alt: "Grand Plaza Hotel exterior view",
									isPrimary: true,
								},
							],
							amenities: [
								{ id: "wifi", name: "Free WiFi", icon: "📶" },
								{ id: "pool", name: "Swimming Pool", icon: "🏊" },
								{ id: "spa", name: "Spa & Wellness", icon: "🧖‍♀️" },
								{ id: "restaurant", name: "Fine Dining", icon: "🍽️" },
								{ id: "gym", name: "Fitness Center", icon: "💪" },
							],
							availability: {
								available: true,
								lowAvailability: false,
							},
							passionScore: {
								"luxury-indulgence": 0.95,
								"romantic-escape": 0.88,
							},
							sustainabilityScore: 0.89,
						},
						{
							id: "hotel-visual-2",
							name: "Comfort Budget Inn",
							description:
								"Clean, comfortable accommodation with essential amenities for budget-conscious travelers.",
							location: {
								city: "Visual City",
								country: "Test Country",
								neighborhood: "Airport District",
							},
							rating: 4.1,
							reviewCount: 892,
							priceRange: {
								avgNightly: 89,
								currency: "USD",
							},
							images: [
								{
									url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop",
									alt: "Comfort Budget Inn exterior",
									isPrimary: true,
								},
							],
							amenities: [
								{ id: "wifi", name: "Free WiFi", icon: "📶" },
								{ id: "parking", name: "Free Parking", icon: "🅿️" },
								{ id: "breakfast", name: "Continental Breakfast", icon: "🥐" },
							],
							availability: {
								available: true,
								lowAvailability: true,
							},
							passionScore: {
								"budget-conscious": 0.92,
							},
							sustainabilityScore: 0.67,
						},
					],
					pagination: {
						page: 1,
						limit: 10,
						total: 2,
						totalPages: 1,
					},
				},
			}),
		});
	});

	// Mock other APIs as needed
	await page.route("**/api/ai/**", (route: any) =>
		route.fulfill({ status: 200, body: "{}" }),
	);
	await page.route("**/api/payments/**", (route: any) =>
		route.fulfill({ status: 200, body: "{}" }),
	);
}

test.describe("Hotel Booking Visual Regression Tests", () => {
	test.beforeEach(async ({ page }) => {
		await setupMockData(page);
	});

	// Homepage visual tests across different viewports
	VIEWPORTS.forEach(({ name: viewportName, width, height }) => {
		test(`Homepage layout - ${viewportName}`, async ({ page }) => {
			await page.setViewportSize({ width, height });
			await page.goto("/");
			await waitForStability(page);

			await expect(page).toHaveScreenshot(`homepage-${viewportName}.png`, {
				fullPage: true,
				animations: "disabled",
			});
		});
	});

	test.describe("Search Functionality Visual Tests", () => {
		test("Search form initial state", async ({ page }) => {
			await page.goto("/");
			await waitForStability(page);

			const searchSection = page.locator(
				'section:has(input[placeholder*="Where are you going"])',
			);
			await expect(searchSection).toHaveScreenshot("search-form-initial.png");
		});

		test("Search form filled state", async ({ page }) => {
			await page.goto("/");
			await waitForStability(page);

			// Fill search form
			await page.fill('[placeholder="Where are you going?"]', "Visual City");
			await page.fill('[aria-label="Check-in Date"]', "2024-12-15");
			await page.fill('[aria-label="Check-out Date"]', "2024-12-18");
			await page.selectOption('[aria-label="Guests"]', "2 Guests");

			const searchSection = page.locator(
				'section:has(input[placeholder*="Where are you going"])',
			);
			await expect(searchSection).toHaveScreenshot("search-form-filled.png");
		});

		test("Search loading state", async ({ page }) => {
			// Mock delayed response
			await page.route("**/api/hotels/search**", async (route: any) => {
				await new Promise((resolve) => setTimeout(resolve, 1500));
				await route.continue();
			});

			await page.goto("/");
			await page.fill('[placeholder="Where are you going?"]', "Test City");

			const searchPromise = page.click('button:has-text("Search Hotels")');

			// Capture loading state
			await page.waitForSelector('button:has-text("Searching...")');
			const loadingButton = page.locator('button:has-text("Searching...")');
			await expect(loadingButton).toHaveScreenshot("search-loading-state.png");

			await searchPromise;
		});

		test("Search results layout", async ({ page }) => {
			await page.goto("/");
			await page.fill('[placeholder="Where are you going?"]', "Visual City");
			await page.click('button:has-text("Search Hotels")');

			await page.waitForSelector("text=Grand Plaza Hotel");
			await waitForStability(page);

			await expect(page).toHaveScreenshot("search-results-layout.png", {
				fullPage: true,
				animations: "disabled",
			});
		});

		test("Individual hotel card design", async ({ page }) => {
			await page.goto("/");
			await page.fill('[placeholder="Where are you going?"]', "Visual City");
			await page.click('button:has-text("Search Hotels")');

			await page.waitForSelector("text=Grand Plaza Hotel");
			await waitForStability(page);

			const luxuryHotelCard = page
				.locator('[data-testid="hotel-card"]')
				.first();
			await expect(luxuryHotelCard).toHaveScreenshot("luxury-hotel-card.png");

			const budgetHotelCard = page.locator('[data-testid="hotel-card"]').nth(1);
			await expect(budgetHotelCard).toHaveScreenshot("budget-hotel-card.png");
		});

		test("Hotel card hover state", async ({ page }) => {
			await page.goto("/");
			await page.fill('[placeholder="Where are you going?"]', "Visual City");
			await page.click('button:has-text("Search Hotels")');

			await page.waitForSelector("text=Grand Plaza Hotel");
			const hotelCard = page.locator('[data-testid="hotel-card"]').first();

			await hotelCard.hover();
			await page.waitForTimeout(300);

			await expect(hotelCard).toHaveScreenshot("hotel-card-hover.png");
		});

		test("Empty search results", async ({ page }) => {
			// Mock empty results
			await page.route("**/api/hotels/search**", async (route: any) => {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						data: { hotels: [], pagination: null },
					}),
				});
			});

			await page.goto("/");
			await page.fill(
				'[placeholder="Where are you going?"]',
				"Nonexistent City",
			);
			await page.click('button:has-text("Search Hotels")');

			await page.waitForSelector("text=No hotels found");

			const emptyState = page
				.locator('div:has-text("No hotels found")')
				.first();
			await expect(emptyState).toHaveScreenshot("empty-search-results.png");
		});
	});

	test.describe("Responsive Design Visual Tests", () => {
		VIEWPORTS.forEach(({ name: viewportName, width, height }) => {
			test(`Search results responsive - ${viewportName}`, async ({ page }) => {
				await page.setViewportSize({ width, height });
				await page.goto("/");

				await page.fill('[placeholder="Where are you going?"]', "Visual City");
				await page.click('button:has-text("Search Hotels")');
				await page.waitForSelector("text=Grand Plaza Hotel");
				await waitForStability(page);

				await expect(page).toHaveScreenshot(
					`search-results-${viewportName}.png`,
					{
						fullPage: true,
						animations: "disabled",
					},
				);
			});
		});
	});

	test.describe("Component State Visual Tests", () => {
		test("Button focus states", async ({ page }) => {
			await page.goto("/");

			const searchButton = page.locator('button:has-text("Search Hotels")');

			// Normal state
			await expect(searchButton).toHaveScreenshot("button-normal.png");

			// Focus state
			await searchButton.focus();
			await page.waitForTimeout(200);
			await expect(searchButton).toHaveScreenshot("button-focus.png");

			// Hover state
			await searchButton.hover();
			await page.waitForTimeout(200);
			await expect(searchButton).toHaveScreenshot("button-hover.png");
		});

		test("Input field states", async ({ page }) => {
			await page.goto("/");

			const destinationInput = page.locator(
				'[placeholder="Where are you going?"]',
			);

			// Empty state
			await expect(destinationInput).toHaveScreenshot("input-empty.png");

			// Focus state
			await destinationInput.focus();
			await page.waitForTimeout(200);
			await expect(destinationInput).toHaveScreenshot("input-focus.png");

			// Filled state
			await destinationInput.fill("Test City");
			await expect(destinationInput).toHaveScreenshot("input-filled.png");
		});

		test("Date input states", async ({ page }) => {
			await page.goto("/");

			const checkInInput = page.locator('[aria-label="Check-in Date"]');

			// Empty state
			await expect(checkInInput).toHaveScreenshot("date-input-empty.png");

			// Filled state
			await checkInInput.fill("2024-12-15");
			await expect(checkInInput).toHaveScreenshot("date-input-filled.png");
		});

		test("Dropdown select states", async ({ page }) => {
			await page.goto("/");

			const guestSelect = page.locator('[aria-label="Guests"]');

			// Default state
			await expect(guestSelect).toHaveScreenshot("select-default.png");

			// Changed state
			await guestSelect.selectOption("3 Guests");
			await expect(guestSelect).toHaveScreenshot("select-changed.png");
		});
	});

	test.describe("Error and Loading States", () => {
		test("Search error state", async ({ page }) => {
			// Mock API error
			await page.route("**/api/hotels/search**", async (route: any) => {
				await route.fulfill({
					status: 500,
					contentType: "application/json",
					body: JSON.stringify({
						success: false,
						message: "Search service temporarily unavailable",
					}),
				});
			});

			await page.goto("/");
			await page.fill('[placeholder="Where are you going?"]', "Test City");
			await page.click('button:has-text("Search Hotels")');

			await page.waitForTimeout(1000);

			await expect(page).toHaveScreenshot("search-error-state.png", {
				animations: "disabled",
			});
		});

		test("Search results loading skeletons", async ({ page }) => {
			// Mock slow API response
			let resolveRequest: () => void;
			const slowResponsePromise = new Promise<void>((resolve) => {
				resolveRequest = resolve;
			});

			await page.route("**/api/hotels/search**", async (route: any) => {
				await slowResponsePromise;
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						data: { hotels: [], pagination: null },
					}),
				});
			});

			await page.goto("/");
			await page.fill('[placeholder="Where are you going?"]', "Test City");
			const searchPromise = page.click('button:has-text("Search Hotels")');

			// Wait for loading skeletons
			await page.waitForSelector("text=Searching hotels...", { timeout: 2000 });

			await expect(page).toHaveScreenshot("search-loading-skeletons.png", {
				animations: "disabled",
			});

			resolveRequest!();
			await searchPromise;
		});
	});

	test.describe("Accessibility Visual Tests", () => {
		test("High contrast mode", async ({ page }) => {
			await page.goto("/");

			// Enable high contrast simulation
			await page.addStyleTag({
				content: `
          * {
            filter: contrast(2) !important;
          }
        `,
			});

			await page.fill('[placeholder="Where are you going?"]', "Visual City");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Grand Plaza Hotel");
			await waitForStability(page);

			await expect(page).toHaveScreenshot("high-contrast-mode.png", {
				fullPage: true,
				animations: "disabled",
			});
		});

		test("Focus indicators visibility", async ({ page }) => {
			await page.goto("/");

			// Tab through interactive elements
			const focusableElements = [
				'[placeholder="Where are you going?"]',
				'[aria-label="Check-in Date"]',
				'[aria-label="Check-out Date"]',
				'[aria-label="Guests"]',
				'button:has-text("Search Hotels")',
			];

			for (let i = 0; i < focusableElements.length; i++) {
				const element = page.locator(focusableElements[i]);
				await element.focus();
				await page.waitForTimeout(200);

				await expect(element).toHaveScreenshot(`focus-indicator-${i}.png`);
			}
		});

		test("Reduced motion preferences", async ({ page }) => {
			// Simulate reduced motion preference
			await page.addStyleTag({
				content: `
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        `,
			});

			await page.goto("/");
			await page.fill('[placeholder="Where are you going?"]', "Visual City");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Grand Plaza Hotel");
			await waitForStability(page);

			await expect(page).toHaveScreenshot("reduced-motion.png", {
				fullPage: true,
				animations: "disabled",
			});
		});
	});

	test.describe("Cross-browser Compatibility", () => {
		const browsers = ["chromium", "firefox", "webkit"];

		browsers.forEach((browserName) => {
			test(`Homepage consistency - ${browserName}`, async ({
				page,
				browserName: currentBrowser,
			}) => {
				test.skip(currentBrowser !== browserName);

				await page.goto("/");
				await waitForStability(page);

				await expect(page).toHaveScreenshot(`homepage-${browserName}.png`, {
					fullPage: true,
					animations: "disabled",
					threshold: 0.3, // Allow for minor browser differences
				});
			});

			test(`Search results consistency - ${browserName}`, async ({
				page,
				browserName: currentBrowser,
			}) => {
				test.skip(currentBrowser !== browserName);

				await page.goto("/");
				await page.fill('[placeholder="Where are you going?"]', "Visual City");
				await page.click('button:has-text("Search Hotels")');
				await page.waitForSelector("text=Grand Plaza Hotel");
				await waitForStability(page);

				await expect(page).toHaveScreenshot(
					`search-results-${browserName}.png`,
					{
						fullPage: true,
						animations: "disabled",
						threshold: 0.3,
					},
				);
			});
		});
	});

	test.describe("Print Styles Visual Tests", () => {
		test("Print layout for search results", async ({ page }) => {
			await page.goto("/");
			await page.fill('[placeholder="Where are you going?"]', "Visual City");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Grand Plaza Hotel");
			await waitForStability(page);

			// Emulate print media
			await page.emulateMedia({ media: "print" });

			await expect(page).toHaveScreenshot("print-search-results.png", {
				fullPage: true,
			});
		});
	});
});
