import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync } from 'svelte';
import BotanicalProgress from './botanical-progress.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import type { ITimerTicker, TickCallback } from '$lib/domain/ports/timer-ticker.port';
import { PLANT_MODELS, getPlantModel, selectFrameIndex, toPixelRuns } from './plant-models';

class ManualTicker implements ITimerTicker {
	isRunning = false;
	private onTick: TickCallback | null = null;
	start(onTick: TickCallback) {
		this.isRunning = true;
		this.onTick = onTick;
	}
	stop() {
		this.isRunning = false;
	}
	destroy() {
		this.isRunning = false;
	}
	tick(deltaMs: number) {
		if (this.isRunning) this.onTick?.(deltaMs);
	}
}

const FOCUS_MS = 60_000;

function setup(roundsBeforeLongBreak = 4) {
	const ticker = new ManualTicker();
	const timerState = createTimerState(
		{ focusDurationSeconds: FOCUS_MS / 1000, roundsBeforeLongBreak },
		ticker
	);
	const run = (ms: number) => {
		ticker.tick(ms);
		flushSync();
	};
	/** Completes the current focus block and skips its break, landing on the next focus. */
	const completeRound = () => {
		timerState.start();
		run(FOCUS_MS);
		timerState.skip();
		timerState.skip();
		flushSync();
	};
	return { timerState, run, completeRound };
}

function frameOf(container: HTMLElement): number {
	const el = container.querySelector<HTMLElement>('[data-frame]');
	if (!el) throw new Error('botanical wrapper not rendered');
	return Number(el.dataset.frame);
}

describe('plant model registry', () => {
	it.each(PLANT_MODELS.map((m) => [m.id, m] as const))(
		'%s frames fit the declared canvas and only use palette inks',
		(_, model) => {
			expect(model.frames.length).toBeGreaterThan(1);
			for (const rows of model.frames) {
				expect(rows).toHaveLength(model.height);
				for (const row of rows) {
					expect(row).toHaveLength(model.width);
					for (const ch of row) expect(ch === '.' || ch in model.palette).toBe(true);
				}
			}
		}
	);

	it('falls back to the first model for unknown ids', () => {
		expect(getPlantModel('does-not-exist')).toBe(PLANT_MODELS[0]);
	});

	it('maps growth onto frames without anticipating the next step', () => {
		expect(selectFrameIndex(17, 0)).toBe(0);
		expect(selectFrameIndex(17, 0.25)).toBe(4);
		expect(selectFrameIndex(17, 0.2499)).toBe(3);
		expect(selectFrameIndex(17, 1)).toBe(16);
		expect(selectFrameIndex(17, Number.NaN)).toBe(0);
	});

	it('merges horizontal runs and carries idle roles', () => {
		const palette = { g: { fill: 'A' }, f: { fill: 'B', idle: 'glint' as const } };
		expect(toPixelRuns(['.gg.f'], palette)).toEqual([
			{ x: 1, y: 0, width: 2, fill: 'A', idle: undefined },
			{ x: 4, y: 0, width: 1, fill: 'B', idle: 'glint' }
		]);
	});
});

describe('BotanicalProgress (Client Browser)', () => {
	it('grows during focus, holds during breaks and matures at the long break', async () => {
		const { timerState, run } = setup();
		const screen = await render(BotanicalProgress, { timerState });
		expect(frameOf(screen.container)).toBe(0);

		timerState.start();
		run(FOCUS_MS / 2);
		expect(frameOf(screen.container)).toBe(2);

		run(FOCUS_MS / 2);
		expect(frameOf(screen.container)).toBe(4);

		timerState.skip();
		flushSync();
		expect(timerState.mode).toBe('shortBreak');
		expect(frameOf(screen.container)).toBe(4);

		for (let i = 0; i < 3; i++) {
			timerState.skip();
			timerState.start();
			run(FOCUS_MS);
			timerState.skip();
			flushSync();
		}
		expect(timerState.mode).toBe('longBreak');
		expect(frameOf(screen.container)).toBe(16);
		await expect
			.element(screen.getByRole('img'))
			.toHaveAttribute('aria-label', 'Seed to fruit tree: 100% grown this Pomodoro cycle');
		timerState.destroy();
	});

	it('stretches the same story across a 12-round cycle', async () => {
		const { timerState, completeRound } = setup(12);
		const screen = await render(BotanicalProgress, { timerState });

		for (let i = 0; i < 3; i++) completeRound();
		expect(frameOf(screen.container)).toBe(4);
		timerState.destroy();
	});

	it('drops a fruit and restarts from the seed when a new cycle begins', async () => {
		const { timerState, completeRound } = setup();
		const screen = await render(BotanicalProgress, { timerState });

		for (let i = 0; i < 3; i++) completeRound();
		timerState.skip();
		flushSync();
		expect(timerState.mode).toBe('longBreak');
		expect(frameOf(screen.container)).toBe(16);
		expect(screen.container.querySelector('[data-testid="harvest-drop"]')).toBeNull();

		timerState.skip();
		flushSync();
		expect(frameOf(screen.container)).toBe(0);
		expect(screen.container.querySelector('[data-testid="harvest-drop"]')).not.toBeNull();
		timerState.destroy();
	});

	it('animates idle pixels by default and freezes them in static mode', async () => {
		const { timerState } = setup();
		const screen = await render(BotanicalProgress, { timerState });
		const svg = screen.container.querySelector('svg')!;
		expect(svg.querySelector('.idle-sway-a')).not.toBeNull();
		expect(svg.querySelector('.idle-particle')).not.toBeNull();

		timerState.setBotanicalStatic(true);
		flushSync();
		expect(svg.querySelector('[class*="idle-"]')).toBeNull();
		timerState.destroy();
	});

	it('uses theme tokens and crisp pixel edges', async () => {
		const { timerState } = setup();
		const screen = await render(BotanicalProgress, { timerState });
		const svg = screen.container.querySelector('svg')!;
		expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
		const fills = Array.from(svg.querySelectorAll('rect')).map((r) => r.style.fill);
		expect(fills.every((f) => f.includes('var(--'))).toBe(true);
		timerState.destroy();
	});

	it('fades out and pauses in Zen mode when hide-in-zen is on', async () => {
		const { timerState } = setup();
		const screen = await render(BotanicalProgress, { timerState });
		const wrapper = screen.container.querySelector<HTMLElement>('[data-frame]')!;
		expect(wrapper.className).toContain('opacity-100');

		timerState.start();
		flushSync();
		expect(wrapper.className).toContain('opacity-0');
		expect(wrapper.className).toContain('is-paused');
		expect(wrapper.getAttribute('aria-hidden')).toBe('true');

		timerState.pause();
		flushSync();
		expect(wrapper.className).toContain('opacity-100');
		timerState.destroy();
	});

	it('only dims in Zen mode when hide-in-zen is off', async () => {
		const { timerState } = setup();
		timerState.setBotanicalHideInZen(false);
		const screen = await render(BotanicalProgress, { timerState });

		timerState.start();
		flushSync();
		const wrapper = screen.container.querySelector<HTMLElement>('[data-frame]')!;
		expect(wrapper.className).toContain('opacity-60');
		timerState.destroy();
	});

	it('renders nothing when disabled in settings', async () => {
		const { timerState } = setup();
		timerState.setBotanicalEnabled(false);
		const screen = await render(BotanicalProgress, { timerState });
		expect(screen.container.querySelector('svg')).toBeNull();
		timerState.destroy();
	});
});
