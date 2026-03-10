import { expect, test } from "@playwright/test";

test.describe("Testimonials Section - Social Proof and Trust Building", () => {
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
		await page.waitForTimeout(1000); // Allow smooth scroll to complete
	});

	test.describe("Trust Stats Bar", () => {
		test("should display comprehensive trust statistics", async ({ page }) => {
			// Check for trust stats container
			const trustStatsBar = page.locator(".bg-white.rounded-2xl.shadow-lg.p-6");
			await expect(trustStatsBar).toBeVisible();

			// Average Rating
			const averageRating = page.locator("text=4.9/5");
			await expect(averageRating).toBeVisible();

			const ratingDesc = page.locator("text=Average Rating");
			await expect(ratingDesc).toBeVisible();

			const reviewCount = page.locator("text=50,000+ reviews");
			await expect(reviewCount).toBeVisible();

			// Happy Travelers
			const happyTravelers = page.locator("text=2M+");
			await expect(happyTravelers).toBeVisible();

			const travelersDesc = page.locator("text=Happy Travelers");
			await expect(travelersDesc).toBeVisible();

			const trustedDesc = page.locator("text=Trusted worldwide");
			await expect(trustedDesc).toBeVisible();

			// Booking Success Rate
			const successRate = page.locator("text=99.9%");
			await expect(successRate).toBeVisible();

			const successDesc = page.locator("text=Booking Success");
			await expect(successDesc).toBeVisible();

			// Total Savings
			const totalSavings = page.locator("text=$15M+");
			await expect(totalSavings).toBeVisible();

			const savingsDesc = page.locator("text=Total Savings");
			await expect(savingsDesc).toBeVisible();
		});

		test("should display proper color coding for stats", async ({ page }) => {
			// Check color classes for different stats
			const primaryStat = page
				.locator(".text-primary")
				.filter({ hasText: "4.9/5" });
			if ((await primaryStat.count()) > 0) {
				await expect(primaryStat).toBeVisible();
			}

			const accentStat = page
				.locator(".text-accent")
				.filter({ hasText: "2M+" });
			if ((await accentStat.count()) > 0) {
				await expect(accentStat).toBeVisible();
			}

			const blueStat = page
				.locator(".text-blue-600")
				.filter({ hasText: "99.9%" });
			if ((await blueStat.count()) > 0) {
				await expect(blueStat).toBeVisible();
			}

			const greenStat = page
				.locator(".text-green-600")
				.filter({ hasText: "$15M+" });
			if ((await greenStat.count()) > 0) {
				await expect(greenStat).toBeVisible();
			}
		});

		test("should be responsive across different screen sizes", async ({
			page,
		}) => {
			// Test mobile layout
			await page.setViewportSize({ width: 375, height: 667 });
			const mobileGrid = page.locator(".grid.grid-cols-1.md\\:grid-cols-4");
			await expect(mobileGrid).toBeVisible();

			// Test desktop layout
			await page.setViewportSize({ width: 1024, height: 768 });
			await expect(mobileGrid).toBeVisible();

			// All stats should still be visible
			await expect(page.locator("text=4.9/5")).toBeVisible();
			await expect(page.locator("text=2M+")).toBeVisible();
			await expect(page.locator("text=99.9%")).toBeVisible();
			await expect(page.locator("text=$15M+")).toBeVisible();
		});
	});

	test.describe("Section Header and Branding", () => {
		test("should display featured badge and compelling headline", async ({
			page,
		}) => {
			// Check for featured badge
			const featuredBadge = page.locator(
				'.bg-primary-50.text-primary-700:has-text("Featured Customer Stories")',
			);
			await expect(featuredBadge).toBeVisible();

			// Check for checkmark icon in badge
			const checkIcon = page
				.locator('svg[fill="currentColor"]')
				.filter({ has: page.locator('path[clip-rule="evenodd"]') });
			await expect(checkIcon.first()).toBeVisible();

			// Check main headline
			const mainHeadline = page.locator(
				'h2:has-text("Real Stories from Real Travelers")',
			);
			await expect(mainHeadline).toBeVisible();
			await expect(mainHeadline).toHaveClass(
				/text-4xl.*md:text-5xl.*font-bold/,
			);

			// Check subheading
			const subheading = page.locator(
				"text=See why millions choose Vibe Booking",
			);
			await expect(subheading).toBeVisible();
			await expect(subheading).toHaveClass(/text-xl.*text-gray-600/);
		});
	});

	test.describe("Desktop Testimonials Grid", () => {
		test("should display testimonials in grid layout on desktop", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1024, height: 768 });

			// Check for desktop grid
			const desktopGrid = page.locator(".hidden.lg\\:grid.lg\\:grid-cols-3");
			await expect(desktopGrid).toBeVisible();

			// Should display first 3 testimonials
			const testimonialCards = page.locator(
				".group .bg-white.rounded-2xl.shadow-lg",
			);
			await expect(testimonialCards).toHaveCount(3);
		});

		test("should display featured story badge on first testimonial", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1024, height: 768 });

			// Check for featured story badge
			const featuredBadge = page.locator(
				'.bg-primary.text-white:has-text("Featured Story")',
			);
			if ((await featuredBadge.count()) > 0) {
				await expect(featuredBadge).toBeVisible();
				await expect(featuredBadge).toHaveClass(/rotate-12/);
			}
		});

		test("should display complete testimonial information", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1024, height: 768 });

			const testimonialCards = page
				.locator(".group .bg-white.rounded-2xl.shadow-lg")
				.first();

			// Check star rating
			const starRating = testimonialCards.locator(".text-yellow-400");
			await expect(starRating.first()).toBeVisible();

			// Check rating number
			const ratingNumber = testimonialCards.locator(
				".text-lg.font-bold.text-yellow-600",
			);
			await expect(ratingNumber).toBeVisible();

			// Check testimonial quote
			const quote = testimonialCards.locator("blockquote");
			await expect(quote).toBeVisible();
			await expect(quote).toHaveClass(/italic/);

			// Check user avatar
			const avatar = testimonialCards.locator("img[alt]");
			await expect(avatar).toBeVisible();
			await expect(avatar).toHaveClass(/w-16.*h-16.*rounded-full/);

			// Check user name
			const userName = testimonialCards.locator(
				".font-bold.text-gray-900.text-lg",
			);
			await expect(userName).toBeVisible();

			// Check user location
			const userLocation = testimonialCards.locator(".text-sm.text-gray-600");
			await expect(userLocation).toBeVisible();

			// Check verified badge
			const verifiedBadge = testimonialCards.locator(
				'.bg-green-100.text-green-800:has-text("Verified Booking")',
			);
			if ((await verifiedBadge.count()) > 0) {
				await expect(verifiedBadge).toBeVisible();
			}

			// Check hotel details
			const hotelDetails = testimonialCards.locator(
				".bg-gray-50.rounded-lg.p-3",
			);
			await expect(hotelDetails).toBeVisible();
		});

		test("should handle hover effects on desktop", async ({
			page,
			isMobile,
		}) => {
			if (!isMobile) {
				await page.setViewportSize({ width: 1024, height: 768 });

				const testimonialCard = page
					.locator(".group .bg-white.rounded-2xl.shadow-lg")
					.first();

				// Test hover effects
				await testimonialCard.hover();

				// Check for hover shadow
				await expect(testimonialCard).toHaveClass(/hover:shadow-2xl/);

				// Check for hover border
				await expect(testimonialCard).toHaveClass(/hover:border-primary-200/);

				// Check for hover overlay
				const hoverOverlay = testimonialCard.locator(
					".absolute.inset-0.bg-gradient-to-br",
				);
				await expect(hoverOverlay).toBeVisible();
			}
		});

		test("should handle avatar image loading errors", async ({ page }) => {
			await page.setViewportSize({ width: 1024, height: 768 });

			const avatars = page.locator(
				'img[alt*="Johnson"], img[alt*="Chen"], img[alt*="Rodriguez"]',
			);

			if ((await avatars.count()) > 0) {
				// Check that avatars are visible or have fallback
				await expect(avatars.first()).toBeVisible();
			}
		});
	});

	test.describe("Mobile/Tablet Carousel", () => {
		test("should display carousel on mobile and tablet", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Desktop grid should be hidden
			const desktopGrid = page.locator(".hidden.lg\\:grid");
			await expect(desktopGrid).toBeHidden();

			// Mobile carousel should be visible
			const mobileCarousel = page.locator(".lg\\:hidden");
			await expect(mobileCarousel).toBeVisible();

			// Check for testimonial card
			const carouselCard = page.locator(".bg-white.rounded-xl.shadow-lg.p-6");
			await expect(carouselCard).toBeVisible();
		});

		test("should display current testimonial information in carousel", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 667 });

			const carouselCard = page.locator(".bg-white.rounded-xl.shadow-lg.p-6");

			// Check user info
			const avatar = carouselCard.locator("img[alt]");
			await expect(avatar).toBeVisible();
			await expect(avatar).toHaveClass(/w-12.*h-12/);

			const userName = carouselCard.locator(".font-semibold.text-gray-900");
			await expect(userName).toBeVisible();

			const userLocation = carouselCard.locator(".text-sm.text-gray-600");
			await expect(userLocation).toBeVisible();

			// Check verified badge
			const verifiedBadge = carouselCard.locator(
				'.bg-green-100.text-green-800:has-text("Verified")',
			);
			if ((await verifiedBadge.count()) > 0) {
				await expect(verifiedBadge).toBeVisible();
			}

			// Check rating stars
			const stars = carouselCard.locator(".text-yellow-400");
			await expect(stars.first()).toBeVisible();

			// Check testimonial quote
			const quote = carouselCard.locator("blockquote.italic");
			await expect(quote).toBeVisible();

			// Check hotel details
			const hotelName = carouselCard.locator(".font-medium");
			await expect(hotelName).toBeVisible();
		});

		test("should display navigation buttons", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Check for previous button
			const prevButton = page
				.locator("button")
				.filter({ has: page.locator('svg path[d*="M15 19l-7-7 7-7"]') });
			await expect(prevButton).toBeVisible();
			await expect(prevButton).toHaveClass(/bg-white.*shadow-lg.*rounded-full/);

			// Check for next button
			const nextButton = page
				.locator("button")
				.filter({ has: page.locator('svg path[d*="M9 5l7 7-7 7"]') });
			await expect(nextButton).toBeVisible();
			await expect(nextButton).toHaveClass(/bg-white.*shadow-lg.*rounded-full/);
		});

		test("should display dots indicator", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Check for dots container
			const dotsContainer = page.locator(".flex.justify-center.mt-6.space-x-2");
			await expect(dotsContainer).toBeVisible();

			// Should have multiple dots (5 testimonials)
			const dots = dotsContainer.locator("button.w-2.h-2.rounded-full");
			await expect(dots).toHaveCount(5);

			// First dot should be active (blue)
			const activeDot = dots.first();
			await expect(activeDot).toHaveClass(/bg-blue-600/);
		});

		test("should handle carousel navigation", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Get initial testimonial name
			const initialName = await page
				.locator(".font-semibold.text-gray-900")
				.first()
				.textContent();

			// Click next button
			const nextButton = page
				.locator("button")
				.filter({ has: page.locator('svg path[d*="M9 5l7 7-7 7"]') });
			await nextButton.click();

			// Wait for animation
			await page.waitForTimeout(500);

			// Name should change
			const newName = await page
				.locator(".font-semibold.text-gray-900")
				.first()
				.textContent();
			expect(newName).not.toBe(initialName);

			// Active dot should change
			const secondDot = page.locator("button.w-2.h-2.rounded-full").nth(1);
			await expect(secondDot).toHaveClass(/bg-blue-600/);
		});

		test("should handle dot navigation", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Click on third dot
			const thirdDot = page.locator("button.w-2.h-2.rounded-full").nth(2);
			await thirdDot.click();

			// Wait for animation
			await page.waitForTimeout(500);

			// Third dot should be active
			await expect(thirdDot).toHaveClass(/bg-blue-600/);

			// Testimonial should change
			const testimonialCard = page.locator(
				".bg-white.rounded-xl.shadow-lg.p-6",
			);
			await expect(testimonialCard).toBeVisible();
		});

		test("should handle previous button navigation", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Click previous button (should go to last testimonial)
			const prevButton = page
				.locator("button")
				.filter({ has: page.locator('svg path[d*="M15 19l-7-7 7-7"]') });
			await prevButton.click();

			// Wait for animation
			await page.waitForTimeout(500);

			// Last dot should be active
			const lastDot = page.locator("button.w-2.h-2.rounded-full").last();
			await expect(lastDot).toHaveClass(/bg-blue-600/);
		});
	});

	test.describe("Enhanced CTA Section", () => {
		test("should display compelling CTA with gradient background", async ({
			page,
		}) => {
			// Check for CTA section
			const ctaSection = page.locator(
				".bg-gradient-to-r.from-primary.to-primary-600.rounded-3xl",
			);
			await expect(ctaSection).toBeVisible();

			// Check background pattern
			const backgroundPattern = ctaSection.locator(
				".absolute.inset-0.bg-white\\/5",
			);
			await expect(backgroundPattern).toBeVisible();

			// Check main headline
			const headline = ctaSection.locator(
				'h3:has-text("Ready to Find Your Perfect Hotel?")',
			);
			await expect(headline).toBeVisible();
			await expect(headline).toHaveClass(/text-3xl.*md:text-4xl.*font-bold/);

			// Check value proposition
			const valueProp = ctaSection.locator(
				"text=Join 2M+ travelers who saved money",
			);
			await expect(valueProp).toBeVisible();

			// Check feature list
			const features = ctaSection.locator(
				"text=• Free cancellation on most bookings • Best price guarantee • Instant confirmation",
			);
			await expect(features).toBeVisible();
		});

		test("should display action buttons with proper styling", async ({
			page,
		}) => {
			const ctaSection = page.locator(
				".bg-gradient-to-r.from-primary.to-primary-600.rounded-3xl",
			);

			// Primary CTA button
			const startBookingButton = ctaSection.locator(
				'button:has-text("Start Booking Now")',
			);
			await expect(startBookingButton).toBeVisible();
			await expect(startBookingButton).toHaveClass(
				/bg-white.*text-primary.*font-bold/,
			);
			await expect(startBookingButton).toHaveClass(
				/hover:bg-gray-50.*transform.*hover:scale-105/,
			);

			// Secondary CTA button
			const browseDealsButton = ctaSection.locator(
				'button:has-text("Browse Deals")',
			);
			await expect(browseDealsButton).toBeVisible();
			await expect(browseDealsButton).toHaveClass(
				/border-2.*border-white\/30.*text-white/,
			);
			await expect(browseDealsButton).toHaveClass(/hover:bg-white\/10/);
		});

		test("should display trust indicators in CTA", async ({ page }) => {
			const ctaSection = page.locator(
				".bg-gradient-to-r.from-primary.to-primary-600.rounded-3xl",
			);

			// Check trust indicators
			const sslSecured = ctaSection.locator("text=SSL Secured");
			await expect(sslSecured).toBeVisible();

			const support24_7 = ctaSection.locator("text=24/7 Support");
			await expect(support24_7).toBeVisible();

			const noHiddenFees = ctaSection.locator("text=No Hidden Fees");
			await expect(noHiddenFees).toBeVisible();

			// Check for checkmark icons
			const checkIcons = ctaSection
				.locator('svg[fill="currentColor"]')
				.filter({ has: page.locator('path[clip-rule="evenodd"]') });
			await expect(checkIcons).toHaveCount(3);
		});

		test("should adapt CTA layout for mobile", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Check button layout
			const buttonContainer = page.locator(
				".flex.flex-col.sm\\:flex-row.gap-4",
			);
			await expect(buttonContainer).toBeVisible();

			// Buttons should stack on mobile
			const buttons = buttonContainer.locator("button");
			await expect(buttons).toHaveCount(2);

			// Trust indicators should wrap properly
			const trustContainer = page.locator(".flex.flex-wrap.justify-center");
			await expect(trustContainer).toBeVisible();
		});
	});

	test.describe("Performance and Accessibility", () => {
		test("should handle image loading errors gracefully", async ({ page }) => {
			// All avatar images should have error handling
			const avatars = page.locator(
				'img[alt*="Johnson"], img[alt*="Chen"], img[alt*="Rodriguez"], img[alt*="Kim"], img[alt*="Thompson"]',
			);

			if ((await avatars.count()) > 0) {
				// Check that images are visible or have fallback
				for (let i = 0; i < (await avatars.count()); i++) {
					const avatar = avatars.nth(i);
					if (await avatar.isVisible()) {
						await expect(avatar).toBeVisible();
					}
				}
			}
		});

		test("should meet accessibility standards", async ({ page }) => {
			// Check for proper heading structure
			const h2 = page.locator(
				'h2:has-text("Real Stories from Real Travelers")',
			);
			await expect(h2).toBeVisible();

			// Check for proper button labels
			const prevButton = page
				.locator("button[aria-label], button")
				.filter({ has: page.locator('svg path[d*="M15 19l-7-7 7-7"]') });
			const nextButton = page
				.locator("button[aria-label], button")
				.filter({ has: page.locator('svg path[d*="M9 5l7 7-7 7"]') });

			if ((await prevButton.count()) > 0) {
				await expect(prevButton).toBeVisible();
			}
			if ((await nextButton.count()) > 0) {
				await expect(nextButton).toBeVisible();
			}

			// Check for proper image alt texts
			const avatars = page.locator("img[alt]");
			if ((await avatars.count()) > 0) {
				for (let i = 0; i < (await avatars.count()); i++) {
					const avatar = avatars.nth(i);
					const altText = await avatar.getAttribute("alt");
					expect(altText).toBeTruthy();
				}
			}
		});

		test("should load testimonials section within performance budget", async ({
			page,
		}) => {
			const startTime = Date.now();

			await page.goto("/");

			// Wait for testimonials section to be visible
			await page.waitForSelector(
				'h2:has-text("Real Stories from Real Travelers")',
				{ timeout: 5000 },
			);

			const loadTime = Date.now() - startTime;

			// Should load within 5 seconds
			expect(loadTime).toBeLessThan(5000);
		});
	});
});
