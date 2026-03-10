import { expect, test } from '@playwright/test';

test.describe('Case Management', () => {
  test('should create a new case', async ({ page }) => {
    await page.goto('/');

    // Check if we are on the dashboard
    await expect(page).toHaveTitle(/Vibe-Justice/);

    // Click 'New Case' button (assuming there's a button with this text or ID)
    const newCaseBtn = page.getByRole('button', { name: /New Case/i });
    await newCaseBtn.click();

    // Fill in case details
    await page.fill('input[placeholder*="Case Name"]', 'Test Case 2026');
    await page.fill('textarea[placeholder*="Description"]', 'Automated test case for local verification.');

    // Submit
    await page.click('button:has-text("Create")');

    // Verify it appeared in the list
    await expect(page.locator('text=Test Case 2026')).toBeVisible();
  });
});
