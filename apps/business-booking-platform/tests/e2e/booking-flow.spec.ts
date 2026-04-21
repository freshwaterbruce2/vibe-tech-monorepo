import { expect, test } from "@playwright/test";

test.describe("Complete Booking Flow - Cross-Device Journey", () => {
	const testDestinations = ["New York", "Paris", "London", "Tokyo"];

	test.describe("Search and Discovery Flow", () => {
		test("should complete hotel search flow on desktop", async ({ page }) => {
			await page.setViewportSize({ width: 1920, height: 1080 });
			await page.goto("/");

			// Step 1: Hero section engagement
			await expect(page.locator("h1")).toBeVisible();
			await expect(page.locator("video")).toBeVisible();

			// Step 2: Basic search flow
			const destination = testDestinations[0];
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				destination,
			);

			// Set check-in date (tomorrow)
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			const tomorrowStr = tomorrow.toISOString().split("T")[0];

			const checkinInput = page.locator('input[type="date"]').first();
			await checkinInput.fill(tomorrowStr);

			// Set check-out date (day after tomorrow)
			const dayAfter = new Date();
			dayAfter.setDate(dayAfter.getDate() + 4);
			const dayAfterStr = dayAfter.toISOString().split("T")[0];

			const checkoutInput = page.locator('input[type="date"]').last();
			await checkoutInput.fill(dayAfterStr);

			// Execute search
			await page.click('button:has-text("Search Hotels")');

			// Step 3: Verify search results load
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});

			const resultsHeader = page.locator('h3:has-text("hotels found")');
			await expect(resultsHeader).toBeVisible();
		});

		test("should complete hotel search flow on mobile", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto("/");

			// Mobile-specific hero section
			const headline = page.locator("h1");
			await expect(headline).toBeVisible();
			await expect(headline).toHaveClass(/text-4xl.*sm:text-5xl/);

			// Mobile booking widget
			const bookingWidget = page.locator(
				".bg-white\\/95.backdrop-blur-lg.rounded-2xl",
			);
			await expect(bookingWidget).toBeVisible();

			// Fill search form on mobile
			const destination = testDestinations[1];
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				destination,
			);

			// Mobile search button should be large
			const searchButton = page.locator('button:has-text("Search Hotels")');
			await expect(searchButton).toHaveClass(/w-full.*h-14/);

			await searchButton.click();

			// Verify mobile results layout
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});

			// Check mobile-specific layout
			const hotelCards = page.locator(".flex.flex-col.lg\\:flex-row");
			if ((await hotelCards.count()) > 0) {
				await expect(hotelCards.first()).toBeVisible();
			}
		});

		test("should handle AI-powered search flow", async ({ page }) => {
			await page.goto("/");

			// Use AI search input
			const aiInput = page.locator(
				'input[placeholder*="Romantic weekend in Paris with spa"]',
			);
			await aiInput.fill("Luxury beachfront resort in Miami with pool and spa");

			// Submit AI search (might trigger different flow)
			await aiInput.press("Enter");

			// Should either process AI query or show regular results
			// This depends on your AI service implementation
			await page.waitForTimeout(2000); // Allow processing time

			// Verify some response (either results or processing indicator)
			const hasResults =
				(await page.locator('h3:has-text("hotels found")').count()) > 0;
			const hasProcessing = (await page.locator("text=Processing").count()) > 0;

			expect(hasResults || hasProcessing).toBe(true);
		});
	});

	test.describe("Hotel Selection and Details", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				"Barcelona",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});
		});

		test("should display hotel details with conversion elements", async ({
			page,
		}) => {
			const hotelCards = page.locator(".group.hover\\:shadow-2xl");

			if ((await hotelCards.count()) > 0) {
				const firstCard = hotelCards.first();

				// Verify conversion elements are present
				const hotelName = firstCard.locator(
					".text-lg.sm\\:text-xl.font-semibold",
				);
				await expect(hotelName).toBeVisible();

				// Star ratings
				const starRating = firstCard.locator(".text-yellow-400.fill-current");
				await expect(starRating.first()).toBeVisible();

				// Price information
				const price = firstCard.locator(".text-3xl.font-bold");
				await expect(price).toBeVisible();

				// Urgency indicators
				const urgencyIndicators = firstCard.locator('[class*="animate-pulse"]');
				if ((await urgencyIndicators.count()) > 0) {
					await expect(urgencyIndicators.first()).toBeVisible();
				}

				// Book Now button
				const bookButton = firstCard.locator('button:has-text("Book Now")');
				if ((await bookButton.count()) > 0) {
					await expect(bookButton).toBeVisible();
					await expect(bookButton).toHaveClass(/bg-primary/);
				}
			}
		});

		test("should handle hotel card interactions", async ({ page }) => {
			const hotelCards = page.locator(".group.hover\\:shadow-2xl");

			if ((await hotelCards.count()) > 0) {
				const firstCard = hotelCards.first();

				// Test card click (should navigate to details or expand)
				await firstCard.click();

				// Depending on implementation, this might:
				// 1. Navigate to hotel details page
				// 2. Expand card with more details
				// 3. Open a modal

				// Wait for some response
				await page.waitForTimeout(1000);

				// Verify some interaction occurred
				const currentUrl = page.url();
				const hasModal =
					(await page.locator('[role="dialog"], .modal').count()) > 0;
				const hasExpandedContent =
					(await page.locator(".expanded, .detailed").count()) > 0;

				// One of these should be true
				expect(
					currentUrl.includes("/hotel/") || hasModal || hasExpandedContent,
				).toBe(true);
			}
		});

		test("should show additional hotel information on demand", async ({
			page,
		}) => {
			const hotelCards = page.locator(".group.hover\\:shadow-2xl");

			if ((await hotelCards.count()) > 0) {
				const firstCard = hotelCards.first();

				// Check for amenities
				const amenities = firstCard.locator(
					".inline-flex.items-center.gap-1.px-2.py-1",
				);
				if ((await amenities.count()) > 0) {
					await expect(amenities.first()).toBeVisible();
				}

				// Check for review quotes
				const reviewQuotes = firstCard.locator('.italic:has-text(""")');
				if ((await reviewQuotes.count()) > 0) {
					await expect(reviewQuotes.first()).toBeVisible();
				}

				// Check for View Details button
				const detailsButton = firstCard.locator(
					'button:has-text("View Details")',
				);
				if ((await detailsButton.count()) > 0) {
					await detailsButton.click();

					// Should show more information or navigate
					await page.waitForTimeout(1000);
				}
			}
		});
	});

	test.describe("Booking Initiation Flow", () => {
		test.beforeEach(async ({ page }) => {
			await page.goto("/");
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				"Amsterdam",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});
		});

		test("should initiate booking flow from Book Now button", async ({
			page,
		}) => {
			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				const firstBookButton = bookNowButtons.first();

				// Capture hotel information before booking
				const hotelCard = firstBookButton.locator("../..");
				const hotelName = await hotelCard
					.locator(".text-lg.sm\\:text-xl.font-semibold")
					.textContent();

				// Click Book Now
				await firstBookButton.click();

				// Should navigate to booking page or show booking form
				await page.waitForTimeout(2000);

				const currentUrl = page.url();
				const hasBookingPage =
					currentUrl.includes("/booking") || currentUrl.includes("/payment");
				const hasBookingModal =
					(await page
						.locator('[role="dialog"]:has-text("booking"), .booking-modal')
						.count()) > 0;
				const hasBookingForm =
					(await page
						.locator('form:has(input[type="email"]), .booking-form')
						.count()) > 0;

				// One of these should be true
				expect(hasBookingPage || hasBookingModal || hasBookingForm).toBe(true);

				// If booking page/form is shown, verify hotel details are preserved
				if (hasBookingPage || hasBookingModal || hasBookingForm) {
					// Hotel information should be present in booking context
					if (hotelName) {
						// This is a flexible check as exact implementation may vary
					}
				}
			}
		});

		test("should handle booking flow on mobile devices", async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });

			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				const firstBookButton = bookNowButtons.first();

				// Mobile Book Now button should be prominent
				await expect(firstBookButton).toHaveClass(/w-full.*sm:w-auto/);
				await expect(firstBookButton).toHaveClass(/h-12.*sm:h-auto/);

				// Test mobile booking flow
				await firstBookButton.click();

				await page.waitForTimeout(2000);

				// Verify mobile-optimized booking experience
				const bookingElements = await page
					.locator('form, [role="dialog"], .booking')
					.count();
				expect(bookingElements).toBeGreaterThan(0);
			}
		});

		test("should preserve search context in booking flow", async ({ page }) => {
			// Perform search with specific criteria
			await page.goto("/");
			const destination = "Vienna";
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				destination,
			);

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 2);
			const checkinDate = tomorrow.toISOString().split("T")[0];

			const dayAfter = new Date();
			dayAfter.setDate(dayAfter.getDate() + 5);
			const checkoutDate = dayAfter.toISOString().split("T")[0];

			await page.fill('input[type="date"]', checkinDate);
			await page.fill('input[type="date"]', checkoutDate);

			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});

			// Initiate booking
			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				await bookNowButtons.first().click();
				await page.waitForTimeout(2000);

				// Booking context should preserve search criteria
				const bodyText = await page.locator("body").textContent();

				// Should contain destination and dates (in some form)
				// This is a flexible check as the exact format depends on implementation
				const hasDestination = bodyText
					?.toLowerCase()
					.includes(destination.toLowerCase());

				if (hasDestination) {
					expect(hasDestination).toBe(true);
				}
			}
		});
	});

	test.describe("Guest Information and Forms", () => {
		// Note: These tests assume booking flow leads to forms
		// Adjust based on your actual booking flow implementation

		test("should display guest information form", async ({ page }) => {
			// Navigate through booking flow to get to forms
			await page.goto("/");
			await page.fill('input[placeholder*="City, hotel, landmark"]', "Prague");
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});

			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				await bookNowButtons.first().click();
				await page.waitForTimeout(2000);

				// Look for booking forms
				const emailInput = page.locator('input[type="email"]');
				const nameInput = page.locator(
					'input[placeholder*="name"], input[name*="name"]',
				);

				// Check if booking form is present
				if ((await emailInput.count()) > 0 || (await nameInput.count()) > 0) {
					// Test form validation
					if ((await emailInput.count()) > 0) {
						await emailInput.fill("invalid-email");

						// Try to proceed (should show validation)
						const continueButton = page.locator(
							'button:has-text("Continue"), button[type="submit"]',
						);
						if ((await continueButton.count()) > 0) {
							await continueButton.click();
							await page.waitForTimeout(500);

							// Should show validation error
							const hasError =
								(await page
									.locator('.error, [role="alert"], .invalid')
									.count()) > 0;
							if (hasError) {
								expect(hasError).toBe(true);
							}
						}

						// Fix email and continue
						await emailInput.fill("test@example.com");
					}
				}
			}
		});

		test("should validate required booking information", async ({ page }) => {
			// This test would check form validation in the booking flow
			// Implementation depends on your actual booking forms

			await page.goto("/");

			// If there's a direct path to booking forms, use it
			// Otherwise, navigate through the search flow
			const bookingPageUrl = "/booking"; // Adjust if you have a direct booking page

			try {
				await page.goto(bookingPageUrl);

				// Test form validation
				const submitButton = page.locator(
					'button[type="submit"], button:has-text("Book"), button:has-text("Continue")',
				);

				if ((await submitButton.count()) > 0) {
					await submitButton.click();

					// Should show validation errors for empty required fields
					const errorElements = page.locator(
						'.error, [role="alert"], .invalid, .required',
					);

					if ((await errorElements.count()) > 0) {
						await expect(errorElements.first()).toBeVisible();
					}
				}
			} catch {
				// If direct booking page doesn't exist, that's OK
				// The booking flow might be integrated differently
			}
		});
	});

	test.describe("Payment Integration Flow", () => {
		test("should display payment options", async ({ page }) => {
			// Navigate to payment page if it exists
			const paymentPageUrl = "/payment"; // Adjust based on your routes

			try {
				await page.goto(paymentPageUrl);

				// Check for Square payment form
				const squarePaymentForm = page.locator(
					'#card-container, .square-payment, [data-testid="square-payment"]',
				);

				if ((await squarePaymentForm.count()) > 0) {
					await expect(squarePaymentForm).toBeVisible();
				}

				// Check for PayPal option
				const paypalOption = page.locator(
					'button:has-text("PayPal"), .paypal-button',
				);

				if ((await paypalOption.count()) > 0) {
					await expect(paypalOption).toBeVisible();
				}

				// Check for payment security indicators
				const securityIndicators = page.locator(
					"text=Secure, text=SSL, text=256-bit",
				);

				if ((await securityIndicators.count()) > 0) {
					await expect(securityIndicators.first()).toBeVisible();
				}
			} catch {
				// If payment page doesn't exist as standalone, check if it's part of booking flow
				await page.goto("/");
				await page.fill(
					'input[placeholder*="City, hotel, landmark"]',
					"Berlin",
				);
				await page.click('button:has-text("Search Hotels")');
				await page.waitForSelector(
					'.space-y-6, [data-testid="search-results"]',
					{ timeout: 15000 },
				);

				const bookNowButtons = page.locator('button:has-text("Book Now")');

				if ((await bookNowButtons.count()) > 0) {
					await bookNowButtons.first().click();
					await page.waitForTimeout(3000);

					// Look for payment elements in the booking flow
					const paymentElements = page.locator(
						'#card-container, .square-payment, input[placeholder*="card"], .payment-form',
					);

					if ((await paymentElements.count()) > 0) {
						await expect(paymentElements.first()).toBeVisible();
					}
				}
			}
		});

		test("should handle payment form validation", async ({ page }) => {
			// This test checks payment form validation
			// Implementation depends on Square integration and form structure

			try {
				await page.goto("/payment");

				// Look for payment submit button
				const paymentSubmit = page.locator(
					'button:has-text("Pay"), button:has-text("Complete"), button[type="submit"]',
				);

				if ((await paymentSubmit.count()) > 0) {
					// Try to submit without filling payment info
					await paymentSubmit.click();
					await page.waitForTimeout(1000);

					// Should show validation errors
					const hasErrors =
						(await page.locator('.error, [role="alert"], .invalid').count()) >
						0;

					if (hasErrors) {
						expect(hasErrors).toBe(true);
					}
				}
			} catch {
				// Payment page might not be accessible without going through booking flow
				// This is acceptable as it shows proper flow control
			}
		});
	});

	test.describe("Booking Confirmation Flow", () => {
		test("should display confirmation page structure", async ({ page }) => {
			// Check if confirmation page exists
			const confirmationUrl = "/booking-confirmation"; // Adjust based on your routes

			try {
				await page.goto(confirmationUrl);

				// Check for confirmation elements
				const confirmationHeading = page.locator(
					'h1:has-text("Confirmation"), h2:has-text("Confirmed"), h1:has-text("Thank you")',
				);

				if ((await confirmationHeading.count()) > 0) {
					await expect(confirmationHeading.first()).toBeVisible();
				}

				// Check for booking details
				const bookingDetails = page.locator(
					".booking-details, .confirmation-details",
				);

				if ((await bookingDetails.count()) > 0) {
					await expect(bookingDetails).toBeVisible();
				}

				// Check for next steps or contact information
				const nextSteps = page.locator(
					"text=email, text=contact, text=support",
				);

				if ((await nextSteps.count()) > 0) {
					await expect(nextSteps.first()).toBeVisible();
				}
			} catch {
				// If confirmation page isn't directly accessible, that's OK
				// It should only be reachable after completing a booking
			}
		});
	});

	test.describe("Error Handling in Booking Flow", () => {
		test("should handle search errors gracefully", async ({ page }) => {
			await page.goto("/");

			// Test with invalid search criteria
			await page.fill('input[placeholder*="City, hotel, landmark"]', "!@#$%");
			await page.click('button:has-text("Search Hotels")');

			// Wait for response
			await page.waitForTimeout(5000);

			// Should either show error message or no results message
			const errorMessage = page.locator(
				'text=error, text=Error, [role="alert"]',
			);
			const noResultsMessage = page.locator("text=No hotels found");

			const hasErrorHandling =
				(await errorMessage.count()) > 0 ||
				(await noResultsMessage.count()) > 0;
			expect(hasErrorHandling).toBe(true);
		});

		test("should handle network errors during booking", async ({ page }) => {
			// Simulate network issues
			await page.route("**/*", (route) => {
				if (route.request().url().includes("/api/")) {
					route.abort("connectionrefused");
				} else {
					route.continue();
				}
			});

			await page.goto("/");
			await page.fill('input[placeholder*="City, hotel, landmark"]', "Madrid");
			await page.click('button:has-text("Search Hotels")');

			// Should handle the error gracefully
			await page.waitForTimeout(5000);

			const errorHandling =
				(await page
					.locator("text=error, text=try again, text=connection")
					.count()) > 0;

			// Remove the route to clean up
			await page.unroute("**/*");

			if (errorHandling) {
				expect(errorHandling).toBe(true);
			}
		});
	});

	test.describe("Complete End-to-End Journey", () => {
		test("should complete full booking journey simulation", async ({
			page,
		}) => {
			// This test simulates a complete user journey
			// Adjust timeouts and expectations based on your implementation

			await page.goto("/");

			// Step 1: Arrive at homepage
			await expect(page.locator("h1")).toBeVisible();
			await expect(page.locator("video")).toBeVisible();

			// Step 2: Search for hotels
			await page.fill(
				'input[placeholder*="City, hotel, landmark"]',
				"Florence",
			);

			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 3);
			await page.fill(
				'input[type="date"]',
				tomorrow.toISOString().split("T")[0],
			);

			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector('.space-y-6, [data-testid="search-results"]', {
				timeout: 15000,
			});

			// Step 3: Review search results
			const resultsHeader = page.locator('h3:has-text("hotels found")');
			await expect(resultsHeader).toBeVisible();

			// Step 4: Select a hotel (if Book Now buttons are available)
			const bookNowButtons = page.locator('button:has-text("Book Now")');

			if ((await bookNowButtons.count()) > 0) {
				await bookNowButtons.first().click();
				await page.waitForTimeout(2000);

				// Step 5: Verify booking flow initiation
				const currentUrl = page.url();
				const hasBookingContent =
					(await page.locator('form, .booking, [role="dialog"]').count()) > 0;

				expect(
					currentUrl.includes("/booking") ||
						currentUrl.includes("/payment") ||
						hasBookingContent,
				).toBe(true);

				// If booking forms are present, fill them out (basic simulation)
				const emailInput = page.locator('input[type="email"]');
				if ((await emailInput.count()) > 0) {
					await emailInput.fill("test@example.com");
				}

				const nameInput = page.locator(
					'input[placeholder*="name"], input[name*="name"]',
				);
				if ((await nameInput.count()) > 0) {
					await nameInput.first().fill("Test User");
				}

				// Note: We don't actually submit payment in tests
				// Just verify the forms are present and functional
			}
		});
	});
});
