/**
 * End-to-End Production Workflow Tests
 * Tests complete user onboarding, subscription, and daily shipping operations
 */

import { test, expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Test data generators
const generateTestUser = () => ({
  email: faker.internet.email({ provider: 'warehouse.com' }),
  password: 'TestPassword123!',
  name: faker.person.fullName(),
  warehouseId: 'DC8980',
  role: faker.helpers.arrayElement(['operator', 'supervisor', 'manager'])
});

const generateDoorEntry = () => ({
  doorNumber: faker.number.int({ min: 332, max: 454 }),
  destination: faker.helpers.arrayElement(['6024', '6070', '6039', '6040', '7045']),
  freightType: faker.helpers.arrayElement(['23/43', '28', 'XD']),
  trailerStatus: faker.helpers.arrayElement(['partial', 'empty', 'shipload'])
});

// Page Object Models
class WelcomeWizardPage {
  constructor(private page: Page) {}

  async navigateToWelcome() {
    await this.page.goto('/');
    // Assuming first-time users see welcome wizard
    await expect(this.page.locator('[data-testid="welcome-wizard"]')).toBeVisible();
  }

  async completeProfileSetup(userData: ReturnType<typeof generateTestUser>) {
    await this.page.fill('[data-testid="user-name-input"]', userData.name);
    await this.page.selectOption('[data-testid="role-select"]', userData.role);
    await this.page.fill('[data-testid="warehouse-id-input"]', userData.warehouseId);
    await this.page.click('[data-testid="continue-profile-button"]');
  }

  async completeTenantSetup() {
    await this.page.fill('[data-testid="tenant-name-input"]', 'DC8980 Shipping Department');
    await this.page.fill('[data-testid="organization-input"]', 'Walmart Distribution Center');
    await this.page.click('[data-testid="continue-tenant-button"]');
  }

  async selectSubscriptionPlan(planId: 'starter' | 'professional' | 'enterprise') {
    await this.page.click(`[data-testid="plan-${planId}"]`);
    await this.page.click('[data-testid="subscribe-button"]');
  }

  async completePayment() {
    // This would redirect to Square checkout in real scenario
    // For testing, we'll mock the successful payment return
    await this.page.waitForURL('**/payment-success**');
    await expect(this.page.locator('[data-testid="payment-success"]')).toBeVisible();
  }

  async finishWelcome() {
    await this.page.click('[data-testid="finish-setup-button"]');
    await this.page.waitForURL('**/dashboard**');
  }
}

class AuthenticationPage {
  constructor(private page: Page) {}

  async signUp(userData: ReturnType<typeof generateTestUser>) {
    await this.page.goto('/auth/signup');
    await this.page.fill('[data-testid="email-input"]', userData.email);
    await this.page.fill('[data-testid="password-input"]', userData.password);
    await this.page.fill('[data-testid="confirm-password-input"]', userData.password);
    await this.page.click('[data-testid="signup-button"]');

    // Wait for email verification (mocked in test environment)
    await expect(this.page.locator('[data-testid="email-verification-sent"]')).toBeVisible();
  }

  async signIn(email: string, password: string) {
    await this.page.goto('/auth/signin');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="signin-button"]');
    await this.page.waitForURL('**/dashboard**');
  }

  async signOut() {
    await this.page.click('[data-testid="user-menu-trigger"]');
    await this.page.click('[data-testid="sign-out-button"]');
    await this.page.waitForURL('**/auth/signin**');
  }
}

class ShippingDashboardPage {
  constructor(private page: Page) {}

  async addDoorEntry(doorData: ReturnType<typeof generateDoorEntry>) {
    await this.page.fill('[data-testid="door-number-input"]', doorData.doorNumber.toString());
    await this.page.selectOption('[data-testid="destination-select"]', doorData.destination);
    await this.page.click(`[data-testid="freight-type-${doorData.freightType}"]`);
    await this.page.click(`[data-testid="trailer-status-${doorData.trailerStatus}"]`);
    await this.page.click('[data-testid="add-door-button"]');

    // Verify door was added
    await expect(
      this.page.locator(`[data-testid="door-entry-${doorData.doorNumber}"]`)
    ).toBeVisible();
  }

  async deleteDoorEntry(doorNumber: number) {
    await this.page.click(`[data-testid="delete-door-${doorNumber}"]`);
    await this.page.click('[data-testid="confirm-delete-button"]');

    // Verify door was removed
    await expect(
      this.page.locator(`[data-testid="door-entry-${doorNumber}"]`)
    ).not.toBeVisible();
  }

  async enableVoiceCommands() {
    await this.page.click('[data-testid="voice-commands-toggle"]');
    await expect(this.page.locator('[data-testid="voice-status-active"]')).toBeVisible();
  }

  async executeVoiceCommand(command: string) {
    // Mock voice input since we can't actually speak in tests
    await this.page.evaluate((cmd) => {
      window.dispatchEvent(new CustomEvent('mock-voice-command', { detail: cmd }));
    }, command);
  }

  async exportData() {
    await this.page.click('[data-testid="export-menu-trigger"]');
    await this.page.click('[data-testid="export-csv-button"]');

    // Wait for download to complete
    const download = await this.page.waitForEvent('download');
    expect(download.suggestedFilename()).toMatch(/door-entries-.*\.csv/);
  }
}

class PalletCounterPage {
  constructor(private page: Page) {}

  async navigateToPalletCounter() {
    await this.page.click('[data-testid="nav-pallet-counter"]');
    await this.page.waitForURL('**/pallets**');
  }

  async addPalletCount(doorNumber: number, count: number) {
    await this.page.fill('[data-testid="pallet-door-input"]', doorNumber.toString());
    await this.page.fill('[data-testid="pallet-count-input"]', count.toString());
    await this.page.click('[data-testid="add-pallet-button"]');

    // Verify pallet count was added
    await expect(
      this.page.locator(`[data-testid="pallet-entry-${doorNumber}"]`)
    ).toContainText(count.toString());
  }

  async updatePalletCount(doorNumber: number, newCount: number) {
    await this.page.click(`[data-testid="edit-pallet-${doorNumber}"]`);
    await this.page.fill('[data-testid="pallet-count-edit-input"]', newCount.toString());
    await this.page.click('[data-testid="save-pallet-edit-button"]');

    await expect(
      this.page.locator(`[data-testid="pallet-entry-${doorNumber}"]`)
    ).toContainText(newCount.toString());
  }
}

class SettingsPage {
  constructor(private page: Page) {}

  async navigateToSettings() {
    await this.page.click('[data-testid="nav-settings"]');
    await this.page.waitForURL('**/settings**');
  }

  async updateProfile(name: string) {
    await this.page.fill('[data-testid="profile-name-input"]', name);
    await this.page.click('[data-testid="save-profile-button"]');

    await expect(this.page.locator('[data-testid="profile-saved-toast"]')).toBeVisible();
  }

  async configureVoiceSettings(confidence: number, noiseSuppression: boolean) {
    await this.page.click('[data-testid="interaction-settings-tab"]');
    await this.page.fill('[data-testid="voice-confidence-input"]', confidence.toString());

    if (noiseSuppression) {
      await this.page.check('[data-testid="noise-suppression-checkbox"]');
    } else {
      await this.page.uncheck('[data-testid="noise-suppression-checkbox"]');
    }

    await this.page.click('[data-testid="save-voice-settings-button"]');
  }

  async manageSubscription() {
    await this.page.click('[data-testid="subscription-tab"]');
    await expect(this.page.locator('[data-testid="current-plan"]')).toBeVisible();
  }
}

// Test Suite
test.describe('Production Workflow Tests', () => {
  let testUser: ReturnType<typeof generateTestUser>;
  let welcomeWizard: WelcomeWizardPage;
  let auth: AuthenticationPage;
  let dashboard: ShippingDashboardPage;
  let palletCounter: PalletCounterPage;
  let settings: SettingsPage;

  test.beforeEach(async ({ page }) => {
    testUser = generateTestUser();
    welcomeWizard = new WelcomeWizardPage(page);
    auth = new AuthenticationPage(page);
    dashboard = new ShippingDashboardPage(page);
    palletCounter = new PalletCounterPage(page);
    settings = new SettingsPage(page);

    // Set up test environment
    await page.addInitScript(() => {
      // Mock Firebase config for testing
      window.localStorage.setItem('firebase-config-test', 'true');

      // Mock successful payment responses
      window.addEventListener('mock-payment-success', () => {
        window.location.href = '/payment-success';
      });

      // Mock voice command recognition
      window.addEventListener('mock-voice-command', (event: any) => {
        const command = event.detail;
        window.dispatchEvent(new CustomEvent('voice-command-recognized', {
          detail: { transcript: command, confidence: 0.95 }
        }));
      });
    });
  });

  test.describe('Complete User Onboarding Flow', () => {
    test('should complete full onboarding for new user', async ({ page }) => {
      // 1. User arrives at application for first time
      await welcomeWizard.navigateToWelcome();

      // 2. Complete profile setup
      await welcomeWizard.completeProfileSetup(testUser);

      // 3. Set up tenant organization
      await welcomeWizard.completeTenantSetup();

      // 4. Select subscription plan
      await welcomeWizard.selectSubscriptionPlan('professional');

      // 5. Complete payment (mocked)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-payment-success'));
      });
      await welcomeWizard.completePayment();

      // 6. Finish welcome flow
      await welcomeWizard.finishWelcome();

      // 7. Verify user is now on main dashboard
      await expect(page.locator('[data-testid="shipping-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText(testUser.name);
    });

    test('should handle subscription plan selection and features', async ({ page }) => {
      await welcomeWizard.navigateToWelcome();
      await welcomeWizard.completeProfileSetup(testUser);
      await welcomeWizard.completeTenantSetup();

      // Test different plan selections
      const plans = ['starter', 'professional', 'enterprise'] as const;

      for (const plan of plans) {
        await page.reload();
        await welcomeWizard.selectSubscriptionPlan(plan);

        // Verify plan features are displayed correctly
        await expect(page.locator(`[data-testid="${plan}-features"]`)).toBeVisible();

        if (plan === 'starter') {
          await expect(page.locator('[data-testid="max-users"]')).toContainText('5');
          await expect(page.locator('[data-testid="multi-shift"]')).toContainText('Not included');
        } else if (plan === 'enterprise') {
          await expect(page.locator('[data-testid="max-users"]')).toContainText('Unlimited');
          await expect(page.locator('[data-testid="priority-support"]')).toContainText('Included');
        }
      }
    });
  });

  test.describe('Authentication and Session Management', () => {
    test('should handle complete authentication flow', async ({ page }) => {
      // 1. Sign up new user
      await auth.signUp(testUser);

      // 2. Simulate email verification (in real app, user would click email link)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-email-verified'));
      });

      // 3. Sign in with verified account
      await auth.signIn(testUser.email, testUser.password);

      // 4. Verify user is signed in
      await expect(page.locator('[data-testid="user-menu-trigger"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-email"]')).toContainText(testUser.email);

      // 5. Sign out
      await auth.signOut();

      // 6. Verify sign out
      await expect(page.locator('[data-testid="signin-form"]')).toBeVisible();
    });

    test('should persist session across page reloads', async ({ page }) => {
      await auth.signIn(testUser.email, testUser.password);

      // Reload page
      await page.reload();

      // Should still be signed in
      await expect(page.locator('[data-testid="shipping-dashboard"]')).toBeVisible();
    });

    test('should handle authentication errors gracefully', async ({ page }) => {
      // Test invalid credentials
      await page.goto('/auth/signin');
      await page.fill('[data-testid="email-input"]', 'invalid@email.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="signin-button"]');

      await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="auth-error"]')).toContainText('Invalid credentials');
    });
  });

  test.describe('Daily Shipping Operations', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in user for shipping operations tests
      await auth.signIn(testUser.email, testUser.password);
    });

    test('should handle complete shipping workflow', async ({ page }) => {
      // 1. Add multiple door entries
      const doorEntries = Array.from({ length: 5 }, generateDoorEntry);

      for (const doorData of doorEntries) {
        await dashboard.addDoorEntry(doorData);
      }

      // 2. Navigate to pallet counter and add pallet counts
      await palletCounter.navigateToPalletCounter();

      for (const doorData of doorEntries) {
        const palletCount = faker.number.int({ min: 10, max: 50 });
        await palletCounter.addPalletCount(doorData.doorNumber, palletCount);
      }

      // 3. Update some pallet counts
      const updatedCount = faker.number.int({ min: 51, max: 75 });
      await palletCounter.updatePalletCount(doorEntries[0].doorNumber, updatedCount);

      // 4. Navigate back to shipping dashboard
      await page.click('[data-testid="nav-shipping"]');

      // 5. Export all data
      await dashboard.exportData();

      // 6. Verify all data is present
      for (const doorData of doorEntries) {
        await expect(
          page.locator(`[data-testid="door-entry-${doorData.doorNumber}"]`)
        ).toBeVisible();
      }
    });

    test('should handle voice commands for shipping operations', async ({ page }) => {
      await dashboard.enableVoiceCommands();

      // Test adding doors via voice
      await dashboard.executeVoiceCommand('door 335');
      await expect(page.locator('[data-testid="door-entry-335"]')).toBeVisible();

      // Test adding door range via voice
      await dashboard.executeVoiceCommand('doors 340 to 342');
      await expect(page.locator('[data-testid="door-entry-340"]')).toBeVisible();
      await expect(page.locator('[data-testid="door-entry-341"]')).toBeVisible();
      await expect(page.locator('[data-testid="door-entry-342"]')).toBeVisible();

      // Test deleting door via voice
      await dashboard.executeVoiceCommand('delete door 335');
      await expect(page.locator('[data-testid="door-entry-335"]')).not.toBeVisible();

      // Test export via voice
      await dashboard.executeVoiceCommand('export data');
      const download = await page.waitForEvent('download');
      expect(download.suggestedFilename()).toMatch(/door-entries-.*\.csv/);
    });

    test('should handle error scenarios gracefully', async ({ page }) => {
      // Test duplicate door entry
      const doorData = generateDoorEntry();
      await dashboard.addDoorEntry(doorData);

      // Try to add same door again
      await dashboard.addDoorEntry(doorData);
      await expect(page.locator('[data-testid="duplicate-door-error"]')).toBeVisible();

      // Test invalid door number
      await page.fill('[data-testid="door-number-input"]', '999');
      await page.click('[data-testid="add-door-button"]');
      await expect(page.locator('[data-testid="invalid-door-error"]')).toBeVisible();
    });
  });

  test.describe('Settings and Configuration', () => {
    test.beforeEach(async ({ page }) => {
      await auth.signIn(testUser.email, testUser.password);
    });

    test('should update user profile settings', async ({ page }) => {
      await settings.navigateToSettings();

      const newName = faker.person.fullName();
      await settings.updateProfile(newName);

      // Verify name change is reflected in UI
      await page.click('[data-testid="nav-shipping"]');
      await expect(page.locator('[data-testid="user-name-display"]')).toContainText(newName);
    });

    test('should configure voice command settings', async ({ page }) => {
      await settings.navigateToSettings();

      await settings.configureVoiceSettings(0.8, true);

      // Navigate back to shipping and test voice commands with new settings
      await page.click('[data-testid="nav-shipping"]');
      await dashboard.enableVoiceCommands();

      // Voice commands should now require higher confidence
      await dashboard.executeVoiceCommand('door 350');
      await expect(page.locator('[data-testid="door-entry-350"]')).toBeVisible();
    });

    test('should display subscription information', async ({ page }) => {
      await settings.navigateToSettings();
      await settings.manageSubscription();

      // Verify subscription details are displayed
      await expect(page.locator('[data-testid="current-plan"]')).toBeVisible();
      await expect(page.locator('[data-testid="billing-cycle"]')).toContainText('Monthly');
      await expect(page.locator('[data-testid="next-billing-date"]')).toBeVisible();
    });
  });

  test.describe('Offline and PWA Functionality', () => {
    test.beforeEach(async ({ page }) => {
      await auth.signIn(testUser.email, testUser.password);
    });

    test('should work offline and sync when online', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);

      // Add door entries while offline
      const offlineDoorData = generateDoorEntry();
      await dashboard.addDoorEntry(offlineDoorData);

      // Verify door appears with offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(
        page.locator(`[data-testid="door-entry-${offlineDoorData.doorNumber}"]`)
      ).toBeVisible();

      // Go back online
      await context.setOffline(false);

      // Wait for sync
      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });

    test('should display PWA install prompt', async ({ page }) => {
      // Simulate beforeinstallprompt event
      await page.evaluate(() => {
        const event = new Event('beforeinstallprompt');
        Object.defineProperty(event, 'userChoice', {
          value: Promise.resolve({ outcome: 'accepted' })
        });
        window.dispatchEvent(event);
      });

      await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible();

      // Test install prompt interaction
      await page.click('[data-testid="install-pwa-button"]');
      await expect(page.locator('[data-testid="pwa-installed-toast"]')).toBeVisible();
    });
  });

  test.describe('Multi-tenant Data Isolation', () => {
    let secondUser: ReturnType<typeof generateTestUser>;

    test.beforeEach(async ({ page }) => {
      secondUser = generateTestUser();
    });

    test('should isolate data between different tenants', async ({ page, context }) => {
      // Sign in as first user and add data
      await auth.signIn(testUser.email, testUser.password);
      const firstUserDoorData = generateDoorEntry();
      await dashboard.addDoorEntry(firstUserDoorData);

      // Sign out first user
      await auth.signOut();

      // Create and sign in second user (different tenant)
      await auth.signUp(secondUser);
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('mock-email-verified'));
      });
      await auth.signIn(secondUser.email, secondUser.password);

      // Second user should not see first user's data
      await expect(
        page.locator(`[data-testid="door-entry-${firstUserDoorData.doorNumber}"]`)
      ).not.toBeVisible();

      // Add data as second user
      const secondUserDoorData = generateDoorEntry();
      await dashboard.addDoorEntry(secondUserDoorData);

      // Sign out second user and back in as first user
      await auth.signOut();
      await auth.signIn(testUser.email, testUser.password);

      // First user should see their data but not second user's data
      await expect(
        page.locator(`[data-testid="door-entry-${firstUserDoorData.doorNumber}"]`)
      ).toBeVisible();
      await expect(
        page.locator(`[data-testid="door-entry-${secondUserDoorData.doorNumber}"]`)
      ).not.toBeVisible();
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test.beforeEach(async ({ page }) => {
      await auth.signIn(testUser.email, testUser.password);
    });

    test('should handle network errors gracefully', async ({ page, context }) => {
      // Simulate network failure during operation
      await context.route('**/*', route => route.abort());

      // Try to add door entry
      const doorData = generateDoorEntry();
      await dashboard.addDoorEntry(doorData);

      // Should show network error message
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();

      // Restore network
      await context.unroute('**/*');

      // Should automatically retry and succeed
      await expect(page.locator('[data-testid="network-error"]')).not.toBeVisible();
      await expect(
        page.locator(`[data-testid="door-entry-${doorData.doorNumber}"]`)
      ).toBeVisible();
    });

    test('should handle JavaScript errors without crashing', async ({ page }) => {
      // Inject an error into the page
      await page.evaluate(() => {
        throw new Error('Simulated runtime error');
      });

      // Application should still be functional
      const doorData = generateDoorEntry();
      await dashboard.addDoorEntry(doorData);

      await expect(
        page.locator(`[data-testid="door-entry-${doorData.doorNumber}"]`)
      ).toBeVisible();
    });
  });
});