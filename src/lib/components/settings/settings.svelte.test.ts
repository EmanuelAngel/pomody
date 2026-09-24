import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import SettingsTrigger from './settings-trigger.svelte';
import SettingsDrawer from './settings-drawer.svelte';
import SettingsTestHost from './settings-test-host.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createThemeState } from '$lib/state/theme.svelte';
import { DEFAULT_TIMER_CONFIG } from '$lib/domain/timer/timer-fsm';

function createDummyTicker(isRunning = false) {
	return {
		isRunning,
		start: vi.fn(),
		stop: vi.fn(),
		destroy: vi.fn()
	};
}

describe('SettingsTrigger (Client Browser)', () => {
	it('renders visible and accessible trigger button during idle state', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);

		const screen = await render(SettingsTrigger, { timerState });
		const button = screen.getByRole('button', { name: 'Open settings' });

		await expect.element(button).toBeVisible();
		expect(button.element().hasAttribute('disabled')).toBe(false);
		expect(button.element().className).toContain('opacity-100');
		expect(button.element().className).toContain('pointer-events-auto');
		expect(button.element().getAttribute('aria-expanded')).toBe('false');
	});

	it('triggers onclick callback when clicked', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const onclick = vi.fn();

		const screen = await render(SettingsTrigger, { timerState, onclick });
		const button = screen.getByRole('button', { name: 'Open settings' });

		await button.click();
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it('fades out and disables button in Zen mode when timer is running', async () => {
		const ticker = createDummyTicker(true);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		timerState.start();

		const screen = await render(SettingsTrigger, { timerState });
		const button = screen.getByRole('button', { name: 'Open settings', includeHidden: true });

		expect(button.element().hasAttribute('disabled')).toBe(true);
		expect(button.element().getAttribute('aria-hidden')).toBe('true');
		expect(button.element().getAttribute('tabindex')).toBe('-1');
		expect(button.element().className).toContain('opacity-0');
		expect(button.element().className).toContain('pointer-events-none');
	});

	it('restores visibility and interactivity when timer pauses', async () => {
		const ticker = createDummyTicker(true);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		timerState.start();

		const screen = await render(SettingsTrigger, { timerState });
		const button = screen.getByRole('button', { name: 'Open settings', includeHidden: true });
		expect(button.element().hasAttribute('disabled')).toBe(true);

		timerState.pause();

		await expect.element(button).toBeVisible();
		expect(button.element().hasAttribute('disabled')).toBe(false);
		expect(button.element().className).toContain('opacity-100');
		expect(button.element().className).toContain('pointer-events-auto');
	});
});

describe('SettingsDrawer (Client Browser)', () => {
	beforeEach(() => {
		document.documentElement.removeAttribute('data-theme');
		localStorage.clear();
	});

	it('renders drawer content with initial configured values when open', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState(
			{
				focusDurationSeconds: 1800, // 30m
				shortBreakDurationSeconds: 300, // 5m
				longBreakDurationSeconds: 1200 // 20m
			},
			ticker
		);
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Settings')).toBeVisible();
		await expect
			.element(screen.getByText('Customize timer intervals and color theme.'))
			.toBeVisible();
		await expect.element(screen.getByText('30 min', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('5 min', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('20 min', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('4 rounds', { exact: true })).toBeVisible();

		// Check section headers
		await expect.element(screen.getByRole('heading', { name: 'Intervals' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { name: 'Theme' })).toBeVisible();

		// Check Reset button
		await expect.element(screen.getByRole('button', { name: /Reset to defaults/i })).toBeVisible();
	});

	it('adjusts focus slider via keyboard arrows and updates timer config', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker); // 25 min
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		const focusSliderContainer = screen.container.querySelector(
			'[aria-label="Focus duration"]'
		) as HTMLElement;
		expect(focusSliderContainer).not.toBeNull();

		const focusThumb = focusSliderContainer.querySelector(
			'[data-slot="slider-thumb"]'
		) as HTMLElement;
		expect(focusThumb).not.toBeNull();
		expect(focusThumb.getAttribute('aria-valuenow')).toBe('25');

		focusThumb.focus();

		// ArrowRight increases by 1 min (step=1)
		await userEvent.keyboard('{ArrowRight}');

		expect(focusThumb.getAttribute('aria-valuenow')).toBe('26');
		await expect.element(screen.getByText('26 min', { exact: true })).toBeVisible();
		expect(timerState.config.focusDurationSeconds).toBe(26 * 60);

		// ArrowLeft decreases by 1 min
		await userEvent.keyboard('{ArrowLeft}');

		expect(focusThumb.getAttribute('aria-valuenow')).toBe('25');
		await expect.element(screen.getByText('25 min', { exact: true })).toBeVisible();
		expect(timerState.config.focusDurationSeconds).toBe(25 * 60);
	});

	it('adjusts short break and long break sliders and updates config', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState(
			{
				shortBreakDurationSeconds: 300, // 5 min
				longBreakDurationSeconds: 900 // 15 min
			},
			ticker
		);
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		const shortBreakContainer = screen.container.querySelector(
			'[aria-label="Short break duration"]'
		) as HTMLElement;
		const longBreakContainer = screen.container.querySelector(
			'[aria-label="Long break duration"]'
		) as HTMLElement;

		const shortBreakThumb = shortBreakContainer.querySelector(
			'[data-slot="slider-thumb"]'
		) as HTMLElement;
		const longBreakThumb = longBreakContainer.querySelector(
			'[data-slot="slider-thumb"]'
		) as HTMLElement;

		// Increase short break: 5 -> 6 min
		shortBreakThumb.focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(shortBreakThumb.getAttribute('aria-valuenow')).toBe('6');
		await expect.element(screen.getByText('6 min', { exact: true })).toBeVisible();
		expect(timerState.config.shortBreakDurationSeconds).toBe(6 * 60);

		// Increase long break: 15 -> 16 min
		longBreakThumb.focus();
		await userEvent.keyboard('{ArrowRight}');
		expect(longBreakThumb.getAttribute('aria-valuenow')).toBe('16');
		await expect.element(screen.getByText('16 min', { exact: true })).toBeVisible();
		expect(timerState.config.longBreakDurationSeconds).toBe(16 * 60);
	});

	it('adjusts rounds before long break slider via keyboard arrows and updates timer config', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ roundsBeforeLongBreak: 4 }, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		const roundsSlider = screen.getByLabelText('Rounds before long break');
		const thumb = roundsSlider.getByRole('slider');

		await expect.element(thumb).toHaveAttribute('aria-valuenow', '4');
		await expect.element(screen.getByText('4 rounds', { exact: true })).toBeVisible();

		(thumb.element() as HTMLElement).focus();

		await userEvent.keyboard('{ArrowRight}');

		await expect.element(thumb).toHaveAttribute('aria-valuenow', '5');
		await expect.element(screen.getByText('5 rounds', { exact: true })).toBeVisible();
		expect(timerState.config.roundsBeforeLongBreak).toBe(5);

		await userEvent.keyboard('{ArrowLeft}');

		await expect.element(thumb).toHaveAttribute('aria-valuenow', '4');
		await expect.element(screen.getByText('4 rounds', { exact: true })).toBeVisible();
		expect(timerState.config.roundsBeforeLongBreak).toBe(4);
	});

	it('resets intervals to defaults (25 / 5 / 15 min · 4 rounds) on clicking Reset', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState(
			{
				focusDurationSeconds: 2700, // 45 min
				shortBreakDurationSeconds: 600, // 10 min
				longBreakDurationSeconds: 1800, // 30 min
				roundsBeforeLongBreak: 6
			},
			ticker
		);
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('45 min', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('10 min', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('30 min', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('6 rounds', { exact: true })).toBeVisible();

		const resetBtn = screen.getByRole('button', { name: /Reset to defaults/i });
		await resetBtn.click();

		expect(timerState.config.focusDurationSeconds).toBe(DEFAULT_TIMER_CONFIG.focusDurationSeconds);
		expect(timerState.config.shortBreakDurationSeconds).toBe(
			DEFAULT_TIMER_CONFIG.shortBreakDurationSeconds
		);
		expect(timerState.config.longBreakDurationSeconds).toBe(
			DEFAULT_TIMER_CONFIG.longBreakDurationSeconds
		);
		expect(timerState.config.roundsBeforeLongBreak).toBe(
			DEFAULT_TIMER_CONFIG.roundsBeforeLongBreak
		);

		await expect.element(screen.getByText('25 min', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('5 min', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('15 min', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('4 rounds', { exact: true })).toBeVisible();
	});

	it('switches themes across Dark, Dawn, and OLED with DOM synchronization', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		// Default is dark
		expect(themeState.current).toBe('dark');

		// Switch to Dawn
		const dawnRadio = screen.getByRole('radio', { name: 'Dawn theme' });
		await dawnRadio.click();

		expect(themeState.current).toBe('dawn');
		expect(document.documentElement.dataset.theme).toBe('dawn');
		expect(dawnRadio.element().getAttribute('data-state')).toBe('on');
		expect(dawnRadio.element().getAttribute('aria-checked')).toBe('true');

		// Switch to OLED
		const oledRadio = screen.getByRole('radio', { name: 'OLED theme' });
		await oledRadio.click();

		expect(themeState.current).toBe('oled');
		expect(document.documentElement.dataset.theme).toBe('oled');
		expect(oledRadio.element().getAttribute('data-state')).toBe('on');
		expect(oledRadio.element().getAttribute('aria-checked')).toBe('true');

		// Switch back to Dark
		const darkRadio = screen.getByRole('radio', { name: 'Dark theme' });
		await darkRadio.click();

		expect(themeState.current).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
		expect(darkRadio.element().getAttribute('data-state')).toBe('on');
		expect(darkRadio.element().getAttribute('aria-checked')).toBe('true');
	});

	it('retains active theme when clicking already selected toggle item (no unselect corruption)', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		const darkRadio = screen.getByRole('radio', { name: 'Dark theme' });
		await darkRadio.click();

		// Should remain 'dark'
		expect(themeState.current).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
	});

	it('anchors active running timer block without crashing when intervals are reconfigured mid-session', async () => {
		const ticker = createDummyTicker(true);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		timerState.start();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			portalProps: { disabled: true }
		});

		const focusContainer = screen.container.querySelector(
			'[aria-label="Focus duration"]'
		) as HTMLElement;
		const focusThumb = focusContainer.querySelector('[data-slot="slider-thumb"]') as HTMLElement;

		focusThumb.focus();
		// Shorten focus duration while running: 25 -> 24 min
		await userEvent.keyboard('{ArrowLeft}');

		expect(timerState.isRunning).toBe(true);
		expect(timerState.config.focusDurationSeconds).toBe(24 * 60);
		// Progress should stay valid non-negative number between 0 and 1
		expect(timerState.progress).toBeGreaterThanOrEqual(0);
		expect(timerState.progress).toBeLessThanOrEqual(1);
	});

	it('clamps slider values at minimum and maximum boundaries using Home and End keys', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		const focusContainer = screen.container.querySelector(
			'[aria-label="Focus duration"]'
		) as HTMLElement;
		const focusThumb = focusContainer.querySelector('[data-slot="slider-thumb"]') as HTMLElement;

		focusThumb.focus();

		// Home key jumps to minimum (1 min)
		await userEvent.keyboard('{Home}');
		expect(focusThumb.getAttribute('aria-valuenow')).toBe('1');
		await expect.element(screen.getByText('1 min', { exact: true })).toBeVisible();
		expect(timerState.config.focusDurationSeconds).toBe(1 * 60);

		// ArrowLeft at minimum does not go below 1 min
		await userEvent.keyboard('{ArrowLeft}');
		expect(focusThumb.getAttribute('aria-valuenow')).toBe('1');
		expect(timerState.config.focusDurationSeconds).toBe(1 * 60);

		// End key jumps to maximum (60 min)
		await userEvent.keyboard('{End}');
		expect(focusThumb.getAttribute('aria-valuenow')).toBe('60');
		await expect.element(screen.getByText('60 min', { exact: true })).toBeVisible();
		expect(timerState.config.focusDurationSeconds).toBe(60 * 60);

		// ArrowRight at maximum does not exceed 60 min
		await userEvent.keyboard('{ArrowRight}');
		expect(focusThumb.getAttribute('aria-valuenow')).toBe('60');
		expect(timerState.config.focusDurationSeconds).toBe(60 * 60);
	});
});

describe('Settings Integration: Trigger & Drawer (Client Browser)', () => {
	it('opens drawer on trigger click and closes on sheet close button', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsTestHost, {
			timerState,
			themeState,
			open: false
		});

		const triggerBtn = screen.getByRole('button', { name: 'Open settings' });
		await expect.element(triggerBtn).toBeVisible();

		// Click trigger to open
		await triggerBtn.click();

		// Drawer content becomes visible
		const settingsTitle = screen.getByText('Settings');
		await expect.element(settingsTitle).toBeVisible();

		// Click close button inside drawer
		const closeBtn = screen.getByRole('button', { name: 'Close' });
		await expect.element(closeBtn).toBeVisible();
		await closeBtn.click();

		// Drawer is closed
		await expect.element(settingsTitle).not.toBeInTheDocument();
	});

	it('closes drawer when Escape key is pressed', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsTestHost, {
			timerState,
			themeState,
			open: false
		});

		const triggerBtn = screen.getByRole('button', { name: 'Open settings' });
		await triggerBtn.click();

		const settingsTitle = screen.getByText('Settings');
		await expect.element(settingsTitle).toBeVisible();

		// Press Escape to dismiss drawer
		await userEvent.keyboard('{Escape}');

		await expect.element(settingsTitle).not.toBeInTheDocument();
	});

	it('clears temporary slider overrides when drawer is closed and reopened', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker); // 25 min
		const themeState = createThemeState();

		const screen = await render(SettingsTestHost, {
			timerState,
			themeState,
			open: false
		});

		const triggerBtn = screen.getByRole('button', { name: 'Open settings' });
		await triggerBtn.click();

		const focusContainer = screen.container.querySelector(
			'[aria-label="Focus duration"]'
		) as HTMLElement;
		const focusThumb = focusContainer.querySelector('[data-slot="slider-thumb"]') as HTMLElement;

		focusThumb.focus();
		await userEvent.keyboard('{ArrowRight}'); // 26 min
		await expect.element(screen.getByText('26 min', { exact: true })).toBeVisible();

		// Close drawer
		const closeBtn = screen.getByRole('button', { name: 'Close' });
		await closeBtn.click();

		// Externally update timerState config to 20 min
		timerState.updateConfig({ focusDurationSeconds: 1200 });

		// Reopen drawer
		await triggerBtn.click();

		// Drawer should display fresh external config (20 min), not stale override (26 min)
		await expect.element(screen.getByText('20 min', { exact: true })).toBeVisible();
	});
});
