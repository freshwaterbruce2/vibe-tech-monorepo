import { expect, test } from '@playwright/test';

const trip = {
  destination: 'Miami',
  checkIn: '2026-06-10',
  checkOut: '2026-06-12',
  guests: '2',
};

test('traveler can search, reserve, pay, and see booking confirmation', async ({ page }) => {
  const email = `traveler-${Date.now()}@example.com`;
  const password = 'change-this-password';

  await page.request.post('/api/auth/register', {
    data: {
      email,
      password,
      firstName: 'Demo',
      lastName: 'Traveler',
    },
  });
  await page.request.post('/api/webhooks/stripe', {
    data: {
      id: `evt_e2e_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_e2e_${Date.now()}`,
          customer_email: email,
        },
      },
    },
  });

  await page.goto('/');

  await page.getByLabel(/destination/i).fill(trip.destination);
  await page.getByLabel(/check-in/i).fill(trip.checkIn);
  await page.getByLabel(/check-out/i).fill(trip.checkOut);
  await page.getByLabel(/guests/i).fill(trip.guests);
  await page.getByRole('button', { name: /search stays/i }).click();

  await expect(page).toHaveURL(/\/search/);
  await expect(page.getByRole('heading', { name: /hotels in miami/i })).toBeVisible();
  await expect(page.getByText(/^[1-9]\d* stays match$/i)).toBeVisible();

  await page.getByRole('link', { name: /reserve/i }).first().click();
  await expect(page.getByRole('heading', { name: /review and reserve/i })).toBeVisible();

  await page.getByLabel(/auth mode/i).selectOption('login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /continue to payment/i }).click();

  await expect(page.getByRole('heading', { name: /secure payment/i })).toBeVisible();
  await page.getByRole('button', { name: /pay now/i }).click();

  await expect(page.getByRole('heading', { name: /booking confirmed/i })).toBeVisible();
  await expect(page.getByText(/payment: paid/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /start another search/i })).toBeVisible();
});
