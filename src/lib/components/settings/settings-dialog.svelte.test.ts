import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SettingsDialog from './settings-dialog.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createUpdateState } from '$lib/state/update.svelte';
import { FakeUpdateChecker } from '$tests/fakes/platform/fake-update-checker';
import type { UpdateInfo } from '$lib/domain/ports/update-checker.port';

const UPDATE: UpdateInfo = {
	version: '0.20.0',
	notes: '### Features\n- Auto update',
	publishedAt: '2026-10-23T12:00:00Z'
};

function createUpdateHarness(options: { isSupported?: boolean } = {}) {
	const checker = new FakeUpdateChecker({ isSupported: options.isSupported });
	checker.nextCheck = UPDATE;
	const updateState = createUpdateState({ checker, timer: { state: 'idle' } });

	return { checker, updateState };
}

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

	it('opens on the Intervals tab by default', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker());

		const screen = await render(SettingsDialog, { open: true, timerState });
		const intervalsTab = screen.getByRole('tab', { name: 'Intervals' });

		await expect.element(intervalsTab).toBeVisible();
		await expect.element(intervalsTab).toHaveAttribute('aria-selected', 'true');
	});

	it('opens on the Application tab when the caller asks for it', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker());

		const screen = await render(SettingsDialog, {
			open: true,
			timerState,
			initialTab: 'application'
		});
		const applicationTab = screen.getByRole('tab', { name: 'Application' });

		await expect.element(applicationTab).toHaveAttribute('aria-selected', 'true');
		await expect
			.element(screen.getByRole('tab', { name: 'Intervals' }))
			.toHaveAttribute('aria-selected', 'false');
	});

	it('lists the Metrics tab and renders its panel when selected', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker());

		const screen = await render(SettingsDialog, { open: true, timerState });
		const metricsTab = screen.getByRole('tab', { name: 'Metrics' });
		await metricsTab.click();

		await expect.element(metricsTab).toHaveAttribute('aria-selected', 'true');
		await expect
			.element(screen.getByRole('spinbutton', { name: 'Daily focus goal in minutes' }))
			.toBeVisible();
	});

	it('opens straight on the Metrics tab when the caller asks for it', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker());

		const screen = await render(SettingsDialog, {
			open: true,
			timerState,
			initialTab: 'metrics'
		});

		await expect
			.element(screen.getByRole('tab', { name: 'Metrics' }))
			.toHaveAttribute('aria-selected', 'true');
		await expect.element(screen.getByRole('button', { name: 'Delete history' })).toBeVisible();
	});

	it('renders the updater section on a platform that can update itself', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker());
		const { updateState } = createUpdateHarness();
		await updateState.checkNow();

		const screen = await render(SettingsDialog, {
			open: true,
			timerState,
			updateState,
			initialTab: 'application'
		});

		await expect.element(screen.getByRole('heading', { name: 'Updates' })).toBeVisible();
		await expect.element(screen.getByText('Version 0.20.0 is available.')).toBeVisible();
	});

	it('renders no updater section when the platform cannot update itself', async () => {
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, createDummyTicker());
		const { updateState } = createUpdateHarness({ isSupported: false });
		await updateState.checkNow();

		const screen = await render(SettingsDialog, {
			open: true,
			timerState,
			updateState,
			initialTab: 'application'
		});

		expect(screen.getByRole('heading', { name: 'Updates' }).query()).toBeNull();
	});
});
