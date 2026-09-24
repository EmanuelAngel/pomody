import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import SettingsTrigger from './settings-trigger.svelte';
import SettingsDrawer from './settings-drawer.svelte';
import { createTimerState } from '$lib/state/timer.svelte.js';
import { createThemeState } from '$lib/state/theme.svelte.js';

describe('SettingsTrigger (Component Rendering & Zen Mode)', () => {
	it('renders accessible trigger button visible during idle/stopped state', () => {
		const dummyTicker = { isRunning: false, start: () => {}, stop: () => {}, destroy: () => {} };
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, dummyTicker);

		const result = render(SettingsTrigger, { props: { timerState } });

		expect(result.body).toContain('aria-label="Open settings"');
		expect(result.body).toContain('opacity-100');
		expect(result.body).toContain('pointer-events-auto');
		expect(result.body).not.toContain('opacity-0');
	});

	it('fades out and disables trigger button in Zen mode when timer is running', () => {
		const dummyTicker = { isRunning: true, start: () => {}, stop: () => {}, destroy: () => {} };
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, dummyTicker);
		timerState.start();

		const result = render(SettingsTrigger, { props: { timerState } });

		expect(result.body).toContain('aria-label="Open settings"');
		expect(result.body).toContain('opacity-0');
		expect(result.body).not.toContain('pointer-events-auto');
		expect(result.body).toContain('tabindex="-1"');
	});
});

describe('SettingsDrawer (Component Rendering)', () => {
	it('renders drawer with interval fields and theme selectors when open', () => {
		const dummyTicker = { isRunning: false, start: () => {}, stop: () => {}, destroy: () => {} };
		const timerState = createTimerState(
			{
				focusDurationSeconds: 1800,
				shortBreakDurationSeconds: 300,
				longBreakDurationSeconds: 900
			},
			dummyTicker
		);
		const themeState = createThemeState();

		const result = render(SettingsDrawer, {
			props: {
				open: true,
				timerState,
				themeState,
				portalProps: { disabled: true }
			}
		});

		expect(result.body).toContain('Settings');
		expect(result.body).toContain('Intervals');
		expect(result.body).toContain('Focus (1–60 min)');
		expect(result.body).toContain('Short Break (1–30 min)');
		expect(result.body).toContain('Long Break (1–60 min)');
		expect(result.body).toContain('value="30"'); // 1800s / 60 = 30 min
		expect(result.body).toContain('value="5"'); // 300s / 60 = 5 min
		expect(result.body).toContain('value="15"'); // 900s / 60 = 15 min
		expect(result.body).toContain('Reset to defaults');
		expect(result.body).toContain('Theme');
		expect(result.body).toContain('Dark');
		expect(result.body).toContain('Dawn');
		expect(result.body).toContain('OLED');
	});
});
