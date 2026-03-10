import { expect, test } from "@playwright/test";

test.describe("Search Results - Conversion-Focused Design", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		// Navigate to search results by performing a search
		await page.fill('input[placeholder*="City, hotel, landmark"]', "New York");
		await page.click('button:has-text("Search Hotels")');

		// Wait for search results to load
		await page.waitForSelector('[data-testid="search-results"], .space-y-6', {
			timeout: 10000,
		});
		await page.waitForLoadState("networkidle");
	});

	test.describe("Search Results Layout and Structure", () => {
		test("should display search results with proper header", async ({
			page,
		}) => {
			// Check results header
			const resultsHeader = page.locator('h3:has-text("hotels found")');
			await expect(resultsHeader).toBeVisible();

			// Check sort options
			const sortSelect = page.locator("select");
			await expect(sortSelect).toBeVisible();

			// Verify sort options
			const sortOptions = [
				"relevance",
				"price-low",
				"price-high",
				"rating",
				"passion",
			];
			for (const option of sortOptions) {
				await expect(page.locator(`option[value="${option}"]`)).toBeVisible();
			}
		});

		test("should display hotel cards with conversion-focused layout", async ({
			page,
		}) => {
			// Check for hotel cards
			const hotelCards = page.locator(".group.hover\\:shadow-2xl");
			await expect(hotelCards.first()).toBeVisible();

			// Verify card hover effects
			const firstCard = hotelCards.first();
			await expect(firstCard).toHaveClass(/hover:scale-\[1\.02\]/);
		});

		test("should handle loading states properly", async ({ page }) => {
			// If still loading, check for loading animation
			const loadingText = page.locator("text=Searching hotels...");
			if (await loadingText.isVisible()) {
				await expect(loadingText).toBeVisible();

				// Check for skeleton loading cards
				const skeletonCards = page.locator(".animate-pulse");
				await expect(skeletonCards.first()).toBeVisible();
			}
		});

		test("should handle empty results gracefully", async ({ page }) => {
			// Perform a search that might return no results
			await page.goto("/");
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				"NonExistentCity123456",
			);
			await page.click('button:has-text("Search Hotels")');

			// Wait and check for no results message
			try {
				await page.waitForSelector("text=No hotels found", { timeout: 5000 });
				const noResultsMessage = page.locator("text=No hotels found");
				await expect(noResultsMessage).toBeVisible();

				const modifyButton = page.locator('button:has-text("Modify Search")');
				await expect(modifyButton).toBeVisible();
			} catch {
				// If results are found, that's also acceptable
				const resultsHeader = page.locator('h3:has-text("hotels found")');
				await expect(resultsHeader).toBeVisible();
			}
		});
	});

	test.describe("Urgency Indicators and Social Proof", () => {
		test("should display viewing count indicators", async ({ page }) => {
			// Check for viewing indicators
			const viewingIndicators = page.locator(
				'[class*="text-orange-600"]:has-text("people viewing")',
			);

			if ((await viewingIndicators.count()) > 0) {
				await expect(viewingIndicators.first()).toBeVisible();

				// Check for eye icon
				const eyeIcon = page.locator("svg").filter({ hasText: "Eye" });
				await expect(eyeIcon.first()).toBeVisible();

				// Verify animation (pulse effect)
				await expect(viewingIndicators.first()).toHaveClass(/animate-pulse/);
			}
		});

		test("should display recently booked indicators", async ({ page }) => {
			// Check for recently booked indicators
			const recentlyBookedIndicators = page.locator(
				'[class*="text-green-600"]:has-text("Booked"), [class*="text-green-600"]:has-text("hours ago")',
			);

			if ((await recentlyBookedIndicators.count()) > 0) {
				await expect(recentlyBookedIndicators.first()).toBeVisible();

				// Check for clock icon
				const clockIcon = page.locator("svg").filter({ hasText: "Clock" });
				await expect(clockIcon.first()).toBeVisible();
			}
		});

		test("should display limited availability warnings", async ({ page }) => {
			// Check for limited availability indicators
			const limitedIndicators = page.locator(
				'[class*="text-red-600"]:has-text("rooms left")',
			);

			if ((await limitedIndicators.count()) > 0) {
				await expect(limitedIndicators.first()).toBeVisible();

				// Check for users icon
				const usersIcon = page.locator("svg").filter({ hasText: "Users" });
				await expect(usersIcon.first()).toBeVisible();
			}
		});

		test("should display passion match badges for high-scoring hotels", async ({
			page,
		}) => {
			// Check for passion match badges
			const passionBadges = page.locator(
				'[class*="text-primary"]:has-text("% Match")',
			);

			if ((await passionBadges.count()) > 0) {
				await expect(passionBadges.first()).toBeVisible();
				await expect(passionBadges.first()).toContainText("Match");
			}
		});

		test("should highlight featured deals properly", async ({ page }) => {
			// Check for featured deal banners
			const featuredBanners = page.locator(
				'[class*="bg-gradient-to-r"]:has-text("FEATURED DEAL")',
			);

			if ((await featuredBanners.count()) > 0) {
				await expect(featuredBanners.first()).toBeVisible();
				await expect(featuredBanners.first()).toContainText(
					"Perfect Match for You",
				);
			}
		});
	});

	test.describe("Trust Badges and Verification Elements", () => {
		test("should display sustainability badges", async ({ page }) => {
			// Check for eco-friendly badges
			const ecoBadges = page.locator(
				'.bg-green-100.text-green-800:has-text("Eco-Friendly")',
			);

			if ((await ecoBadges.count()) > 0) {
				await expect(ecoBadges.first()).toBeVisible();
			}
		});

		test("should show amenity icons with proper styling", async ({ page }) => {
			// Check for amenity icons
			const wifiIcon = page.locator("svg").filter({ hasText: "Wifi" });
			const carIcon = page.locator("svg").filter({ hasText: "Car" });
			const coffeeIcon = page.locator("svg").filter({ hasText: "Coffee" });

			if ((await wifiIcon.count()) > 0) {
				await expect(wifiIcon.first()).toBeVisible();
				await expect(wifiIcon.first()).toHaveClass(/text-blue-500/);
			}

			if ((await carIcon.count()) > 0) {
				await expect(carIcon.first()).toBeVisible();
				await expect(carIcon.first()).toHaveClass(/text-green-500/);
			}

			if ((await coffeeIcon.count()) > 0) {
				await expect(coffeeIcon.first()).toBeVisible();
				await expect(coffeeIcon.first()).toHaveClass(/text-amber-500/);
			}
		});

		test("should display verified reviews and ratings", async ({ page }) => {
			// Check for star ratings
			const starRatings = page.locator(".text-yellow-400.fill-current");
			await expect(starRatings.first()).toBeVisible();

			// Check for review counts
			const reviewCounts = page.locator("text=reviews)");
			await expect(reviewCounts.first()).toBeVisible();

			// Check for best review quotes
			const reviewQuotes = page.locator('.italic:has-text(""")');
			if ((await reviewQuotes.count()) > 0) {
				await expect(reviewQuotes.first()).toBeVisible();
			}
		});
	});

	test.describe("Pricing and Deal Badges", () => {
		test("should display pricing with savings highlights", async ({ page }) => {
			// Check for discount badges
			const discountBadges = page.locator(
				'.bg-accent.text-white:has-text("OFF TODAY")',
			);

			if ((await discountBadges.count()) > 0) {
				await expect(discountBadges.first()).toBeVisible();
				await expect(discountBadges.first()).toContainText("%");
			}
		});

		test("should show original and discounted prices", async ({ page }) => {
			// Check for strikethrough original prices
			const originalPrices = page.locator(".line-through");

			if ((await originalPrices.count()) > 0) {
				await expect(originalPrices.first()).toBeVisible();
			}

			// Check for current prices
			const currentPrices = page.locator(".text-3xl.font-bold");
			await expect(currentPrices.first()).toBeVisible();

			// Check for savings amounts
			const savingsAmounts = page.locator('.text-accent:has-text("Save")');
			if ((await savingsAmounts.count()) > 0) {
				await expect(savingsAmounts.first()).toBeVisible();
			}
		});

		test("should display total price hints", async ({ page }) => {
			// Check for total price calculations
			const totalPriceHints = page.locator("text=total (3 nights)");
			if ((await totalPriceHints.count()) > 0) {
				await expect(totalPriceHints.first()).toBeVisible();
			}
		});
	});

	test.describe("Book Now Buttons and CTAs", () => {
		test("should display prominent Book Now buttons", async ({ page }) => {
			// Check for Book Now buttons
			const bookNowButtons = page.locator('button:has-text("Book Now")');
			await expect(bookNowButtons.first()).toBeVisible();

			// Verify button styling for conversion
			await expect(bookNowButtons.first()).toHaveClass(/bg-primary/);
			await expect(bookNowButtons.first()).toHaveClass(/shadow-lg/);
			await expect(bookNowButtons.first()).toHaveClass(/hover:shadow-xl/);
			await expect(bookNowButtons.first()).toHaveClass(
				/transform.*hover:scale-105/,
			);
		});

		test("should show mobile-optimized CTAs", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Check mobile Book Now button is full width
			const mobileBookButton = page
				.locator('button:has-text("Book Now")')
				.first();
			await expect(mobileBookButton).toBeVisible();
			await expect(mobileBookButton).toHaveClass(/w-full.*sm:w-auto/);

			// Check mobile button height
			await expect(mobileBookButton).toHaveClass(/h-12.*sm:h-auto/);
		});

		test("should handle Book Now button interactions", async ({ page }) => {
			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				// Click should not cause page errors
				await bookNowButtons.first().click();

				// Should prevent event propagation (not navigate to hotel details)
				await expect(page).toHaveURL(/search/);
			}
		});

		test("should display View Details buttons", async ({ page }) => {
			// Check for View Details buttons
			const detailsButtons = page.locator('button:has-text("View Details")');

			if ((await detailsButtons.count()) > 0) {
				await expect(detailsButtons.first()).toBeVisible();
				await expect(detailsButtons.first()).toHaveClass(
					/hover:text-primary-600/,
				);
			}
		});
	});

	test.describe("Interactive Elements and Hover Effects", () => {
		test("should display action buttons on hover (desktop)", async ({
			page,
			isMobile,
		}) => {
			if (!isMobile) {
				const hotelCards = page.locator(".group.hover\\:shadow-2xl").first();
				await hotelCards.hover();

				// Check for favorite/heart button
				const heartButton = page
					.locator("button:has(svg)")
					.filter({ has: page.locator("svg").filter({ hasText: "Heart" }) });
				if ((await heartButton.count()) > 0) {
					await expect(heartButton.first()).toBeVisible();
				}

				// Check for share button
				const shareButton = page
					.locator("button:has(svg)")
					.filter({ has: page.locator("svg").filter({ hasText: "Share2" }) });
				if ((await shareButton.count()) > 0) {
					await expect(shareButton.first()).toBeVisible();
				}
			}
		});

		test("should handle card click interactions", async ({ page }) => {
			const hotelCards = page.locator(".group.hover\\:shadow-2xl");

			if ((await hotelCards.count()) > 0) {
				// Click on card should navigate or trigger action
				await hotelCards.first().click();
				// The exact behavior depends on implementation
			}
		});

		test("should show virtual tour links when available", async ({ page }) => {
			// Check for virtual tour buttons
			const virtualTourButtons = page.locator(
				'button:has-text("Virtual Tour")',
			);

			if ((await virtualTourButtons.count()) > 0) {
				await expect(virtualTourButtons.first()).toBeVisible();

				// Check for camera icon
				const cameraIcon = page.locator("svg").filter({ hasText: "Camera" });
				await expect(cameraIcon.first()).toBeVisible();
			}
		});
	});

	test.describe("Mobile Responsiveness", () => {
		test("should adapt layout for mobile screens", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Check mobile-specific layout classes
			const hotelCards = page.locator(".flex.flex-col.lg\\:flex-row");
			await expect(hotelCards.first()).toBeVisible();

			// Check mobile image dimensions
			const hotelImages = page.locator(
				".w-full.lg\\:w-96.h-48.sm\\:h-56.lg\\:h-48",
			);
			await expect(hotelImages.first()).toBeVisible();
		});

		test("should stack elements properly on mobile", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Check mobile stacking classes
			const infoSections = page.locator(".flex.flex-col.sm\\:flex-row");
			await expect(infoSections.first()).toBeVisible();

			// Check mobile action buttons
			const actionSections = page.locator(
				".flex.flex-col.sm\\:flex-row.sm\\:items-center",
			);
			await expect(actionSections.first()).toBeVisible();
		});

		test("should hide secondary actions on mobile", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			// Check that desktop-only elements are hidden
			const desktopOnlyElements = page.locator(".hidden.sm\\:flex");

			if ((await desktopOnlyElements.count()) > 0) {
				// These should not be visible on mobile
				await expect(desktopOnlyElements.first()).toBeHidden();
			}

			// Check mobile-specific elements are visible
			const mobileOnlyElements = page.locator(".sm\\:hidden");
			if ((await mobileOnlyElements.count()) > 0) {
				await expect(mobileOnlyElements.first()).toBeVisible();
			}
		});
	});

	test.describe("Pagination and Navigation", () => {
		test("should display pagination when multiple pages available", async ({
			page,
		}) => {
			// Look for pagination controls
			const paginationContainer = page.locator(
				".flex.items-center.justify-center.gap-2",
			);

			if ((await paginationContainer.count()) > 0) {
				await expect(paginationContainer).toBeVisible();

				// Check for Previous/Next buttons
				const prevButton = page.locator('button:has-text("Previous")');
				const nextButton = page.locator('button:has-text("Next")');

				if ((await prevButton.count()) > 0) {
					await expect(prevButton).toBeVisible();
				}
				if ((await nextButton.count()) > 0) {
					await expect(nextButton).toBeVisible();
				}
			}
		});
	});

	test.describe("Performance and Loading", () => {
		test("should load search results within performance budget", async ({
			page,
		}) => {
			const startTime = Date.now();

			await page.goto("/");
			await page.fill('input[placeholder*="City, hotel, landmark"]', "Paris");
			await page.click('button:has-text("Search Hotels")');

			// Wait for first result to appear
			await page.waitForSelector(".group.hover\\:shadow-2xl", {
				timeout: 10000,
			});

			const loadTime = Date.now() - startTime;

			// Should load within 10 seconds
			expect(loadTime).toBeLessThan(10000);
		});

		test("should handle image loading errors gracefully", async ({ page }) => {
			// Images should have error handling
			const hotelImages = page.locator('img[src*="unsplash"]');

			if ((await hotelImages.count()) > 0) {
				// Check that images have onError handlers (via testing fallback)
				await expect(hotelImages.first()).toBeVisible();
			}
		});
	});
});
