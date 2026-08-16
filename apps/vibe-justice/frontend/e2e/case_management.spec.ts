import { expect, test } from '@playwright/test'

const CASE_ID = 'E2E-CASE-CURRENT-001'

test.describe('Case management persistence', () => {
  test('creates, restores current selection, archives, and restores a synthetic case', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await page.goto('/')
    await expect(page).toHaveTitle(/Vibe Justice/)

    await page.getByRole('button', { name: 'New Investigation' }).click()
    const createDialog = page.getByRole('dialog', { name: 'New Investigation' })
    await expect(createDialog).toBeVisible()
    await createDialog.getByLabel('Case ID').fill(CASE_ID)
    await createDialog.getByLabel('Jurisdiction').fill('South Carolina')
    await createDialog
      .getByLabel('Research goals')
      .fill('Synthetic local-only Playwright verification. No provider calls.')
    await createDialog.getByRole('button', { name: 'Create case' }).click()

    await expect(createDialog).toBeHidden()
    const currentCaseButton = page.getByRole('button', {
      name: new RegExp(`^${CASE_ID}\\s+Current$`),
    })
    await expect(currentCaseButton).toHaveAttribute('aria-current', 'true')

    await page.reload()
    await page.getByRole('navigation').locator('..').hover()
    await expect(
      page.getByRole('button', { name: new RegExp(`^${CASE_ID}\\s+Current$`) })
    ).toHaveAttribute('aria-current', 'true')

    await page.getByTitle('Archive Case').click()
    await expect(page.getByText(CASE_ID, { exact: true })).toBeHidden()
    await expect(page.getByText('Current', { exact: true })).toBeHidden()

    await page.getByRole('button', { name: 'Settings' }).click()
    const settingsDialog = page.getByRole('dialog', { name: 'System Configuration' })
    await page.locator('button.w-10.h-5').click()
    await page.getByRole('button', { name: 'Save Configuration' }).click()

    await expect(page.getByText(CASE_ID, { exact: true })).toBeVisible()
    await page.getByTitle('Restore Case').click()
    await expect(page.getByTitle('Archive Case')).toBeVisible()

    await page.getByRole('button', { name: CASE_ID, exact: true }).click()
    await expect(
      page.getByRole('button', { name: new RegExp(`^${CASE_ID}\\s+Current$`) })
    ).toHaveAttribute('aria-current', 'true')
  })
})
