import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("should display hero section", async ({ page }) => {
		await expect(page.locator("h1")).toContainText(/Find Your Perfect Stay/i);
		await expect(page.locator("text=Discover amazing hotels")).toBeVisible();
	});

	test("should have working navigation", async ({ page }) => {
		// Check navigation links
		await expect(page.locator("nav")).toBeVisible();
		await expect(page.locator("nav >> text=Home")).toBeVisible();
		await expect(page.locator("nav >> text=Hotels")).toBeVisible();
		await expect(page.locator("nav >> text=About")).toBeVisible();
	});

	test("should have search functionality", async ({ page }) => {
		// Find search input
		const searchInput = page.locator('input[placeholder*="Search"]');
		await expect(searchInput).toBeVisible();

		// Type in search
		await searchInput.fill("New York");
		await searchInput.press("Enter");

		// Should navigate to search results
		await expect(page).toHaveURL(/search/);
	});

	test("should display featured destinations", async ({ page }) => {
		await expect(page.locator("text=Featured Destinations")).toBeVisible();
		const destinations = page.locator('[data-testid="destination-card"]');
		await expect(destinations).toHaveCount(3);
	});

	test("should have working theme toggle", async ({ page }) => {
		const themeToggle = page.locator('[data-testid="theme-toggle"]');
		await expect(themeToggle).toBeVisible();

		// Check initial theme
		const html = page.locator("html");
		const initialTheme = await html.getAttribute("data-theme");

		// Toggle theme
		await themeToggle.click();

		// Check theme changed
		const newTheme = await html.getAttribute("data-theme");
		expect(newTheme).not.toBe(initialTheme);
	});

	test("should be responsive", async ({ page }) => {
		// Test mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		// Mobile menu should be visible
		const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
		await expect(mobileMenuButton).toBeVisible();

		// Click mobile menu
		await mobileMenuButton.click();

		// Navigation should be visible
		await expect(page.locator("nav")).toBeVisible();
	});
});
