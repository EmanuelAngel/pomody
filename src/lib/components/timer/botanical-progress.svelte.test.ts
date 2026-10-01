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
	toInkPaths,
	type InkPath,
	type PlantModel,
	type SceneActivity
} from './plant-models';
import {
	breakActionAt,
	exerciseAt,
	repPhaseAt,
	SETS_PER_EXERCISE,
	type Exercise
} from './plant-models/gym-gains';

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
const CENTER = Math.floor(model.width / 2) - 1;
const compose = (activity: SceneActivity, tick: number, animated = true, frameIndex = 16) =>
	composeScene(model, { tick, animated, activity, frameIndex, harvestAge: null }).rows.join('');
const anyTick = (activity: SceneActivity, ink: string) =>
	Array.from({ length: 300 }, (_, t) => compose(activity, t)).some((s) => s.includes(ink));
const staticScene = (m: PlantModel, frameIndex: number) =>
	composeScene(m, { tick: 0, animated: false, activity: 'calm', frameIndex, harvestAge: null })
		.rows;
const fauna = (m: PlantModel, frameIndex: number) =>
	Array.from({ length: 200 }, (_, tick) => tick).some((tick) => {
		const state = { tick, animated: true, activity: 'calm' as const, frameIndex, harvestAge: null };
		return (
			composeScene(m, state).rows.join('') !==
			composeScene({ ...m, actors: [] }, state).rows.join('')
		);
	});

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

	it.each(PLANT_MODELS.map((m) => [m.id, m] as const))(
		'%s only ever grows: every step is at least as tall and full as the previous one',
		(_, m) => {
			const centre = Math.floor(m.width / 2) - 1;
			const scene = (i: number) => staticScene(m, i).slice(0, m.groundY - 3);
			const height = (i: number) => {
				const top = scene(i).findIndex((row) => /[^.]/.test(row.slice(centre - 11, centre + 13)));
				return top < 0 ? 0 : m.groundY - top;
			};
			const filled = (i: number) => scene(i).join('').replace(/\./g, '').length;
			for (let i = 1; i < m.frames.length; i++) {
				expect(height(i), `height of frame ${i}`).toBeGreaterThanOrEqual(height(i - 1));
				expect(filled(i), `fullness of frame ${i}`).toBeGreaterThan(filled(i - 1));
			}
		}
	);

	it('ends each round near 35% / 60% / 80% / 100% of the final height', () => {
		const height = (i: number) => {
			const top = model.frames[i].findIndex(
				(row, y) => y < model.groundY - 4 && /[^.]/.test(row.slice(CENTER - 11, CENTER + 13))
			);
			return model.groundY - top;
		};
		const full = height(16);
		expect(height(4) / full).toBeCloseTo(0.35, 1);
		expect(height(8) / full).toBeCloseTo(0.6, 1);
		expect(height(12) / full).toBeCloseTo(0.8, 1);
	});

	it.each(PLANT_MODELS.map((m) => [m.id, m] as const))(
		'%s floats on an island that tapers downward and never reaches the bottom edge',
		(_, m) => {
			for (const rows of m.frames) {
				expect(rows[rows.length - 1]).toMatch(/^\.+$/);
				const soilWidth = (y: number) => rows[y].replace(/\./g, '').length;
				expect(soilWidth(m.groundY + 2)).toBeGreaterThan(soilWidth(m.groundY + 14));
				expect(rows[m.groundY + 2][0]).toBe('.');
			}
		}
	);

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
					widest = Math.max(widest, Math.abs(x - CENTER));
				});
			});
			return { deepest, widest };
		};
		expect(rootExtent(4).deepest).toBeGreaterThanOrEqual(10);
		expect(rootExtent(4).widest).toBeGreaterThanOrEqual(6);
		expect(rootExtent(16).deepest).toBeGreaterThanOrEqual(24);
		expect(rootExtent(16).widest).toBeGreaterThanOrEqual(16);
	});
});

describe('toInkPaths (SVG rendering)', () => {
	/** Paints the SVG path data back into a grid so it can be compared pixel by pixel. */
	const rasterize = (paths: readonly InkPath[], width: number, height: number) => {
		const grid = Array.from({ length: height }, () => Array<string>(width).fill('.'));
		for (const { ink, d } of paths) {
			for (const [, x, y, w] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
				for (let i = 0; i < Number(w); i++) {
					expect(grid[Number(y)][Number(x) + i], 'pixels never overlap').toBe('.');
					grid[Number(y)][Number(x) + i] = ink;
				}
			}
		}
		return grid.map((row) => row.join(''));
	};

	it.each(PLANT_MODELS.map((m) => [m.id, m] as const))(
		'%s: the SVG reproduces the composed scene exactly',
		(_, m) => {
			for (const frameIndex of [0, 4, 8, 12, 16]) {
				for (const [tick, activity] of [
					[0, 'calm'],
					[7, 'calm'],
					[37, 'break']
				] as const) {
					const rows = composeScene(m, {
						tick,
						animated: true,
						activity,
						frameIndex,
						harvestAge: null
					}).rows;
					const expected = rows.map((row) =>
						[...row].map((ch) => (ch in m.palette ? ch : '.')).join('')
					);
					expect(rasterize(toInkPaths(rows, m.palette), m.width, m.height)).toEqual(expected);
				}
			}
		}
	);

	it('emits one path per ink and merges horizontal runs', () => {
		const paths = toInkPaths(['.aa.b', 'aab..'], { a: 'red', b: 'blue' });
		expect(paths).toEqual([
			{ ink: 'a', d: 'M1 0h2v1h-2zM0 1h2v1h-2z' },
			{ ink: 'b', d: 'M4 0h1v1h-1zM2 1h1v1h-1z' }
		]);
	});
});

describe('composeScene', () => {
	it.each(PLANT_MODELS.map((m) => [m.id, m] as const))(
		'%s resolves idle inks so no authoring characters leak to the canvas',
		(_, m) => {
			for (const activity of ['calm', 'break'] as const) {
				const rows = composeScene(m, {
					tick: 3,
					animated: true,
					activity,
					frameIndex: 16,
					harvestAge: null
				}).rows.join('');
				for (const idleInk of Object.keys(m.idle ?? {})) expect(rows).not.toContain(idleInk);
			}
		}
	);

	it.each(PLANT_MODELS.map((m) => [m.id, m] as const))(
		'%s has visitors in every chapter and a fixed image in static mode',
		(_, m) => {
			for (const frame of [3, 4, 6, 8, 11, 12, 16])
				expect(fauna(m, frame), `frame ${frame}`).toBe(true);
			const at = (tick: number) =>
				composeScene(m, {
					tick,
					animated: false,
					activity: 'break',
					frameIndex: 10,
					harvestAge: null
				}).rows.join('');
			expect(at(1)).toBe(at(7));
		}
	);

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

describe('gym-gains model', () => {
	const gym = getPlantModel('gym-gains');
	const count = (rows: readonly string[], inks: RegExp) =>
		rows.join('').replace(new RegExp(`[^${inks.source}]`, 'g'), '').length;
	const scene = (frameIndex: number, tick: number, activity: SceneActivity = 'calm') =>
		composeScene(gym, { tick, animated: true, activity, frameIndex, harvestAge: null }).rows;

	it('is registered as a selectable model', () => {
		expect(gym.id).toBe('gym-gains');
		expect(PLANT_MODELS).toContain(gym);
	});

	it('keeps the athlete on screen in static mode', () => {
		for (let f = 0; f < gym.frames.length; f++) {
			expect(count(staticScene(gym, f), /S/), `frame ${f}`).toBeGreaterThan(10);
		}
	});

	it('grows in muscle every step while keeping the same stature', () => {
		const body = (f: number) => count(staticScene(gym, f), /WSZOITUJPQ/);
		const headTop = (f: number) => staticScene(gym, f).findIndex((row) => /[Hh]/.test(row));
		for (let f = 1; f < gym.frames.length; f++) {
			expect(body(f), `muscle of frame ${f}`).toBeGreaterThan(body(f - 1));
			expect(headTop(f), `stature of frame ${f}`).toBe(headTop(0));
		}
		expect(body(16)).toBeGreaterThan(body(0) * 2);
	});

	it('draws the body with enough pixels to read its anatomy', () => {
		const rows = staticScene(gym, 16);
		expect(count(rows, /W/)).toBeGreaterThan(20);
		expect(count(rows, /Z/)).toBeGreaterThan(20);
		expect(count(rows, /O/)).toBeGreaterThan(40);
		expect(gym.width).toBe(PLANT_MODELS[0].width * 2);
	});

	it('keeps a human scale: the lifter leaves room for the gym around him', () => {
		const rows = staticScene(gym, 16);
		const top = rows.findIndex((row) => /[Hh]/.test(row));
		const stature = gym.groundY - top;
		const towerTop = rows.findIndex((row) => /[bB]/.test(row.slice(90, 100)));
		expect(stature).toBeLessThan(90);
		expect(gym.groundY - towerTop).toBeGreaterThan(stature);
		const bodyColumns = new Set<number>();
		rows.forEach((row) =>
			[...row].forEach((ch, x) => {
				if ('SWZOTIU'.includes(ch)) bodyColumns.add(x);
			})
		);
		expect(bodyColumns.size).toBeLessThan(gym.width * 0.5);
	});

	it('never paints scenery over the lifter', () => {
		const heroOnly = { ...gym, frames: gym.frames.map((f) => f.map((r) => '.'.repeat(r.length))) };
		const scenery = gym.actors?.filter((a) => a.layer === 'back') ?? [];
		for (const frameIndex of [0, 3, 6, 8, 10, 11, 12, 14, 16]) {
			const moments: (readonly [number, SceneActivity])[] = [
				[3, 'calm'],
				[30, 'calm'],
				...Array.from({ length: 10 }, (_, k) => [k * 16 + 6, 'break'] as const)
			];
			for (const [tick, activity] of moments) {
				const state = { tick, animated: true, activity, frameIndex, harvestAge: null };
				const hero = composeScene({ ...heroOnly, actors: [] }, state).rows;
				const scene = composeScene({ ...gym, actors: scenery }, state).rows;
				hero.forEach((row, y) => {
					for (let x = 0; x < row.length; x++) {
						if (row[x] !== '.')
							expect(scene[y][x], `frame ${frameIndex} at ${x},${y}`).toBe(row[x]);
					}
				});
			}
		}
	});

	describe('exercise rotation', () => {
		const FIVE_MINUTES = 5 * 60 * 4;
		const ticks = (n: number) => Array.from({ length: n }, (_, t) => t);
		const STAR: Record<1 | 2 | 3 | 4, Exercise> = {
			1: 'curl',
			2: 'pulldown',
			3: 'benchPress',
			4: 'squat'
		};

		it('shows at least three exercises every five minutes, led by the round star', () => {
			for (const chapter of [1, 2, 3, 4] as const) {
				const counts = new Map<Exercise, number>();
				for (const t of ticks(FIVE_MINUTES)) {
					const e = exerciseAt(chapter, t);
					counts.set(e, (counts.get(e) ?? 0) + 1);
				}
				expect(counts.size, `chapter ${chapter}`).toBeGreaterThanOrEqual(3);
				const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
				expect(top, `chapter ${chapter}`).toBe(STAR[chapter]);
			}
		});

		it('only uses machines that are on the island in that round', () => {
			const needs: Partial<Record<Exercise, 1 | 2 | 3 | 4>> = {
				pulldown: 2,
				benchPress: 3,
				squat: 4,
				deadlift: 4,
				barbellPress: 4
			};
			for (const chapter of [1, 2, 3, 4] as const) {
				for (const t of ticks(FIVE_MINUTES)) {
					const station = needs[exerciseAt(chapter, t)];
					if (station) expect(station, `chapter ${chapter} tick ${t}`).toBe(chapter);
				}
			}
		});

		it('does three sets before switching, with a pause in between', () => {
			let switches = 0;
			let setsSinceSwitch = 0;
			let wasResting = true;
			for (const t of ticks(FIVE_MINUTES).slice(1)) {
				const q = repPhaseAt(t);
				if (exerciseAt(4, t) !== exerciseAt(4, t - 1)) {
					switches++;
					expect(setsSinceSwitch).toBe(SETS_PER_EXERCISE);
					expect(repPhaseAt(t - 1)).toBeNull();
					setsSinceSwitch = 0;
				}
				if (q !== null && wasResting) setsSinceSwitch++;
				wasResting = q === null;
			}
			expect(switches).toBeGreaterThan(5);
		});

		it('draws every exercise without scenery covering the lifter', () => {
			const heroOnly = {
				...gym,
				actors: [],
				frames: gym.frames.map((f) => f.map((r) => '.'.repeat(r.length)))
			};
			const scenery = gym.actors?.filter((a) => a.layer === 'back') ?? [];
			for (const frameIndex of [2, 6, 11, 15]) {
				for (const tick of [3, 143, 283, 423]) {
					const state = {
						tick,
						animated: true,
						activity: 'calm' as const,
						frameIndex,
						harvestAge: null
					};
					const hero = composeScene(heroOnly, state).rows;
					const scene = composeScene({ ...gym, actors: scenery }, state).rows;
					hero.forEach((row, y) => {
						for (let x = 0; x < row.length; x++) {
							if (row[x] !== '.') expect(scene[y][x]).toBe(row[x]);
						}
					});
				}
			}
		});
	});

	describe('break routine', () => {
		const heroOnly = { ...gym, actors: [] };
		const pose = (frameIndex: number, tick: number) =>
			composeScene(heroOnly, {
				tick,
				animated: true,
				activity: 'break',
				frameIndex,
				harvestAge: null
			}).rows.join('');

		it('shows at least eight different poses in one loop', () => {
			for (const frameIndex of [2, 16]) {
				const loop = new Set(Array.from({ length: 10 }, (_, k) => pose(frameIndex, k * 16 + 6)));
				expect(loop.size, `frame ${frameIndex}`).toBeGreaterThanOrEqual(8);
			}
		});

		it('never repeats an action back to back', () => {
			for (const chapter of [1, 2, 3, 4] as const) {
				for (let k = 0; k < 20; k++) {
					expect(breakActionAt(chapter, k * 16)).not.toBe(breakActionAt(chapter, (k + 1) * 16));
				}
			}
		});

		it('unlocks the showiest poses only once there is muscle to show', () => {
			const seen = (chapter: 1 | 2 | 3 | 4) =>
				new Set(Array.from({ length: 20 }, (_, k) => breakActionAt(chapter, k * 16)));
			for (const chapter of [1, 2] as const) {
				expect(seen(chapter).has('mostMuscular')).toBe(false);
				expect(seen(chapter).has('victory')).toBe(false);
			}
			expect(seen(3).has('mostMuscular')).toBe(true);
			expect(seen(4).has('victory')).toBe(true);
		});

		it('takes the towel off the pulley arm while drying off', () => {
			const towelArea = (rows: readonly string[]) =>
				rows
					.slice(94, 107)
					.map((row) => row.slice(78, 86))
					.join('');
			const at = (tick: number) =>
				composeScene(gym, {
					tick,
					animated: true,
					activity: 'break',
					frameIndex: 10,
					harvestAge: null
				}).rows;
			const towelTick = Array.from({ length: 10 }, (_, k) => k * 16 + 6).find(
				(tick) => breakActionAt(3, tick) === 'towelFace'
			)!;
			expect(towelArea(at(6))).toMatch(/[iI]/);
			expect(towelArea(at(towelTick))).not.toMatch(/[iI]/);
		});
	});

	it('gives every round three elements of its own, all equally busy', () => {
		// motion = pixels that change from one tick to the next, with the athlete left out
		const scenery = { ...gym, hero: undefined };
		const motion = (frameIndex: number) => {
			let changed = 0;
			let prev = '';
			for (let tick = 0; tick <= 120; tick++) {
				const cur = composeScene(scenery, {
					tick,
					animated: true,
					activity: 'calm',
					frameIndex,
					harvestAge: null
				}).rows.join('');
				if (prev) for (let i = 0; i < cur.length; i++) if (cur[i] !== prev[i]) changed++;
				prev = cur;
			}
			return changed;
		};
		const rounds = [2, 6, 11, 15].map(motion);
		const max = Math.max(...rounds);
		for (const r of rounds) expect(r).toBeGreaterThan(max * 0.5);
	});

	it('trains a different exercise each chapter and rests on breaks', () => {
		const rest = (f: number) => staticScene(gym, f).join('');
		for (const f of [2, 7, 11, 15]) {
			expect(scene(f, 3).join(''), `frame ${f} rep`).not.toBe(rest(f));
		}
		const top = (rows: readonly string[]) => rows.findIndex((row) => /[STH]/.test(row));
		expect(top(scene(11, 3))).toBeGreaterThan(top(staticScene(gym, 11)));
		expect(scene(16, 34, 'break').join('')).not.toBe(scene(16, 2, 'break').join(''));
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

	it('renders the scene as a crisp, theme-coloured SVG with one path per ink', async () => {
		const { timerState } = setup();
		const screen = await render(BotanicalProgress, { timerState });
		const svg = screen.container.querySelector('svg')!;
		expect(screen.container.querySelector('canvas')).toBeNull();
		expect(svg.getAttribute('viewBox')).toBe(`0 0 ${model.width} ${model.height}`);
		expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
		await expect.element(screen.getByRole('img')).toBe(svg);

		const paths = [...svg.querySelectorAll('path')];
		const inks = Object.keys(model.palette).length;
		expect(paths.length).toBeGreaterThan(5);
		expect(paths.length).toBeLessThanOrEqual(inks);
		for (const path of paths) expect(path.style.fill).toMatch(/var\(--|color-mix/);
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
