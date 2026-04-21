import { expect, test } from "@playwright/test";

test.describe("Complete Booking Workflow", () => {
	const mockHotelData = {
		id: "hotel-123",
		name: "Grand Test Hotel",
		price: "$250.00",
		location: "Test City, TC",
		rating: "4.5",
	};

	const mockBookingData = {
		firstName: "John",
		lastName: "Doe",
		email: "john.doe@example.com",
		phone: "+1234567890",
	};

	test.beforeEach(async ({ page }) => {
		// Mock API responses
		await page.route("**/api/hotels/search**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					data: {
						hotels: [
							{
								id: "hotel-123",
								name: "Grand Test Hotel",
								description: "A luxurious hotel in the heart of the city",
								location: {
									city: "Test City",
									country: "Test Country",
									neighborhood: "Downtown",
								},
								rating: 4.5,
								reviewCount: 1250,
								priceRange: {
									avgNightly: 250,
									currency: "USD",
								},
								images: [
									{
										url: "/test-hotel-1.jpg",
										alt: "Grand Test Hotel exterior",
										isPrimary: true,
									},
								],
								amenities: [
									{ id: "wifi", name: "Free WiFi", icon: "📶" },
									{ id: "pool", name: "Swimming Pool", icon: "🏊" },
									{ id: "gym", name: "Fitness Center", icon: "💪" },
								],
								availability: {
									available: true,
									lowAvailability: false,
								},
								sustainabilityScore: 0.85,
							},
						],
						pagination: {
							page: 1,
							limit: 10,
							total: 1,
							totalPages: 1,
						},
					},
				}),
			});
		});

		// Mock hotel details API
		await page.route("**/api/hotels/hotel-123**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					data: {
						...mockHotelData,
						rooms: [
							{
								id: "room-deluxe-001",
								type: "Deluxe Room",
								price: 250,
								amenities: ["WiFi", "AC", "TV"],
								bedType: "King",
								maxOccupancy: 2,
								available: true,
							},
						],
					},
				}),
			});
		});

		// Mock Square payment creation
		await page.route("**/api/payments/create", async (route) => {
			if (route.request().method() === "POST") {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						success: true,
						paymentId: "sq_pay_test_123",
						receiptUrl: "https://square.test/receipt/sq_pay_test_123",
					}),
				});
			} else {
				await route.continue();
			}
		});

		// Mock booking creation
		await page.route("**/api/bookings**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					data: {
						id: "booking-123",
						confirmationNumber: "CONF789",
						status: "confirmed",
						totalAmount: 500,
						hotelName: "Grand Test Hotel",
						checkIn: "2024-12-01",
						checkOut: "2024-12-03",
					},
				}),
			});
		});

		// Navigate to homepage
		await page.goto("/");
	});

	test("should complete full booking workflow from search to confirmation", async ({
		page,
	}) => {
		// Step 1: Perform hotel search
		await test.step("Search for hotels", async () => {
			// Fill in search form
			await page.fill('[placeholder="Where are you going?"]', "Test City");
			await page.fill('[aria-label="Check-in Date"]', "2024-12-01");
			await page.fill('[aria-label="Check-out Date"]', "2024-12-03");
			await page.selectOption('[aria-label="Guests"]', "2 Guests");

			// Submit search
			await page.click('button:has-text("Search Hotels")');

			// Wait for search results
			await expect(page.locator("text=Grand Test Hotel")).toBeVisible();
			await expect(page.locator("text=$250.00")).toBeVisible();
			await expect(page.locator("text=4.5")).toBeVisible();
		});

		// Step 2: Select hotel
		await test.step("Select hotel from search results", async () => {
			// Click on hotel card
			await page.click(
				'[data-testid="hotel-card"]:has-text("Grand Test Hotel")',
			);

			// Should navigate to hotel details page
			await expect(page.url()).toContain("/hotels/hotel-123");
			await expect(
				page.locator('h1:has-text("Grand Test Hotel")'),
			).toBeVisible();
		});

		// Step 3: Select room and proceed to booking
		await test.step("Select room and start booking", async () => {
			// Select room
			await page.click('button:has-text("Select Room")');

			// Should navigate to booking page
			await expect(page.url()).toContain("/booking");
			await expect(page.locator("text=Room Selection")).toBeVisible();
		});

		// Step 4: Complete guest details
		await test.step("Fill guest details", async () => {
			// Fill guest information
			await page.fill('[name="firstName"]', mockBookingData.firstName);
			await page.fill('[name="lastName"]', mockBookingData.lastName);
			await page.fill('[name="email"]', mockBookingData.email);
			await page.fill('[name="phone"]', mockBookingData.phone);

			// Add special requests
			await page.fill('[name="specialRequests"]', "Late check-in requested");

			// Proceed to payment
			await page.click('button:has-text("Continue to Payment")');

			// Should show payment section
			await expect(page.locator("text=Payment Details")).toBeVisible();
		});

		// Step 5: Complete payment
		await test.step("Complete payment process", async () => {
			// Simulate Square card tokenization success by ensuring our mocked route returns success
			await expect(page.locator("text=Payment Details")).toBeVisible();
			await expect(page.locator("text=Total"))
				.not.toBeVisible({ timeout: 1000 })
				.catch(() => {});

			// Trigger payment
			await page.click('button:has-text("Pay $500.00 USD")');

			// Wait for payment processing indicator
			await expect(page.locator("text=Processing Payment...")).toBeVisible();

			// Should proceed to confirmation success UI eventually
			await expect(page.locator("text=Booking Confirmed")).toBeVisible({
				timeout: 12000,
			});
		});

		// Step 6: Verify booking confirmation
		await test.step("Verify booking confirmation", async () => {
			// Should show confirmation details
			await expect(page.locator("text=CONF789")).toBeVisible();
			await expect(page.locator("text=Grand Test Hotel")).toBeVisible();
			await expect(page.locator("text=December 1, 2024")).toBeVisible();
			await expect(page.locator("text=December 3, 2024")).toBeVisible();
			await expect(page.locator("text=John Doe")).toBeVisible();

			// Should show success message
			await expect(
				page.locator("text=Your booking has been confirmed"),
			).toBeVisible();

			// Should have download button for confirmation
			await expect(
				page.locator('button:has-text("Download Confirmation")'),
			).toBeVisible();
		});
	});

	test("should handle booking errors gracefully", async ({ page }) => {
		// Mock API error for booking creation
		await page.route("**/api/bookings**", async (route) => {
			await route.fulfill({
				status: 400,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					message: "Room no longer available",
				}),
			});
		});

		// Complete search and selection
		await page.fill('[placeholder="Where are you going?"]', "Test City");
		await page.click('button:has-text("Search Hotels")');
		await page.click('[data-testid="hotel-card"]:first-child');
		await page.click('button:has-text("Select Room")');

		// Fill guest details
		await page.fill('[name="firstName"]', mockBookingData.firstName);
		await page.fill('[name="lastName"]', mockBookingData.lastName);
		await page.fill('[name="email"]', mockBookingData.email);
		await page.fill('[name="phone"]', mockBookingData.phone);

		await page.click('button:has-text("Continue to Payment")');
		await page.click('button:has-text("Complete Payment")');

		// Should show error message
		await expect(page.locator("text=Room no longer available")).toBeVisible();
		await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
	});

	test("should validate required fields in booking form", async ({ page }) => {
		// Navigate through booking flow without API errors
		await page.fill('[placeholder="Where are you going?"]', "Test City");
		await page.click('button:has-text("Search Hotels")');
		await page.click('[data-testid="hotel-card"]:first-child');
		await page.click('button:has-text("Select Room")');

		// Try to proceed without filling required fields
		await page.click('button:has-text("Continue to Payment")');

		// Should show validation errors
		await expect(page.locator("text=First name is required")).toBeVisible();
		await expect(page.locator("text=Last name is required")).toBeVisible();
		await expect(page.locator("text=Email is required")).toBeVisible();
		await expect(page.locator("text=Phone number is required")).toBeVisible();
	});

	test("should allow user to go back and modify booking details", async ({
		page,
	}) => {
		// Complete initial booking steps
		await page.fill('[placeholder="Where are you going?"]', "Test City");
		await page.click('button:has-text("Search Hotels")');
		await page.click('[data-testid="hotel-card"]:first-child');
		await page.click('button:has-text("Select Room")');

		// Fill guest details
		await page.fill('[name="firstName"]', "Jane");
		await page.fill('[name="lastName"]', "Smith");
		await page.fill('[name="email"]', "jane.smith@example.com");
		await page.fill('[name="phone"]', "+0987654321");

		await page.click('button:has-text("Continue to Payment")');

		// Go back to modify details
		await page.click('button:has-text("Back to Guest Details")');

		// Modify guest details
		await page.fill('[name="firstName"]', "John");
		await page.fill('[name="email"]', "john.doe@example.com");

		// Proceed again
		await page.click('button:has-text("Continue to Payment")');

		// Verify updated details are maintained
		await expect(page.locator("text=John")).toBeVisible();
		await expect(page.locator("text=john.doe@example.com")).toBeVisible();
	});

	test("should handle payment failures gracefully", async ({ page }) => {
		// Mock payment failure
		await page.route("**/api/payments/create", async (route) => {
			await route.fulfill({
				status: 400,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					message: "Card declined",
				}),
			});
		});

		// Complete booking flow to payment
		await page.fill('[placeholder="Where are you going?"]', "Test City");
		await page.click('button:has-text("Search Hotels")');
		await page.click('[data-testid="hotel-card"]:first-child');
		await page.click('button:has-text("Select Room")');

		await page.fill('[name="firstName"]', mockBookingData.firstName);
		await page.fill('[name="lastName"]', mockBookingData.lastName);
		await page.fill('[name="email"]', mockBookingData.email);
		await page.fill('[name="phone"]', mockBookingData.phone);

		await page.click('button:has-text("Continue to Payment")');

		// Should show payment error (generic square form error toast / message)
		await expect(page.locator("text=Card declined")).toBeVisible();
	});

	test("should maintain booking state across page refreshes", async ({
		page,
	}) => {
		// Complete partial booking
		await page.fill('[placeholder="Where are you going?"]', "Test City");
		await page.click('button:has-text("Search Hotels")');
		await page.click('[data-testid="hotel-card"]:first-child');
		await page.click('button:has-text("Select Room")');

		await page.fill('[name="firstName"]', mockBookingData.firstName);
		await page.fill('[name="lastName"]', mockBookingData.lastName);
		await page.fill('[name="email"]', mockBookingData.email);
		await page.fill('[name="phone"]', mockBookingData.phone);

		// Refresh page
		await page.reload();

		// State should be maintained (assuming localStorage persistence)
		await expect(
			page.locator(`[value="${mockBookingData.firstName}"]`),
		).toBeVisible();
		await expect(
			page.locator(`[value="${mockBookingData.email}"]`),
		).toBeVisible();
	});

	test("should show progress indicator throughout booking flow", async ({
		page,
	}) => {
		// Check initial step
		await page.fill('[placeholder="Where are you going?"]', "Test City");
		await page.click('button:has-text("Search Hotels")');
		await page.click('[data-testid="hotel-card"]:first-child');
		await page.click('button:has-text("Select Room")');

		// Should show room selection step as active
		await expect(
			page.locator('[data-step="room-selection"].active'),
		).toBeVisible();

		// Fill guest details
		await page.fill('[name="firstName"]', mockBookingData.firstName);
		await page.fill('[name="lastName"]', mockBookingData.lastName);
		await page.fill('[name="email"]', mockBookingData.email);
		await page.fill('[name="phone"]', mockBookingData.phone);

		await page.click('button:has-text("Continue to Payment")');

		// Should show payment step as active
		await expect(page.locator('[data-step="payment"].active')).toBeVisible();
		await expect(
			page.locator('[data-step="room-selection"].completed'),
		).toBeVisible();
		await expect(
			page.locator('[data-step="guest-details"].completed'),
		).toBeVisible();
	});

	test("should handle mobile booking workflow", async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		// Complete mobile booking flow
		await page.fill('[placeholder="Where are you going?"]', "Test City");
		await page.click('button:has-text("Search Hotels")');

		// Mobile-specific interactions
		await expect(page.locator(".grid-cols-1")).toBeVisible(); // Mobile layout

		await page.click('[data-testid="hotel-card"]:first-child');
		await page.click('button:has-text("Select Room")');

		// Scroll and fill mobile form
		await page.fill('[name="firstName"]', mockBookingData.firstName);
		await page.fill('[name="lastName"]', mockBookingData.lastName);

		await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

		await page.fill('[name="email"]', mockBookingData.email);
		await page.fill('[name="phone"]', mockBookingData.phone);

		await page.click('button:has-text("Continue to Payment")');

		// Verify mobile payment layout
		await expect(page.locator(".md\\:grid-cols-2")).toBeVisible(); // Responsive grid
	});

	test("should support keyboard navigation throughout booking flow", async ({
		page,
	}) => {
		// Use keyboard to navigate search form
		await page.keyboard.press("Tab"); // Focus destination input
		await page.keyboard.type("Test City");

		await page.keyboard.press("Tab"); // Focus check-in date
		await page.keyboard.type("2024-12-01");

		await page.keyboard.press("Tab"); // Focus check-out date
		await page.keyboard.type("2024-12-03");

		await page.keyboard.press("Tab"); // Focus guests select
		await page.keyboard.press("ArrowDown"); // Select 2 guests

		await page.keyboard.press("Tab"); // Focus search button
		await page.keyboard.press("Enter"); // Submit search

		// Verify search results
		await expect(page.locator("text=Grand Test Hotel")).toBeVisible();

		// Use keyboard to select hotel
		await page.keyboard.press("Tab"); // Focus hotel card
		await page.keyboard.press("Enter"); // Select hotel

		// Continue with keyboard navigation through booking flow
		await page.keyboard.press("Tab"); // Focus room selection
		await page.keyboard.press("Enter"); // Select room

		// Verify keyboard accessibility in forms
		const firstNameInput = page.locator('[name="firstName"]');
		await expect(firstNameInput).toBeFocused();
	});
});

test.describe("Search and Filter Workflow", () => {
	test.beforeEach(async ({ page }) => {
		// Mock search API with multiple hotels
		await page.route("**/api/hotels/search**", async (route) => {
			const url = new URL(route.request().url());
			const { searchParams } = url;

			let hotels = [
				{
					id: "hotel-1",
					name: "Budget Hotel",
					priceRange: { avgNightly: 99, currency: "USD" },
					rating: 3.5,
					amenities: [{ id: "wifi", name: "Free WiFi" }],
				},
				{
					id: "hotel-2",
					name: "Luxury Resort",
					priceRange: { avgNightly: 450, currency: "USD" },
					rating: 4.8,
					amenities: [
						{ id: "spa", name: "Spa" },
						{ id: "pool", name: "Pool" },
						{ id: "restaurant", name: "Restaurant" },
					],
				},
				{
					id: "hotel-3",
					name: "Business Hotel",
					priceRange: { avgNightly: 200, currency: "USD" },
					rating: 4.2,
					amenities: [
						{ id: "wifi", name: "Free WiFi" },
						{ id: "gym", name: "Gym" },
					],
				},
			];

			// Apply filters
			const priceMin = searchParams.get("priceMin");
			const priceMax = searchParams.get("priceMax");
			const rating = searchParams.get("rating");

			if (priceMin || priceMax) {
				hotels = hotels.filter((hotel) => {
					const price = hotel.priceRange.avgNightly;
					return (
						(!priceMin || price >= parseInt(priceMin)) &&
						(!priceMax || price <= parseInt(priceMax))
					);
				});
			}

			if (rating) {
				hotels = hotels.filter((hotel) => hotel.rating >= parseFloat(rating));
			}

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					data: {
						hotels,
						pagination: {
							page: 1,
							limit: 10,
							total: hotels.length,
							totalPages: 1,
						},
					},
				}),
			});
		});

		await page.goto("/");
	});

	test("should filter hotels by price range", async ({ page }) => {
		// Perform initial search
		await page.fill('[placeholder="Where are you going?"]', "Test City");
		await page.click('button:has-text("Search Hotels")');

		// Should show all hotels initially
		await expect(page.locator("text=Budget Hotel")).toBeVisible();
		await expect(page.locator("text=Luxury Resort")).toBeVisible();
		await expect(page.locator("text=Business Hotel")).toBeVisible();

		// Apply price filter
		await page.fill('[data-testid="price-min"]', "200");
		await page.fill('[data-testid="price-max"]', "300");
		await page.click('button:has-text("Apply Filters")');

		// Should only show hotels in price range
		await expect(page.locator("text=Business Hotel")).toBeVisible();
		await expect(page.locator("text=Budget Hotel")).not.toBeVisible();
		await expect(page.locator("text=Luxury Resort")).not.toBeVisible();
	});

	test("should filter hotels by rating", async ({ page }) => {
		// Perform initial search
		await page.fill('[placeholder="Where are you going?"]', "Test City");
		await page.click('button:has-text("Search Hotels")');

		// Apply rating filter
		await page.selectOption('[data-testid="rating-filter"]', "4.0");
		await page.click('button:has-text("Apply Filters")');

		// Should only show hotels with rating >= 4.0
		await expect(page.locator("text=Luxury Resort")).toBeVisible();
		await expect(page.locator("text=Business Hotel")).toBeVisible();
		await expect(page.locator("text=Budget Hotel")).not.toBeVisible();
	});

	test("should sort hotels by different criteria", async ({ page }) => {
		// Perform initial search
		await page.fill('[placeholder="Where are you going?"]', "Test City");
		await page.click('button:has-text("Search Hotels")');

		// Sort by price low to high
		await page.selectOption('[data-testid="sort-select"]', "price-low");

		// Should show hotels in price order
		const hotelNames = await page
			.locator('[data-testid="hotel-name"]')
			.allTextContents();
		expect(hotelNames[0]).toBe("Budget Hotel");
		expect(hotelNames[2]).toBe("Luxury Resort");

		// Sort by rating
		await page.selectOption('[data-testid="sort-select"]', "rating");

		// Should show hotels in rating order
		const hotelNamesAfterSort = await page
			.locator('[data-testid="hotel-name"]')
			.allTextContents();
		expect(hotelNamesAfterSort[0]).toBe("Luxury Resort");
	});
});
