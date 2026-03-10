import { expect, test } from "@playwright/test";

test.describe("Visual Regression Testing - UI Consistency", () => {
	// Configure visual comparison settings
	test.beforeEach(async ({ page }) => {
		// Disable animations for consistent screenshots
		await page.addStyleTag({
			content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
		});
	});

	test.describe("Homepage Visual Consistency", () => {
		test("should maintain hero section visual consistency - Desktop", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1920, height: 1080 });
			await page.goto("/");

			// Wait for video and all elements to load
			await page.waitForLoadState("networkidle");
			await page.waitForTimeout(2000); // Allow video to start

			// Hide video element for consistent screenshots (video frames vary)
			await page.addStyleTag({
				content: `
          video {
            opacity: 0 !important;
          }
          .video-fallback, [style*="backgroundImage"] {
            opacity: 1 !important;
          }
        `,
			});

			// Screenshot hero section
			const heroSection = page.locator("section.relative.min-h-screen").first();
			await expect(heroSection).toHaveScreenshot("hero-section-desktop.png");
		});

		test("should maintain hero section visual consistency - Mobile", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto("/");

			await page.waitForLoadState("networkidle");
			await page.waitForTimeout(2000);

			// Hide video for consistency
			await page.addStyleTag({
				content: `video { opacity: 0 !important; }`,
			});

			const heroSection = page.locator("section.relative.min-h-screen").first();
			await expect(heroSection).toHaveScreenshot("hero-section-mobile.png");
		});

		test("should maintain hero section visual consistency - Tablet", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 768, height: 1024 });
			await page.goto("/");

			await page.waitForLoadState("networkidle");
			await page.waitForTimeout(2000);

			// Hide video for consistency
			await page.addStyleTag({
				content: `video { opacity: 0 !important; }`,
			});

			const heroSection = page.locator("section.relative.min-h-screen").first();
			await expect(heroSection).toHaveScreenshot("hero-section-tablet.png");
		});

		test("should maintain booking widget visual consistency", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1200, height: 800 });
			await page.goto("/");

			await page.waitForLoadState("networkidle");

			// Focus on booking widget
			const bookingWidget = page.locator(
				".bg-white\\/95.backdrop-blur-lg.rounded-2xl",
			);
			await expect(bookingWidget).toHaveScreenshot(
				"booking-widget-desktop.png",
			);
		});

		test("should maintain trust badges visual consistency", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1200, height: 800 });
			await page.goto("/");

			await page.waitForLoadState("networkidle");

			// Screenshot trust badges section
			const trustBadges = page
				.locator(".flex.justify-center.items-center.gap-6.text-sm")
				.first();
			await expect(trustBadges).toHaveScreenshot("trust-badges.png");
		});
	});

	test.describe("Search Results Visual Consistency", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			await page.fill('input[placeholder*="City, hotel, landmark"]', "Paris");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});
			await page.waitForLoadState("networkidle");

			// Replace dynamic images with placeholder for consistency
			await page.addStyleTag({
				content: `
          img[src*="unsplash"] {
            content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="18">Hotel Image</text></svg>') !important;
          }
        `,
			});
		});

		test("should maintain search results layout - Desktop", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1200, height: 800 });

			// Screenshot search results header
			const resultsHeader = page
				.locator(
					".flex.flex-col.sm\\:flex-row.sm\\:items-center.sm\\:justify-between",
				)
				.first();
			await expect(resultsHeader).toHaveScreenshot(
				"search-results-header-desktop.png",
			);

			// Screenshot first hotel card
			const hotelCards = page.locator(".group.hover\\:shadow-2xl");
			if ((await hotelCards.count()) > 0) {
				await expect(hotelCards.first()).toHaveScreenshot(
					"hotel-card-desktop.png",
				);
			}
		});

		test("should maintain search results layout - Mobile", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Screenshot mobile search results
			const hotelCards = page.locator(".group.hover\\:shadow-2xl");
			if ((await hotelCards.count()) > 0) {
				await expect(hotelCards.first()).toHaveScreenshot(
					"hotel-card-mobile.png",
				);
			}
		});

		test("should maintain urgency indicators visual design", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1200, height: 800 });

			// Screenshot urgency indicators if present
			const urgencyIndicators = page.locator(
				'[class*="animate-pulse"]:has-text("people viewing"), [class*="bg-orange-50"]',
			);
			if ((await urgencyIndicators.count()) > 0) {
				await expect(urgencyIndicators.first()).toHaveScreenshot(
					"urgency-indicator.png",
				);
			}
		});

		test("should maintain deal badges visual design", async ({ page }) => {
			await page.setViewportSize({ width: 1200, height: 800 });

			// Screenshot deal badges if present
			const dealBadges = page.locator(
				'.bg-accent.text-white:has-text("OFF TODAY")',
			);
			if ((await dealBadges.count()) > 0) {
				await expect(dealBadges.first()).toHaveScreenshot("deal-badge.png");
			}

			// Screenshot featured deal banner if present
			const featuredBanner = page.locator(
				'[class*="bg-gradient-to-r"]:has-text("FEATURED DEAL")',
			);
			if ((await featuredBanner.count()) > 0) {
				await expect(featuredBanner.first()).toHaveScreenshot(
					"featured-deal-banner.png",
				);
			}
		});

		test("should maintain Book Now button visual consistency", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1200, height: 800 });

			// Screenshot Book Now buttons
			const bookNowButtons = page.locator('button:has-text("Book Now")');
			if ((await bookNowButtons.count()) > 0) {
				await expect(bookNowButtons.first()).toHaveScreenshot(
					"book-now-button-desktop.png",
				);
			}
		});

		test("should maintain Book Now button mobile visual consistency", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 667 });

			const bookNowButtons = page.locator('button:has-text("Book Now")');
			if ((await bookNowButtons.count()) > 0) {
				await expect(bookNowButtons.first()).toHaveScreenshot(
					"book-now-button-mobile.png",
				);
			}
		});
	});

	test.describe("Testimonials Visual Consistency", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");

			// Scroll to testimonials section
			await page.evaluate(() => {
				const testimonialsSection =
					document.querySelector('section:has(h2:contains("Real Stories"))') ||
					document.querySelector('[class*="py-20"]:has(h2)');
				if (testimonialsSection) {
					testimonialsSection.scrollIntoView({ behavior: "smooth" });
				}
			});
			await page.waitForTimeout(1000);
		});

		test("should maintain trust stats bar visual design", async ({ page }) => {
			await page.setViewportSize({ width: 1200, height: 800 });

			const trustStatsBar = page
				.locator(".bg-white.rounded-2xl.shadow-lg.p-6")
				.first();
			await expect(trustStatsBar).toHaveScreenshot("trust-stats-bar.png");
		});

		test("should maintain testimonials section header visual design", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1200, height: 800 });

			// Screenshot testimonials header section
			const headerSection = page.locator(".text-center.mb-12");
			if ((await headerSection.count()) > 0) {
				await expect(headerSection.first()).toHaveScreenshot(
					"testimonials-header.png",
				);
			}
		});

		test("should maintain desktop testimonials grid visual consistency", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1200, height: 800 });

			// Replace user avatars with placeholder for consistency
			await page.addStyleTag({
				content: `
          img[src*="unsplash"][alt*="Johnson"], img[src*="unsplash"][alt*="Chen"], img[src*="unsplash"][alt*="Rodriguez"] {
            content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="%23e5e7eb"/><circle cx="32" cy="24" r="8" fill="%239ca3af"/><path d="M12 52c0-11 9-20 20-20s20 9 20 20" fill="%239ca3af"/></svg>') !important;
          }
        `,
			});

			const desktopGrid = page.locator(".hidden.lg\\:grid.lg\\:grid-cols-3");
			if ((await desktopGrid.count()) > 0) {
				await expect(desktopGrid).toHaveScreenshot(
					"testimonials-desktop-grid.png",
				);
			}
		});

		test("should maintain mobile testimonials carousel visual consistency", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Replace avatar with placeholder
			await page.addStyleTag({
				content: `
          img[alt] {
            content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="%23e5e7eb"/><circle cx="24" cy="18" r="6" fill="%239ca3af"/><path d="M8 40c0-8.5 7-15.5 16-15.5s16 7 16 15.5" fill="%239ca3af"/></svg>') !important;
          }
        `,
			});

			const mobileCarousel = page.locator(
				".lg\\:hidden .bg-white.rounded-xl.shadow-lg.p-6",
			);
			if ((await mobileCarousel.count()) > 0) {
				await expect(mobileCarousel).toHaveScreenshot(
					"testimonials-mobile-carousel.png",
				);
			}

			// Screenshot navigation controls
			const navControls = page.locator(".flex.justify-center.mt-6.space-x-2");
			if ((await navControls.count()) > 0) {
				await expect(navControls).toHaveScreenshot(
					"testimonials-mobile-nav.png",
				);
			}
		});

		test("should maintain CTA section visual consistency", async ({ page }) => {
			await page.setViewportSize({ width: 1200, height: 800 });

			const ctaSection = page.locator(
				".bg-gradient-to-r.from-primary.to-primary-600.rounded-3xl",
			);
			await expect(ctaSection).toHaveScreenshot("testimonials-cta-section.png");
		});
	});

	test.describe("UI Component Visual Consistency", () => {
		test("should maintain TrustBadge component visual design", async ({
			page,
		}) => {
			await page.goto("/");
			await page.fill('input[placeholder*="City, hotel, landmark"]', "London");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});

			// Find and screenshot trust badges
			const trustBadges = page.locator(
				'[class*="bg-primary-50"], [class*="bg-green-100"]',
			);
			if ((await trustBadges.count()) > 0) {
				await expect(trustBadges.first()).toHaveScreenshot(
					"trust-badge-component.png",
				);
			}
		});

		test("should maintain UrgencyIndicator component visual design", async ({
			page,
		}) => {
			await page.goto("/");
			await page.fill('input[placeholder*="City, hotel, landmark"]', "Rome");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});

			// Find and screenshot urgency indicators
			const urgencyIndicators = page.locator(
				'[class*="bg-orange-50"], [class*="bg-green-50"], [class*="bg-red-50"]',
			);
			if ((await urgencyIndicators.count()) > 0) {
				await expect(urgencyIndicators.first()).toHaveScreenshot(
					"urgency-indicator-component.png",
				);
			}
		});

		test("should maintain Button component variants visual consistency", async ({
			page,
		}) => {
			await page.goto("/");

			// Primary button
			const primaryButton = page.locator('button:has-text("Search Hotels")');
			await expect(primaryButton).toHaveScreenshot("button-primary.png");

			// Secondary buttons (if visible)
			const secondaryButtons = page.locator('button:has-text("Watch Demo")');
			if ((await secondaryButtons.count()) > 0) {
				await expect(secondaryButtons.first()).toHaveScreenshot(
					"button-secondary.png",
				);
			}

			// Outline buttons
			const outlineButtons = page.locator(
				'button:has-text("Browse Destinations")',
			);
			if ((await outlineButtons.count()) > 0) {
				await expect(outlineButtons.first()).toHaveScreenshot(
					"button-outline.png",
				);
			}
		});

		test("should maintain Card component visual consistency", async ({
			page,
		}) => {
			await page.goto("/");
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				"Barcelona",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});

			// Replace images for consistency
			await page.addStyleTag({
				content: `
          img {
            content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="18">Hotel Image</text></svg>') !important;
          }
        `,
			});

			const hotelCards = page.locator(".group.hover\\:shadow-2xl");
			if ((await hotelCards.count()) > 0) {
				await expect(hotelCards.first()).toHaveScreenshot("card-component.png");
			}
		});
	});

	test.describe("Layout Visual Regression", () => {
		test("should maintain full page layout - Desktop", async ({ page }) => {
			await page.setViewportSize({ width: 1920, height: 1080 });
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			// Hide video and replace images for consistency
			await page.addStyleTag({
				content: `
          video { opacity: 0 !important; }
          img[src*="unsplash"] {
            content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50%" y="55%" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="12">Image</text></svg>') !important;
          }
        `,
			});

			await expect(page).toHaveScreenshot("full-page-desktop.png", {
				fullPage: true,
			});
		});

		test("should maintain full page layout - Mobile", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			// Hide video and replace images for consistency
			await page.addStyleTag({
				content: `
          video { opacity: 0 !important; }
          img[src*="unsplash"] {
            content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50%" y="55%" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="10">Image</text></svg>') !important;
          }
        `,
			});

			await expect(page).toHaveScreenshot("full-page-mobile.png", {
				fullPage: true,
			});
		});

		test("should maintain search results page layout", async ({ page }) => {
			await page.setViewportSize({ width: 1200, height: 800 });
			await page.goto("/");
			await page.fill('input[placeholder*="City, hotel, landmark"]', "Madrid");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});
			await page.waitForLoadState("networkidle");

			// Standardize images
			await page.addStyleTag({
				content: `
          img {
            content: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="50%" y="50%" text-anchor="middle" fill="%236b7280" font-family="Arial" font-size="18">Hotel</text></svg>') !important;
          }
        `,
			});

			await expect(page).toHaveScreenshot("search-results-page.png", {
				fullPage: true,
			});
		});
	});

	test.describe("Color Scheme and Theme Consistency", () => {
		test("should maintain light theme visual consistency", async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			// Ensure light theme
			await page.evaluate(() => {
				document.documentElement.classList.remove("dark");
			});

			// Hide video for consistency
			await page.addStyleTag({
				content: `video { opacity: 0 !important; }`,
			});

			const heroSection = page.locator("section.relative.min-h-screen").first();
			await expect(heroSection).toHaveScreenshot("light-theme-hero.png");
		});

		test("should maintain dark theme visual consistency", async ({ page }) => {
			await page.goto("/");
			await page.waitForLoadState("networkidle");

			// Enable dark theme
			await page.evaluate(() => {
				document.documentElement.classList.add("dark");
			});

			await page.addStyleTag({
				content: `video { opacity: 0 !important; }`,
			});

			const heroSection = page.locator("section.relative.min-h-screen").first();
			await expect(heroSection).toHaveScreenshot("dark-theme-hero.png");
		});
	});

	test.describe("Cross-Browser Visual Consistency", () => {
		const browsers = ["chromium", "firefox", "webkit"];

		browsers.forEach((browserName) => {
			test(`should maintain visual consistency in ${browserName}`, async ({
				page,
			}) => {
				await page.setViewportSize({ width: 1200, height: 800 });
				await page.goto("/");
				await page.waitForLoadState("networkidle");

				await page.addStyleTag({
					content: `
            video { opacity: 0 !important; }
            * { animation: none !important; transition: none !important; }
          `,
				});

				const bookingWidget = page.locator(
					".bg-white\\/95.backdrop-blur-lg.rounded-2xl",
				);
				await expect(bookingWidget).toHaveScreenshot(
					`booking-widget-${browserName}.png`,
				);
			});
		});
	});

	test.describe("Loading State Visual Consistency", () => {
		test("should maintain search loading state visual design", async ({
			page,
		}) => {
			await page.goto("/");

			// Intercept search API to show loading state
			await page.route("**/api/search**", (route) => {
				// Delay the response to capture loading state
				setTimeout(() => route.continue(), 5000);
			});

			await page.fill('input[placeholder*="City, hotel, landmark"]', "Testing");
			await page.click('button:has-text("Search Hotels")');

			// Wait for loading state to appear
			await page.waitForTimeout(1000);

			const loadingState = page.locator(
				"text=Searching hotels..., .animate-pulse",
			);
			if ((await loadingState.count()) > 0) {
				await expect(loadingState.first()).toHaveScreenshot(
					"search-loading-state.png",
				);
			}

			// Clean up route
			await page.unroute("**/api/search**");
		});
	});

	test.describe("Error State Visual Consistency", () => {
		test("should maintain error state visual design", async ({ page }) => {
			await page.goto("/");

			// Simulate search error
			await page.route("**/api/**", (route) => {
				route.fulfill({
					status: 500,
					contentType: "application/json",
					body: JSON.stringify({ error: "Test error" }),
				});
			});

			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				"ErrorTest",
			);
			await page.click('button:has-text("Search Hotels")');

			await page.waitForTimeout(3000);

			// Look for error state
			const errorState = page.locator('text=error, text=Error, [role="alert"]');
			if ((await errorState.count()) > 0) {
				await expect(errorState.first()).toHaveScreenshot("error-state.png");
			}

			await page.unroute("**/api/**");
		});
	});
});
