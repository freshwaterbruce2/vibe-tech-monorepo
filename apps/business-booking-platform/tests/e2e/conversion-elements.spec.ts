import { expect, test } from "@playwright/test";

test.describe("Conversion Elements - Sales Optimization Testing", () => {
	test.describe("Book Now Buttons and Primary CTAs", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				"New York",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 10000,
			});
		});

		test("should display Book Now buttons with conversion-focused styling", async ({
			page,
		}) => {
			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				const firstButton = bookNowButtons.first();
				await expect(firstButton).toBeVisible();

				// Check conversion-optimized styling
				await expect(firstButton).toHaveClass(/bg-primary/);
				await expect(firstButton).toHaveClass(/text-white/);
				await expect(firstButton).toHaveClass(/font-bold/);
				await expect(firstButton).toHaveClass(/shadow-lg/);
				await expect(firstButton).toHaveClass(/hover:shadow-xl/);
				await expect(firstButton).toHaveClass(/transform.*hover:scale-105/);
			}
		});

		test("should make Book Now buttons prominent on mobile", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 667 });

			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				const firstButton = bookNowButtons.first();

				// Mobile-specific styling for better conversion
				await expect(firstButton).toHaveClass(/w-full.*sm:w-auto/);
				await expect(firstButton).toHaveClass(/h-12.*sm:h-auto/);
				await expect(firstButton).toHaveClass(/text-lg.*sm:text-sm/);

				// Should be prominently placed (order-1)
				await expect(firstButton).toHaveClass(/order-1.*sm:order-2/);
			}
		});

		test("should handle Book Now button interactions properly", async ({
			page,
		}) => {
			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				const firstButton = bookNowButtons.first();

				// Should be clickable
				await expect(firstButton).not.toHaveAttribute("disabled");

				// Click should not cause JavaScript errors
				const consoleErrors: string[] = [];
				page.on("console", (msg) => {
					if (msg.type() === "error") {
						consoleErrors.push(msg.text());
					}
				});

				await firstButton.click();

				// Should not have produced console errors
				expect(consoleErrors.length).toBe(0);

				// Should prevent event bubbling (not navigate to hotel details)
				await expect(page).toHaveURL(/search/);
			}
		});

		test("should display secondary action buttons with proper hierarchy", async ({
			page,
		}) => {
			const viewDetailsButtons = page.locator(
				'button:has-text("View Details")',
			);

			if ((await viewDetailsButtons.count()) > 0) {
				const firstDetailsButton = viewDetailsButtons.first();
				await expect(firstDetailsButton).toBeVisible();

				// Should have secondary styling (less prominent than Book Now)
				await expect(firstDetailsButton).toHaveClass(/hover:text-primary-600/);
				await expect(firstDetailsButton).not.toHaveClass(/bg-primary/);
			}
		});

		test("should show mobile-optimized action layout", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Check for mobile-only "View Details & Map" button
			const mobileDetailsButton = page.locator(
				'button:has-text("View Details & Map")',
			);
			if ((await mobileDetailsButton.count()) > 0) {
				await expect(mobileDetailsButton).toBeVisible();
				await expect(mobileDetailsButton).toHaveClass(/sm:hidden/);
				await expect(mobileDetailsButton).toHaveClass(/w-full/);
			}

			// Desktop-only "View Details" should be hidden on mobile
			const desktopDetailsButton = page.locator(
				'.hidden.sm\\:block:has-text("View Details")',
			);
			if ((await desktopDetailsButton.count()) > 0) {
				await expect(desktopDetailsButton).toBeHidden();
			}
		});
	});

	test.describe("Deal Badges and Discount Indicators", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			await page.fill('input[placeholder*="City, hotel, landmark"]', "Paris");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 10000,
			});
		});

		test("should display discount badges prominently", async ({ page }) => {
			const discountBadges = page.locator(
				'.bg-accent.text-white:has-text("OFF TODAY")',
			);

			if ((await discountBadges.count()) > 0) {
				const firstBadge = discountBadges.first();
				await expect(firstBadge).toBeVisible();

				// Should contain percentage
				await expect(firstBadge).toContainText("%");

				// Should be prominently styled
				await expect(firstBadge).toHaveClass(/font-bold/);
				await expect(firstBadge).toHaveClass(/text-xs/);
			}
		});

		test("should show original vs discounted pricing clearly", async ({
			page,
		}) => {
			// Check for strikethrough original prices
			const originalPrices = page.locator(".line-through");

			if ((await originalPrices.count()) > 0) {
				const firstOriginalPrice = originalPrices.first();
				await expect(firstOriginalPrice).toBeVisible();
				await expect(firstOriginalPrice).toHaveClass(/text-gray-400/);
			}

			// Check for current prices (should be more prominent)
			const currentPrices = page.locator(".text-3xl.font-bold");
			await expect(currentPrices.first()).toBeVisible();

			// Check for savings amount
			const savingsAmounts = page.locator('.text-accent:has-text("Save")');
			if ((await savingsAmounts.count()) > 0) {
				await expect(savingsAmounts.first()).toBeVisible();
				await expect(savingsAmounts.first()).toHaveClass(/font-medium/);
			}
		});

		test("should display featured deal banners for high-match hotels", async ({
			page,
		}) => {
			const featuredBanners = page.locator(
				'[class*="bg-gradient-to-r"]:has-text("FEATURED DEAL")',
			);

			if ((await featuredBanners.count()) > 0) {
				const firstBanner = featuredBanners.first();
				await expect(firstBanner).toBeVisible();

				// Should have compelling copy
				await expect(firstBanner).toContainText("Perfect Match for You");
				await expect(firstBanner).toHaveClass(/font-bold/);

				// Should be at the top of the card
				const parentCard = firstBanner.locator("..");
				await expect(parentCard).toHaveClass(/border-2.*border-primary/);
			}
		});

		test("should show total price hints to increase transparency", async ({
			page,
		}) => {
			const totalPriceHints = page.locator("text=total (3 nights)");

			if ((await totalPriceHints.count()) > 0) {
				await expect(totalPriceHints.first()).toBeVisible();
				await expect(totalPriceHints.first()).toHaveClass(
					/text-xs.*text-gray-400/,
				);
			}
		});
	});

	test.describe("Urgency Indicators and Social Proof", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			await page.fill('input[placeholder*="City, hotel, landmark"]', "London");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 10000,
			});
		});

		test("should display viewing count indicators with proper urgency", async ({
			page,
		}) => {
			const viewingIndicators = page.locator(
				'[class*="text-orange-600"]:has-text("people viewing")',
			);

			if ((await viewingIndicators.count()) > 0) {
				const firstIndicator = viewingIndicators.first();
				await expect(firstIndicator).toBeVisible();

				// Should have urgency styling
				await expect(firstIndicator).toHaveClass(/animate-pulse/);
				await expect(firstIndicator).toHaveClass(/bg-orange-50/);
				await expect(firstIndicator).toHaveClass(/border-orange-200/);

				// Should include eye icon
				const parentElement = firstIndicator.locator("..");
				const eyeIcon = parentElement.locator("svg");
				await expect(eyeIcon).toBeVisible();

				// Should show realistic numbers
				const text = await firstIndicator.textContent();
				expect(text).toMatch(/\d+ people viewing/);
			}
		});

		test("should show recently booked indicators for social proof", async ({
			page,
		}) => {
			const recentlyBookedIndicators = page.locator(
				'[class*="text-green-600"]:has-text("Booked"), [class*="text-green-600"]:has-text("hours ago")',
			);

			if ((await recentlyBookedIndicators.count()) > 0) {
				const firstIndicator = recentlyBookedIndicators.first();
				await expect(firstIndicator).toBeVisible();

				// Should have positive/trustworthy styling
				await expect(firstIndicator).toHaveClass(/bg-green-50/);
				await expect(firstIndicator).toHaveClass(/border-green-200/);

				// Should include clock icon
				const parentElement = firstIndicator.locator("..");
				const clockIcon = parentElement.locator("svg");
				await expect(clockIcon).toBeVisible();

				// Should show recent timeframe
				const text = await firstIndicator.textContent();
				expect(text).toMatch(/(hours ago|Booked)/);
			}
		});

		test("should display limited availability warnings", async ({ page }) => {
			const limitedIndicators = page.locator(
				'[class*="text-red-600"]:has-text("rooms left")',
			);

			if ((await limitedIndicators.count()) > 0) {
				const firstIndicator = limitedIndicators.first();
				await expect(firstIndicator).toBeVisible();

				// Should have scarcity styling
				await expect(firstIndicator).toHaveClass(/bg-red-50/);
				await expect(firstIndicator).toHaveClass(/border-red-200/);

				// Should show low numbers to create urgency
				const text = await firstIndicator.textContent();
				expect(text).toMatch(/Only \d+ rooms left/);

				// Number should typically be low (1-5)
				const numberMatch = text?.match(/Only (\d+) rooms left/);
				if (numberMatch) {
					const roomCount = parseInt(numberMatch[1]);
					expect(roomCount).toBeLessThanOrEqual(5);
				}
			}
		});

		test("should show passion match scores for personalization", async ({
			page,
		}) => {
			const passionBadges = page.locator(
				'[class*="text-primary"]:has-text("% Match")',
			);

			if ((await passionBadges.count()) > 0) {
				const firstBadge = passionBadges.first();
				await expect(firstBadge).toBeVisible();

				// Should have personalization styling
				await expect(firstBadge).toHaveClass(/bg-primary-50/);

				// Should show high match percentages
				const text = await firstBadge.textContent();
				expect(text).toMatch(/\d+% Match/);

				const percentMatch = text?.match(/(\d+)% Match/);
				if (percentMatch) {
					const matchPercent = parseInt(percentMatch[1]);
					expect(matchPercent).toBeGreaterThanOrEqual(70); // Only show high matches
				}
			}
		});
	});

	test.describe("Trust Badges and Verification Elements", () => {
		test("should display hero section trust badges prominently", async ({
			page,
		}) => {
			await page.goto("/");

			// Check for Secure Booking badge
			const secureBooking = page.locator("text=Secure Booking");
			await expect(secureBooking).toBeVisible();

			// Should be accompanied by shield icon
			await expect(
				page.locator("svg").filter({ hasText: "Shield" }).first(),
			).toBeVisible();

			// Check for Best Price Guarantee
			const priceGuarantee = page.locator("text=Best Price Guarantee");
			await expect(priceGuarantee).toBeVisible();

			// Check for Instant Confirmation
			const instantConfirm = page.locator("text=Instant Confirmation");
			await expect(instantConfirm).toBeVisible();

			// All should be in white text for contrast on video background
			const trustBadgeContainer = page.locator(".text-white\\/80");
			await expect(trustBadgeContainer).toBeVisible();
		});

		test("should show sustainability and eco-friendly badges", async ({
			page,
		}) => {
			await page.goto("/");
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				"Amsterdam",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 10000,
			});

			const ecoBadges = page.locator(
				'.bg-green-100.text-green-800:has-text("Eco-Friendly")',
			);

			if ((await ecoBadges.count()) > 0) {
				const firstBadge = ecoBadges.first();
				await expect(firstBadge).toBeVisible();

				// Should have green styling for environmental association
				await expect(firstBadge).toHaveClass(/text-green-800/);
				await expect(firstBadge).toHaveClass(/bg-green-100/);
			}
		});

		test("should display verified booking badges in testimonials", async ({
			page,
		}) => {
			await page.goto("/");

			// Scroll to testimonials
			await page.evaluate(() => {
				const testimonialsSection =
					document.querySelector('section:has(h2:contains("Real Stories"))') ||
					document.querySelector('[class*="py-20"]:has(h2)');
				if (testimonialsSection) {
					testimonialsSection.scrollIntoView({ behavior: "smooth" });
				}
			});

			const verifiedBadges = page.locator(
				'.bg-green-100.text-green-800:has-text("Verified")',
			);

			if ((await verifiedBadges.count()) > 0) {
				const firstBadge = verifiedBadges.first();
				await expect(firstBadge).toBeVisible();

				// Should include checkmark icon
				const checkIcon = firstBadge.locator('svg[fill="currentColor"]');
				await expect(checkIcon).toBeVisible();

				// Should be small and unobtrusive but trustworthy
				await expect(firstBadge).toHaveClass(/text-xs.*font-medium/);
			}
		});

		test("should show trust statistics with impressive numbers", async ({
			page,
		}) => {
			await page.goto("/");

			// Hero section stats
			const rating = page.locator("text=4.9");
			await expect(rating).toBeVisible();
			await expect(rating).toHaveClass(/text-4xl.*font-bold/);

			const travelers = page.locator("text=2M+");
			await expect(travelers).toBeVisible();

			const hotels = page.locator("text=50K+");
			await expect(hotels).toBeVisible();

			// Additional context for credibility
			const reviewCount = page.locator("text=From 50,000+ reviews");
			await expect(reviewCount).toBeVisible();

			const savings = page.locator("text=Saved $15M+ total");
			await expect(savings).toBeVisible();
		});
	});

	test.describe("Pricing Psychology and Value Communication", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			await page.fill('input[placeholder*="City, hotel, landmark"]', "Tokyo");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 10000,
			});
		});

		test("should emphasize savings with 5% discount message", async ({
			page,
		}) => {
			await page.goto("/");

			// Check hero section savings message
			const savingsMessage = page.locator("text=Save 5% on Every Booking");
			await expect(savingsMessage).toBeVisible();
			await expect(savingsMessage).toHaveClass(/text-primary/);

			// Should be prominently positioned in headline
			const headline = page.locator("h1");
			const savingsInHeadline = headline.locator('span:has-text("Save 5%")');
			await expect(savingsInHeadline).toBeVisible();
		});

		test("should display anchored pricing with original vs current", async ({
			page,
		}) => {
			// Look for price anchoring (showing higher original price)
			const originalPrices = page.locator(".line-through");
			const currentPrices = page.locator(".text-3xl.font-bold");

			await expect(currentPrices.first()).toBeVisible();

			if ((await originalPrices.count()) > 0) {
				const firstOriginal = originalPrices.first();
				const firstCurrent = currentPrices.first();

				await expect(firstOriginal).toBeVisible();

				// Original should be visually de-emphasized
				await expect(firstOriginal).toHaveClass(/text-gray-400/);

				// Current should be prominent
				await expect(firstCurrent).toHaveClass(
					/text-gray-900.*dark:text-white/,
				);
			}
		});

		test("should show per-night pricing with total hints", async ({ page }) => {
			const perNightPrices = page.locator("text=per night");
			await expect(perNightPrices.first()).toBeVisible();
			await expect(perNightPrices.first()).toHaveClass(
				/text-sm.*text-gray-500/,
			);

			// Should show total for 3 nights to help with decision making
			const totalHints = page.locator("text=total (3 nights)");
			if ((await totalHints.count()) > 0) {
				await expect(totalHints.first()).toBeVisible();
			}
		});

		test("should highlight savings amounts in accent color", async ({
			page,
		}) => {
			const savingsAmounts = page.locator('.text-accent:has-text("Save")');

			if ((await savingsAmounts.count()) > 0) {
				const firstSaving = savingsAmounts.first();
				await expect(firstSaving).toBeVisible();

				// Should be in accent color for visibility
				await expect(firstSaving).toHaveClass(/text-accent/);
				await expect(firstSaving).toHaveClass(/font-medium/);

				// Should show actual dollar amounts
				const text = await firstSaving.textContent();
				expect(text).toMatch(/Save.*\$/);
			}
		});
	});

	test.describe("Interactive Hover and Micro-interactions", () => {
		test("should enhance hotel cards on hover (desktop)", async ({
			page,
			isMobile,
		}) => {
			if (!isMobile) {
				await page.goto("/");
				await page.fill(
					'input[placeholder*="City, hotel, landmark"]',
					"Barcelona",
				);
				await page.click('button:has-text("Search Hotels")');
				await page.waitForSelector(
					'.space-y-6, [data-testid="search-results"]',
					{ timeout: 10000 },
				);

				const hotelCards = page.locator(".group.hover\\:shadow-2xl");

				if ((await hotelCards.count()) > 0) {
					const firstCard = hotelCards.first();

					// Test hover effects
					await firstCard.hover();

					// Should have enhanced shadow
					await expect(firstCard).toHaveClass(/hover:shadow-2xl/);

					// Should scale slightly
					await expect(firstCard).toHaveClass(/hover:scale-\[1\.02\]/);

					// Image should zoom
					const hotelImage = firstCard.locator("img");
					if ((await hotelImage.count()) > 0) {
						await expect(hotelImage).toHaveClass(/group-hover:scale-110/);
					}

					// Action buttons should appear
					const actionButtons = firstCard.locator(
						".opacity-0.group-hover\\:opacity-100",
					);
					if ((await actionButtons.count()) > 0) {
						await expect(actionButtons.first()).toBeVisible();
					}
				}
			}
		});

		test("should show smooth transitions on button hovers", async ({
			page,
			isMobile,
		}) => {
			if (!isMobile) {
				await page.goto("/");
				await page.fill(
					'input[placeholder*="City, hotel, landmark"]',
					"Berlin",
				);
				await page.click('button:has-text("Search Hotels")');
				await page.waitForSelector(
					'.space-y-6, [data-testid="search-results"]',
					{ timeout: 10000 },
				);

				const bookNowButtons = page.locator('button:has-text("Book Now")');

				if ((await bookNowButtons.count()) > 0) {
					const firstButton = bookNowButtons.first();

					// Should have transform and shadow on hover
					await expect(firstButton).toHaveClass(/hover:shadow-xl/);
					await expect(firstButton).toHaveClass(/transform.*hover:scale-105/);

					// Test actual hover
					await firstButton.hover();

					// Should maintain visibility and accessibility
					await expect(firstButton).toBeVisible();
				}
			}
		});
	});

	test.describe("Mobile Touch Optimization", () => {
		test("should optimize touch targets for mobile conversion", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto("/");

			// Hero section search button
			const heroSearchButton = page.locator('button:has-text("Search Hotels")');
			await expect(heroSearchButton).toHaveClass(/h-14.*md:h-12/);

			// Navigate to results
			await page.fill('input[placeholder*="City, hotel, landmark"]', "Dubai");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 10000,
			});

			// Book Now buttons should be large and easy to tap
			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				const firstButton = bookNowButtons.first();

				// Should be full width on mobile
				await expect(firstButton).toHaveClass(/w-full.*sm:w-auto/);

				// Should have adequate height for touch
				await expect(firstButton).toHaveClass(/h-12.*sm:h-auto/);

				// Text should be larger on mobile
				await expect(firstButton).toHaveClass(/text-lg.*sm:text-sm/);

				// Should be easy to tap
				const buttonBox = await firstButton.boundingBox();
				expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // iOS minimum touch target
			}
		});

		test("should space interactive elements appropriately on mobile", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto("/");
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				"Singapore",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 10000,
			});

			const actionSections = page.locator(
				".flex.flex-col.sm\\:flex-row.sm\\:items-center.sm\\:justify-between.gap-3",
			);

			if ((await actionSections.count()) > 0) {
				// Should have adequate spacing between buttons
				await expect(actionSections.first()).toHaveClass(/gap-3/);
			}
		});
	});

	test.describe("A/B Test Ready Elements", () => {
		test("should have identifiable elements for conversion testing", async ({
			page,
		}) => {
			await page.goto("/");

			// Primary CTA button should be easily targetable
			const primaryCTA = page.locator('button:has-text("Search Hotels")');
			await expect(primaryCTA).toBeVisible();

			// Savings message should be easily modifiable
			const savingsMessage = page.locator("text=Save 5% on Every Booking");
			await expect(savingsMessage).toBeVisible();

			// Navigate to results for more conversion points
			await page.fill('input[placeholder*="City, hotel, landmark"]', "Rome");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 10000,
			});

			// Book Now buttons should be easily identifiable
			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				// Should have consistent styling across all instances
				for (let i = 0; i < Math.min(3, await bookNowButtons.count()); i++) {
					const button = bookNowButtons.nth(i);
					await expect(button).toHaveClass(/bg-primary/);
					await expect(button).toHaveClass(/font-bold/);
				}
			}
		});
	});
});
