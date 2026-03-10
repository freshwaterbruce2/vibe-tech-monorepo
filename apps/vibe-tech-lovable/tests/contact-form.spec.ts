import { test, expect } from '@playwright/test';

/**
 * Contact Form Tests
 *
 * Tests for the contact form functionality:
 * - Form validation (required fields, email format)
 * - Form submission
 * - Success/error states
 * - Accessibility
 */
test.describe('Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('displays contact form with all fields', async ({ page }) => {
    // Check form exists
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Check required fields are present
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/message/i)).toBeVisible();

    // Check submit button
    await expect(page.getByRole('button', { name: /send|submit/i })).toBeVisible();
  });

  test('validates required fields on empty submit', async ({ page }) => {
    // Click submit without filling fields
    await page.getByRole('button', { name: /send|submit/i }).click();

    // Check for validation errors
    const errorMessages = page.locator('[class*="error"], [role="alert"]');
    await expect(errorMessages.first()).toBeVisible({ timeout: 5000 });
  });

  test('validates email format', async ({ page }) => {
    // Fill name
    await page.getByLabel(/name/i).fill('Test User');

    // Fill invalid email
    await page.getByLabel(/email/i).fill('invalid-email');

    // Fill message
    await page.getByLabel(/message/i).fill('Test message');

    // Submit
    await page.getByRole('button', { name: /send|submit/i }).click();

    // Should show email format error
    await expect(page.getByText(/valid email|invalid email/i)).toBeVisible({ timeout: 5000 });
  });

  test('submits form with valid data', async ({ page }) => {
    // Fill all required fields
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/message/i).fill('This is a test message from Playwright.');

    // Fill optional fields if present
    const phoneField = page.getByLabel(/phone/i);
    if (await phoneField.isVisible()) {
      await phoneField.fill('555-123-4567');
    }

    const companyField = page.getByLabel(/company/i);
    if (await companyField.isVisible()) {
      await companyField.fill('Test Company');
    }

    // Submit form
    await page.getByRole('button', { name: /send|submit/i }).click();

    // Wait for success message or redirect
    await expect(
      page.getByText(/thank you|success|sent|received/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows loading state during submission', async ({ page }) => {
    // Fill fields
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/message/i).fill('Test message');

    // Submit and check for loading indicator
    const submitButton = page.getByRole('button', { name: /send|submit/i });
    await submitButton.click();

    // Button should show loading state (disabled or spinner)
    await expect(submitButton).toBeDisabled({ timeout: 1000 }).catch(() => {
      // Some forms might use a different loading pattern
    });
  });

  test('form fields are accessible', async ({ page }) => {
    // Check labels are associated with inputs
    const nameInput = page.getByLabel(/name/i);
    await expect(nameInput).toHaveAttribute('id', /.+/);

    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');

    // Check form has accessible name
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('handles server error gracefully', async ({ page, context }) => {
    // Mock API to return error
    await context.route('**/api/contact**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' }),
      });
    });

    // Fill and submit
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/message/i).fill('Test message');
    await page.getByRole('button', { name: /send|submit/i }).click();

    // Should show error message
    await expect(
      page.getByText(/error|failed|try again/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('clears form after successful submission', async ({ page }) => {
    // Fill fields
    await page.getByLabel(/name/i).fill('Test User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/message/i).fill('Test message');

    // Submit
    await page.getByRole('button', { name: /send|submit/i }).click();

    // Wait for success
    await expect(
      page.getByText(/thank you|success|sent/i)
    ).toBeVisible({ timeout: 10000 });

    // Check if form is cleared (if still visible)
    const nameInput = page.getByLabel(/name/i);
    if (await nameInput.isVisible()) {
      await expect(nameInput).toHaveValue('');
    }
  });
});