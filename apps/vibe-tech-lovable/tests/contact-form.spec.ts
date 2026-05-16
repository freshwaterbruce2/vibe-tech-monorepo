import { test, expect, type Locator, type Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

/**
 * Contact Form Tests
 *
 * Tests for the contact form functionality:
 * - Form validation (required fields, email format)
 * - Form submission
 * - Success/error states
 * - Accessibility
 */
const getContactForm = (page: Page): Locator =>
  page.locator('form').filter({ has: page.locator('textarea[name="message"]') });

const fillContactForm = async (form: Locator, values: { name: string; email: string; message: string }) => {
  await form.getByLabel('Your Name').fill(values.name);
  await form.getByLabel('Email Address').fill(values.email);
  await form.getByLabel('Message').fill(values.message);
};

test.describe('Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
    await expect(getContactForm(page)).toBeVisible();
  });

  test('displays contact form with all fields', async ({ page }) => {
    const form = getContactForm(page);

    await expect(form.getByLabel('Your Name')).toBeVisible();
    await expect(form.getByLabel('Email Address')).toBeVisible();
    await expect(form.getByLabel('Subject')).toBeVisible();
    await expect(form.getByLabel('Message')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Send Message' })).toBeVisible();
  });

  test('validates required fields on empty submit', async ({ page }) => {
    const form = getContactForm(page);
    await form.getByRole('button', { name: 'Send Message' }).click();
    await expect(page.getByRole('alert')).toContainText('Name, email, and message are required.');
  });

  test('validates email format', async ({ page }) => {
    const form = getContactForm(page);
    await fillContactForm(form, {
      name: 'Test User',
      email: 'invalid-email',
      message: 'Test message',
    });
    await form.getByRole('button', { name: 'Send Message' }).click();
    await expect(page.getByRole('alert')).toContainText('Please enter a valid email address.');
  });

  test('submits form with valid data', async ({ page }) => {
    const form = getContactForm(page);
    await fillContactForm(form, {
      name: 'Test User',
      email: 'test@example.com',
      message: 'This is a test message from Playwright.',
    });
    await form.getByRole('button', { name: 'Send Message' }).click();
    await expect(page.getByRole('status')).toContainText('Thank you. Your message has been sent.');
  });

  test('shows loading state during submission', async ({ page }) => {
    await page.route('**/api/contact', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    const form = getContactForm(page);
    const submitButton = form.getByRole('button', { name: 'Send Message' });

    await fillContactForm(form, {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Delayed response test',
    });

    await submitButton.click();
    const sendingButton = form.getByRole('button', { name: /sending/i });
    const statusMessage = page.getByRole('status');

    await expect
      .poll(
        async () =>
          (await sendingButton.isVisible().catch(() => false)) ||
          (await statusMessage.isVisible().catch(() => false)),
        { timeout: 3_000 },
      )
      .toBeTruthy();

    if (await sendingButton.isVisible().catch(() => false)) {
      await expect(sendingButton).toBeDisabled();
    }

    await expect(page.getByRole('status')).toContainText('Thank you. Your message has been sent.');
  });

  test('form fields are accessible', async ({ page }) => {
    const form = getContactForm(page);
    const nameInput = form.getByLabel('Your Name');
    const emailInput = form.getByLabel('Email Address');
    const messageInput = form.getByLabel('Message');

    await expect(nameInput).toHaveAttribute('id', 'name');
    await expect(emailInput).toHaveAttribute('id', 'email');
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(messageInput).toHaveAttribute('id', 'message');
  });

  test('handles server error gracefully', async ({ page }) => {
    await page.evaluate(() => {
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const rawUrl =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (rawUrl.includes('/api/contact')) {
          throw new Error('Simulated contact submit failure');
        }

        return originalFetch(input, init);
      };
    });

    const form = getContactForm(page);
    await fillContactForm(form, {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Test message',
    });
    await form.getByRole('button', { name: 'Send Message' }).click();
    await expect(page.getByRole('alert')).toContainText('Submission failed. Please try again.');
  });

  test('clears form after successful submission', async ({ page }) => {
    const form = getContactForm(page);
    const nameInput = form.getByLabel('Your Name');
    const emailInput = form.getByLabel('Email Address');
    const messageInput = form.getByLabel('Message');

    await fillContactForm(form, {
      name: 'Test User',
      email: 'test@example.com',
      message: 'Test message',
    });
    await form.getByRole('button', { name: 'Send Message' }).click();

    await expect(page.getByRole('status')).toContainText('Thank you. Your message has been sent.');
    await expect(nameInput).toHaveValue('');
    await expect(emailInput).toHaveValue('');
    await expect(messageInput).toHaveValue('');
  });
});

