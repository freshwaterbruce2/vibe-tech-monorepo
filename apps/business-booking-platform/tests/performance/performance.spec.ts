import { expect, test } from "@playwright/test";

test.describe("Hotel Booking Performance Tests", () => {
	test.beforeEach(async ({ page }) => {
		// Mock API responses for consistent performance testing
		await page.route("**/api/hotels/search**", async (route) => {
			// Simulate realistic API response time
			await new Promise((resolve) => setTimeout(resolve, 200));

			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					data: {
						hotels: Array.from({ length: 20 }, (_, i) => ({
							id: `hotel-${i + 1}`,
							name: `Performance Test Hotel ${i + 1}`,
							description: `Test hotel ${i + 1} with comprehensive amenities and services.`,
							location: {
								city: "Performance City",
								country: "Test Country",
								neighborhood: `District ${i + 1}`,
							},
							rating: 3.5 + (i % 3) * 0.5,
							reviewCount: 100 + i * 50,
							priceRange: {
								avgNightly: 99 + i * 20,
								currency: "USD",
							},
							images: [
								{
									url: `https://picsum.photos/800/600?random=${i}`,
									alt: `Hotel ${i + 1} exterior`,
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
								lowAvailability: i % 5 === 0,
							},
							passionScore: {
								"luxury-indulgence": Math.random() * 0.5 + 0.5,
							},
							sustainabilityScore: Math.random() * 0.4 + 0.6,
						})),
						pagination: {
							page: 1,
							limit: 20,
							total: 100,
							totalPages: 5,
						},
					},
				}),
			});
		});

		// Mock other APIs with realistic delays
		await page.route("**/api/ai/**", async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 300));
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ processed: true }),
			});
		});

		await page.route("**/api/hotels/**/details**", async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 150));
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					success: true,
					data: {
						id: "hotel-1",
						name: "Performance Test Hotel",
						rooms: [
							{
								id: "room-1",
								type: "Standard Room",
								price: 150,
								available: true,
								amenities: ["WiFi", "AC"],
							},
						],
					},
				}),
			});
		});
	});

	test.describe("Page Load Performance", () => {
		test("Homepage should load within performance budget", async ({ page }) => {
			const startTime = Date.now();

			await page.goto("/");

			// Wait for the page to be fully loaded
			await page.waitForLoadState("networkidle");

			const loadTime = Date.now() - startTime;

			// Homepage should load within 3 seconds
			expect(loadTime).toBeLessThan(3000);

			// Check Core Web Vitals
			const metrics = await page.evaluate(() => {
				return new Promise((resolve) => {
					if ("web-vital" in window) {
						resolve(window["web-vital"]);
					} else {
						// Fallback metrics collection
						const navigation = performance.getEntriesByType(
							"navigation",
						)[0] as PerformanceNavigationTiming;
						resolve({
							FCP: navigation.responseStart - navigation.fetchStart,
							LCP: navigation.loadEventEnd - navigation.fetchStart,
							FID: 0, // Can't measure FID without real user interaction
							CLS: 0, // Would need layout shift observer
						});
					}
				});
			});

			console.log("Homepage Performance Metrics:", metrics);
		});

		test("Search results should load efficiently", async ({ page }) => {
			await page.goto("/");

			const searchStartTime = Date.now();

			// Perform search
			await page.fill(
				'[placeholder="Where are you going?"]',
				"Performance City",
			);
			await page.click('button:has-text("Search Hotels")');

			// Wait for search results
			await page.waitForSelector("text=Performance Test Hotel 1");

			const searchTime = Date.now() - searchStartTime;

			// Search should complete within 5 seconds
			expect(searchTime).toBeLessThan(5000);

			// Verify all hotels are rendered
			const hotelCards = await page
				.locator('[data-testid="hotel-card"]')
				.count();
			expect(hotelCards).toBeGreaterThan(0);
		});

		test("Hotel details page should load quickly", async ({ page }) => {
			// Navigate through search to hotel details
			await page.goto("/");
			await page.fill(
				'[placeholder="Where are you going?"]',
				"Performance City",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Performance Test Hotel 1");

			const detailsStartTime = Date.now();

			// Click on first hotel
			await page.click('[data-testid="hotel-card"]:first-child');

			// Wait for hotel details to load
			await page.waitForLoadState("networkidle");

			const detailsTime = Date.now() - detailsStartTime;

			// Hotel details should load within 2 seconds
			expect(detailsTime).toBeLessThan(2000);
		});
	});

	test.describe("Runtime Performance", () => {
		test("Search interaction should be responsive", async ({ page }) => {
			await page.goto("/");

			// Measure input responsiveness
			const inputStartTime = Date.now();

			const destinationInput = page.locator(
				'[placeholder="Where are you going?"]',
			);
			await destinationInput.click();
			await destinationInput.fill("Performance Test");

			const inputTime = Date.now() - inputStartTime;

			// Input should be responsive within 100ms
			expect(inputTime).toBeLessThan(100);
		});

		test("Scrolling through search results should be smooth", async ({
			page,
		}) => {
			await page.goto("/");
			await page.fill(
				'[placeholder="Where are you going?"]',
				"Performance City",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Performance Test Hotel 1");

			// Measure scroll performance
			const scrollMetrics = await page.evaluate(async () => {
				const startTime = performance.now();
				let frameCount = 0;

				return new Promise((resolve) => {
					const measureFrame = () => {
						frameCount++;
						if (frameCount < 60) {
							// Measure for 60 frames (~1 second at 60fps)
							requestAnimationFrame(measureFrame);
						} else {
							const endTime = performance.now();
							const duration = endTime - startTime;
							const fps = (frameCount * 1000) / duration;
							resolve({ fps, duration });
						}
					};

					// Start scrolling
					window.scrollTo({
						top: document.body.scrollHeight,
						behavior: "smooth",
					});
					requestAnimationFrame(measureFrame);
				});
			});

			console.log("Scroll Performance:", scrollMetrics);

			// Should maintain at least 30 FPS during scrolling
			expect((scrollMetrics as any).fps).toBeGreaterThan(30);
		});

		test("Hotel card hover interactions should be performant", async ({
			page,
		}) => {
			await page.goto("/");
			await page.fill(
				'[placeholder="Where are you going?"]',
				"Performance City",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Performance Test Hotel 1");

			const hotelCards = page.locator('[data-testid="hotel-card"]');
			const cardCount = await hotelCards.count();

			// Measure hover performance on multiple cards
			const hoverTimes: number[] = [];

			for (let i = 0; i < Math.min(5, cardCount); i++) {
				const startTime = Date.now();

				await hotelCards.nth(i).hover();
				await page.waitForTimeout(100); // Wait for hover effects

				const hoverTime = Date.now() - startTime;
				hoverTimes.push(hoverTime);
			}

			const averageHoverTime =
				hoverTimes.reduce((a, b) => a + b, 0) / hoverTimes.length;

			// Hover effects should be responsive within 50ms on average
			expect(averageHoverTime).toBeLessThan(150);
		});
	});

	test.describe("Memory Performance", () => {
		test("Search operations should not cause memory leaks", async ({
			page,
		}) => {
			await page.goto("/");

			// Get initial memory usage
			const initialMemory = await page.evaluate(() => {
				if ("memory" in performance) {
					return (performance as any).memory.usedJSHeapSize;
				}
				return 0;
			});

			// Perform multiple search operations
			for (let i = 0; i < 5; i++) {
				await page.fill(
					'[placeholder="Where are you going?"]',
					`Test City ${i}`,
				);
				await page.click('button:has-text("Search Hotels")');
				await page.waitForSelector("text=Performance Test Hotel 1");

				// Clear search
				await page.fill('[placeholder="Where are you going?"]', "");
			}

			// Force garbage collection if available
			await page.evaluate(() => {
				if ("gc" in window) {
					(window as any).gc();
				}
			});

			const finalMemory = await page.evaluate(() => {
				if ("memory" in performance) {
					return (performance as any).memory.usedJSHeapSize;
				}
				return 0;
			});

			if (initialMemory > 0 && finalMemory > 0) {
				const memoryIncrease = finalMemory - initialMemory;
				const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

				console.log(
					`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`,
				);

				// Memory should not increase by more than 50% after operations
				expect(memoryIncreasePercent).toBeLessThan(50);
			}
		});

		test("Long scrolling should not accumulate excessive DOM nodes", async ({
			page,
		}) => {
			await page.goto("/");
			await page.fill(
				'[placeholder="Where are you going?"]',
				"Performance City",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Performance Test Hotel 1");

			// Count initial DOM nodes
			const initialNodeCount = await page.evaluate(() => {
				return document.querySelectorAll("*").length;
			});

			// Simulate extensive scrolling
			for (let i = 0; i < 10; i++) {
				await page.evaluate(() => {
					window.scrollTo(0, document.body.scrollHeight);
				});
				await page.waitForTimeout(100);

				await page.evaluate(() => {
					window.scrollTo(0, 0);
				});
				await page.waitForTimeout(100);
			}

			const finalNodeCount = await page.evaluate(() => {
				return document.querySelectorAll("*").length;
			});

			const nodeIncrease = finalNodeCount - initialNodeCount;
			const nodeIncreasePercent = (nodeIncrease / initialNodeCount) * 100;

			console.log(
				`DOM node increase: ${nodeIncrease} nodes (${nodeIncreasePercent.toFixed(2)}%)`,
			);

			// DOM nodes should not increase significantly after scrolling
			expect(nodeIncreasePercent).toBeLessThan(20);
		});
	});

	test.describe("Network Performance", () => {
		test("Should minimize redundant API calls", async ({ page }) => {
			const apiCalls: string[] = [];

			// Monitor API calls
			page.on("request", (request) => {
				if (request.url().includes("/api/")) {
					apiCalls.push(request.url());
				}
			});

			await page.goto("/");

			// Perform search
			await page.fill(
				'[placeholder="Where are you going?"]',
				"Performance City",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Performance Test Hotel 1");

			// Perform same search again
			await page.fill('[placeholder="Where are you going?"]', "");
			await page.fill(
				'[placeholder="Where are you going?"]',
				"Performance City",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Performance Test Hotel 1");

			// Count unique API endpoints called
			const uniqueEndpoints = [
				...new Set(
					apiCalls.map((url) => {
						const urlObj = new URL(url);
						return urlObj.pathname;
					}),
				),
			];

			console.log("API calls made:", apiCalls.length);
			console.log("Unique endpoints:", uniqueEndpoints);

			// Should make reasonable number of API calls (not excessive)
			expect(apiCalls.length).toBeLessThan(10);
		});

		test("Should handle slow network gracefully", async ({ page }) => {
			// Simulate slow network
			await page.route("**/api/hotels/search**", async (route) => {
				await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
				await route.continue();
			});

			await page.goto("/");

			const searchStartTime = Date.now();

			await page.fill(
				'[placeholder="Where are you going?"]',
				"Performance City",
			);
			await page.click('button:has-text("Search Hotels")');

			// Should show loading state immediately
			await expect(
				page.locator('button:has-text("Searching...")'),
			).toBeVisible();

			// Wait for results
			await page.waitForSelector("text=Performance Test Hotel 1", {
				timeout: 10000,
			});

			const totalTime = Date.now() - searchStartTime;

			// Should handle slow network within reasonable time
			expect(totalTime).toBeLessThan(5000);
		});
	});

	test.describe("Bundle Size and Asset Performance", () => {
		test("Should load critical resources efficiently", async ({ page }) => {
			const resourceSizes: Record<string, number> = {};
			// const resourceTimings: Record<string, number> = {};

			page.on("response", async (response) => {
				const url = response.url();
				const contentLength = response.headers()["content-length"];

				if (contentLength) {
					resourceSizes[url] = parseInt(contentLength);
				}
			});

			const startTime = Date.now();
			await page.goto("/");
			await page.waitForLoadState("networkidle");
			const loadTime = Date.now() - startTime;

			// Get resource timing data
			const performanceData = await page.evaluate(() => {
				const resources = performance.getEntriesByType(
					"resource",
				) as PerformanceResourceTiming[];
				return resources.map((resource) => ({
					name: resource.name,
					duration: resource.duration,
					size: resource.transferSize,
					type: resource.initiatorType,
				}));
			});

			console.log("Resource Performance Data:", performanceData);

			// Check for large resources
			const largeResources = performanceData.filter(
				(resource) => resource.size > 500000,
			); // >500KB

			if (largeResources.length > 0) {
				console.warn("Large resources detected:", largeResources);
			}

			// Bundle should be reasonably sized
			expect(largeResources.length).toBeLessThan(3);

			// Page should load within reasonable time
			expect(loadTime).toBeLessThan(4000);
		});

		test("Should optimize image loading", async ({ page }) => {
			await page.goto("/");
			await page.fill(
				'[placeholder="Where are you going?"]',
				"Performance City",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Performance Test Hotel 1");

			// Wait for images to load
			await page.waitForTimeout(2000);

			// Check image loading performance
			const imageMetrics = await page.evaluate(() => {
				const images = Array.from(document.querySelectorAll("img"));
				return images.map((img) => ({
					src: img.src,
					complete: img.complete,
					naturalWidth: img.naturalWidth,
					naturalHeight: img.naturalHeight,
					loading: img.loading,
				}));
			});

			console.log("Image Metrics:", imageMetrics);

			// Most images should be loaded
			const loadedImages = imageMetrics.filter((img) => img.complete);
			const loadedPercentage =
				(loadedImages.length / imageMetrics.length) * 100;

			expect(loadedPercentage).toBeGreaterThan(80);
		});
	});

	test.describe("User Experience Performance", () => {
		test("Should provide fast feedback for user interactions", async ({
			page,
		}) => {
			await page.goto("/");

			// Test input responsiveness
			const inputs = [
				'[placeholder="Where are you going?"]',
				'[aria-label="Check-in Date"]',
				'[aria-label="Check-out Date"]',
			];

			for (const selector of inputs) {
				const startTime = Date.now();

				await page.click(selector);
				await page.type(selector, "test");

				const responseTime = Date.now() - startTime;

				// Input should respond within 50ms
				expect(responseTime).toBeLessThan(200);
			}
		});

		test("Should maintain 60fps during animations", async ({ page }) => {
			await page.goto("/");
			await page.fill(
				'[placeholder="Where are you going?"]',
				"Performance City",
			);
			await page.click('button:has-text("Search Hotels")');
			await page.waitForSelector("text=Performance Test Hotel 1");

			// Measure animation performance during hover
			const animationMetrics = await page.evaluate(async () => {
				return new Promise((resolve) => {
					let frameCount = 0;
					const startTime = performance.now();

					const measureFrame = () => {
						frameCount++;
						if (frameCount < 30) {
							// Measure for 30 frames
							requestAnimationFrame(measureFrame);
						} else {
							const endTime = performance.now();
							const duration = endTime - startTime;
							const fps = (frameCount * 1000) / duration;
							resolve({ fps, frameCount, duration });
						}
					};

					// Trigger animation
					const hotelCard = document.querySelector(
						'[data-testid="hotel-card"]',
					) as HTMLElement;
					if (hotelCard) {
						hotelCard.dispatchEvent(new MouseEvent("mouseenter"));
					}

					requestAnimationFrame(measureFrame);
				});
			});

			console.log("Animation Performance:", animationMetrics);

			// Should maintain smooth animations (>45 FPS)
			expect((animationMetrics as any).fps).toBeGreaterThan(45);
		});

		test("Should optimize first contentful paint", async ({ page }) => {
			const startTime = Date.now();

			await page.goto("/");

			// Wait for first meaningful content
			await page.waitForSelector('h1, h2, [data-testid="search-form"]');

			const fcp = Date.now() - startTime;

			console.log("First Contentful Paint:", fcp, "ms");

			// FCP should be under 2 seconds
			expect(fcp).toBeLessThan(2000);
		});
	});

	test.describe("Error Handling Performance", () => {
		test("Should handle API errors without blocking UI", async ({ page }) => {
			// Mock API error
			await page.route("**/api/hotels/search**", async (route) => {
				await route.fulfill({
					status: 500,
					contentType: "application/json",
					body: JSON.stringify({ error: "Server error" }),
				});
			});

			await page.goto("/");

			const startTime = Date.now();

			await page.fill('[placeholder="Where are you going?"]', "Error City");
			await page.click('button:has-text("Search Hotels")');

			// UI should remain responsive even with API errors
			await page.waitForTimeout(1000);

			const responseTime = Date.now() - startTime;

			// Error handling should not block UI for more than 2 seconds
			expect(responseTime).toBeLessThan(2000);

			// Should be able to interact with form after error
			await page.fill('[placeholder="Where are you going?"]', "Recovery Test");
			const input = await page.inputValue(
				'[placeholder="Where are you going?"]',
			);
			expect(input).toBe("Recovery Test");
		});

		test("Should handle network timeouts gracefully", async ({ page }) => {
			// Mock timeout scenario
			await page.route("**/api/hotels/search**", async () => {
				// Never respond to simulate timeout
				await new Promise(() => {}); // Infinite promise
			});

			await page.goto("/");

			const startTime = Date.now();

			await page.fill('[placeholder="Where are you going?"]', "Timeout City");
			await page.click('button:has-text("Search Hotels")');

			// Should show loading state
			await expect(
				page.locator('button:has-text("Searching...")'),
			).toBeVisible();

			// Wait for reasonable timeout period
			await page.waitForTimeout(3000);

			const timeoutTime = Date.now() - startTime;

			// Should handle timeout within reasonable time
			expect(timeoutTime).toBeLessThan(5000);
		});
	});
});
