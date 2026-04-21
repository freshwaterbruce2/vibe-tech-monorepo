import { expect, test } from "@playwright/test";

test.describe("Hero Section - Conversion-Focused Design", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		// Wait for the page to fully load including the video
		await page.waitForLoadState("networkidle");
	});

	test.describe("Video Background and Visual Elements", () => {
		test("should display video background with fallback", async ({ page }) => {
			// Check for video element
			const video = page.locator("video");
			await expect(video).toBeVisible();

			// Verify video attributes
			await expect(video).toHaveAttribute("autoplay");
			await expect(video).toHaveAttribute("muted");
			await expect(video).toHaveAttribute("loop");
			await expect(video).toHaveAttribute("playsinline");

			// Check for poster image fallback
			await expect(video).toHaveAttribute("poster");

			// Verify gradient overlay is present
			const overlay = page.locator(
				".absolute.inset-0.bg-gradient-to-r.from-black\\/60",
			);
			await expect(overlay).toBeVisible();
		});

		test("should handle video loading states gracefully", async ({ page }) => {
			// Check that fallback background image exists
			const fallbackDiv = page.locator('div[style*="backgroundImage"]');
			await expect(fallbackDiv).toBeVisible();
		});
	});

	test.describe("Trust Badges and Social Proof", () => {
		test("should display trust badges in header", async ({ page }) => {
			// Check for Secure Booking badge
			const secureBooking = page.locator("text=Secure Booking");
			await expect(secureBooking).toBeVisible();

			// Check for Best Price Guarantee badge
			const priceGuarantee = page.locator("text=Best Price Guarantee");
			await expect(priceGuarantee).toBeVisible();

			// Check for Instant Confirmation badge
			const instantConfirm = page.locator("text=Instant Confirmation");
			await expect(instantConfirm).toBeVisible();

			// Verify icons are present
			await expect(
				page.locator("svg").filter({ hasText: "Shield" }).first(),
			).toBeVisible();
			await expect(
				page.locator("svg").filter({ hasText: "Award" }).first(),
			).toBeVisible();
			await expect(
				page.locator("svg").filter({ hasText: "Clock" }).first(),
			).toBeVisible();
		});

		test("should display trust statistics with proper formatting", async ({
			page,
		}) => {
			// Customer Rating
			const rating = page.locator("text=4.9");
			await expect(rating).toBeVisible();
			const ratingDesc = page.locator("text=Customer Rating");
			await expect(ratingDesc).toBeVisible();

			// Happy Travelers
			const travelers = page.locator("text=2M+");
			await expect(travelers).toBeVisible();
			const travelersDesc = page.locator("text=Happy Travelers");
			await expect(travelersDesc).toBeVisible();

			// Hotels Worldwide
			const hotels = page.locator("text=50K+");
			await expect(hotels).toBeVisible();
			const hotelsDesc = page.locator("text=Hotels Worldwide");
			await expect(hotelsDesc).toBeVisible();
		});
	});

	test.describe("Mobile-First Booking Widget", () => {
		test("should display booking widget with proper layout", async ({
			page,
		}) => {
			// Check for booking widget container
			const widget = page.locator(
				".bg-white\\/95.backdrop-blur-lg.rounded-2xl",
			);
			await expect(widget).toBeVisible();

			// Verify destination input
			const destinationInput = page.locator(
				'input[placeholder*="City, hotel, landmark"]',
			);
			await expect(destinationInput).toBeVisible();
			await expect(destinationInput).toHaveAttribute("type", "text");

			// Verify date inputs
			const checkinInput = page.locator('input[type="date"]').first();
			const checkoutInput = page.locator('input[type="date"]').last();
			await expect(checkinInput).toBeVisible();
			await expect(checkoutInput).toBeVisible();

			// Verify search button
			const searchButton = page.locator('button:has-text("Search Hotels")');
			await expect(searchButton).toBeVisible();
			await expect(searchButton).toHaveClass(/w-full.*h-14/);
		});

		test("should show AI search section with proper styling", async ({
			page,
		}) => {
			// Check for AI badge
			const aiBadge = page.locator("text=Try AI-Powered Search");
			await expect(aiBadge).toBeVisible();

			// Check for AI input placeholder
			const aiInput = page.locator(
				'input[placeholder*="Romantic weekend in Paris with spa"]',
			);
			await expect(aiInput).toBeVisible();
		});

		test("should handle booking widget interactions", async ({ page }) => {
			// Test destination input
			const destinationInput = page.locator(
				'input[placeholder*="City, hotel, landmark"]',
			);
			await destinationInput.fill("New York");
			await expect(destinationInput).toHaveValue("New York");

			// Test AI input
			const aiInput = page.locator(
				'input[placeholder*="Romantic weekend in Paris with spa"]',
			);
			await aiInput.fill("Beach resort with spa in Miami");
			await expect(aiInput).toHaveValue("Beach resort with spa in Miami");
		});
	});

	test.describe("Conversion-Focused Headlines and CTAs", () => {
		test("should display compelling headlines with savings message", async ({
			page,
		}) => {
			// Main headline
			const mainHeadline = page.locator("h1");
			await expect(mainHeadline).toContainText("Book Your");
			await expect(mainHeadline).toContainText("Dream Stay");

			// Savings message
			const savingsMessage = page.locator("text=Save 5% on Every Booking");
			await expect(savingsMessage).toBeVisible();
			await expect(savingsMessage).toHaveClass(/text-primary/);
		});

		test("should display mobile-optimized descriptions", async ({
			page,
			isMobile,
		}) => {
			if (isMobile) {
				// Mobile description
				const mobileDesc = page.locator(
					"text=Find perfect hotels with AI • Best prices • Instant booking",
				);
				await expect(mobileDesc).toBeVisible();
			} else {
				// Desktop description
				const desktopDesc = page.locator(
					"text=AI-powered hotel matching • Instant confirmation • Best prices guaranteed",
				);
				await expect(desktopDesc).toBeVisible();
			}
		});

		test("should display action buttons with proper styling", async ({
			page,
		}) => {
			// Watch Demo button
			const demoButton = page.locator('button:has-text("Watch Demo")');
			await expect(demoButton).toBeVisible();
			await expect(demoButton).toHaveClass(/bg-white\/10/);

			// Browse Destinations button
			const browseButton = page.locator(
				'button:has-text("Browse Destinations")',
			);
			await expect(browseButton).toBeVisible();
			await expect(browseButton).toHaveClass(/border-white\/30/);

			// Test hover effects (desktop only)
			if (!(await page.evaluate(() => window.innerWidth < 768))) {
				await demoButton.hover();
				await expect(demoButton).toHaveClass(/hover:bg-white\/20/);
			}
		});
	});

	test.describe("Scroll Indicator and UX Elements", () => {
		test("should display animated scroll indicator", async ({ page }) => {
			const scrollIndicator = page.locator(".absolute.bottom-8.left-1\\/2");
			await expect(scrollIndicator).toBeVisible();

			// Check for bounce animation
			const bounceElement = page.locator(".animate-bounce");
			await expect(bounceElement).toBeVisible();

			// Check for pulse animation
			const pulseElement = page.locator(".animate-pulse");
			await expect(pulseElement).toBeVisible();
		});
	});

	test.describe("Responsive Design Testing", () => {
		test("should adapt layout for mobile devices", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Check mobile-specific classes
			const mobileHeadline = page.locator("h1");
			await expect(mobileHeadline).toHaveClass(/text-4xl.*sm:text-5xl/);

			// Verify mobile booking widget layout
			const bookingWidget = page.locator(".space-y-4.md\\:space-y-0");
			await expect(bookingWidget).toBeVisible();

			// Check mobile description is visible
			const mobileDesc = page.locator(".md\\:hidden");
			await expect(mobileDesc).toBeVisible();
		});

		test("should adapt layout for tablet devices", async ({ page }) => {
			await page.setViewportSize({ width: 768, height: 1024 });

			// Check medium screen adaptations
			const mediumHeadline = page.locator("h1");
			await expect(mediumHeadline).toHaveClass(/md:text-7xl/);

			// Verify grid layout changes
			const statsGrid = page.locator(".grid.grid-cols-1.md\\:grid-cols-3");
			await expect(statsGrid).toBeVisible();
		});

		test("should display full desktop experience", async ({ page }) => {
			await page.setViewportSize({ width: 1920, height: 1080 });

			// Check large screen headline
			const largeHeadline = page.locator("h1");
			await expect(largeHeadline).toHaveClass(/lg:text-8xl/);

			// Verify desktop description is visible
			const desktopDesc = page.locator(".hidden.md\\:inline");
			await expect(desktopDesc).toBeVisible();

			// Check desktop booking widget layout
			const desktopWidget = page.locator(".md\\:grid.md\\:grid-cols-4");
			await expect(desktopWidget).toBeVisible();
		});
	});

	test.describe("Performance and Accessibility", () => {
		test("should load hero content within performance budgets", async ({
			page,
		}) => {
			const startTime = Date.now();
			await page.goto("/");
			await page.waitForSelector("h1");
			const loadTime = Date.now() - startTime;

			// Hero should load within 3 seconds
			expect(loadTime).toBeLessThan(3000);
		});

		test("should meet accessibility standards", async ({ page }) => {
			// Check for proper heading structure
			const h1 = page.locator("h1");
			await expect(h1).toBeVisible();

			// Check for form labels
			const destinationLabel = page.locator('label:has-text("Where to?")');
			await expect(destinationLabel).toBeVisible();

			const checkinLabel = page.locator('label:has-text("Check-in")');
			await expect(checkinLabel).toBeVisible();

			const checkoutLabel = page.locator('label:has-text("Check-out")');
			await expect(checkoutLabel).toBeVisible();

			// Check button accessibility
			const searchButton = page.locator('button:has-text("Search Hotels")');
			await expect(searchButton).not.toHaveAttribute("disabled");
		});

		test("should handle focus states properly", async ({ page }) => {
			// Test keyboard navigation through booking widget
			await page.keyboard.press("Tab");
			const firstFocusable = page.locator(
				'input[placeholder*="City, hotel, landmark"]',
			);
			await expect(firstFocusable).toBeFocused();

			await page.keyboard.press("Tab");
			const secondFocusable = page.locator('input[type="date"]').first();
			await expect(secondFocusable).toBeFocused();
		});
	});

	test.describe("Conversion Optimization Elements", () => {
		test("should highlight savings and value propositions", async ({
			page,
		}) => {
			// Check for savings highlighted in primary color
			const savingsText = page.locator('.text-primary:has-text("Save 5%")');
			await expect(savingsText).toBeVisible();

			// Verify value props in stats
			const savedAmount = page.locator("text=Saved $15M+ total");
			await expect(savedAmount).toBeVisible();
		});

		test("should use urgency and scarcity elements appropriately", async ({
			page,
		}) => {
			// Check for "Instant" messaging
			const instantElements = page.locator("text=Instant");
			await expect(instantElements.first()).toBeVisible();

			// Verify trust signals are prominent
			const trustBadges = page.locator(".flex.items-center.gap-2").first();
			await expect(trustBadges).toBeVisible();
		});
	});
});
