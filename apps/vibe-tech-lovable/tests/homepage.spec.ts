import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should display homepage with hero section', async ({ page }) => {
    // Check if hero section is visible
    await expect(page.locator('h1')).toContainText(/Bruce Freshwater|Vibe Tech/i);
    
    // Check navigation elements
    await expect(page.locator('header nav').first()).toBeVisible();
    await expect(page.locator('header a[href="/portfolio"]').first()).toBeVisible();
    await expect(page.locator('header a[href="/services"]').first()).toBeVisible();
    await expect(page.locator('header a[href="/about"]').first()).toBeVisible();
    await expect(page.locator('header a[href="/contact"]').first()).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    const ensureHomeRoute = async () => {
      if (/\/$/.test(new URL(page.url()).pathname)) {
        return;
      }

      const homeLink = page.getByRole('link', { name: /vibe tech/i }).first();
      await expect(homeLink).toBeVisible();
      await homeLink.click({ timeout: 10_000 });
      await expect(page).toHaveURL(/\/$/);
    };

    const clickHeaderLink = async (label: string, href: string) => {
      await ensureHomeRoute();
      const headerNav = page.locator('header nav').first();
      const link = headerNav.getByRole('link', { name: label }).first();
      await expect(link).toBeVisible();
      await link.click({ timeout: 10_000 });
      await expect(page).toHaveURL(new RegExp(`${href}$`));
    };

    await clickHeaderLink('Portfolio', '/portfolio');
    await clickHeaderLink('Services', '/services');
    await clickHeaderLink('About', '/about');
  });

  test('should display portfolio preview section', async ({ page }) => {
    const portfolioSection = page.locator('[data-testid="portfolio-section"]');
    await expect(portfolioSection).toBeVisible();
    
    // Check for project cards
    const projectCards = page.locator('.project-card');
    await expect(projectCards).toHaveCount(3, { timeout: 10000 });
  });

  test('should display services section', async ({ page }) => {
    const servicesSection = page.locator('[data-testid="services-section"]');
    await expect(servicesSection).toBeVisible();
    
    // Check for service items
    await expect(page.getByText('Web Development')).toBeVisible();
    await expect(page.getByText('Mobile Apps')).toBeVisible();
    await expect(page.getByText('UI/UX Design')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile menu visibility
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    await expect(mobileMenuButton).toBeVisible();
    
    // Test mobile navigation
    await mobileMenuButton.evaluate((button) => {
      (button as HTMLButtonElement).click();
    });
    const mobileNav = page.locator('[data-testid="mobile-nav"]');
    await expect(mobileNav).toBeVisible();
  });

  test('should have working theme toggle', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    
    // Check if theme toggle exists
    await expect(themeToggle).toBeVisible();
    
    // Test theme switching
    await themeToggle.click();
    
    // Verify theme change by checking body class or data attribute
    await expect(page.locator('html')).toHaveAttribute('data-theme', /.+/);
  });
});
