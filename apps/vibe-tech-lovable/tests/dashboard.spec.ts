import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      type ElectronStore = {
        get: (key: string) => string | null;
        set: (key: string, value: string) => void;
      };

      const ensureStore = (): ElectronStore => ({
        get: (key: string) => window.localStorage.getItem(key),
        set: (key: string, value: string) => {
          window.localStorage.setItem(key, value);
        },
      });

      const globalWithElectron = window as Window & {
        electronAPI?: { store?: ElectronStore };
      };

      if (!globalWithElectron.electronAPI) {
        globalWithElectron.electronAPI = { store: ensureStore() };
        return;
      }

      if (!globalWithElectron.electronAPI.store) {
        globalWithElectron.electronAPI.store = ensureStore();
      }
    });

    await page.goto('/dashboard');
  });

  test('should display dashboard with metrics', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/crm|dashboard/i);

    const metricsGrid = page.locator('[data-testid="metrics-grid"]');
    const metricsCards = page.locator('[data-testid="metric-card"]');

    await expect(metricsGrid).toBeVisible();
    await expect(metricsCards).toHaveCount(4, { timeout: 10000 });

    await expect(metricsGrid.getByText('Total Leads')).toBeVisible();
    await expect(metricsGrid.getByText('New Leads Today')).toBeVisible();
    await expect(metricsGrid.getByText('Conversion Rate')).toBeVisible();
    await expect(metricsGrid.getByText('Avg Response Time')).toBeVisible();
  });

  test('should display leads table', async ({ page }) => {
    await page.getByRole('tab', { name: /^leads$/i }).click();
    await expect(page.locator('[data-testid="leads-content"]')).toBeVisible();

    const leadsTable = page.locator('[data-testid="leads-table"]');
    await expect(leadsTable).toBeVisible({ timeout: 15000 });

    const tableHeaders = leadsTable.locator('thead th');
    await expect(tableHeaders).toContainText(['Name', 'Email', 'Source', 'Status', 'Date', 'Actions']);
  });

  test('should allow adding new lead', async ({ page }) => {
    const uniqueEmail = `lane-a-${Date.now()}@example.com`;

    await expect(page.locator('[data-testid="metrics-grid"]')).toBeVisible();

    await page.getByRole('button', { name: /^add lead$/i }).first().click();

    const addLeadDialog = page.getByRole('dialog', { name: /add new lead/i });
    await expect(addLeadDialog).toBeVisible();

    await addLeadDialog.getByLabel('Name').fill('John Doe');
    await addLeadDialog.getByLabel('Email').fill(uniqueEmail);
    await addLeadDialog.getByRole('button', { name: /^add lead$/i }).click();

    await expect(addLeadDialog).toBeHidden({ timeout: 10000 });

    await page.getByRole('tab', { name: /^leads$/i }).click();
    await expect(page.locator('[data-testid="leads-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="leads-table"]')).toContainText(uniqueEmail, {
      timeout: 10000,
    });
  });

  test('should allow switching between tabs', async ({ page }) => {
    const overviewTab = page.getByRole('tab', { name: /^overview$/i });
    await overviewTab.click();
    await expect(page.locator('[data-testid="overview-content"]')).toBeVisible();

    const leadsTab = page.getByRole('tab', { name: /^leads$/i });
    await leadsTab.click();
    await expect(page.locator('[data-testid="leads-content"]')).toBeVisible();

    const analyticsTab = page.getByRole('tab', { name: /^analytics$/i });
    await analyticsTab.click();
    await expect(page.locator('[data-testid="analytics-content"]')).toBeVisible();
  });

  test('should keep dashboard usable when API calls fail', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.reload();

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/crm|dashboard/i);
    await expect(page.locator('[data-testid="metrics-grid"]')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const dashboardContent = page.locator('[data-testid="dashboard-content"]');
    const metricsGrid = page.locator('[data-testid="metrics-grid"]');

    await expect(dashboardContent).toBeVisible();
    await expect(metricsGrid).toBeVisible();

    const boundingBox = await metricsGrid.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBeLessThanOrEqual(375);
  });
});
