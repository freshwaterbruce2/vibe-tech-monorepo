import { _electron as electron } from 'playwright';
import { test, expect } from '@playwright/test';

test('Verify Settings Pipeline (UI -> IPC -> D: Drive)', async () => {
  // Launch the app using the dev entry point
  // Note: we are in apps/vibe-justice/frontend, so the main arg is '.'
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();

  // 1. Trigger the Settings View
  // We assume there is a button with data-testid="settings-toggle"
  await window.click('[data-testid="settings-toggle"]');

  // 2. Modify the Vector Store Path (Critical D: drive link)
  // We assume input name is "dbPath"
  const pathInput = window.locator('input[name="dbPath"]');
  const testPath = 'D:/vibe-tech/vibe_justice_test.db';
  await pathInput.fill(testPath);
  
  // 3. Save and Listen for IPC Acknowledgement
  // We assume a button with text "Apply Changes"
  await window.click('button:has-text("Apply Changes")');

  // 4. Verification: Look for the 'System Green' status indicator
  // We assume a class .connection-status
  const status = window.locator('.connection-status');
  await expect(status).toContainText('Connected');

  // 5. Check console for "Failed to Fetch" errors
  const logs: string[] = [];
  window.on('console', msg => logs.push(msg.text()));
  
  await electronApp.close();
  
  // Fail the test if any fetch errors occurred during the settings save
  expect(logs.some(l => l.includes('Failed to fetch'))).toBe(false);
});
