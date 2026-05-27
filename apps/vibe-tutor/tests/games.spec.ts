import { expect, test } from '@playwright/test';
import {
  openDashboard,
  prepareVibeTutorTestPage,
} from './e2eTestHarness';

test.describe('Vibe-Tutor Brain Gym & Games E2E', () => {
  test.beforeEach(async ({ page }) => {
    await prepareVibeTutorTestPage(page);
    await openDashboard(page);
  });

  test('navigates to Brain Gym and interacts with game elements', async ({ page }) => {
    // 1. Navigate to Brain Gym via navigation panel
    await page.getByRole('button', { name: /Brain Gym|Games/i }).first().click();
    
    // Verify Brain Gym Hub is visible
    const heading = page.locator('h2', { hasText: 'Brain Gym' }).first();
    await expect(heading).toBeVisible();

    // 2. Test Zone Filtering
    const challengeZoneBtn = page.getByRole('button', { name: '⚡ Challenge Zone' }).first();
    await expect(challengeZoneBtn).toBeVisible();
    await challengeZoneBtn.click();

    // 3. Launch Sudoku Game
    const playSudokuBtn = page.getByRole('button', { name: /Play Sudoku/i }).first();
    await expect(playSudokuBtn).toBeVisible();
    await playSudokuBtn.click();

    // Verify Sudoku Game has loaded
    const sudokuHeading = page.locator('h2', { hasText: 'Sudoku' });
    await expect(sudokuHeading).toBeVisible();

    // 4. Interact with the Sudoku board
    // Locate the first empty cell in the grid
    const emptyCell = page.locator('div.grid-cols-9 > div:not(.bg-gray-200)').first();
    await expect(emptyCell).toBeVisible();
    await emptyCell.click();

    // Click on a keypad number, say 5
    const numBtn = page.locator('button', { hasText: '5' }).first();
    await expect(numBtn).toBeVisible();
    await numBtn.click();

    // Verify cell holds the value
    await expect(emptyCell).toHaveText('5');

    // 5. Visual regression snapshot for Sudoku Game container
    const gameContainer = page.locator('.sudoku-game-container');
    if (await gameContainer.count() > 0) {
      await expect(gameContainer).toHaveScreenshot('sudoku-game-board.png', {
        mask: [page.locator('.timer'), page.locator('.sudoku-difficulty-level')],
      });
    }

    // Go back to Hub
    await page.getByRole('button', { name: 'Back' }).first().click();
    await expect(heading).toBeVisible();
  });
});
