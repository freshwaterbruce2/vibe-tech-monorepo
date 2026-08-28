import { expect, test } from '@playwright/test';

test.describe('Vibe Booking End-to-End Reservation Flow', () => {
  test('New user registration and complete booking flow', async ({ page }) => {
    const testEmail = `test-booking-reg-${Date.now()}@example.com`;
    const testPassword = 'password123';

    // 1. Visit the home page on port 4211
    await page.goto('http://localhost:4211/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/book work-ready hotels/i);

    // 2. Perform search
    const destinationInput = page.getByPlaceholder(/City, hotel, or district/i);
    await destinationInput.fill('Miami');

    const checkInInput = page.locator('input[type="date"]').first();
    const checkOutInput = page.locator('input[type="date"]').nth(1);
    
    await checkInInput.fill('2026-06-01');
    await checkOutInput.fill('2026-06-05');

    await destinationInput.press('Enter');

    // 3. Select hotel and reserve
    await expect(page).toHaveURL(/.*\/search.*/);
    await expect(page.getByRole('heading', { level: 2, name: /Harbor Point Suites/i })).toBeVisible();

    const reserveButton = page.locator('article.hotelResult').filter({ hasText: 'Harbor Point Suites' }).getByRole('link', { name: /reserve/i });
    await reserveButton.click();

    // 4. Fill traveler account (Create account/Register mode)
    await expect(page).toHaveURL(/.*\/booking\/h_1.*/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/review and reserve/i);

    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByLabel(/first name/i).fill('E2E');
    await page.getByLabel(/last name/i).fill('Tester');

    await page.getByRole('button', { name: /continue to payment/i }).click();

    // 5. Secure Payment Page
    await expect(page).toHaveURL(/.*\/payment\/.*/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/secure payment/i);
    
    await page.getByRole('button', { name: /pay now/i }).click();

    // 6. Confirmation Page
    await expect(page).toHaveURL(/.*\/confirmation\/.*/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/booking confirmed/i);
  });

  test('Existing user login and complete booking flow', async ({ page }) => {
    const testEmail = `test-booking-login-${Date.now()}@example.com`;
    const testPassword = 'password123';

    // -- Step A: Register the user first to make them an "existing" user --
    await page.goto('http://localhost:4211/');
    const destinationInput = page.getByPlaceholder(/City, hotel, or district/i);
    await destinationInput.fill('Miami');
    const checkInInput = page.locator('input[type="date"]').first();
    const checkOutInput = page.locator('input[type="date"]').nth(1);
    await checkInInput.fill('2026-06-01');
    await checkOutInput.fill('2026-06-05');
    await destinationInput.press('Enter');

    const reserveButton = page.locator('article.hotelResult').filter({ hasText: 'Harbor Point Suites' }).getByRole('link', { name: /reserve/i });
    await reserveButton.click();

    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByLabel(/first name/i).fill('Existing');
    await page.getByLabel(/last name/i).fill('Tester');
    await page.getByRole('button', { name: /continue to payment/i }).click();
    await expect(page).toHaveURL(/.*\/payment\/.*/);

    // Now log out using the header Sign out button
    const signOutButton = page.getByRole('button', { name: /sign out/i });
    await signOutButton.click();
    await expect(page).toHaveURL('http://localhost:4211/');

    // -- Step B: Log in as the newly created user and book --
    await destinationInput.fill('Miami');
    await checkInInput.fill('2026-06-01');
    await checkOutInput.fill('2026-06-05');
    await destinationInput.press('Enter');

    await reserveButton.click();

    // Select "Sign in" auth mode
    await page.getByLabel(/auth mode/i).selectOption('login');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);

    await page.getByRole('button', { name: /continue to payment/i }).click();

    // 5. Secure Payment Page
    await expect(page).toHaveURL(/.*\/payment\/.*/);
    await page.getByRole('button', { name: /pay now/i }).click();

    // 6. Confirmation Page
    await expect(page).toHaveURL(/.*\/confirmation\/.*/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/booking confirmed/i);
  });

  test('Bleisure Split-Payment complete booking flow', async ({ page }) => {
    const testEmail = `test-booking-bleisure-${Date.now()}@example.com`;
    const testPassword = 'password123';

    // 1. Visit the home page
    await page.goto('http://localhost:4211/');
    const destinationInput = page.getByPlaceholder(/City, hotel, or district/i);
    await destinationInput.fill('Miami');

    const checkInInput = page.locator('input[type="date"]').first();
    const checkOutInput = page.locator('input[type="date"]').nth(1);
    
    await checkInInput.fill('2026-06-01');
    await checkOutInput.fill('2026-06-05'); // 4 nights stay

    await destinationInput.press('Enter');

    // 2. Select hotel and reserve
    await expect(page).toHaveURL(/.*\/search.*/);
    const reserveButton = page.locator('article.hotelResult').filter({ hasText: 'Harbor Point Suites' }).getByRole('link', { name: /reserve/i });
    await reserveButton.click();

    // 3. Register user and configure Bleisure split payment
    await expect(page).toHaveURL(/.*\/booking\/h_1.*/);
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByLabel(/first name/i).fill('Bleisure');
    await page.getByLabel(/last name/i).fill('User');

    // Select Bleisure Split billing
    await page.getByLabel(/billing & invoice method/i).selectOption('bleisure_split');
    
    // Choose 2 business nights
    await page.getByLabel(/business stay portion/i).selectOption('2');

    await page.getByRole('button', { name: /continue to payment/i }).click();

    // 4. Secure Payment Page
    await expect(page).toHaveURL(/.*\/payment\/.*/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/secure payment/i);
    
    // Check that split payment info is rendered
    await expect(page.getByText(/business invoice/i)).toBeVisible();
    await expect(page.getByText(/personal card/i)).toBeVisible();
    
    // Pay personal portion
    await page.getByRole('button', { name: /pay personal portion/i }).click();

    // 5. Confirmation Page
    await expect(page).toHaveURL(/.*\/confirmation\/.*/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/booking confirmed/i);
    await expect(page.getByText(/bleisure split checkout completed/i)).toBeVisible();
  });
});
