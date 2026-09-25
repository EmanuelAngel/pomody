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

	test('persists timer intervals, theme, and sound settings across page reloads', async ({
		page
	}) => {
		// 1. Visit /
		await page.goto('/');

		// 2. Open settings
		const openSettingsButton = page.getByRole('button', { name: 'Open settings' });
		await expect(openSettingsButton).toBeVisible();
		await openSettingsButton.click();

		const settingsHeading = page.getByRole('heading', { name: 'Settings' });
		await expect(settingsHeading).toBeVisible();

		// 3. Adjust focus: 25 min -> 24 min
		const focusSlider = page.getByLabel('Focus duration').getByRole('slider');
		await expect(focusSlider).toHaveAttribute('aria-valuenow', '25');
		await focusSlider.focus();
		await page.keyboard.press('ArrowLeft');
		await expect(focusSlider).toHaveAttribute('aria-valuenow', '24');
		await expect(page.getByText('24 min', { exact: true })).toBeVisible();

		// 4. Select Dawn theme
		const dawnRadio = page.getByRole('radio', { name: 'Dawn theme' });
		await dawnRadio.click();
		await expect(dawnRadio).toHaveAttribute('data-state', 'on');

		// 5. Toggle sound alerts switch to off
		const soundSwitch = page.getByRole('switch', { name: 'Sound alerts' });
		await expect(soundSwitch).toBeChecked();
		await soundSwitch.click();
		await expect(soundSwitch).not.toBeChecked();

		// 6. Close drawer, verify main timer displays 24:00, document.documentElement.dataset.theme === 'dawn'
		const closeButton = page.getByRole('button', { name: 'Close' });
		await closeButton.click();
		await expect(settingsHeading).not.toBeVisible();

		const timerDisplay = page.getByRole('timer');
		await expect(timerDisplay).toHaveText('24:00');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dawn');

		// 7. Reload page
		await page.reload();

		// 8. Verify main timer still displays 24:00, document data-theme is still 'dawn'
		await expect(timerDisplay).toHaveText('24:00');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dawn');

		// 9. Open settings drawer, verify focus slider is 24, dawn radio is selected, sound alerts switch is unchecked
		await openSettingsButton.click();
		await expect(settingsHeading).toBeVisible();

		const reloadedFocusSlider = page.getByLabel('Focus duration').getByRole('slider');
		await expect(reloadedFocusSlider).toHaveAttribute('aria-valuenow', '24');

		const reloadedDawnRadio = page.getByRole('radio', { name: 'Dawn theme' });
		await expect(reloadedDawnRadio).toHaveAttribute('data-state', 'on');

		const reloadedSoundSwitch = page.getByRole('switch', { name: 'Sound alerts' });
		await expect(reloadedSoundSwitch).not.toBeChecked();

		// 10. Click Reset to defaults button, verify timer resets to 25:00, sound switch is checked, but theme remains 'dawn'
		const resetButton = page.getByRole('button', { name: /Reset to defaults/i });
		await resetButton.click();

		await expect(reloadedFocusSlider).toHaveAttribute('aria-valuenow', '25');
		await expect(reloadedSoundSwitch).toBeChecked();
		await expect(reloadedDawnRadio).toHaveAttribute('data-state', 'on');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dawn');

		await closeButton.click();
		await expect(settingsHeading).not.toBeVisible();
		await expect(timerDisplay).toHaveText('25:00');

		// 11. Reload page, verify timer remains 25:00 and theme remains 'dawn'
		await page.reload();
		await expect(timerDisplay).toHaveText('25:00');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dawn');
	});
});
