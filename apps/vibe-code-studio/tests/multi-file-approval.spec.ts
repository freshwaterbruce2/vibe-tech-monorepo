/**
 * E2E Tests for Multi-File Edit Approval Panel
 *
 * The modal only opens when the AI execution engine proposes a multi-file
 * edit plan. The behavioral tests below stay skipped until an AI-trigger
 * mechanism exists (see tests/README.md, "Multi-File Approval Tests").
 */
import { expect, gotoAppShell, test } from './fixtures/auth';

test.describe('Multi-File Edit Approval Panel', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAppShell(page);
  });

  test('approval modal is not shown without a pending multi-file edit', async ({ page }) => {
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="multi-file-approval"]')).toHaveCount(0);
  });

  test.describe('when modal is open', () => {
    // Skipped pending an AI-trigger mechanism (tests/README.md).

    test.skip('shows file list with checkboxes', async ({ page }) => {
      const modal = page.locator('[data-testid="multi-file-approval"]');
      await expect(modal).toBeVisible();

      const checkboxes = modal.locator('input[type="checkbox"]');
      await expect(checkboxes.first()).toBeVisible();
    });

    test.skip('apply button shows selected file count', async ({ page }) => {
      const applyButton = page.locator('[data-testid="apply-button"]');
      await expect(applyButton).toBeVisible();
      await expect(applyButton).toContainText('Apply Selected');
    });

    test.skip('reject button closes modal', async ({ page }) => {
      const rejectButton = page.locator('[data-testid="reject-button"]');
      await expect(rejectButton).toBeVisible();

      await rejectButton.click();

      const modal = page.locator('[data-testid="multi-file-approval"]');
      await expect(modal).not.toBeVisible();
    });

    test.skip('clicking overlay closes modal', async ({ page }) => {
      const modal = page.locator('[data-testid="multi-file-approval"]');

      await modal.click({ position: { x: 10, y: 10 } });

      await expect(modal).not.toBeVisible();
    });

    test.skip('can toggle file selection', async ({ page }) => {
      const modal = page.locator('[data-testid="multi-file-approval"]');
      const firstCheckbox = modal.locator('input[type="checkbox"]').first();

      await expect(firstCheckbox).toBeChecked();

      await firstCheckbox.click();
      await expect(firstCheckbox).not.toBeChecked();

      await firstCheckbox.click();
      await expect(firstCheckbox).toBeChecked();
    });

    test.skip('apply button disabled when no files selected', async ({ page }) => {
      const modal = page.locator('[data-testid="multi-file-approval"]');
      const applyButton = page.locator('[data-testid="apply-button"]');
      const checkboxes = modal.locator('input[type="checkbox"]');

      const count = await checkboxes.count();
      for (let i = 0; i < count; i++) {
        const checkbox = checkboxes.nth(i);
        if (await checkbox.isChecked()) {
          await checkbox.click();
        }
      }

      await expect(applyButton).toBeDisabled();
    });

    test.skip('per-file accept button removes file from list', async ({ page }) => {
      const acceptButton = page.locator('[data-testid="accept-file-button"]').first();
      await expect(acceptButton).toBeVisible();

      await acceptButton.click();
    });

    test.skip('per-file reject button removes file from list', async ({ page }) => {
      const rejectButton = page.locator('[data-testid="reject-file-button"]').first();
      await expect(rejectButton).toBeVisible();

      await rejectButton.click();
    });
  });
});
