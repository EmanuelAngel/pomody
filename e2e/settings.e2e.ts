import { test, expect, type Page } from '@playwright/test';

async function openSettings(page: Page) {
	await page.getByRole('button', { name: 'Open settings' }).click();
	// Not scoped by accessible name: the name itself changes when the locale does.
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	return dialog;
}

async function openGroup(dialog: ReturnType<Page['getByRole']>, name: string) {
	await dialog.getByRole('tab', { name }).click();
	await expect(dialog.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true');
}

test.describe('Settings dialog', () => {
	test('opens on the intervals group and closes with Escape', async ({ page }) => {
		await page.goto('/');

		const timerDisplay = page.getByRole('timer');
		await expect(timerDisplay).toHaveText('25:00');

		const dialog = await openSettings(page);

		await expect(dialog.getByRole('heading', { name: 'Settings' })).toBeVisible();

		// Every group is reachable from the rail, and intervals wins the first visit.
		await expect(dialog.getByRole('tab')).toHaveCount(5);
		await expect(dialog.getByRole('tab', { name: 'Intervals' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(dialog.getByLabel('Focus duration').getByRole('slider')).toHaveAttribute(
			'aria-valuenow',
			'25'
		);

		// Inactive groups are not mounted, so the dialog never carries all seven sections at once.
		await expect(dialog.getByRole('radio', { name: 'Dawn theme' })).toHaveCount(0);

		await page.keyboard.press('Escape');
		await expect(dialog).not.toBeVisible();
	});

	test('walks the rail with the keyboard and swaps the mounted group', async ({ page }) => {
		await page.goto('/');
		const dialog = await openSettings(page);

		const intervalsTab = dialog.getByRole('tab', { name: 'Intervals' });
		await intervalsTab.focus();

		await page.keyboard.press('ArrowDown');
		const appearanceTab = dialog.getByRole('tab', { name: 'Appearance' });
		await expect(appearanceTab).toHaveAttribute('aria-selected', 'true');
		await expect(dialog.getByRole('radio', { name: 'Dawn theme' })).toBeVisible();

		await page.keyboard.press('ArrowDown');
		await expect(dialog.getByRole('tab', { name: 'Companion' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(
			dialog.getByRole('switch', { name: 'Show the living companion illustration' })
		).toBeVisible();

		await page.keyboard.press('ArrowDown');
		await expect(dialog.getByRole('tab', { name: 'Behavior' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(dialog.getByRole('switch', { name: 'Sound alerts' })).toBeVisible();

		await page.keyboard.press('ArrowDown');
		await expect(dialog.getByRole('tab', { name: 'Application' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect(dialog.getByRole('radio', { name: 'Spanish language' })).toBeVisible();

		await page.keyboard.press('ArrowUp');
		await expect(dialog.getByRole('tab', { name: 'Behavior' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
	});

	test('updates the focus duration and counts down from the new configuration', async ({
		page
	}) => {
		await page.goto('/');
		const timerDisplay = page.getByRole('timer');
		await expect(timerDisplay).toHaveText('25:00');

		const dialog = await openSettings(page);
		const focusSlider = dialog.getByLabel('Focus duration').getByRole('slider');
		await expect(focusSlider).toHaveAttribute('aria-valuenow', '25');

		await focusSlider.focus();
		await page.keyboard.press('ArrowLeft');

		await expect(focusSlider).toHaveAttribute('aria-valuenow', '24');
		await expect(dialog.getByText('24 min', { exact: true })).toBeVisible();

		await dialog.getByRole('button', { name: 'Close' }).click();
		await expect(dialog).not.toBeVisible();
		await expect(timerDisplay).toHaveText('24:00');

		await page.getByRole('button', { name: 'Start timer' }).click();
		await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
		await expect(timerDisplay).toHaveText('23:59');
	});

	test('persists each group across reloads and scopes the reset to intervals', async ({ page }) => {
		await page.goto('/');
		let dialog = await openSettings(page);

		// Intervals
		const focusSlider = dialog.getByLabel('Focus duration').getByRole('slider');
		await focusSlider.focus();
		await page.keyboard.press('ArrowLeft');
		await expect(focusSlider).toHaveAttribute('aria-valuenow', '24');

		// Appearance
		await openGroup(dialog, 'Appearance');
		const dawnRadio = dialog.getByRole('radio', { name: 'Dawn theme' });
		await dawnRadio.click();
		await expect(dawnRadio).toHaveAttribute('data-state', 'on');

		// Behavior
		await openGroup(dialog, 'Behavior');
		const soundSwitch = dialog.getByRole('switch', { name: 'Sound alerts' });
		await expect(soundSwitch).toBeChecked();
		await soundSwitch.click();
		await expect(soundSwitch).not.toBeChecked();

		await dialog.getByRole('button', { name: 'Close' }).click();
		await expect(dialog).not.toBeVisible();

		const timerDisplay = page.getByRole('timer');
		await expect(timerDisplay).toHaveText('24:00');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dawn');

		await page.reload();
		await expect(timerDisplay).toHaveText('24:00');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dawn');

		dialog = await openSettings(page);
		await expect(dialog.getByLabel('Focus duration').getByRole('slider')).toHaveAttribute(
			'aria-valuenow',
			'24'
		);

		await openGroup(dialog, 'Appearance');
		await expect(dialog.getByRole('radio', { name: 'Dawn theme' })).toHaveAttribute(
			'data-state',
			'on'
		);

		await openGroup(dialog, 'Behavior');
		await expect(dialog.getByRole('switch', { name: 'Sound alerts' })).not.toBeChecked();

		// Resetting intervals must not reach into another group's switches.
		await openGroup(dialog, 'Intervals');
		await dialog.getByRole('button', { name: /Reset to defaults/i }).click();
		await expect(dialog.getByLabel('Focus duration').getByRole('slider')).toHaveAttribute(
			'aria-valuenow',
			'25'
		);

		await openGroup(dialog, 'Behavior');
		await expect(dialog.getByRole('switch', { name: 'Sound alerts' })).not.toBeChecked();

		await openGroup(dialog, 'Appearance');
		await expect(dialog.getByRole('radio', { name: 'Dawn theme' })).toHaveAttribute(
			'data-state',
			'on'
		);
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dawn');

		await dialog.getByRole('button', { name: 'Close' }).click();
		await expect(timerDisplay).toHaveText('25:00');

		await page.reload();
		await expect(timerDisplay).toHaveText('25:00');
		await expect(page.locator('html')).toHaveAttribute('data-theme', 'dawn');
	});

	test('keeps the ultradian 90/20 cadence across the dialog, the timer, and reloads', async ({
		page
	}) => {
		await page.goto('/');
		const timerDisplay = page.getByRole('timer');
		await expect(timerDisplay).toHaveText('25:00');

		await page.getByRole('tab', { name: 'Planning' }).click();
		await expect(page.getByRole('heading', { name: 'Planning' })).toBeVisible();
		await page.getByRole('button', { name: /90\/20/i }).click();

		const dialog = await openSettings(page);
		await expect(dialog.getByLabel('Focus duration').getByRole('slider')).toHaveAttribute(
			'aria-valuenow',
			'90'
		);
		await expect(dialog.getByText('90 min', { exact: true })).toBeVisible();
		await expect(dialog.getByLabel('Short break duration').getByRole('slider')).toHaveAttribute(
			'aria-valuenow',
			'20'
		);

		await dialog.getByRole('button', { name: 'Close' }).click();
		await expect(dialog).not.toBeVisible();

		await page.getByRole('tab', { name: 'Timer' }).click();
		await expect(timerDisplay).toHaveText('90:00');

		await page.reload();
		await expect(timerDisplay).toHaveText('90:00');

		const reopened = await openSettings(page);
		await expect(reopened.getByLabel('Focus duration').getByRole('slider')).toHaveAttribute(
			'aria-valuenow',
			'90'
		);
		await expect(reopened.getByLabel('Short break duration').getByRole('slider')).toHaveAttribute(
			'aria-valuenow',
			'20'
		);
	});

	test('disables the companion sub-options while the companion is off', async ({ page }) => {
		await page.goto('/');
		const dialog = await openSettings(page);
		await openGroup(dialog, 'Companion');

		const masterSwitch = dialog.getByRole('switch', {
			name: 'Show the living companion illustration'
		});
		const motionSwitch = dialog.getByRole('switch', {
			name: 'Enable ambient illustration motion'
		});
		const hideSwitch = dialog.getByRole('switch', {
			name: 'Hide the illustration while focusing'
		});

		await expect(masterSwitch).not.toBeChecked();
		await expect(motionSwitch).toBeDisabled();
		await expect(hideSwitch).toBeDisabled();
		await expect(dialog.getByRole('radio', { name: 'Desert' })).toBeDisabled();

		await masterSwitch.click();
		await expect(masterSwitch).toBeChecked();
		await expect(motionSwitch).toBeEnabled();
		await expect(dialog.getByRole('radio', { name: 'Desert' })).toBeEnabled();

		await dialog.getByRole('radio', { name: 'Desert' }).click();
		await expect(dialog.getByRole('radio', { name: 'Desert' })).toHaveAttribute('data-state', 'on');

		await masterSwitch.click();
		await expect(motionSwitch).toBeDisabled();
		await expect(dialog.getByRole('radio', { name: 'Desert' })).toHaveAttribute('data-state', 'on');
	});

	test('switches the interface language from the application group', async ({ page }) => {
		await page.goto('/');
		const dialog = await openSettings(page);

		await openGroup(dialog, 'Application');
		await dialog.getByRole('radio', { name: 'Spanish language' }).click();

		await expect(dialog.getByRole('tab', { name: 'Compañía' })).toBeVisible();
		await expect(dialog.getByRole('tab', { name: 'Apariencia' })).toBeVisible();

		await openGroup(dialog, 'Aplicación');
		await dialog.getByRole('radio', { name: /inglés|English/i }).click();
		await expect(dialog.getByRole('tab', { name: 'Companion' })).toBeVisible();
	});
});
