import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { FakeSettingsStorage } from '$tests/fakes/repositories/fake-settings-storage';
import { DEFAULT_ILLUSTRATION_SETTINGS } from '$lib/domain/ports/settings-storage.port';
import { IllustrationState } from '$lib/state/illustration.svelte';
import IllustrationBackground from './illustration-background.svelte';
import type { TimerMode } from '$lib/domain/timer/timer-fsm';

function createState(options: {
	minutes?: number;
	enabled?: boolean;
	selectedId?: 'forest' | 'desert';
	hideWhileFocusing?: boolean;
	motionEnabled?: boolean;
	running?: boolean;
	mode?: TimerMode;
}): IllustrationState {
	const storage = new FakeSettingsStorage({
		illustration: {
			...DEFAULT_ILLUSTRATION_SETTINGS,
			enabled: options.enabled ?? true,
			selectedId: options.selectedId ?? 'forest',
			hideWhileFocusing: options.hideWhileFocusing ?? false,
			motionEnabled: options.motionEnabled ?? true
		}
	});

	return new IllustrationState(
		storage,
		{ accumulatedMinutes: options.minutes ?? 0 },
		{ isRunning: options.running ?? false, mode: options.mode ?? 'focus' }
	);
}

describe('IllustrationBackground (Client Browser)', () => {
	it('renders nothing when the illustration is disabled', async () => {
		const screen = await render(IllustrationBackground, {
			illustration: createState({ enabled: false })
		});

		expect(screen.container.querySelector('[data-testid="illustration-background"]')).toBeNull();
	});

	it('renders the selected illustration at the derived phase', async () => {
		const screen = await render(IllustrationBackground, {
			illustration: createState({ minutes: 75 })
		});
		const svg = screen.container.querySelector('svg');

		expect(svg?.getAttribute('data-illustration')).toBe('forest');
		expect(svg?.getAttribute('data-phase')).toBe('1');
	});

	it('renders the desert illustration with its own phase count', async () => {
		const screen = await render(IllustrationBackground, {
			illustration: createState({ minutes: 250, selectedId: 'desert' })
		});
		const svg = screen.container.querySelector('svg');

		expect(svg?.getAttribute('data-illustration')).toBe('desert');
		expect(svg?.getAttribute('data-phase')).toBe('2');
	});

	it('hides the layer while a focus block runs when requested', async () => {
		const screen = await render(IllustrationBackground, {
			illustration: createState({ hideWhileFocusing: true, running: true, mode: 'focus' })
		});

		expect(screen.container.querySelector('[data-testid="illustration-background"]')).toBeNull();
	});

	it('keeps the layer during a running break', async () => {
		const screen = await render(IllustrationBackground, {
			illustration: createState({ hideWhileFocusing: true, running: true, mode: 'shortBreak' })
		});

		expect(
			screen.container.querySelector('[data-testid="illustration-background"]')
		).not.toBeNull();
	});

	it('passes the ambient motion flag to the renderer', async () => {
		const screen = await render(IllustrationBackground, {
			illustration: createState({ running: true, mode: 'focus' })
		});

		expect(screen.container.querySelector('svg')?.classList.contains('animated')).toBe(true);

		const paused = await render(IllustrationBackground, {
			illustration: createState({ running: false })
		});

		expect(paused.container.querySelector('svg')?.classList.contains('animated')).toBe(false);
	});
});
