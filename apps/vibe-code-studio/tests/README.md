# E2E Testing Guide - Vibe Code Studio

## Overview

This directory contains end-to-end (E2E) tests for Vibe Code Studio using Playwright. These tests verify the application's user interface and interaction flows.

## Test Files

- **`basic.spec.ts`** - Basic application launch and UI verification
- **`agent-mode-basic.spec.ts`** - Agent mode functionality tests
- **`agent-mode-comprehensive.spec.ts`** - Comprehensive agent mode tests
- **`ai-tab-completion.spec.ts`** - AI tab completion feature tests
- **`cmd-k-inline-editing.spec.ts`** - Cmd+K inline editing tests
- **`multi-file-approval.spec.ts`** - Multi-file edit approval panel tests

## Running Tests

### Option 1: Manual Dev Server (Recommended for Development)

Since Vibe Code Studio is an Electron application, the recommended approach for development is to run the dev server manually, then run tests against it:

```powershell
# Terminal 1: Start the development server
pnpm dev

# Terminal 2: Wait for app to fully load, then run tests
pnpm playwright test

# Run a specific test file
pnpm playwright test multi-file-approval.spec.ts

# Run in headed mode (see the browser)
pnpm playwright test --headed

# Run with UI mode (interactive)
pnpm playwright test --ui
```

### Option 2: Automated (CI/Production)

The Playwright config will attempt to start the dev server automatically:

```powershell
pnpm playwright test
```

**Note**: This may take longer as it waits for the Electron app to build and start.

## Multi-File Approval Tests

The `multi-file-approval.spec.ts` tests verify the Multi-File Edit Approval Panel component.

### Current Status

Most tests in this file are currently **skipped** (using `test.skip`) because they require an AI suggestion trigger to open the modal. The tests are fully implemented and ready to activate once the AI execution engine can trigger multi-file edit plans.

### Test Coverage

✅ **Implemented Tests** (currently skipped pending trigger mechanism):
- Modal structure and visibility
- File list with checkboxes
- Apply button shows selected file count
- Reject button closes modal
- Clicking overlay closes modal
- Toggle file selection
- Apply button disabled when no files selected
- Per-file accept button functionality
- Per-file reject button functionality

### Component Verification

The MultiFileEditApprovalPanel component is **fully implemented** with:
- ✅ Monaco DiffEditor for side-by-side code comparison
- ✅ File selection with checkboxes
- ✅ Per-file accept/reject buttons
- ✅ Bulk apply/reject actions
- ✅ Proper `data-testid` attributes for E2E testing
- ✅ Wired into AppLayout with state management
- ✅ Handler callbacks in useAppHandlers hook

### Activating Tests

To activate the tests once AI triggers are ready:

1. Remove the `.skip` suffix from test functions in `multi-file-approval.spec.ts`
2. Add a test helper to trigger the modal via AI execution engine:

```typescript
// Example helper function
async function triggerMultiFileEdit(page: Page) {
  // Send AI message that triggers multi-file edit plan
  await page.fill('[data-testid="ai-chat-input"]',
    'Refactor these components into a shared utility');
  await page.click('[data-testid="send-message"]');

  // Wait for multi-file approval modal to appear
  await page.waitForSelector('[data-testid="multi-file-approval"]');
}
```

3. Update test setup to call the trigger:

```typescript
test('shows file list with checkboxes', async ({ page }) => {
  await triggerMultiFileEdit(page); // Add this line

  const modal = page.locator('[data-testid="multi-file-approval"]');
  await expect(modal).toBeVisible();
  // ... rest of test
});
```

## Test Architecture

### Data Test IDs

All interactive elements use `data-testid` attributes for reliable E2E testing:

| Element | Test ID | Purpose |
|---------|---------|---------|
| Modal Container | `multi-file-approval` | Context isolation |
| Apply Button | `apply-button` | Bulk confirmation |
| Reject Button | `reject-button` | Bulk cancellation |
| Accept File Button | `accept-file-button` | Per-file approval |
| Reject File Button | `reject-file-button` | Per-file rejection |

### Best Practices

1. **Always use `data-testid`** for element selection in tests
2. **Wait for animations** - Use `waitForSelector` with appropriate timeouts
3. **Test user flows**, not implementation details
4. **Keep tests independent** - Each test should be runnable in isolation
5. **Use descriptive test names** that explain the expected behavior

## Troubleshooting

### "Timed out waiting for webServer"

The Electron app is taking too long to start. Solutions:
- Manually start the dev server first (`pnpm dev`)
- Set `reuseExistingServer: true` in `playwright.config.ts`
- Increase the timeout in `playwright.config.ts`

### "Element not found" errors

- Verify the `data-testid` attribute exists in the component
- Check if the element is visible (not hidden by CSS or conditional rendering)
- Add explicit waits: `await page.waitForSelector('[data-testid="..."]')`

### Tests pass locally but fail in CI

- Ensure consistent viewport sizes
- Add longer timeouts for slower CI environments
- Use `waitForLoadState('networkidle')` before assertions

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Electron Support](https://playwright.dev/docs/api/class-electron)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [High-Fidelity Agentic Editor Patterns KI](../../.gemini/antigravity/knowledge/high_fidelity_agentic_editor_patterns/)
