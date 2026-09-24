import { test, expect } from '@playwright/test';

test.describe('Settings Drawer Integration', () => {
	test('updates timer focus duration and counts down from new configuration', async ({ page }) => {
		// 1. Navigate to Pomody root
		await page.goto('/');

		// 2. Initial state: timer shows 25:00 focus time
		const timerDisplay = page.getByRole('timer');
		await expect(timerDisplay).toBeVisible();
		await expect(timerDisplay).toHaveText('25:00');

		// 3. Open settings drawer
		const openSettingsButton = page.getByRole('button', { name: 'Open settings' });
		await expect(openSettingsButton).toBeVisible();
		await openSettingsButton.click();

		// 4. Drawer content is visible
		const settingsHeading = page.getByRole('heading', { name: 'Settings' });
		await expect(settingsHeading).toBeVisible();

		// 5. Locate Focus duration slider and adjust: 25 min -> 24 min
		const focusSlider = page.getByLabel('Focus duration').getByRole('slider');
		await expect(focusSlider).toHaveAttribute('aria-valuenow', '25');

		await focusSlider.focus();
		await page.keyboard.press('ArrowLeft');

		await expect(focusSlider).toHaveAttribute('aria-valuenow', '24');
		await expect(page.getByText('24 min', { exact: true })).toBeVisible();

		// 6. Close drawer via close button
		const closeButton = page.getByRole('button', { name: 'Close' });
		await closeButton.click();
		await expect(settingsHeading).not.toBeVisible();

		// 7. Verify main timer screen updated to 24:00
		await expect(timerDisplay).toHaveText('24:00');

		// 8. Start timer
		const startButton = page.getByRole('button', { name: 'Start timer' });
		await expect(startButton).toBeVisible();
		await startButton.click();

		// 9. Controls switch to Pause state and countdown decrements
		await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
		await expect(timerDisplay).toHaveText('23:59');
	});
});
