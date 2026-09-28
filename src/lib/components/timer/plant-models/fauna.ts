import type { SceneActor } from './types';

interface ButterflyOptions {
	readonly wing: string;
	readonly body: string;
	readonly seed: number;
	readonly centerX: number;
	readonly centerY: number;
	readonly rangeX: number;
	readonly rangeY: number;
	/** Whether it also visits during calm moments (not only breaks). */
	readonly visitsWhenCalm?: boolean;
}

/** Flutters in a lazy figure-eight, flapping every tick. Comes out during breaks. */
export function butterfly(o: ButterflyOptions): SceneActor {
	return {
		draw(p, s) {
			const visiting = o.visitsWhenCalm && s.activity === 'calm' && s.tick % 240 < 110;
			if (s.activity !== 'break' && !visiting) return;
			const t = s.tick;
			const x = Math.round(
				o.centerX + o.rangeX * Math.sin(t / 19 + o.seed * 2.1) + 2 * Math.sin(t / 5 + o.seed)
			);
			const y = Math.round(
				o.centerY + o.rangeY * Math.sin(t / 23 + o.seed * 1.3) + 1.5 * Math.sin(t / 3)
			);
			p.put(x, y, o.body);
			p.put(x - 1, y - 1, o.wing);
			p.put(x + 1, y - 1, o.wing);
			if (t % 2 === 0) {
				p.put(x - 1, y, o.wing);
				p.put(x + 1, y, o.wing);
				p.put(x - 2, y - 1, o.wing);
				p.put(x + 2, y - 1, o.wing);
			}
		}
	};
}

/** Crosses the grass line from left to right every so often. */
export function ladybug(o: { groundY: number; shell: string; head: string }): SceneActor {
	return {
		draw(p, s) {
			const cycle = s.tick % 300;
			if (cycle >= 110) return;
			const x = Math.floor(cycle / 2) - 3;
			p.put(x, o.groundY, o.shell);
			p.put(x + 1, o.groundY, o.shell);
			p.put(x + 1, o.groundY - 1, o.shell);
			p.put(x + 2, o.groundY, o.head);
		}
	};
}

/** Specks of pollen drifting up from the ground in a slow zigzag. */
export function pollen(o: { originX: number; originY: number; ink: string }): SceneActor {
	return {
		draw(p, s) {
			for (let i = 0; i < 3; i++) {
				const phase = (s.tick + i * 17) % 52;
				if (phase >= 26) continue;
				const x = o.originX + i * 13 + Math.round(2 * Math.sin(phase / 3)) + Math.floor(phase / 6);
				p.put(x, o.originY - Math.floor(phase * 1.6), o.ink);
			}
		}
	};
}

interface FrameRange {
	readonly fromFrame: number;
	readonly toFrame?: number;
}

const inRange = (r: FrameRange, frameIndex: number) =>
	frameIndex >= r.fromFrame && frameIndex <= (r.toFrame ?? Infinity);

/** Highest drawn pixel in a column of the base frame, or -1 when the column is empty. */
function topOf(frame: readonly string[], column: number, groundY: number): number {
	for (let y = 0; y < groundY; y++) if (frame[y]?.[column] && frame[y][column] !== '.') return y;
	return -1;
}

interface ClimberOptions extends FrameRange {
	readonly column: number;
	readonly groundY: number;
	readonly body: string;
	readonly head: string;
	readonly length: number;
	/** Ticks per step while calm; breaks move twice as fast. */
	readonly pace: number;
}

/** Climbs up and down a stem (a ladybug, a caterpillar). */
export function climber(o: ClimberOptions): SceneActor {
	return {
		draw(p, s) {
			if (!inRange(o, s.frameIndex)) return;
			const top = topOf(s.frame, o.column - 1, o.groundY);
			if (top < 0) return;
			const span = Math.max(1, o.groundY - 2 - (top + 3));
			const pace = s.activity === 'break' ? Math.max(1, o.pace / 2) : o.pace;
			const step = Math.floor(s.tick / pace) % (span * 2);
			const climbing = step < span;
			const offset = climbing ? step : span * 2 - step;
			const headY = o.groundY - 2 - offset;
			for (let i = 1; i < o.length; i++) p.put(o.column, headY + (climbing ? i : -i), o.body);
			p.put(o.column, headY, o.head);
		}
	};
}

interface BeeOptions extends FrameRange {
	readonly column: number;
	readonly groundY: number;
	readonly body: string;
	readonly stripe: string;
	readonly wing: string;
}

/** Hovers around the flower at the top of a stem, visiting it every so often. */
export function bee(o: BeeOptions): SceneActor {
	return {
		draw(p, s) {
			if (!inRange(o, s.frameIndex)) return;
			if (s.activity === 'calm' && s.tick % 160 >= 100) return;
			const top = topOf(s.frame, o.column, o.groundY);
			if (top < 0) return;
			const t = s.tick;
			const x = Math.round(o.column + 4 * Math.sin(t / 6));
			const y = Math.round(top - 3 + 2 * Math.sin(t / 4));
			p.put(x, y, o.body);
			p.put(x + 1, y, o.stripe);
			if (t % 2 === 0) p.put(x, y - 1, o.wing);
			else p.put(x + 1, y - 1, o.wing);
		}
	};
}

interface PerchedButterflyOptions extends FrameRange {
	/** Ink of the flower it lands on; it picks the highest one right of the stem. */
	readonly flower: string;
	readonly fromX: number;
	readonly groundY: number;
	readonly wing: string;
	readonly body: string;
}

/** Rests on a flower, slowly opening and closing its wings. */
export function perchedButterfly(o: PerchedButterflyOptions): SceneActor {
	return {
		draw(p, s) {
			if (!inRange(o, s.frameIndex)) return;
			let spot: [number, number] | null = null;
			for (let y = 0; y < o.groundY && !spot; y++) {
				const x = s.frame[y].indexOf(o.flower, o.fromX);
				if (x >= 0) spot = [x, y];
			}
			if (!spot) return;
			const [x, y] = spot;
			const open = Math.floor(s.tick / (s.activity === 'break' ? 1 : 4)) % 2 === 0;
			p.put(x, y - 1, o.body);
			if (open) {
				p.put(x - 1, y - 2, o.wing);
				p.put(x + 1, y - 2, o.wing);
				p.put(x - 1, y - 1, o.wing);
				p.put(x + 1, y - 1, o.wing);
			} else {
				p.put(x, y - 2, o.wing);
			}
		}
	};
}

interface BirdOptions extends FrameRange {
	readonly column: number;
	readonly body: string;
	readonly wing: string;
	readonly beak: string;
}

/** Perches on the highest leaf of a given column while the plant is in the given frames. */
export function bird(o: BirdOptions): SceneActor {
	return {
		draw(p, s) {
			if (!inRange(o, s.frameIndex)) return;
			const top = topOf(s.frame, o.column, s.frame.length);
			if (top < 2) return;
			const t = s.tick;
			const hop = s.activity === 'break' && t % 14 < 2 ? 1 : 0;
			const y = top - 1 - hop;
			const x = o.column;
			p.put(x - 1, y, o.body);
			p.put(x, y, o.body);
			p.put(x + 1, y - 1, o.body);
			p.put(x + 2, y - 1, o.beak);
			const tailUp = t % 16 < 2;
			p.put(x - 2, tailUp ? y - 1 : y, o.body);
			if (s.activity === 'break' && t % 2 === 0) p.put(x, y - 1, o.wing);
		}
	};
}

interface HarvestOptions {
	readonly from: { readonly x: number; readonly y: number };
	readonly to: { readonly x: number; readonly y: number };
	readonly fruit: string;
	readonly highlight: string;
	readonly duration: number;
}

/** A ripe fruit falls from the canopy into the soil, where the next seed appears. */
export function harvestDrop(o: HarvestOptions): SceneActor {
	return {
		draw(p, s) {
			if (s.harvestAge === null || s.harvestAge > o.duration) return;
			const k = Math.min(1, (s.harvestAge / o.duration) ** 2);
			const x = Math.round(o.from.x + (o.to.x - o.from.x) * k);
			const y = Math.round(o.from.y + (o.to.y - o.from.y) * k);
			p.put(x, y, o.highlight);
			p.put(x + 1, y, o.fruit);
			p.put(x, y + 1, o.fruit);
			p.put(x + 1, y + 1, o.fruit);
		}
	};
}
