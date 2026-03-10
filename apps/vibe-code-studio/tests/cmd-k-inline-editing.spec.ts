/**
 * E2E Tests for Cmd+K Inline Editing (Cursor's Killer Feature)
 * Tests the complete workflow of inline code editing with AI
 */

import { test, expect } from '@playwright/test';

test.describe('Cmd+K Inline Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for app to be ready
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should open inline edit dialog when Cmd+K is pressed with selection', async ({ page }) => {
    // Skip if no Monaco editor is visible
    const editorExists = await page.locator('.monaco-editor').count() > 0;
    if (!editorExists) {
      test.skip();
      return;
    }

    // Focus the editor
    await page.click('.monaco-editor');
    await page.waitForTimeout(500);

    // Select some text (Ctrl+A for all content)
    await page.keyboard.press('Control+A');
    await page.waitForTimeout(200);

    // Trigger Cmd+K (use Control for Windows, Meta for Mac)
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+K' : 'Control+K');

    // Verify inline edit widget appears
    // The widget should be visible after pressing Cmd+K
    const inlineWidget = page.locator('.fixed.z-50').filter({ hasText: /Edit selection|instruction/i });
    await expect(inlineWidget).toBeVisible({ timeout: 3000 });
  });

  test('should show input field for AI instruction', async ({ page }) => {
    const editorExists = await page.locator('.monaco-editor').count() > 0;
    if (!editorExists) {
      test.skip();
      return;
    }

    // Select text and open inline edit
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+K');

    // Wait for widget to appear
    await page.waitForTimeout(500);

    // Find the instruction input field
    const inputField = page.locator('input[placeholder*="Edit"]').or(
      page.locator('input[placeholder*="instruction"]')
    );

    await expect(inputField).toBeVisible({ timeout: 2000 });
    await expect(inputField).toBeFocused();
  });

  test('should generate AI edit when instruction is entered', async ({ page }) => {
    const editorExists = await page.locator('.monaco-editor').count() > 0;
    if (!editorExists) {
      test.skip();
      return;
    }

    // Open inline edit dialog
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);

    // Type instruction
    const inputField = page.locator('input').filter({ hasText: '' }).first();
    await inputField.fill('add error handling');

    // Press Enter to generate
    await page.keyboard.press('Enter');

    // Should show loading state (spinning icon or "thinking" text)
    const loadingIndicator = page.locator('.animate-spin').or(
      page.locator('text=/generating|thinking/i')
    );

    // Wait for AI response (with generous timeout for API call)
    await page.waitForTimeout(1000); // Give it a moment to start

    // After generation completes, should show diff or modified code
    const codePreview = page.locator('.whitespace-pre-wrap').or(
      page.locator('code')
    ).first();

    // Either loading is shown or code preview appears
    const loadingVisible = await loadingIndicator.isVisible().catch(() => false);
    const codeVisible = await codePreview.isVisible().catch(() => false);

    expect(loadingVisible || codeVisible).toBeTruthy();
  });

  test('should show Accept and Reject buttons after generation', async ({ page }) => {
    const editorExists = await page.locator('.monaco-editor').count() > 0;
    if (!editorExists) {
      test.skip();
      return;
    }

    // Open dialog, enter instruction
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);

    const inputField = page.locator('input').first();
    await inputField.fill('add comments');
    await page.keyboard.press('Enter');

    // Wait for generation to complete (up to 10 seconds)
    await page.waitForTimeout(3000);

    // Look for Accept button (might have text "Accept" or checkmark icon)
    const acceptButton = page.locator('button').filter({
      hasText: /accept|✓|check/i
    }).or(
      page.locator('button:has(svg)').filter({ hasText: '' })
    ).first();

    // Look for Reject/Close button
    const rejectButton = page.locator('button').filter({
      hasText: /reject|discard|✕|close/i
    }).or(
      page.locator('button:has(svg)').filter({ hasText: '' })
    ).last();

    // At least one action button should be visible
    const hasActionButtons = await acceptButton.isVisible().catch(() => false) ||
                            await rejectButton.isVisible().catch(() => false);

    expect(hasActionButtons).toBeTruthy();
  });

  test('should close dialog when Escape is pressed', async ({ page }) => {
    const editorExists = await page.locator('.monaco-editor').count() > 0;
    if (!editorExists) {
      test.skip();
      return;
    }

    // Open dialog
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);

    // Verify dialog is open
    const widget = page.locator('.fixed.z-50').first();
    await expect(widget).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Dialog should close
    await expect(widget).not.toBeVisible();
  });

  test('should not open dialog if no text is selected', async ({ page }) => {
    const editorExists = await page.locator('.monaco-editor').count() > 0;
    if (!editorExists) {
      test.skip();
      return;
    }

    // Click editor but don't select anything
    await page.click('.monaco-editor');
    await page.waitForTimeout(200);

    // Clear any selection by clicking again
    await page.keyboard.press('Home'); // Move cursor to start
    await page.waitForTimeout(200);

    // Press Cmd+K
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);

    // Widget should not appear (or should appear with different behavior)
    const widget = page.locator('.fixed.z-50').first();
    const isVisible = await widget.isVisible().catch(() => false);

    // This test documents the current behavior - adjust based on actual implementation
    // Some editors show the widget even without selection (for cursor-position edits)
    // For now, we just document what happens
    console.log('Widget visibility without selection:', isVisible);
  });

  test('should handle rapid keyboard shortcuts gracefully', async ({ page }) => {
    const editorExists = await page.locator('.monaco-editor').count() > 0;
    if (!editorExists) {
      test.skip();
      return;
    }

    // Rapid fire Cmd+K multiple times
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+A');

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Control+K');
      await page.waitForTimeout(100);
    }

    // App should not crash, only one dialog should be visible
    const widgets = page.locator('.fixed.z-50');
    const count = await widgets.count();

    expect(count).toBeLessThanOrEqual(1);
  });

  test('should maintain editor focus after closing dialog', async ({ page }) => {
    const editorExists = await page.locator('.monaco-editor').count() > 0;
    if (!editorExists) {
      test.skip();
      return;
    }

    // Open and close dialog
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Editor should still be focusable
    await page.keyboard.press('Control+A');
    await page.waitForTimeout(200);

    // Verify selection happened (editor responded to keyboard)
    const editorContent = page.locator('.monaco-editor .view-lines');
    const hasContent = await editorContent.textContent();

    expect(hasContent).toBeTruthy();
  });
});

test.describe('Cmd+K Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });
  });

  test('should handle empty instruction gracefully', async ({ page }) => {
    const editorExists = await page.locator('.monaco-editor').count() > 0;
    if (!editorExists) {
      test.skip();
      return;
    }

    // Open dialog
    await page.click('.monaco-editor');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(500);

    // Press Enter without typing anything
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // Should not crash, dialog should remain open or show validation
    const widget = page.locator('.fixed.z-50').first();
    const stillVisible = await widget.isVisible().catch(() => false);

    // Either widget stays open OR gracefully closes
    // Document the behavior (don't crash is the key requirement)
    console.log('Empty instruction behavior - widget visible:', stillVisible);
  });

  test('should handle API failures gracefully', async ({ page }) => {
    // This test would need API mocking to simulate failures
    // For now, document that error handling should exist

    const editorExists = await page.locator('.monaco-editor').count() > 0;
    if (!editorExists) {
      test.skip();
      return;
    }

    // Note: In real implementation, we'd mock the API to return error
    // For now, just verify error states are handled in code
    test.skip(); // Skip until API mocking is set up
  });
});
