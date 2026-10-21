import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SettingsDialog from './settings-dialog.svelte';
import { createTimerState } from '$lib/state/timer.svelte';

function createDummyTicker(isRunning = false) {
	return {
		isRunning,
		start: vi.fn(),
		stop: vi.fn(),
		destroy: vi.fn()
	};
}

describe('SettingsDialog (Client Browser)', () => {
	it('closes itself when the timer transitions to running', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker());

		const screen = await render(SettingsDialog, { open: true, timerState });
		const dialog = screen.getByRole('dialog');
		await expect.element(dialog).toBeVisible();

		timerState.start();

		await expect.element(dialog).not.toBeInTheDocument();
	});

	it('stays open when it is opened while the timer is already running', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker());
		timerState.start();

		const screen = await render(SettingsDialog, { open: true, timerState });
		const dialog = screen.getByRole('dialog');

		await expect.element(dialog).toBeVisible();
	});
});
