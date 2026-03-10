import { expect, test } from "@playwright/test";

// Define viewport configurations for comprehensive testing
const viewports = [
	{ name: "iPhone SE", width: 375, height: 667, type: "mobile" },
	{ name: "iPhone 12", width: 390, height: 844, type: "mobile" },
	{ name: "Pixel 5", width: 393, height: 851, type: "mobile" },
	{ name: "iPad Mini", width: 768, height: 1024, type: "tablet" },
	{ name: "iPad Pro", width: 1024, height: 1366, type: "tablet" },
	{ name: "Galaxy Tab", width: 1024, height: 768, type: "tablet" },
	{ name: "Desktop Small", width: 1280, height: 720, type: "desktop" },
	{ name: "Desktop Large", width: 1920, height: 1080, type: "desktop" },
	{ name: "Desktop XL", width: 2560, height: 1440, type: "desktop" },
];

test.describe("Responsive Design - Cross-Device Compatibility", () => {
	test.describe("Hero Section Responsiveness", () => {
		viewports.forEach(({ name, width, height, type }) => {
			test(`should display properly on ${name} (${width}x${height})`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height });
				await page.goto("/");
				await page.waitForLoadState("networkidle");

				// Test hero section visibility
				const heroSection = page.locator("section.relative.min-h-screen");
				await expect(heroSection).toBeVisible();

				// Test video background
				const video = page.locator("video");
				await expect(video).toBeVisible();

				// Test headline responsiveness
				const headline = page.locator("h1");
				await expect(headline).toBeVisible();

				if (type === "mobile") {
					// Mobile-specific classes
					await expect(headline).toHaveClass(/text-4xl.*sm:text-5xl/);

					// Mobile description should be visible
					const mobileDesc = page.locator(
						'.md\\:hidden:has-text("Find perfect hotels with AI")',
					);
					await expect(mobileDesc).toBeVisible();

					// Mobile booking widget layout
					const bookingWidget = page.locator(".space-y-4.md\\:space-y-0");
					await expect(bookingWidget).toBeVisible();
				} else if (type === "tablet") {
					// Tablet-specific classes
					await expect(headline).toHaveClass(/md:text-7xl/);

					// Should show desktop grid for booking widget
					const bookingGrid = page.locator(".md\\:grid.md\\:grid-cols-4");
					await expect(bookingGrid).toBeVisible();
				} else {
					// Desktop-specific classes
					await expect(headline).toHaveClass(/lg:text-8xl/);

					// Desktop description should be visible
					const desktopDesc = page.locator(".hidden.md\\:inline");
					await expect(desktopDesc).toBeVisible();
				}

				// Test trust badges visibility
				const trustBadges = page.locator("text=Secure Booking");
				await expect(trustBadges).toBeVisible();

				// Test booking widget inputs
				const destinationInput = page.locator(
					'input[placeholder*="City, hotel, landmark"]',
				);
				await expect(destinationInput).toBeVisible();

				const searchButton = page.locator('button:has-text("Search Hotels")');
				await expect(searchButton).toBeVisible();

				// Test stats section
				const statsGrid = page.locator(".grid.grid-cols-1.md\\:grid-cols-3");
				await expect(statsGrid).toBeVisible();
			});
		});
	});

	test.describe("Search Results Responsiveness", () => {
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

		viewports.forEach(({ name, width, height, type }) => {
			test(`should display search results properly on ${name} (${width}x${height})`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height });

				// Test search results header
				const resultsHeader = page.locator('h3:has-text("hotels found")');
				await expect(resultsHeader).toBeVisible();

				// Test hotel cards layout
				const hotelCards = page.locator(".group.hover\\:shadow-2xl");
				if ((await hotelCards.count()) > 0) {
					const firstCard = hotelCards.first();
					await expect(firstCard).toBeVisible();

					if (type === "mobile") {
						// Mobile layout should stack vertically
						const cardLayout = firstCard.locator(
							".flex.flex-col.lg\\:flex-row",
						);
						await expect(cardLayout).toBeVisible();

						// Image should be full width on mobile
						const hotelImage = firstCard.locator(".w-full.lg\\:w-96");
						await expect(hotelImage).toBeVisible();

						// Price should be centered on mobile
						const priceSection = firstCard.locator(
							".text-center.sm\\:text-right",
						);
						await expect(priceSection).toBeVisible();

						// Book Now button should be full width on mobile
						const bookButton = firstCard.locator('button:has-text("Book Now")');
						if ((await bookButton.count()) > 0) {
							await expect(bookButton).toHaveClass(/w-full.*sm:w-auto/);
						}
					} else {
						// Desktop/tablet should show horizontal layout
						const cardLayout = firstCard.locator(
							".flex.flex-col.lg\\:flex-row",
						);
						await expect(cardLayout).toBeVisible();
					}

					// Test urgency indicators
					const urgencyIndicators = firstCard.locator(
						'[class*="text-orange-600"], [class*="text-green-600"], [class*="text-red-600"]',
					);
					if ((await urgencyIndicators.count()) > 0) {
						await expect(urgencyIndicators.first()).toBeVisible();
					}

					// Test trust badges
					const trustBadges = firstCard.locator(
						'[class*="bg-primary-50"], [class*="bg-green-100"]',
					);
					if ((await trustBadges.count()) > 0) {
						await expect(trustBadges.first()).toBeVisible();
					}
				}

				// Test sort dropdown
				const sortSelect = page.locator("select");
				await expect(sortSelect).toBeVisible();
			});
		});
	});

	test.describe("Testimonials Section Responsiveness", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
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

		viewports.forEach(({ name, width, height, type }) => {
			test(`should display testimonials properly on ${name} (${width}x${height})`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height });

				// Test trust stats bar
				const trustStatsBar = page.locator(
					".bg-white.rounded-2xl.shadow-lg.p-6",
				);
				await expect(trustStatsBar).toBeVisible();

				// Test stats grid responsiveness
				const statsGrid = page.locator(".grid.grid-cols-1.md\\:grid-cols-4");
				await expect(statsGrid).toBeVisible();

				// Test main headline
				const headline = page.locator(
					'h2:has-text("Real Stories from Real Travelers")',
				);
				await expect(headline).toBeVisible();

				if (type === "mobile") {
					// Mobile should show carousel
					const mobileCarousel = page.locator(".lg\\:hidden");
					await expect(mobileCarousel).toBeVisible();

					// Desktop grid should be hidden
					const desktopGrid = page.locator(".hidden.lg\\:grid");
					await expect(desktopGrid).toBeHidden();

					// Test carousel navigation
					const prevButton = page
						.locator("button")
						.filter({ has: page.locator('svg path[d*="M15 19l-7-7 7-7"]') });
					const nextButton = page
						.locator("button")
						.filter({ has: page.locator('svg path[d*="M9 5l7 7-7 7"]') });
					await expect(prevButton).toBeVisible();
					await expect(nextButton).toBeVisible();

					// Test dots indicator
					const dotsContainer = page.locator(
						".flex.justify-center.mt-6.space-x-2",
					);
					await expect(dotsContainer).toBeVisible();
				} else if (type === "desktop") {
					// Desktop should show grid
					const desktopGrid = page.locator(
						".hidden.lg\\:grid.lg\\:grid-cols-3",
					);
					await expect(desktopGrid).toBeVisible();

					// Should show 3 testimonial cards
					const testimonialCards = desktopGrid.locator(
						".group .bg-white.rounded-2xl.shadow-lg",
					);
					await expect(testimonialCards).toHaveCount(3);
				}

				// Test CTA section
				const ctaSection = page.locator(
					".bg-gradient-to-r.from-primary.to-primary-600.rounded-3xl",
				);
				await expect(ctaSection).toBeVisible();

				if (type === "mobile") {
					// Buttons should stack on mobile
					const buttonContainer = page.locator(
						".flex.flex-col.sm\\:flex-row.gap-4",
					);
					await expect(buttonContainer).toBeVisible();
				}
			});
		});
	});

	test.describe("Navigation Responsiveness", () => {
		viewports.forEach(({ name, width, height, type }) => {
			test(`should display navigation properly on ${name} (${width}x${height})`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height });
				await page.goto("/");

				// Test header visibility
				const header = page.locator("header, nav");
				await expect(header).toBeVisible();

				if (type === "mobile") {
					// Mobile should show hamburger menu or mobile-specific navigation
					const mobileMenuButton = page.locator(
						'[data-testid="mobile-menu-button"], button[aria-label*="menu"]',
					);
					if ((await mobileMenuButton.count()) > 0) {
						await expect(mobileMenuButton).toBeVisible();
					}
				} else {
					// Desktop should show full navigation
					const desktopNav = page.locator("nav");
					await expect(desktopNav).toBeVisible();
				}

				// Test theme toggle
				const themeToggle = page.locator('[data-testid="theme-toggle"]');
				if ((await themeToggle.count()) > 0) {
					await expect(themeToggle).toBeVisible();
				}
			});
		});
	});

	test.describe("Interactive Elements Touch Targets", () => {
		const mobileViewports = viewports.filter((v) => v.type === "mobile");

		mobileViewports.forEach(({ name, width, height }) => {
			test(`should have proper touch targets on ${name}`, async ({ page }) => {
				await page.setViewportSize({ width, height });
				await page.goto("/");

				// Test booking widget button touch target
				const searchButton = page.locator('button:has-text("Search Hotels")');
				await expect(searchButton).toBeVisible();

				// Should have minimum touch target size (44px height on mobile)
				const buttonBox = await searchButton.boundingBox();
				expect(buttonBox?.height).toBeGreaterThanOrEqual(44);

				// Test navigation to search results
				await page.fill('input[placeholder*="City, hotel, landmark"]', "Paris");
				await searchButton.click();

				await page.waitForSelector(
					'.space-y-6, [data-testid="search-results"]',
					{ timeout: 10000 },
				);

				// Test Book Now buttons have proper touch targets
				const bookButtons = page.locator('button:has-text("Book Now")');
				if ((await bookButtons.count()) > 0) {
					const firstBookButton = bookButtons.first();
					const bookButtonBox = await firstBookButton.boundingBox();
					expect(bookButtonBox?.height).toBeGreaterThanOrEqual(44);
				}
			});
		});
	});

	test.describe("Content Readability and Typography", () => {
		viewports.forEach(({ name, width, height }) => {
			test(`should maintain readability on ${name} (${width}x${height})`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height });
				await page.goto("/");

				// Test headline readability
				const headline = page.locator("h1");
				await expect(headline).toBeVisible();

				// Headlines should not be too large or small
				const headlineStyles = await headline.evaluate((el) => {
					const styles = window.getComputedStyle(el);
					return {
						fontSize: parseFloat(styles.fontSize),
						lineHeight: parseFloat(styles.lineHeight),
					};
				});

				// Minimum readable font size
				expect(headlineStyles.fontSize).toBeGreaterThan(20);

				// Test body text readability
				const bodyText = page.locator("p").first();
				if ((await bodyText.count()) > 0) {
					const bodyStyles = await bodyText.evaluate((el) => {
						const styles = window.getComputedStyle(el);
						return {
							fontSize: parseFloat(styles.fontSize),
						};
					});

					// Body text should be at least 14px
					expect(bodyStyles.fontSize).toBeGreaterThanOrEqual(14);
				}

				// Test that text doesn't overflow containers
				const textElements = page.locator("h1, h2, h3, p, span").first();
				if ((await textElements.count()) > 0) {
					const elementBox = await textElements.boundingBox();
					const viewportWidth = width;

					if (elementBox) {
						// Text should not extend beyond viewport
						expect(elementBox.x + elementBox.width).toBeLessThanOrEqual(
							viewportWidth + 10,
						); // 10px tolerance
					}
				}
			});
		});
	});

	test.describe("Image and Media Responsiveness", () => {
		viewports.forEach(({ name, width, height, type }) => {
			test(`should display media properly on ${name} (${width}x${height})`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height });
				await page.goto("/");

				// Test video background
				const video = page.locator("video");
				await expect(video).toBeVisible();

				const videoBox = await video.boundingBox();
				if (videoBox) {
					// Video should cover the viewport
					expect(videoBox.width).toBeGreaterThan(width * 0.9); // Allow some margin
				}

				// Navigate to search results to test hotel images
				await page.fill(
					'input[placeholder*="City, hotel, landmark"]',
					"London",
				);
				await page.click('button:has-text("Search Hotels")');

				await page.waitForSelector(
					'.space-y-6, [data-testid="search-results"]',
					{ timeout: 10000 },
				);

				// Test hotel images
				const hotelImages = page.locator(
					'img[src*="unsplash"], img[alt*="hotel"]',
				);
				if ((await hotelImages.count()) > 0) {
					const firstImage = hotelImages.first();
					await expect(firstImage).toBeVisible();

					const imageBox = await firstImage.boundingBox();
					if (imageBox && type === "mobile") {
						// Images should not be wider than container on mobile
						expect(imageBox.width).toBeLessThanOrEqual(width);
					}
				}
			});
		});
	});

	test.describe("Performance Across Devices", () => {
		const performanceViewports = [
			{ name: "iPhone SE", width: 375, height: 667 },
			{ name: "iPad", width: 768, height: 1024 },
			{ name: "Desktop", width: 1920, height: 1080 },
		];

		performanceViewports.forEach(({ name, width, height }) => {
			test(`should maintain good performance on ${name}`, async ({ page }) => {
				await page.setViewportSize({ width, height });

				const startTime = Date.now();

				await page.goto("/");
				await page.waitForSelector("h1");

				const loadTime = Date.now() - startTime;

				// Should load within reasonable time (adjust based on your requirements)
				const timeoutLimit = name.includes("iPhone") ? 5000 : 3000; // Mobile may be slower
				expect(loadTime).toBeLessThan(timeoutLimit);

				// Test search performance
				const searchStartTime = Date.now();

				await page.fill('input[placeholder*="City, hotel, landmark"]', "Tokyo");
				await page.click('button:has-text("Search Hotels")');

				await page.waitForSelector(
					'.space-y-6, [data-testid="search-results"]',
					{ timeout: 10000 },
				);

				const searchTime = Date.now() - searchStartTime;

				// Search should complete within reasonable time
				expect(searchTime).toBeLessThan(10000);
			});
		});
	});

	test.describe("Accessibility Across Devices", () => {
		viewports.forEach(({ name, width, height, type }) => {
			test(`should maintain accessibility on ${name} (${width}x${height})`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height });
				await page.goto("/");

				// Test heading structure
				const h1 = page.locator("h1");
				await expect(h1).toBeVisible();

				// Test form labels
				const destinationLabel = page.locator('label:has-text("Where to?")');
				await expect(destinationLabel).toBeVisible();

				// Test button accessibility
				const searchButton = page.locator('button:has-text("Search Hotels")');
				await expect(searchButton).toBeVisible();
				await expect(searchButton).not.toHaveAttribute("disabled");

				// Test focus management (keyboard navigation)
				if (type !== "mobile") {
					// Skip for mobile as touch is primary interaction
					await page.keyboard.press("Tab");

					// Should focus on first interactive element
					const focusedElement = page.locator(":focus");
					await expect(focusedElement).toBeVisible();
				}

				// Test color contrast (basic check)
				const bodyText = page.locator("p, span").first();
				if ((await bodyText.count()) > 0) {
					const textColor = await bodyText.evaluate((el) => {
						return window.getComputedStyle(el).color;
					});

					// Should not be pure white on white or similar low contrast
					expect(textColor).not.toBe("rgb(255, 255, 255)");
				}
			});
		});
	});

	test.describe("Layout Stability", () => {
		viewports.forEach(({ name, width, height }) => {
			test(`should maintain layout stability on ${name} (${width}x${height})`, async ({
				page,
			}) => {
				await page.setViewportSize({ width, height });
				await page.goto("/");

				// Get initial positions of key elements
				const headline = page.locator("h1");
				const bookingWidget = page.locator(
					".bg-white\\/95.backdrop-blur-lg.rounded-2xl",
				);
				const searchButton = page.locator('button:has-text("Search Hotels")');

				const initialHeadlinePos = await headline.boundingBox();
				const initialWidgetPos = await bookingWidget.boundingBox();
				const initialButtonPos = await searchButton.boundingBox();

				// Wait for any potential layout shifts
				await page.waitForTimeout(2000);

				// Check positions haven't shifted dramatically
				const finalHeadlinePos = await headline.boundingBox();
				const finalWidgetPos = await bookingWidget.boundingBox();
				const finalButtonPos = await searchButton.boundingBox();

				if (initialHeadlinePos && finalHeadlinePos) {
					// Allow small variations (5px) for potential animations
					expect(
						Math.abs(initialHeadlinePos.y - finalHeadlinePos.y),
					).toBeLessThan(5);
				}

				if (initialWidgetPos && finalWidgetPos) {
					expect(Math.abs(initialWidgetPos.y - finalWidgetPos.y)).toBeLessThan(
						5,
					);
				}

				if (initialButtonPos && finalButtonPos) {
					expect(Math.abs(initialButtonPos.y - finalButtonPos.y)).toBeLessThan(
						5,
					);
				}
			});
		});
	});
});
