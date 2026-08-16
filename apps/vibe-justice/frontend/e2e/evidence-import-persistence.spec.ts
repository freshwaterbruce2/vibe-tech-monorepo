import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { restartBackend } from './backend-harness'

const CASE_ID = 'E2E-EVIDENCE-RESTART-001'
const FILE_NAME = 'synthetic-phase-2b-evidence.txt'
const CONTENT = 'Synthetic evidence for local restart acceptance. No real case data.\n'
const SOURCE = 'Synthetic Playwright fixture'
const RECEIVED_FROM = 'Local E2E harness'
const NOTES = 'Generated in memory; no provider or network use.'
const SHA256 = createHash('sha256').update(CONTENT).digest('hex')

test.describe('Evidence import persistence', () => {
  test('imports a synthetic original and reopens it after reload and backend restart', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')

    await page.getByRole('button', { name: 'New Investigation' }).click()
    const createDialog = page.getByRole('dialog', { name: 'New Investigation' })
    await createDialog.getByLabel('Case ID').fill(CASE_ID)
    await createDialog.getByLabel('Jurisdiction').fill('South Carolina')
    await createDialog.getByLabel('Research goals').fill('Synthetic Phase 2B restart acceptance only.')
    await createDialog.getByRole('button', { name: 'Create case' }).click()
    await expect(createDialog).toBeHidden()

    await page.getByRole('button', { name: 'Evidence', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Evidence', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Import evidence' }).click()
    const importDialog = page.getByRole('dialog', { name: 'Import evidence' })
    await importDialog.locator('input[type="file"]').setInputFiles({
      name: FILE_NAME,
      mimeType: 'text/plain',
      buffer: Buffer.from(CONTENT),
    })
    await importDialog.getByLabel('Source label *').fill(SOURCE)
    await importDialog.getByLabel('Received from or source description').fill(RECEIVED_FROM)
    await importDialog.getByLabel('Notes').fill(NOTES)
    await importDialog.getByRole('button', { name: 'Import original' }).click()
    await expect(importDialog).toBeHidden()

    const card = page.getByRole('article').filter({ hasText: FILE_NAME })
    await expect(card).toContainText(SOURCE)
    await expect(card).toContainText(RECEIVED_FROM)
    await expect(card).toContainText(NOTES)
    await expect(card).toContainText('Ready')
    await expect(card.getByTitle(SHA256)).toBeVisible()

    await page.reload()
    await page.getByRole('button', { name: 'Evidence', exact: true }).click()
    await expect(page.getByRole('article').filter({ hasText: FILE_NAME })).toContainText('Ready')

    const restart = await restartBackend()
    expect(restart.after).not.toBe(restart.before)
    await page.reload()
    await page.getByRole('navigation').locator('..').hover()
    await expect(page.getByRole('button', { name: new RegExp(`^${CASE_ID}\\s+Current$`) })).toHaveAttribute('aria-current', 'true')
    await page.getByRole('button', { name: 'Evidence', exact: true }).click()
    const reopenedCard = page.getByRole('article').filter({ hasText: FILE_NAME })
    await expect(reopenedCard).toContainText(SOURCE)
    await expect(reopenedCard).toContainText(RECEIVED_FROM)
    await expect(reopenedCard).toContainText('Ready')
    await expect(reopenedCard.getByTitle(SHA256)).toBeVisible()
  })
})
