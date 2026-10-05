import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import SettingsTrigger from './settings-trigger.svelte';
import SettingsDrawer from './settings-drawer.svelte';
import SettingsTestHost from './settings-test-host.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createThemeState } from '$lib/state/theme.svelte';
import { localeState } from '$lib/state/locale.svelte';
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
		await expect.element(button).not.toBeDisabled();
		await expect.element(button).toHaveClass('opacity-100');
		await expect.element(button).toHaveClass('pointer-events-auto');
		await expect.element(button).toHaveAttribute('aria-expanded', 'false');
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

		await expect.element(button).toBeDisabled();
		await expect.element(button).toHaveAttribute('aria-hidden', 'true');
		await expect.element(button).toHaveAttribute('tabindex', '-1');
		await expect.element(button).toHaveClass('opacity-0');
		await expect.element(button).toHaveClass('pointer-events-none');
	});

	it('restores visibility and interactivity when timer pauses', async () => {
		const ticker = createDummyTicker(true);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		timerState.start();

		const screen = await render(SettingsTrigger, { timerState });
		const button = screen.getByRole('button', { name: 'Open settings', includeHidden: true });
		await expect.element(button).toBeDisabled();

		timerState.pause();

		await expect.element(button).toBeVisible();
		await expect.element(button).not.toBeDisabled();
		await expect.element(button).toHaveClass('opacity-100');
		await expect.element(button).toHaveClass('pointer-events-auto');
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
		await expect.element(screen.getByRole('heading', { name: 'Sound' })).toBeVisible();
		await expect
			.element(screen.getByRole('heading', { name: 'Break Revitalization' }))
			.toBeVisible();
		await expect
			.element(screen.getByText('Show restorative micro-habits and guides during breaks.'))
			.toBeVisible();
		await expect.element(screen.getByText('Mindful suggestions')).toBeVisible();
		await expect
			.element(screen.getByText('Physical stretches, breathwork, and hydration reminders'))
			.toBeVisible();
		await expect
			.element(screen.getByRole('switch', { name: 'Mindful break suggestions' }))
			.toBeChecked();

		// Check Rosé Pine interval accent dot indicators
		expect(screen.container.querySelector('.bg-accent-foam')).not.toBeNull();
		expect(screen.container.querySelector('.bg-accent-pine')).not.toBeNull();
		expect(screen.container.querySelector('.bg-accent-iris')).not.toBeNull();
		expect(screen.container.querySelector('.bg-accent-rose')).not.toBeNull();

		// Check Reset button
		await expect.element(screen.getByRole('button', { name: /Reset to defaults/i })).toBeVisible();
	});

	it('preserves ultradian 90m focus duration without clamping to 60m when opened', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState(
			{
				focusDurationSeconds: 5400, // 90 min
				shortBreakDurationSeconds: 1200, // 20 min
				longBreakDurationSeconds: 1800 // 30 min
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

		await expect.element(screen.getByText('90 min', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('20 min', { exact: true })).toBeVisible();
		expect(timerState.config.focusDurationSeconds).toBe(5400);
		expect(timerState.config.shortBreakDurationSeconds).toBe(1200);
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

		const focusSlider = screen.getByLabelText('Focus duration');
		const focusThumb = focusSlider.getByRole('slider');

		await expect.element(focusThumb).toHaveAttribute('aria-valuenow', '25');

		(focusThumb.element() as HTMLElement).focus();

		// ArrowRight increases by 1 min (step=1)
		await userEvent.keyboard('{ArrowRight}');

		await expect.element(focusThumb).toHaveAttribute('aria-valuenow', '26');
		await expect.element(screen.getByText('26 min', { exact: true })).toBeVisible();
		expect(timerState.config.focusDurationSeconds).toBe(26 * 60);

		// ArrowLeft decreases by 1 min
		await userEvent.keyboard('{ArrowLeft}');

		await expect.element(focusThumb).toHaveAttribute('aria-valuenow', '25');
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

		const shortBreakSlider = screen.getByLabelText('Short break duration');
		const longBreakSlider = screen.getByLabelText('Long break duration');

		const shortBreakThumb = shortBreakSlider.getByRole('slider');
		const longBreakThumb = longBreakSlider.getByRole('slider');

		// Increase short break: 5 -> 6 min
		(shortBreakThumb.element() as HTMLElement).focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(shortBreakThumb).toHaveAttribute('aria-valuenow', '6');
		await expect.element(screen.getByText('6 min', { exact: true })).toBeVisible();
		expect(timerState.config.shortBreakDurationSeconds).toBe(6 * 60);

		// Increase long break: 15 -> 16 min
		(longBreakThumb.element() as HTMLElement).focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(longBreakThumb).toHaveAttribute('aria-valuenow', '16');
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

	it('resets intervals and sound alerts to defaults while preserving active theme on clicking Reset', async () => {
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
		timerState.setSoundEnabled(false);
		timerState.setRevitalizationEnabled(false);
		const themeState = createThemeState('dawn');

		const defaultFocus = Math.round(DEFAULT_TIMER_CONFIG.focusDurationSeconds / 60);
		const defaultShort = Math.round(DEFAULT_TIMER_CONFIG.shortBreakDurationSeconds / 60);
		const defaultLong = Math.round(DEFAULT_TIMER_CONFIG.longBreakDurationSeconds / 60);
		const defaultRounds = DEFAULT_TIMER_CONFIG.roundsBeforeLongBreak;
		const expectedResetLabel = `Reset to defaults (${defaultFocus} / ${defaultShort} / ${defaultLong} min · ${defaultRounds} rounds)`;

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

		const switchEl = screen.getByRole('switch', { name: 'Sound alerts' });
		await expect.element(switchEl).not.toBeChecked();

		const revSwitchEl = screen.getByRole('switch', { name: 'Mindful break suggestions' });
		await expect.element(revSwitchEl).not.toBeChecked();

		const dawnRadio = screen.getByRole('radio', { name: 'Dawn theme' });
		await expect.element(dawnRadio).toHaveAttribute('data-state', 'on');
		expect(themeState.current).toBe('dawn');
		expect(document.documentElement.dataset.theme).toBe('dawn');

		const resetBtn = screen.getByRole('button', { name: expectedResetLabel });
		await expect.element(resetBtn).toBeVisible();
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
		expect(timerState.soundEnabled).toBe(true);
		expect(timerState.revitalizationEnabled).toBe(true);

		await expect.element(screen.getByText(`${defaultFocus} min`, { exact: true })).toBeVisible();
		await expect.element(screen.getByText(`${defaultShort} min`, { exact: true })).toBeVisible();
		await expect.element(screen.getByText(`${defaultLong} min`, { exact: true })).toBeVisible();
		await expect
			.element(screen.getByText(`${defaultRounds} rounds`, { exact: true }))
			.toBeVisible();
		await expect.element(switchEl).toBeChecked();
		await expect.element(revSwitchEl).toBeChecked();

		// Active theme is preserved
		expect(themeState.current).toBe('dawn');
		expect(document.documentElement.dataset.theme).toBe('dawn');
		await expect.element(dawnRadio).toHaveAttribute('data-state', 'on');
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
		await expect.element(dawnRadio).toHaveAttribute('data-state', 'on');
		await expect.element(dawnRadio).toHaveAttribute('aria-checked', 'true');

		// Switch to OLED
		const oledRadio = screen.getByRole('radio', { name: 'OLED theme' });
		await oledRadio.click();

		expect(themeState.current).toBe('oled');
		expect(document.documentElement.dataset.theme).toBe('oled');
		await expect.element(oledRadio).toHaveAttribute('data-state', 'on');
		await expect.element(oledRadio).toHaveAttribute('aria-checked', 'true');

		// Switch back to Dark
		const darkRadio = screen.getByRole('radio', { name: 'Dark theme' });
		await darkRadio.click();

		expect(themeState.current).toBe('dark');
		expect(document.documentElement.dataset.theme).toBe('dark');
		await expect.element(darkRadio).toHaveAttribute('data-state', 'on');
		await expect.element(darkRadio).toHaveAttribute('aria-checked', 'true');
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

		const focusSlider = screen.getByLabelText('Focus duration');
		const focusThumb = focusSlider.getByRole('slider');

		(focusThumb.element() as HTMLElement).focus();
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

		const focusSlider = screen.getByLabelText('Focus duration');
		const focusThumb = focusSlider.getByRole('slider');

		(focusThumb.element() as HTMLElement).focus();

		// Home key jumps to minimum (1 min)
		await userEvent.keyboard('{Home}');
		await expect.element(focusThumb).toHaveAttribute('aria-valuenow', '1');
		await expect.element(screen.getByText('1 min', { exact: true })).toBeVisible();
		expect(timerState.config.focusDurationSeconds).toBe(1 * 60);

		// ArrowLeft at minimum does not go below 1 min
		await userEvent.keyboard('{ArrowLeft}');
		await expect.element(focusThumb).toHaveAttribute('aria-valuenow', '1');
		expect(timerState.config.focusDurationSeconds).toBe(1 * 60);

		// End key jumps to maximum (120 min)
		await userEvent.keyboard('{End}');
		await expect.element(focusThumb).toHaveAttribute('aria-valuenow', '120');
		await expect.element(screen.getByText('120 min', { exact: true })).toBeVisible();
		expect(timerState.config.focusDurationSeconds).toBe(120 * 60);

		// ArrowRight at maximum does not exceed 120 min
		await userEvent.keyboard('{ArrowRight}');
		await expect.element(focusThumb).toHaveAttribute('aria-valuenow', '120');
		expect(timerState.config.focusDurationSeconds).toBe(120 * 60);
	});

	it('toggles sound alerts switch and updates timerState soundEnabled', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByRole('heading', { name: 'Sound' })).toBeVisible();
		await expect.element(screen.getByText('Enable or mute audio transition alerts.')).toBeVisible();

		// Verify the sound alerts switch renders and is accessible
		const switchEl = screen.getByRole('switch', { name: 'Sound alerts' });
		await expect.element(switchEl).toBeVisible();

		// Verify the switch is checked by default
		expect(timerState.soundEnabled).toBe(true);
		await expect.element(switchEl).toBeChecked();

		// Click the switch and verify timerState.soundEnabled toggles to false and switch is unchecked
		await switchEl.click();
		expect(timerState.soundEnabled).toBe(false);
		await expect.element(switchEl).not.toBeChecked();

		// Click the switch again and verify timerState.soundEnabled toggles back to true and switch is checked
		await switchEl.click();
		expect(timerState.soundEnabled).toBe(true);
		await expect.element(switchEl).toBeChecked();
	});

	it('resets sound alerts switch to checked on clicking Reset to defaults', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const themeState = createThemeState();

		// Set sound to disabled first
		timerState.setSoundEnabled(false);

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		const switchEl = screen.getByRole('switch', { name: 'Sound alerts' });
		await expect.element(switchEl).toBeVisible();
		await expect.element(switchEl).not.toBeChecked();
		expect(timerState.soundEnabled).toBe(false);

		// Click Reset to defaults
		const resetBtn = screen.getByRole('button', { name: /Reset to defaults/i });
		await resetBtn.click();

		// Verify sound alerts switch resets to checked and timerState.soundEnabled is true
		expect(timerState.soundEnabled).toBe(true);
		await expect.element(switchEl).toBeChecked();
	});

	it('toggles break revitalization switch and updates timerState revitalizationEnabled', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		await expect
			.element(screen.getByRole('heading', { name: 'Break Revitalization' }))
			.toBeVisible();
		await expect
			.element(screen.getByText('Show restorative micro-habits and guides during breaks.'))
			.toBeVisible();

		// Verify the mindful suggestions switch renders and is accessible
		const switchEl = screen.getByRole('switch', { name: 'Mindful break suggestions' });
		await expect.element(switchEl).toBeVisible();

		// Verify the switch is checked by default
		expect(timerState.revitalizationEnabled).toBe(true);
		await expect.element(switchEl).toBeChecked();

		// Click the switch and verify timerState.revitalizationEnabled toggles to false and switch is unchecked
		await switchEl.click();
		expect(timerState.revitalizationEnabled).toBe(false);
		await expect.element(switchEl).not.toBeChecked();

		// Click the switch again and verify timerState.revitalizationEnabled toggles back to true and switch is checked
		await switchEl.click();
		expect(timerState.revitalizationEnabled).toBe(true);
		await expect.element(switchEl).toBeChecked();
	});

	it('resets break revitalization switch to checked on clicking Reset to defaults', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);
		const themeState = createThemeState();

		// Set revitalization to disabled first
		timerState.setRevitalizationEnabled(false);

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		const switchEl = screen.getByRole('switch', { name: 'Mindful break suggestions' });
		await expect.element(switchEl).toBeVisible();
		await expect.element(switchEl).not.toBeChecked();
		expect(timerState.revitalizationEnabled).toBe(false);

		// Click Reset to defaults
		const resetBtn = screen.getByRole('button', { name: /Reset to defaults/i });
		await resetBtn.click();

		// Verify revitalization switch resets to checked and timerState.revitalizationEnabled is true
		expect(timerState.revitalizationEnabled).toBe(true);
		await expect.element(switchEl).toBeChecked();
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

		const focusSlider = screen.getByLabelText('Focus duration');
		const focusThumb = focusSlider.getByRole('slider');

		(focusThumb.element() as HTMLElement).focus();
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

describe('SettingsDrawer Internationalization (Client Browser)', () => {
	beforeEach(() => {
		document.documentElement.removeAttribute('data-theme');
		localStorage.clear();
		localeState.setLocale('en');
	});

	it('renders all sections and labels in English by default', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({}, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsDrawer, {
			open: true,
			timerState,
			themeState,
			portalProps: { disabled: true }
		});

		// Header
		await expect.element(screen.getByRole('heading', { level: 2, name: 'Settings' })).toBeVisible();
		await expect
			.element(screen.getByText('Customize timer intervals and color theme.'))
			.toBeVisible();

		// Section headings
		await expect
			.element(screen.getByRole('heading', { level: 3, name: 'Intervals' }))
			.toBeVisible();
		await expect
			.element(screen.getByText('Adjust the duration in minutes for each block.'))
			.toBeVisible();
		await expect.element(screen.getByRole('heading', { level: 3, name: 'Theme' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { level: 3, name: 'Language' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { level: 3, name: 'Sound' })).toBeVisible();
		await expect
			.element(screen.getByRole('heading', { level: 3, name: 'Break Revitalization' }))
			.toBeVisible();

		// Interval labels and reset button
		await expect.element(screen.getByText('Focus', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('Short Break', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('Long Break', { exact: true })).toBeVisible();
		await expect
			.element(screen.getByText('Rounds before Long Break', { exact: true }))
			.toBeVisible();
		await expect.element(screen.getByText('4 rounds', { exact: true })).toBeVisible();
		await expect
			.element(
				screen.getByRole('button', {
					name: 'Reset to defaults (25 / 5 / 15 min · 4 rounds)'
				})
			)
			.toBeVisible();

		// Theme options
		await expect.element(screen.getByRole('radio', { name: 'Dark theme' })).toBeVisible();
		await expect.element(screen.getByRole('radio', { name: 'Dawn theme' })).toBeVisible();
		await expect.element(screen.getByRole('radio', { name: 'OLED theme' })).toBeVisible();

		// Language options
		await expect.element(screen.getByRole('radio', { name: 'English language' })).toBeVisible();
		await expect.element(screen.getByRole('radio', { name: 'Spanish language' })).toBeVisible();

		// Sound alerts
		await expect.element(screen.getByText('Sound alerts', { exact: true })).toBeVisible();
		await expect
			.element(screen.getByText('Play soothing chimes on block transitions'))
			.toBeVisible();

		// Break Revitalization
		await expect.element(screen.getByText('Mindful suggestions', { exact: true })).toBeVisible();
		await expect
			.element(screen.getByText('Physical stretches, breathwork, and hydration reminders'))
			.toBeVisible();
	});

	it('reactively updates all text and accessibility attributes to Spanish on locale change', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({}, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsTestHost, {
			open: true,
			timerState,
			themeState
		});

		localeState.setLocale('es');

		// Header
		await expect.element(screen.getByRole('heading', { level: 2, name: 'Ajustes' })).toBeVisible();
		await expect
			.element(screen.getByText('Personaliza los intervalos del temporizador y el tema de color.'))
			.toBeVisible();

		// Section headings
		await expect
			.element(screen.getByRole('heading', { level: 3, name: 'Intervalos' }))
			.toBeVisible();
		await expect
			.element(screen.getByText('Ajusta la duración en minutos de cada bloque.'))
			.toBeVisible();
		await expect.element(screen.getByRole('heading', { level: 3, name: 'Tema' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { level: 3, name: 'Idioma' })).toBeVisible();
		await expect.element(screen.getByRole('heading', { level: 3, name: 'Sonido' })).toBeVisible();
		await expect
			.element(screen.getByRole('heading', { level: 3, name: 'Revitalización en descansos' }))
			.toBeVisible();

		// Interval labels and reset button
		await expect.element(screen.getByText('Foco', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('Descanso corto', { exact: true })).toBeVisible();
		await expect.element(screen.getByText('Descanso largo', { exact: true })).toBeVisible();
		await expect
			.element(screen.getByText('Rondas antes del descanso largo', { exact: true }))
			.toBeVisible();
		await expect.element(screen.getByText('4 rondas', { exact: true })).toBeVisible();
		await expect
			.element(
				screen.getByRole('button', {
					name: 'Restablecer valores iniciales (25 / 5 / 15 min · 4 rondas)'
				})
			)
			.toBeVisible();

		// Theme options
		await expect.element(screen.getByRole('radio', { name: 'Tema oscuro' })).toBeVisible();
		await expect.element(screen.getByRole('radio', { name: 'Tema claro' })).toBeVisible();
		await expect.element(screen.getByRole('radio', { name: 'Tema OLED' })).toBeVisible();

		// Sound alerts
		await expect.element(screen.getByText('Alertas sonoras', { exact: true })).toBeVisible();
		await expect
			.element(screen.getByText('Reproduce campanadas suaves en las transiciones de bloque'))
			.toBeVisible();

		// Break Revitalization
		await expect
			.element(screen.getByText('Sugerencias conscientes', { exact: true }))
			.toBeVisible();
		await expect
			.element(
				screen.getByText('Estiramientos físicos, respiración y recordatorios de hidratación')
			)
			.toBeVisible();
	});

	it('interactively switches locale from English to Spanish and back via embedded LanguageSelector', async () => {
		const ticker = createDummyTicker(false);
		const timerState = createTimerState({}, ticker);
		const themeState = createThemeState();

		const screen = await render(SettingsTestHost, {
			open: true,
			timerState,
			themeState
		});

		// Initially English
		await expect.element(screen.getByRole('heading', { level: 2, name: 'Settings' })).toBeVisible();
		const esToggle = screen.getByRole('radio', { name: 'Spanish language' });
		await esToggle.click();

		// Reactively switched to Spanish
		await expect.element(screen.getByRole('heading', { level: 2, name: 'Ajustes' })).toBeVisible();
		await expect.element(screen.getByText('Foco')).toBeVisible();
		await expect.element(screen.getByText('4 rondas', { exact: true })).toBeVisible();

		// Switch back to English
		const enToggle = screen.getByRole('radio', { name: 'Idioma inglés' });
		await enToggle.click();

		// Reactively restored to English
		await expect.element(screen.getByRole('heading', { level: 2, name: 'Settings' })).toBeVisible();
		await expect.element(screen.getByText('Focus')).toBeVisible();
		await expect.element(screen.getByText('4 rounds', { exact: true })).toBeVisible();
	});
});
