import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync } from 'svelte';
import BotanicalProgress from './botanical-progress.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import type { ITimerTicker, TickCallback } from '$lib/domain/ports/timer-ticker.port';
import {
	PLANT_MODELS,
	composeScene,
	getPlantModel,
	selectFrameIndex,
	type SceneActivity
} from './plant-models';

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

function wrapperOf(container: HTMLElement): HTMLElement {
	const el = container.querySelector<HTMLElement>('[data-frame]');
	if (!el) throw new Error('botanical wrapper not rendered');
	return el;
}

const frameOf = (container: HTMLElement) => Number(wrapperOf(container).dataset.frame);

const model = PLANT_MODELS[0];
const compose = (activity: SceneActivity, tick: number, animated = true, frameIndex = 16) =>
	composeScene(model, { tick, animated, activity, frameIndex, harvestAge: null }).rows.join('');
const anyTick = (activity: SceneActivity, ink: string) =>
	Array.from({ length: 300 }, (_, t) => compose(activity, t)).some((s) => s.includes(ink));

describe('plant model registry', () => {
	it.each(PLANT_MODELS.map((m) => [m.id, m] as const))(
		'%s frames fit the declared canvas and only use known inks',
		(_, m) => {
			expect(m.frames.length).toBeGreaterThan(1);
			for (const rows of m.frames) {
				expect(rows).toHaveLength(m.height);
				for (const row of rows) {
					expect(row).toHaveLength(m.width);
					for (const ch of row) {
						expect(ch === '.' || ch in m.palette || ch in (m.idle ?? {})).toBe(true);
					}
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

	it('only ever grows: every frame is at least as tall and full as the previous one', () => {
		const plant = (i: number) =>
			model.frames[i].slice(0, model.groundY - 4).map((row) => row.slice(12, 36));
		const height = (i: number) => {
			const top = plant(i).findIndex((row) => /[^.]/.test(row));
			return top < 0 ? 0 : model.groundY - top;
		};
		const filled = (i: number) =>
			model.frames[i].slice(0, model.groundY).join('').replace(/\./g, '').length;
		for (let i = 1; i < model.frames.length; i++) {
			expect(height(i), `height of frame ${i}`).toBeGreaterThanOrEqual(height(i - 1));
			expect(filled(i), `fullness of frame ${i}`).toBeGreaterThan(filled(i - 1));
		}
	});

	it('ends each round near 35% / 60% / 80% / 100% of the final height', () => {
		const height = (i: number) => {
			const top = model.frames[i].findIndex(
				(row, y) => y < model.groundY - 4 && /[^.]/.test(row.slice(12, 36))
			);
			return model.groundY - top;
		};
		const full = height(16);
		expect(height(4) / full).toBeCloseTo(0.35, 1);
		expect(height(8) / full).toBeCloseTo(0.6, 1);
		expect(height(12) / full).toBeCloseTo(0.8, 1);
	});

	it('makes the young tree of round 3 clearly larger than the plant it grows from', () => {
		const width = (i: number) => {
			let min = Infinity;
			let max = -Infinity;
			model.frames[i].slice(0, model.groundY - 6).forEach((row) => {
				const first = row.search(/[^.]/);
				if (first < 0) return;
				min = Math.min(min, first);
				max = Math.max(max, row.length - 1 - [...row].reverse().join('').search(/[^.]/));
			});
			return max - min;
		};
		expect(width(10)).toBeGreaterThan(width(9) * 1.3);
	});

	it('grows long roots for the seedling and a deep, wide system for the tree', () => {
		const rootExtent = (i: number) => {
			const soil = model.frames[i].slice(model.groundY + 1);
			let deepest = 0;
			let widest = 0;
			soil.forEach((row, y) => {
				[...row].forEach((ch, x) => {
					if (ch !== 'b' && ch !== 'B') return;
					deepest = Math.max(deepest, y + 1);
					widest = Math.max(widest, Math.abs(x - 23));
				});
			});
			return { deepest, widest };
		};
		expect(rootExtent(4).deepest).toBeGreaterThanOrEqual(15);
		expect(rootExtent(4).widest).toBeGreaterThanOrEqual(6);
		expect(rootExtent(16).deepest).toBeGreaterThanOrEqual(36);
		expect(rootExtent(16).widest).toBeGreaterThanOrEqual(20);
	});
});

describe('composeScene', () => {
	it('resolves idle inks so no authoring characters leak to the canvas', () => {
		for (const activity of ['calm', 'break'] as const) {
			const rows = compose(activity, 3);
			for (const idleInk of Object.keys(model.idle ?? {})) expect(rows).not.toContain(idleInk);
		}
	});

	it('keeps occasional visitors while calm and brings every butterfly out on breaks', () => {
		expect(anyTick('calm', 'm')).toBe(true);
		expect(anyTick('calm', 'p')).toBe(true);
		expect(anyTick('calm', 'n')).toBe(false);
		expect(anyTick('break', 'm')).toBe(true);
		expect(anyTick('break', 'n')).toBe(true);
	});

	it('draws no fauna and a fixed image in static mode', () => {
		const a = compose('break', 1, false);
		const b = compose('break', 7, false);
		expect(a).toBe(b);
		expect(a).not.toMatch(/[mnp]/);
	});

	it('only lets the bird perch once the tree is grown', () => {
		const birdOnly = {
			...model,
			actors: model.actors?.filter((_, i, all) => i >= all.length - 3 && i < all.length - 1)
		};
		const perched = (frameIndex: number) =>
			composeScene(birdOnly, {
				tick: 5,
				animated: true,
				activity: 'calm',
				frameIndex,
				harvestAge: null
			}).rows.join('') !==
			composeScene(
				{ ...model, actors: [] },
				{
					tick: 5,
					animated: true,
					activity: 'calm',
					frameIndex,
					harvestAge: null
				}
			).rows.join('');
		expect(perched(8)).toBe(false);
		expect(perched(12)).toBe(true);
		expect(perched(16)).toBe(true);
	});

	it('gives every round its own visitors while the plant grows', () => {
		const withoutFauna = { ...model, actors: [] };
		const visited = (frameIndex: number) =>
			Array.from({ length: 200 }, (_, tick) => tick).some((tick) => {
				const state = {
					tick,
					animated: true,
					activity: 'calm' as const,
					frameIndex,
					harvestAge: null
				};
				const withVisitors = composeScene(
					{ ...model, actors: model.actors?.slice(4, -1) },
					state
				).rows.join('');
				return withVisitors !== composeScene(withoutFauna, state).rows.join('');
			});
		for (const frame of [3, 4, 6, 8, 11, 12, 16])
			expect(visited(frame), `frame ${frame}`).toBe(true);
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

	it('plays the harvest when a mature cycle restarts from the seed', async () => {
		const { timerState, completeRound } = setup();
		const screen = await render(BotanicalProgress, { timerState });

		for (let i = 0; i < 3; i++) completeRound();
		timerState.skip();
		flushSync();
		expect(frameOf(screen.container)).toBe(16);
		expect(wrapperOf(screen.container).dataset.harvesting).toBe('false');

		timerState.skip();
		flushSync();
		expect(frameOf(screen.container)).toBe(0);
		expect(wrapperOf(screen.container).dataset.harvesting).toBe('true');
		timerState.destroy();
	});

	it('reports scene activity from the timer', async () => {
		const { timerState } = setup();
		const screen = await render(BotanicalProgress, { timerState });
		expect(wrapperOf(screen.container).dataset.activity).toBe('calm');

		timerState.start();
		flushSync();
		expect(wrapperOf(screen.container).dataset.activity).toBe('calm');

		timerState.skip();
		timerState.start();
		flushSync();
		expect(wrapperOf(screen.container).dataset.activity).toBe('break');
		timerState.destroy();
	});

	it('paints the scene onto a pixelated canvas', async () => {
		const { timerState } = setup();
		const screen = await render(BotanicalProgress, { timerState });
		const canvas = screen.container.querySelector('canvas')!;
		expect(canvas.width).toBe(model.width);
		expect(canvas.height).toBe(model.height);
		await expect
			.poll(() => canvas.getContext('2d')!.getImageData(0, 100, 1, 1).data[3])
			.toBeGreaterThan(0);
		timerState.destroy();
	});

	it('honours the static setting', async () => {
		const { timerState } = setup();
		timerState.setBotanicalStatic(true);
		const screen = await render(BotanicalProgress, { timerState });
		expect(wrapperOf(screen.container).dataset.animated).toBe('false');
		timerState.destroy();
	});

	it('hides only while a focus block runs, staying visible for breaks', async () => {
		const { timerState } = setup();
		const screen = await render(BotanicalProgress, { timerState });
		const wrapper = wrapperOf(screen.container);

		timerState.start();
		flushSync();
		expect(wrapper.className).toContain('opacity-0');
		expect(wrapper.getAttribute('aria-hidden')).toBe('true');

		timerState.skip();
		timerState.start();
		flushSync();
		expect(wrapper.className).not.toContain('opacity-0');
		timerState.destroy();
	});

	it('stays fully visible while focusing when hide-in-zen is off', async () => {
		const { timerState } = setup();
		timerState.setBotanicalHideInZen(false);
		const screen = await render(BotanicalProgress, { timerState });
		timerState.start();
		flushSync();
		expect(wrapperOf(screen.container).className).toContain('opacity-100');
		timerState.destroy();
	});

	it('renders nothing when disabled in settings', async () => {
		const { timerState } = setup();
		timerState.setBotanicalEnabled(false);
		const screen = await render(BotanicalProgress, { timerState });
		expect(screen.container.querySelector('canvas')).toBeNull();
		timerState.destroy();
	});
});
