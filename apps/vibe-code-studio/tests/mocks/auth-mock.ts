import { Page } from '@playwright/test';

/**
 * Mocks the central authentication endpoints to allow E2E tests
 * to bypass the landing page and run authenticated.
 */
export async function setupAuthMock(page: Page): Promise<void> {
  await page.route('**/api/auth/me', async (route) => {
    const origin = route.request().headers()['origin'] || 'http://localhost:3001';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        ok: true,
        user: {
          id: 'mock-user-id',
          email: 'bruce@vibetech.dev',
          fullName: 'Fresh Bruce',
          plan: 'pro'
        }
      })
    });
  });

  // Mock database initialization endpoint
  await page.route('**/api/db/init', async (route) => {
    const origin = route.request().headers()['origin'] || 'http://localhost:3001';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true'
      },
      body: JSON.stringify({ ok: true })
    });
  });
}
