import { PixelCanvas } from './pixel-canvas';
import { pollen } from './fauna';
import { islandShape } from './island';
import type { IdleInk, PlantModel, SceneActor, ScenePainter, SceneState } from './types';

/**
 * Twice the resolution of the plant model: the athlete needs the extra pixels to read as a body.
 * On screen it occupies the same space, since the host sizes scenes by their aspect ratio.
 *
 * Scale: the lifter is ~1.80 m = 80 rows, so 1 row ≈ 2.25 cm. Every piece of equipment is sized
 * against that (bench ≈ 0.45 m, dumbbell rack ≈ 0.9 m, fan ≈ 1.3 m, pulley tower ≈ 2.2 m).
 */
const W = 120;
const H = 252;
const HX = 59.5;
const GROUND = 192;
const ISLAND_DEPTH = 44;
const FRAMES = 17;
/** The mat is two rows thick; shoes rest on it. */
const FEET = GROUND - 3;
const STATURE = 80;
const HEAD_TOP = FEET - STATURE;

// Layout by zones: left = dumbbells + fan, centre = the round's station, right = tower + speaker.
const RACK = { x0: 2, x1: 14, top: FEET - 40 } as const;
const FAN = { x: 21, y: FEET - 54, r: 6 } as const;
const BOTTLE_X = 30;
const CAT_X = 36;
const PLATES_X = 73;
const DOG_X = 80;
const TOWER_X = 94;
const BEAM_Y = FEET - 98;
const STACK = { x0: 97, x1: 102, top: FEET - 40 } as const;
const SPEAKER = { x0: 104, x1: 114, top: FEET - 24 } as const;
const STOPWATCH = { x: 96, y: BEAM_Y + 5 } as const;
const TOWEL = { x0: 80, x1: 83, y0: BEAM_Y + 3, y1: BEAM_Y + 15 } as const;

const island = islandShape({ width: W, centerX: HX, groundY: GROUND, depth: ISLAND_DEPTH });

type Chapter = 1 | 2 | 3 | 4;
const chapterOf = (frame: number): Chapter =>
	frame <= 4 ? 1 : frame <= 8 ? 2 : frame <= 12 ? 3 : 4;

type Point = readonly [number, number];

// ---------------------------------------------------------------- body measurements

/** Stature never changes; only muscle mass `m` (0 → 1) grows from frame to frame. */
interface Build {
	readonly m: number;
	readonly headH: number;
	readonly headW: number;
	readonly jaw: number;
	readonly neck: number;
	readonly neckLen: number;
	readonly torso: number;
	readonly shoulder: number;
	readonly waist: number;
	readonly legs: number;
	readonly thighLen: number;
	readonly thigh: number;
	readonly calf: number;
	readonly upperArm: number;
	readonly forearm: number;
	readonly upperLen: number;
	readonly foreLen: number;
	readonly fist: number;
	readonly plate: number;
}

function buildOf(frame: number): Build {
	const m = (frame / (FRAMES - 1)) ** 1.1;
	const headH = 11;
	const neckLen = 3;
	const torso = 25;
	const legs = STATURE - headH - neckLen - torso;
	return {
		m,
		headH,
		headW: 9 + Math.round(2 * m),
		jaw: Math.round(m),
		neck: 2 + 2.5 * m,
		neckLen,
		torso,
		shoulder: 7 + Math.round(6 * m),
		waist: 5 + Math.round(2 * m),
		legs,
		thighLen: Math.round(legs * 0.47),
		thigh: 2.2 + 2.6 * m,
		calf: 1.8 + 1.8 * m,
		upperArm: 1.6 + 2.6 * m,
		forearm: 1.4 + 1.6 * m,
		upperLen: 14,
		foreLen: 12,
		fist: 1.5 + m,
		plate: 3 + Math.round(m * 5)
	};
}

// ---------------------------------------------------------------- shaded primitives

interface Tones {
	readonly light: string;
	readonly mid: string;
	readonly dark: string;
	readonly line: string;
}

const SKIN: Tones = { light: 'W', mid: 'S', dark: 'Z', line: 'O' };
const TANK: Tones = { light: 'I', mid: 'T', dark: 'U', line: 'U' };
const SHORTS: Tones = { light: 'J', mid: 'P', dark: 'Q', line: 'Q' };
const FUR: Tones = { light: 'b', mid: 'B', dark: 'k', line: 'k' };

/** Light comes from the top-left; n is the pixel's normalised offset from the shape's axis. */
function shadeOf(nx: number, ny: number, tones: Tones): string {
	const l = -(nx * 0.75 + ny * 0.45);
	return l > 0.35 ? tones.light : l < -0.3 ? tones.dark : tones.mid;
}

/** Tapered, optionally bulging capsule with a one-pixel outline: limbs and muscles. */
function capsule(
	p: ScenePainter,
	a: Point,
	b: Point,
	r0: number,
	r1: number,
	tones: Tones,
	bulge = 0
): void {
	const vx = b[0] - a[0];
	const vy = b[1] - a[1];
	const len2 = vx * vx + vy * vy || 1;
	const pad = Math.max(r0, r1) + Math.abs(bulge) + 1;
	const y0 = Math.floor(Math.min(a[1], b[1]) - pad);
	const y1 = Math.ceil(Math.max(a[1], b[1]) + pad);
	const x0 = Math.floor(Math.min(a[0], b[0]) - pad);
	const x1 = Math.ceil(Math.max(a[0], b[0]) + pad);
	for (let y = y0; y <= y1; y++) {
		for (let x = x0; x <= x1; x++) {
			const t = Math.min(1, Math.max(0, ((x - a[0]) * vx + (y - a[1]) * vy) / len2));
			const dx = x - (a[0] + vx * t);
			const dy = y - (a[1] + vy * t);
			const r = r0 + (r1 - r0) * t + bulge * Math.sin(Math.PI * t);
			const d = Math.hypot(dx, dy);
			if (d > r) continue;
			p.put(x, y, d > r - 1 ? tones.line : shadeOf(dx / r, dy / r, tones));
		}
	}
}

function ellipse(
	p: ScenePainter,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	tones: Tones,
	outline = true
): void {
	for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
		for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
			const nx = (x - cx) / rx;
			const ny = (y - cy) / ry;
			const d = nx * nx + ny * ny;
			if (d > 1) continue;
			p.put(x, y, outline && d > 0.72 ? tones.line : shadeOf(nx, ny, tones));
		}
	}
}

function rect(p: ScenePainter, x0: number, y0: number, x1: number, y1: number, ink: string): void {
	for (let y = Math.round(y0); y <= Math.round(y1); y++) {
		for (let x = Math.round(x0); x <= Math.round(x1); x++) p.put(x, y, ink);
	}
}

function disc(p: ScenePainter, cx: number, cy: number, r: number, ink: string): void {
	for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
		for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
			if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5) p.put(x, y, ink);
		}
	}
}

const fist = (p: ScenePainter, b: Build, at: Point) =>
	ellipse(p, at[0], at[1], b.fist, b.fist, SKIN);

// ---------------------------------------------------------------- body parts

function drawHead(p: ScenePainter, b: Build, cx: number, top: number): void {
	const rx = b.headW / 2;
	const ry = b.headH / 2;
	const cy = top + ry;
	ellipse(p, cx, cy, rx, ry, SKIN);
	const jawTop = top + b.headH - 3;
	for (let y = jawTop; y < top + b.headH; y++) {
		const half = rx - 1 + b.jaw - (y - jawTop) * 0.7;
		for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
			const edge =
				x <= Math.round(cx - half) || x >= Math.round(cx + half) || y === top + b.headH - 1;
			p.put(x, y, edge ? 'O' : x > cx + half * 0.4 ? 'Z' : 'S');
		}
	}
	for (let y = top; y <= top + 3; y++) {
		for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
			const nx = (x - cx) / rx;
			const ny = (y - cy) / ry;
			if (nx * nx + ny * ny > 1.02) continue;
			if (y <= top + 2 || Math.abs(nx) > 0.7) p.put(x, y, y === top + 1 && nx < -0.2 ? 'h' : 'H');
		}
	}
	const c = Math.round(cx);
	p.put(Math.round(cx - rx) - 1, top + 5, 'Z');
	p.put(Math.round(cx + rx) + 1, top + 5, 'Z');
	rect(p, c - 3, top + 4, c - 1, top + 4, 'H');
	rect(p, c + 1, top + 4, c + 3, top + 4, 'H');
	p.put(c - 2, top + 5, 'k');
	p.put(c + 2, top + 5, 'k');
	p.put(c, top + 6, 'Z');
	rect(p, c - 1, top + 8, c + 1, top + 8, 'O');
}

/** Neck, trapezius slope, V-tapered torso, then a stringer tank top that shows shoulders and pecs. */
/** Posing tweaks: flared lats, shrugged traps, flexed abs. */
interface TorsoStyle {
	readonly flare?: number;
	readonly traps?: number;
	readonly abs?: boolean;
}

function drawTorso(
	p: ScenePainter,
	b: Build,
	cx: number,
	shoulderY: number,
	hipY: number,
	style: TorsoStyle = {}
): void {
	capsule(p, [cx, shoulderY - b.neckLen - 2], [cx, shoulderY + 1], b.neck, b.neck + 0.5, SKIN);
	const trapTop = shoulderY - 1 - Math.round(b.m * 2) - (style.traps ?? 0);
	for (let y = trapTop; y <= shoulderY; y++) {
		const half = b.neck + (b.shoulder - b.neck) * ((y - trapTop + 1) / (shoulderY - trapTop + 1));
		for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
			p.put(x, y, y === trapTop ? 'O' : shadeOf((x - cx) / half, -0.3, SKIN));
		}
	}

	const halfAt = (y: number) => {
		const t = (y - shoulderY) / b.torso;
		const lats =
			t > 0.05 && t < 0.65 ? (style.flare ?? 0) * Math.sin((Math.PI * (t - 0.05)) / 0.6) : 0;
		return (
			lats +
			(t < 0.3
				? b.shoulder - t * 3
				: b.shoulder - 1 + (b.waist - b.shoulder + 1) * ((t - 0.3) / 0.7) ** 0.9)
		);
	};
	const pecLine = shoulderY + Math.round(b.torso * 0.34);
	for (let y = shoulderY; y <= hipY; y++) {
		const half = halfAt(y);
		for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
			const edge = Math.abs(x - cx) > half - 1;
			p.put(x, y, edge ? 'O' : y === pecLine ? 'Z' : shadeOf((x - cx) / half, 0, SKIN));
		}
	}

	for (let y = shoulderY - 1; y <= hipY; y++) {
		const t = (y - shoulderY) / b.torso;
		const half = halfAt(Math.max(y, shoulderY));
		if (t < 0.14) {
			for (const side of [-1, 1] as const) {
				for (let k = 1; k <= 2; k++) {
					p.put(Math.round(cx + side * (b.neck + k)), y, k === 2 ? 'U' : 'T');
				}
			}
			continue;
		}
		const armhole = Math.max(0, 1 - t / 0.5) * half * 0.38;
		const tank = Math.max(b.neck + 2, half - 1 - armhole);
		for (let x = Math.round(cx - tank); x <= Math.round(cx + tank); x++) {
			const edge = Math.abs(x - cx) > tank - 1;
			p.put(x, y, edge ? 'U' : shadeOf((x - cx) / tank, 0, TANK));
		}
	}

	if (b.m > 0.25) {
		for (let x = Math.round(cx - b.shoulder * 0.6); x <= Math.round(cx + b.shoulder * 0.6); x++) {
			if (Math.abs(x - cx) > 1) p.put(x, pecLine, 'U');
		}
	}
	if (b.m > 0.35 || style.abs) rect(p, cx, pecLine, cx, hipY - 3, 'U');
	if (b.m > 0.45 || style.abs) {
		for (const dy of [4, 8, 12]) {
			const y = pecLine + dy;
			if (y >= hipY - 2) continue;
			const w = 2 + Math.round(b.m * 2);
			rect(p, cx - w - 1, y, cx - 2, y, 'U');
			rect(p, cx + 2, y, cx + w + 1, y, 'U');
		}
	}
}

interface Leg {
	readonly hip: Point;
	readonly knee: Point;
	readonly ankle: Point;
}

function drawShoe(p: ScenePainter, ankle: Point, side: -1 | 1): void {
	const x0 = Math.round(ankle[0] - 2 + (side > 0 ? 0 : -1));
	rect(p, x0, FEET - 2, x0 + 4, FEET - 1, 'K');
	rect(p, x0, FEET, x0 + 4, FEET, 'k');
	p.put(x0 + 2, FEET - 2, 'b');
}

function drawLegs(p: ScenePainter, b: Build, legs: readonly Leg[], hipY: number, cx: number): void {
	for (const leg of legs) {
		capsule(p, leg.knee, leg.ankle, b.calf * 0.8, b.calf * 0.5, SKIN, b.calf * 0.35);
		capsule(p, leg.hip, leg.knee, b.thigh * 1.05, b.thigh * 0.65, SKIN, b.thigh * 0.25);
		drawShoe(p, leg.ankle, leg.ankle[0] < cx ? -1 : 1);
	}
	for (const leg of legs) {
		const end: Point = [
			leg.hip[0] + (leg.knee[0] - leg.hip[0]) * 0.42,
			leg.hip[1] + (leg.knee[1] - leg.hip[1]) * 0.42
		];
		capsule(p, leg.hip, end, b.thigh * 1.2, b.thigh * 1.1, SHORTS);
	}
	rect(p, cx - b.waist - 1, hipY - 2, cx + b.waist + 1, hipY + 3, 'P');
	rect(p, cx - b.waist - 1, hipY - 2, cx + b.waist + 1, hipY - 2, 'Q');
	rect(p, cx + b.waist * 0.4, hipY - 1, cx + b.waist + 1, hipY + 3, 'Q');
}

interface Arm {
	readonly elbow: Point;
	readonly hand: Point;
}

function drawArm(p: ScenePainter, b: Build, shoulder: Point, arm: Arm): void {
	capsule(
		p,
		shoulder,
		arm.elbow,
		b.upperArm,
		b.upperArm * 0.75,
		SKIN,
		0.3 + b.upperArm * 0.45 * b.m
	);
	capsule(p, arm.elbow, arm.hand, b.forearm, b.forearm * 0.7, SKIN, b.forearm * 0.25);
	fist(p, b, arm.hand);
}

interface FrontPose {
	readonly hipY: number;
	readonly seated?: boolean;
	readonly kneeOut?: number;
	readonly torso?: TorsoStyle;
	readonly arms: (side: -1 | 1, shoulder: Point) => Arm;
}

interface Joints {
	readonly shoulderY: number;
	readonly headTop: number;
	readonly hands: readonly [Point, Point];
}

const standingHip = (b: Build) => FEET - b.legs;

function drawFront(p: ScenePainter, b: Build, pose: FrontPose, cx = HX): Joints {
	const shoulderY = pose.hipY - b.torso;
	const headTop = shoulderY - b.neckLen - b.headH;
	const legs = ([-1, 1] as const).map((side): Leg => {
		const hip: Point = [cx + side * Math.max(2, b.waist - b.thigh * 0.6), pose.hipY + 1];
		const ankle: Point = [hip[0] + side * (1 + (pose.kneeOut ?? 0) * 0.3), FEET - 3];
		const knee: Point = pose.seated
			? [hip[0] + side * 2, pose.hipY + b.thigh * 1.4]
			: [hip[0] + side * (pose.kneeOut ?? 0), hip[1] + b.thighLen];
		return { hip, knee, ankle };
	});
	drawLegs(p, b, legs, pose.hipY, cx);
	drawTorso(p, b, cx, shoulderY, pose.hipY, pose.torso);
	drawHead(p, b, cx, headTop);

	const hands: Point[] = [];
	for (const side of [-1, 1] as const) {
		const shoulder: Point = [cx + side * (b.shoulder - b.upperArm * 0.5), shoulderY + 2];
		ellipse(
			p,
			cx + side * (b.shoulder - b.upperArm * 0.4),
			shoulderY + 2,
			b.upperArm + 1,
			b.upperArm + 1.5,
			SKIN
		);
		const arm = pose.arms(side, shoulder);
		drawArm(p, b, shoulder, arm);
		hands.push(arm.hand);
	}
	return { shoulderY, headTop, hands: [hands[0], hands[1]] };
}

const restArms =
	(b: Build) =>
	(side: -1 | 1, s: Point): Arm => {
		const elbow: Point = [s[0] + side * (1 + b.m * 3), s[1] + b.upperLen];
		return { elbow, hand: [elbow[0] + side, elbow[1] + b.foreLen] };
	};

// ---------------------------------------------------------------- weights

function drawDumbbell(p: ScenePainter, b: Build, hand: Point): void {
	const r = 2 + Math.round(b.plate * 0.3);
	rect(p, hand[0] - 3, hand[1], hand[0] + 3, hand[1], 'b');
	for (const side of [-1, 1] as const) {
		const x = hand[0] + side * 4;
		rect(p, x - 1, hand[1] - r, x, hand[1] + r, 'r');
		rect(p, x - 1, hand[1] - r, x - 1, hand[1] + r, 'o');
	}
	fist(p, b, hand);
}

function drawBarbell(p: ScenePainter, b: Build, y: number, reach: number): void {
	rect(p, HX - reach, y, HX + reach, y, 'b');
	for (const side of [-1, 1] as const) {
		for (let k = 0; k < 2; k++) {
			const x = HX + side * (reach - 2 - k * 3);
			rect(p, x - 1, y - b.plate + k * 2, x, y + b.plate - k * 2, 'r');
			rect(p, x - 1, y - b.plate + k * 2, x - 1, y + b.plate - k * 2, 'o');
		}
	}
}

// ---------------------------------------------------------------- stations

function pulldownGeometry(b: Build) {
	const hipY = FEET - Math.round(b.legs * 0.55);
	return { hipY, shoulderY: hipY - b.torso };
}

/** The bench sits at knee height, centred on the island so the lifter's head clears the fan. */
function benchGeometry(b: Build) {
	const top = FEET - 18;
	const chest = Math.round(6 + 5 * b.m);
	const headX = Math.round(HX - 30);
	const shoulderX = headX + b.headH + 1;
	const hipX = shoulderX + b.torso;
	return { top, chest, headX, shoulderX, hipX };
}

function drawBenchPress(p: ScenePainter, b: Build, q: number): void {
	const g = benchGeometry(b);
	const chestTop = g.top - g.chest;
	const hip: Point = [g.hipX, g.top - g.chest / 2];
	const knee: Point = [g.hipX + Math.round(b.thighLen * 0.8), chestTop - 4];
	const ankle: Point = [knee[0] + 3, FEET - 3];
	capsule(p, knee, ankle, b.calf * 0.8, b.calf * 0.5, SKIN, b.calf * 0.3);
	capsule(p, hip, knee, b.thigh * 1.05, b.thigh * 0.7, SKIN, b.thigh * 0.2);
	const shortsEnd: Point = [hip[0] + (knee[0] - hip[0]) * 0.4, hip[1] + (knee[1] - hip[1]) * 0.4];
	capsule(p, hip, shortsEnd, b.thigh * 1.2, b.thigh * 1.1, SHORTS);
	drawShoe(p, ankle, 1);

	for (let x = g.shoulderX; x <= g.hipX; x++) {
		const t = (x - g.shoulderX) / b.torso;
		const bump = Math.round(Math.sin(Math.min(1, t * 1.6) * Math.PI) * (1 + b.m * 2));
		for (let y = chestTop - bump; y < g.top; y++) {
			const edge = y === chestTop - bump || x === g.shoulderX || x === g.hipX;
			p.put(x, y, edge ? 'U' : y < chestTop - bump + 2 ? 'I' : y > g.top - 2 ? 'U' : 'T');
		}
	}
	rect(p, g.hipX - 3, chestTop + 1, g.hipX + 2, g.top - 1, 'P');
	capsule(p, [g.headX + b.headH, g.top - 3], [g.shoulderX + 1, g.top - 3], b.neck, b.neck, SKIN);
	const r = b.headH / 2;
	const hcx = g.headX + r;
	const hcy = g.top - r;
	ellipse(p, hcx, hcy, r, r, SKIN);
	for (let x = g.headX; x <= g.headX + 3; x++) {
		for (let y = Math.floor(hcy - r); y <= Math.ceil(hcy + r); y++) {
			if (((x - hcx) / r) ** 2 + ((y - hcy) / r) ** 2 <= 1) p.put(x, y, 'H');
		}
	}
	p.put(g.headX + b.headH - 4, g.top - b.headH + 4, 'k');
	rect(p, g.headX + b.headH - 2, g.top - 4, g.headX + b.headH - 2, g.top - 3, 'O');

	const shoulder: Point = [g.shoulderX + 3, chestTop];
	const reach = b.upperLen + b.foreLen - 3;
	const hand: Point = [shoulder[0], chestTop - 3 - Math.round(q * reach)];
	const elbow: Point = [
		shoulder[0] - Math.round((1 - q) * b.upperLen * 0.7),
		(shoulder[1] + hand[1]) / 2
	];
	drawArm(p, b, shoulder, { elbow, hand });
	disc(p, hand[0], hand[1], b.plate + 1, 'r');
	disc(p, hand[0] - 1, hand[1] - 1, Math.max(1, b.plate - 2), 'o');
	disc(p, hand[0], hand[1], 1, 'y');
}

const REP_CURVE = [0, 0.35, 0.7, 1, 1, 0.7, 0.35, 0];

export type Exercise =
	| 'curl'
	| 'lateralRaise'
	| 'shoulderPress'
	| 'pulldown'
	| 'benchPress'
	| 'squat'
	| 'deadlift'
	| 'barbellPress';

/**
 * Each round alternates its star exercise (the one that uses the round's machine) with
 * free-weight accessories, so the phase keeps its identity without repeating for 25 minutes.
 */
const PLAYLISTS: Record<Chapter, readonly Exercise[]> = {
	1: ['curl', 'lateralRaise', 'curl', 'shoulderPress'],
	2: ['pulldown', 'curl', 'pulldown', 'shoulderPress'],
	3: ['benchPress', 'curl', 'benchPress', 'lateralRaise'],
	4: ['squat', 'deadlift', 'squat', 'barbellPress']
};

/** A set: 7 reps of 2 s (28 ticks) plus a 3 s breather. */
const SET_TICKS = 40;
const REP_TICKS = 28;
export const SETS_PER_EXERCISE = 3;
/** A slightly longer pause while switching to the next exercise. */
const TRANSITION_TICKS = 20;
const EXERCISE_TICKS = SETS_PER_EXERCISE * SET_TICKS + TRANSITION_TICKS;

export function exerciseAt(chapter: Chapter, tick: number): Exercise {
	const list = PLAYLISTS[chapter];
	return list[Math.floor(tick / EXERCISE_TICKS) % list.length];
}

/** Rep phase 0..1 at this tick, or null while resting between sets or exercises. */
export function repPhaseAt(tick: number): number | null {
	const within = tick % EXERCISE_TICKS;
	if (within >= SETS_PER_EXERCISE * SET_TICKS) return null;
	const cycle = within % SET_TICKS;
	return cycle >= REP_TICKS ? null : REP_CURVE[cycle % REP_CURVE.length];
}

const usesDumbbells = (e: Exercise) =>
	e === 'curl' || e === 'lateralRaise' || e === 'shoulderPress';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function drawTraining(
	p: ScenePainter,
	b: Build,
	chapter: Chapter,
	exercise: Exercise,
	q: number
): void {
	if (chapter === 2 && exercise !== 'pulldown') drawParkedHandle(p);
	const hipY = standingHip(b);
	switch (exercise) {
		case 'curl': {
			const joints = drawFront(p, b, {
				hipY,
				arms: (side, s) => {
					const elbow: Point = [s[0] + side * (1 + b.m * 3), s[1] + b.upperLen];
					const a = q * 2.5;
					return { elbow, hand: [elbow[0] + side, elbow[1] + Math.cos(a) * b.foreLen] };
				}
			});
			joints.hands.forEach((hand) => drawDumbbell(p, b, hand));
			return;
		}
		case 'lateralRaise': {
			const a = q * 1.25;
			const joints = drawFront(p, b, {
				hipY,
				arms: (side, s) => {
					const elbow: Point = [
						s[0] + side * (1 + Math.sin(a) * b.upperLen),
						s[1] + Math.cos(a) * b.upperLen
					];
					const reach = b.foreLen * 0.85;
					return {
						elbow,
						hand: [
							elbow[0] + side * Math.sin(a + 0.15) * reach,
							elbow[1] + Math.cos(a + 0.15) * reach
						]
					};
				}
			});
			joints.hands.forEach((hand) => drawDumbbell(p, b, hand));
			return;
		}
		case 'shoulderPress':
		case 'barbellPress': {
			const barbell = exercise === 'barbellPress';
			const joints = drawFront(p, b, {
				hipY,
				arms: (side, s) => {
					const elbow: Point = [
						s[0] + side * lerp(b.upperLen * 0.8, 3, q),
						lerp(s[1] + 2, s[1] - b.upperLen * 0.85, q)
					];
					const handX = s[0] + side * lerp(b.upperLen * (barbell ? 0.6 : 0.8), barbell ? 1 : 2, q);
					return { elbow, hand: [handX, elbow[1] - lerp(b.foreLen * 0.7, b.foreLen, q)] };
				}
			});
			if (barbell) {
				drawBarbell(p, b, Math.round(joints.hands[0][1]), b.shoulder + 16);
				joints.hands.forEach((hand) => fist(p, b, hand));
			} else {
				joints.hands.forEach((hand) => drawDumbbell(p, b, hand));
			}
			return;
		}
		case 'pulldown': {
			const g = pulldownGeometry(b);
			const joints = drawFront(p, b, {
				hipY: g.hipY,
				seated: true,
				arms: (side, s) => {
					const elbow: Point = [
						s[0] + side * (3 + q * b.upperLen * 0.6),
						s[1] - b.upperLen * 0.9 * (1 - q) + q * 3
					];
					return {
						elbow,
						hand: [s[0] + side * (4 + q * b.upperLen * 0.3), elbow[1] - b.foreLen * (0.9 - q * 0.3)]
					};
				}
			});
			const barY = Math.round(Math.min(joints.hands[0][1], joints.hands[1][1]));
			rect(p, HX, BEAM_Y + 3, HX, barY - 1, 'b');
			rect(p, joints.hands[0][0] - 4, barY, joints.hands[1][0] + 4, barY, 'b');
			joints.hands.forEach((hand) => fist(p, b, hand));
			return;
		}
		case 'benchPress':
			drawBenchPress(p, b, q);
			return;
		case 'squat': {
			const drop = Math.round(q * b.legs * 0.3);
			const joints = drawFront(p, b, {
				hipY: hipY + drop,
				kneeOut: q * b.thigh * 1.6,
				arms: (side, s) => ({
					elbow: [s[0] + side * 4, s[1] + b.upperLen * 0.45],
					hand: [s[0] + side * 5, s[1] - 3]
				})
			});
			drawBarbell(p, b, joints.shoulderY - 3, b.shoulder + 16);
			joints.hands.forEach((hand) => fist(p, b, hand));
			return;
		}
		case 'deadlift': {
			// q = 1 is the lockout; at q = 0 the hips sink and the bar sits by the knees
			const drop = Math.round((1 - q) * b.legs * 0.35);
			const joints = drawFront(p, b, {
				hipY: hipY + drop,
				kneeOut: (1 - q) * b.thigh * 1.2,
				torso: { traps: q > 0.9 ? 1 : 0 },
				arms: (side, s) => ({
					elbow: [s[0] + side * 1, s[1] + b.upperLen],
					hand: [s[0] + side * 0.5, s[1] + b.upperLen + b.foreLen]
				})
			});
			drawBarbell(p, b, Math.round(joints.hands[0][1]), b.shoulder + 16);
			joints.hands.forEach((hand) => fist(p, b, hand));
		}
	}
}

/** The pulldown bar hanging from the pulley arm, above the lifter's head. */
function drawParkedHandle(p: ScenePainter): void {
	rect(p, HX, BEAM_Y + 3, HX, BEAM_Y + 8, 'b');
	rect(p, HX - 7, BEAM_Y + 9, HX + 7, BEAM_Y + 9, 'b');
}

function drawRest(p: ScenePainter, b: Build, chapter: Chapter, exercise?: Exercise): void {
	const joints = drawFront(p, b, { hipY: standingHip(b), arms: restArms(b) });
	const holdsDumbbells = exercise ? usesDumbbells(exercise) : chapter === 1;
	if (holdsDumbbells) joints.hands.forEach((hand) => drawDumbbell(p, b, hand));
	if (chapter === 2) drawParkedHandle(p);
}

type BreakAction =
	| 'water'
	| 'doubleBiceps'
	| 'towelFace'
	| 'latSpread'
	| 'stretch'
	| 'absThigh'
	| 'shakeChalk'
	| 'mostMuscular'
	| 'towelNeck'
	| 'victory';

/** Fixed rotation, never repeating an action back to back. Showy poses unlock with the muscle. */
const BREAK_ROUTINE: readonly { readonly action: BreakAction; readonly fromChapter: Chapter }[] = [
	{ action: 'water', fromChapter: 1 },
	{ action: 'doubleBiceps', fromChapter: 1 },
	{ action: 'towelFace', fromChapter: 1 },
	{ action: 'latSpread', fromChapter: 1 },
	{ action: 'stretch', fromChapter: 1 },
	{ action: 'absThigh', fromChapter: 1 },
	{ action: 'shakeChalk', fromChapter: 1 },
	{ action: 'mostMuscular', fromChapter: 3 },
	{ action: 'towelNeck', fromChapter: 1 },
	{ action: 'victory', fromChapter: 3 }
];

const BREAK_ACTION_TICKS = 16;

export function breakActionAt(chapter: Chapter, tick: number): BreakAction {
	const routine = BREAK_ROUTINE.filter((step) => chapter >= step.fromChapter);
	return routine[Math.floor(tick / BREAK_ACTION_TICKS) % routine.length].action;
}

/** The hand towel: a striped iris cloth, wider than the head so it reads at this size. */
function drawClothTowel(p: ScenePainter, x0: number, y0: number, x1: number, y1: number): void {
	for (let y = Math.round(y0); y <= Math.round(y1); y++) {
		for (let x = Math.round(x0); x <= Math.round(x1); x++) {
			const edge = x === Math.round(x0) || x === Math.round(x1) || y === Math.round(y1);
			p.put(x, y, edge ? 'U' : y % 3 === 0 ? 'I' : 'i');
		}
	}
}

/** While the lifter uses the gym towel, it is gone from the pulley arm. */
function takeTowelFromArm(p: ScenePainter, chapter: Chapter): void {
	if (chapter < 2) return;
	for (let y = TOWEL.y0; y <= TOWEL.y1; y++) {
		for (let x = TOWEL.x0 - 2; x <= TOWEL.x1 + 2; x++) p.put(x, y, '.');
	}
}

function drawBreak(p: ScenePainter, b: Build, tick: number, chapter: Chapter): void {
	const action = breakActionAt(chapter, tick);
	const beat = tick % 8 < 4 ? 0 : 1;
	const breath = tick % 8 < 4 ? 0 : 1;
	const hipY = standingHip(b);
	const shoulderY = hipY - b.torso;
	const headTop = shoulderY - b.neckLen - b.headH;
	const rest = restArms(b);

	switch (action) {
		case 'water': {
			const hand: Point = [HX + b.headW / 2 + 2, headTop + b.headH * 0.8];
			drawFront(p, b, {
				hipY,
				arms: (side, s) =>
					side < 0 ? rest(side, s) : { elbow: [s[0] + 4, s[1] + b.upperLen * 0.7], hand }
			});
			const bx = Math.round(hand[0] + 1);
			const by = Math.round(hand[1]);
			rect(p, bx, by - 5, bx + 2, by + 1, 'l');
			rect(p, bx + 2, by - 5, bx + 2, by + 1, 'k');
			rect(p, bx, by - 6, bx + 2, by - 6, 'i');
			fist(p, b, hand);
			return;
		}
		case 'doubleBiceps': {
			drawFront(p, b, {
				hipY,
				arms: (side, s) => {
					const elbow: Point = [s[0] + side * b.upperLen, s[1] - 1];
					return { elbow, hand: [elbow[0] - side, elbow[1] - b.foreLen] };
				}
			});
			for (const side of [-1, 1] as const) {
				const mid = HX + side * (b.shoulder + b.upperLen * 0.55);
				ellipse(
					p,
					mid,
					shoulderY + 2 - b.upperArm * 0.5,
					b.upperArm * 0.9 + 1,
					b.upperArm * 0.8 + 1,
					SKIN
				);
			}
			return;
		}
		case 'latSpread': {
			drawFront(p, b, {
				hipY,
				torso: { flare: 1 + b.m * 5 },
				arms: (side, s) => ({
					elbow: [s[0] + side * (b.upperLen * 0.75 + b.m * 3), s[1] + b.upperLen * 0.55],
					hand: [HX + side * (b.waist + 2), hipY - 4]
				})
			});
			return;
		}
		case 'mostMuscular': {
			drawFront(p, b, {
				hipY,
				torso: { flare: 1 + b.m * 2, traps: 2 + Math.round(b.m * 2), abs: true },
				arms: (side, s) => ({
					elbow: [s[0] + side * (3 + b.m * 2), s[1] + b.upperLen * 0.75],
					hand: [HX + side * (2 + beat), hipY - 7]
				})
			});
			rect(p, HX - 2, headTop + 8, HX + 2, headTop + 8, 'O');
			return;
		}
		case 'absThigh': {
			drawFront(p, b, {
				hipY,
				torso: { abs: true },
				arms: (side, s) => ({
					elbow: [s[0] + side * (b.upperLen * 0.8), headTop + b.headH * 0.4],
					hand: [HX + side * 3, headTop + 2]
				})
			});
			drawHead(p, b, HX, headTop);
			return;
		}
		case 'victory': {
			drawFront(p, b, {
				hipY,
				arms: (side, s) => {
					if (side > 0) {
						const elbow: Point = [s[0] + 2, s[1] - b.upperLen * 0.9];
						return { elbow, hand: [elbow[0] + 1, elbow[1] - b.foreLen] };
					}
					const elbow: Point = [s[0] - b.upperLen, s[1] - 1];
					return { elbow, hand: [elbow[0] + 1, elbow[1] - b.foreLen] };
				}
			});
			if (tick % 4 < 2) {
				const fx = Math.round(HX + b.shoulder + 3);
				const fy = Math.round(shoulderY + 2 - b.upperLen * 0.9 - b.foreLen - 5);
				p.put(fx, fy, 'y');
				p.put(fx - 2, fy, 'n');
				p.put(fx + 2, fy, 'n');
				p.put(fx, fy - 2, 'n');
			}
			return;
		}
		case 'stretch': {
			drawFront(p, b, {
				hipY,
				arms: (side, s) => {
					const elbow: Point = [s[0] + side * 2, s[1] - b.upperLen * 0.8];
					return { elbow, hand: [HX + side * (2 + beat * 3), elbow[1] - b.foreLen * 0.9] };
				}
			});
			return;
		}
		case 'shakeChalk': {
			const clap = tick % 8 >= 5;
			const chest: Point = [HX, shoulderY + 9];
			drawFront(p, b, {
				hipY,
				arms: (side, s) => {
					if (clap)
						return {
							elbow: [s[0] + side * 3, s[1] + b.upperLen * 0.7],
							hand: [chest[0] + side * 1.5, chest[1]]
						};
					const jitter = tick % 2 === 0 ? side : -side;
					const arm = rest(side, s);
					return { elbow: arm.elbow, hand: [arm.hand[0] + jitter, arm.hand[1]] };
				}
			});
			if (clap) {
				const spread = (tick % 8) - 4;
				for (const [dx, dy] of [
					[-3, -2],
					[3, -3],
					[-4, 1],
					[4, 0],
					[0, -4],
					[-2, 3],
					[2, 2]
				]) {
					p.put(chest[0] + dx * spread * 0.6, chest[1] + dy * spread * 0.5, 'h');
				}
			}
			return;
		}
		case 'towelFace': {
			takeTowelFromArm(p, chapter);
			const sway = [-2, 0, 2, 0][tick % 4];
			const faceY = headTop + b.headH * 0.55;
			drawFront(p, b, {
				hipY,
				arms: (side, s) => ({
					elbow: [s[0] + side * 3, s[1] + b.upperLen * 0.55],
					hand: [HX + side * 4 + sway, faceY]
				})
			});
			drawClothTowel(p, HX - 6 + sway, headTop + 3, HX + 6 + sway, headTop + b.headH + 1);
			return;
		}
		case 'towelNeck': {
			takeTowelFromArm(p, chapter);
			const y0 = shoulderY - 1 - breath;
			const reach = b.neck + 3;
			drawFront(p, b, {
				hipY: hipY - breath,
				arms: (side, s) => ({
					elbow: [s[0] + side * 2, s[1] + b.upperLen * 0.7],
					hand: [HX + side * (reach + 1), y0 + 12]
				})
			});
			drawClothTowel(p, HX - reach - 2, y0 - 2, HX + reach + 2, y0);
			for (const side of [-1, 1] as const) {
				const x = HX + side * (reach + 0.5);
				drawClothTowel(p, x - 1.5, y0, x + 1.5, y0 + 11);
			}
			return;
		}
	}
}

/**
 * The lifter: rotates through the round's exercises (3 sets each) while calm or focusing;
 * on breaks poses, dries off and recovers.
 */
const athlete: SceneActor = {
	draw(p, s: SceneState) {
		const b = buildOf(s.frameIndex);
		const chapter = chapterOf(s.frameIndex);
		if (!s.animated) return drawRest(p, b, chapter);
		if (s.activity === 'break') return drawBreak(p, b, s.tick, chapter);
		const exercise = exerciseAt(chapter, s.tick);
		const q = repPhaseAt(s.tick);
		if (q === null) return drawRest(p, b, chapter, exercise);
		drawTraining(p, b, chapter, exercise, q);
	}
};

// ---------------------------------------------------------------- gym island & equipment

function drawIsland(c: PixelCanvas): void {
	for (let y = GROUND + 3; y <= GROUND + ISLAND_DEPTH; y++) {
		const d = y - GROUND;
		const ink = d <= 12 ? 'e' : 'E';
		for (let x = 0; x < W; x++) {
			if (!island.inside(x, y)) continue;
			const edge = !island.inside(x - 1, y) || !island.inside(x + 1, y) || !island.inside(x, y + 1);
			c.put(x, y, edge ? 'k' : ink);
		}
	}
	const hw = island.halfWidth(1);
	const left = Math.round(HX - hw);
	const right = Math.round(HX + hw);
	for (let y = GROUND; y <= GROUND + 2; y++) c.hline(left, right, y, y === GROUND ? 'f' : 'F');
	for (let x = left; x <= right; x += 12) c.vline(x, GROUND, GROUND + 2, 'D');
	for (let x = left + 4; x <= right - 4; x += 6) c.put(x, GROUND + 2, 'L');

	for (const [x, y] of [
		[28, 208],
		[80, 204],
		[48, 218],
		[66, 226],
		[18, 202],
		[96, 200]
	]) {
		if (island.inside(x, y) && island.inside(x + 3, y + 1)) {
			c.hline(x, x + 3, y, 'D');
			c.hline(x, x + 2, y + 1, 'D');
		}
	}

	for (const [x, len] of [
		[40, 8],
		[62, 12],
		[80, 6]
	]) {
		const bottom = island.bottom(x);
		if (bottom < 0) continue;
		c.vline(x, bottom + 1, bottom + len, 'b');
		c.hline(x - 1, x + 1, bottom + len + 1, 'Y');
		c.hline(x - 1, x + 1, bottom + len + 2, 'Y');
	}
	for (const [x, y] of [
		[32, GROUND + ISLAND_DEPTH - 6],
		[90, GROUND + ISLAND_DEPTH - 14]
	]) {
		c.hline(x, x + 2, y, 'k');
		c.hline(x, x + 3, y + 1, 'D');
		c.hline(x + 1, x + 2, y + 2, 'k');
	}
}

function drawFanBlades(p: ScenePainter, angle: number): void {
	disc(p, FAN.x, FAN.y, FAN.r - 1, 'k');
	for (const offset of [0, Math.PI / 2]) {
		const a = angle + offset;
		for (let r = -FAN.r + 2; r <= FAN.r - 2; r++) {
			p.put(FAN.x + Math.cos(a) * r, FAN.y + Math.sin(a) * r, 'b');
		}
	}
	disc(p, FAN.x, FAN.y, 1, 'y');
}

const SEGMENTS = [
	'1110111',
	'0010010',
	'1011101',
	'1011011',
	'0111010',
	'1101011',
	'1101111',
	'1010010',
	'1111111',
	'1111011'
];

function drawDigit(p: ScenePainter, x: number, y: number, digit: number, ink: string): void {
	const on = SEGMENTS[digit];
	if (on[0] === '1') rect(p, x, y, x + 2, y, ink);
	if (on[1] === '1') rect(p, x, y, x, y + 2, ink);
	if (on[2] === '1') rect(p, x + 2, y, x + 2, y + 2, ink);
	if (on[3] === '1') rect(p, x, y + 2, x + 2, y + 2, ink);
	if (on[4] === '1') rect(p, x, y + 2, x, y + 4, ink);
	if (on[5] === '1') rect(p, x + 2, y + 2, x + 2, y + 4, ink);
	if (on[6] === '1') rect(p, x, y + 4, x + 2, y + 4, ink);
}

function drawStopwatch(p: ScenePainter, seconds: number, colon: boolean): void {
	const { x, y } = STOPWATCH;
	rect(p, x, y, x + 17, y + 8, 'B');
	rect(p, x, y, x + 17, y, 'k');
	rect(p, x, y + 8, x + 17, y + 8, 'k');
	const mm = Math.floor(seconds / 60) % 100;
	const ss = seconds % 60;
	drawDigit(p, x + 2, y + 2, Math.floor(mm / 10), 'y');
	drawDigit(p, x + 5, y + 2, mm % 10, 'y');
	if (colon) {
		p.put(x + 9, y + 3, 'y');
		p.put(x + 9, y + 5, 'y');
	}
	drawDigit(p, x + 11, y + 2, Math.floor(ss / 10), 'y');
	drawDigit(p, x + 14, y + 2, ss % 10, 'y');
}

function drawTowel(p: ScenePainter, sway: number): void {
	for (let y = TOWEL.y0; y <= TOWEL.y1; y++) {
		const off = Math.round((sway * (y - TOWEL.y0)) / (TOWEL.y1 - TOWEL.y0));
		for (let x = TOWEL.x0; x <= TOWEL.x1; x++) p.put(x + off, y, y % 4 === 0 ? 'I' : 'i');
	}
}

function drawEquipment(c: PixelCanvas, frame: number): void {
	const b = buildOf(frame);
	c.hline(Math.round(HX - 20), Math.round(HX + 20), GROUND - 2, 'A');
	c.hline(Math.round(HX - 20), Math.round(HX + 20), GROUND - 1, 'k');

	// round 1 life is there from the first step: speaker and standing fan
	for (let y = SPEAKER.top; y <= GROUND - 1; y++) c.hline(SPEAKER.x0, SPEAKER.x1, y, 'B');
	c.vline(SPEAKER.x1, SPEAKER.top, GROUND - 1, 'k');
	c.hline(SPEAKER.x0, SPEAKER.x1, SPEAKER.top, 'k');
	const spx = (SPEAKER.x0 + SPEAKER.x1) / 2;
	disc(c, spx, GROUND - 9, 4, 'k');
	disc(c, spx, GROUND - 9, 2, 'b');
	disc(c, spx, SPEAKER.top + 5, 1.5, 'k');
	c.put(SPEAKER.x0 + 2, SPEAKER.top + 2, 'L');

	c.hline(FAN.x - 5, FAN.x + 5, GROUND - 1, 'B');
	c.hline(FAN.x - 3, FAN.x + 3, GROUND - 2, 'B');
	c.vline(FAN.x, GROUND - 3, FAN.y + FAN.r, 'b');
	disc(c, FAN.x, FAN.y, FAN.r, 'B');
	drawFanBlades(c, 0);

	if (frame >= 1) {
		for (let y = GROUND - 11; y <= GROUND - 3; y++) {
			c.hline(BOTTLE_X, BOTTLE_X + 1, y, 'l');
			c.put(BOTTLE_X + 2, y, 'k');
		}
		c.hline(BOTTLE_X, BOTTLE_X + 2, GROUND - 7, 'i');
		c.hline(BOTTLE_X, BOTTLE_X + 1, GROUND - 13, 'i');
		c.hline(BOTTLE_X, BOTTLE_X + 1, GROUND - 12, 'i');
	}

	if (frame >= 2) {
		c.vline(RACK.x0, GROUND - 1, RACK.top, 'b');
		c.vline(RACK.x0 + 1, GROUND - 1, RACK.top, 'B');
		c.vline(RACK.x1 - 1, GROUND - 1, RACK.top, 'b');
		c.vline(RACK.x1, GROUND - 1, RACK.top, 'B');
		for (const y of [GROUND - 12, GROUND - 26, RACK.top + 1]) {
			c.hline(RACK.x0, RACK.x1, y, 'B');
			c.hline(RACK.x0, RACK.x1, y + 1, 'k');
			if (y === RACK.top + 1) continue;
			for (const x0 of [RACK.x0 + 2, RACK.x0 + 7]) {
				c.hline(x0 + 1, x0 + 2, y - 2, 'b');
				c.vline(x0, y - 3, y - 1, 'r');
				c.vline(x0 + 3, y - 3, y - 1, 'r');
				c.put(x0, y - 3, 'o');
				c.put(x0 + 3, y - 3, 'o');
			}
		}
	}

	if (frame >= 3) {
		for (let y = GROUND - 5; y <= GROUND - 1; y++) c.hline(115, 118, y, 'o');
		c.vline(118, GROUND - 5, GROUND - 1, 'r');
		for (const [x, y, ink] of [
			[116, GROUND - 7, 'g'],
			[115, GROUND - 9, 'g'],
			[117, GROUND - 10, 'g'],
			[116, GROUND - 12, 'l'],
			[118, GROUND - 8, 'g'],
			[114, GROUND - 11, 'l']
		] as const) {
			c.put(x, y, ink);
		}
	}

	if (frame >= 5) {
		c.vline(TOWER_X, GROUND - 1, BEAM_Y, 'b');
		c.vline(TOWER_X + 1, GROUND - 1, BEAM_Y, 'B');
		c.hline(TOWER_X - 3, TOWER_X + 4, GROUND - 1, 'B');
		for (let y = STACK.top; y <= GROUND - 1; y++) c.hline(STACK.x0, STACK.x1, y, y % 2 ? 'B' : 'k');
		c.vline(STACK.x0 + 2, STACK.top - 12, STACK.top - 1, 'b');
		c.hline(STACK.x0 + 2, STACK.x0 + 3, STACK.top + 16, 'y');
		disc(c, TOWER_X + 0.5, BEAM_Y, 2, 'k');
		// the pulley arm stays once installed; it runs above the lifter's head
		c.hline(Math.round(HX), TOWER_X, BEAM_Y, 'b');
		c.hline(Math.round(HX), TOWER_X, BEAM_Y + 1, 'B');
		disc(c, HX, BEAM_Y + 2, 1.5, 'k');
		if (frame >= 9) drawParkedHandle(c);
		drawTowel(c, 0);
		if (frame <= 8) {
			const seatY = pulldownGeometry(b).hipY + Math.ceil(b.thigh) + 2;
			c.hline(Math.round(HX - b.waist - 5), Math.round(HX + b.waist + 5), seatY, 'b');
			c.hline(Math.round(HX - b.waist - 5), Math.round(HX + b.waist + 5), seatY + 1, 'B');
			c.hline(Math.round(HX - b.waist - 5), Math.round(HX + b.waist + 5), seatY + 2, 'k');
			c.vline(Math.round(HX), seatY + 3, GROUND - 3, 'b');
			c.vline(Math.round(HX) + 1, seatY + 3, GROUND - 3, 'B');
		}
	}

	if (frame >= 9) {
		c.hline(TOWER_X + 2, STOPWATCH.x, STOPWATCH.y + 4, 'B');
		drawStopwatch(c, 0, true);
	}

	if (frame >= 9 && frame <= 12) {
		const g = benchGeometry(b);
		c.hline(g.headX - 2, g.hipX + 4, g.top, 'b');
		c.hline(g.headX - 2, g.hipX + 4, g.top + 1, 'B');
		c.hline(g.headX - 2, g.hipX + 4, g.top + 2, 'k');
		for (const x of [g.headX + 2, g.hipX]) {
			c.vline(x, g.top + 3, GROUND - 3, 'b');
			c.vline(x + 1, g.top + 3, GROUND - 3, 'B');
			c.hline(x - 2, x + 3, GROUND - 3, 'B');
		}
	}

	if (frame >= 10) {
		for (let k = 0; k < 3; k++) {
			const y = GROUND - 3 - k * 3;
			c.hline(PLATES_X, PLATES_X + 6, y, 'r');
			c.hline(PLATES_X, PLATES_X + 6, y - 1, 'r');
			c.put(PLATES_X + ((k * 2) % 6), y - 1, 'X');
		}
	}

	if (frame >= 13) {
		const shoulderY = standingHip(b) - b.torso;
		const reach = b.shoulder + 18;
		for (const x of [Math.round(HX - reach), Math.round(HX + reach)]) {
			c.vline(x, GROUND - 3, shoulderY - 12, 'b');
			c.vline(x + 1, GROUND - 3, shoulderY - 12, 'B');
			c.hline(x - 2, x + 3, GROUND - 3, 'B');
			c.hline(x + (x < HX ? 2 : -2), x + (x < HX ? 3 : -1), shoulderY - 4, 'k');
			c.hline(x - 2, x + 3, shoulderY - 14, 'B');
			c.hline(x - 1, x + 2, shoulderY - 13, 'y');
		}
	}

	if (frame >= 15) {
		const x = SPEAKER.x0 + 3;
		const y = SPEAKER.top - 1;
		c.hline(x, x + 4, y, 'y');
		c.hline(x + 1, x + 3, y - 1, 's');
		c.hline(x + 2, x + 2, y - 2, 'y');
		c.hline(x, x + 4, y - 3, 'y');
		c.hline(x - 1, x + 5, y - 4, 'y');
		c.put(x, y - 4, 'n');
	}
}

function buildFrame(frame: number): string[] {
	const c = new PixelCanvas(W, H);
	drawIsland(c);
	drawEquipment(c, frame);
	return c.toRows();
}

// ---------------------------------------------------------------- life, three per round

/**
 * How lively a round's own elements are right now:
 * 0 not there yet, 1 background (a later round), 2 its round, 3 its round during a break.
 */
function level(s: SceneState, from: number, to: number): 0 | 1 | 2 | 3 {
	if (s.frameIndex < from) return 0;
	if (s.frameIndex > to) return 1;
	return s.activity === 'break' ? 3 : 2;
}

/** Round 1: music notes rising from the speaker. */
const musicNotes: SceneActor = {
	draw(p, s) {
		const lv = level(s, 0, 4);
		if (!lv) return;
		const every = [0, 40, 12, 6][lv];
		for (let k = 0; k < 3; k++) {
			const age = (s.tick + k * every) % (every * 3);
			if (age > 22) continue;
			const x = SPEAKER.x0 + 5 - Math.floor(age / 3) + Math.round(Math.sin(age / 2 + k) * 2);
			const y = SPEAKER.top - 8 - age * 2;
			rect(p, x, y + 3, x + 1, y + 4, 'n');
			rect(p, x + 2, y, x + 2, y + 4, 'n');
			p.put(x + 3, y, 'n');
		}
	}
};

/** Round 1: the standing fan spins (behind the lifter). */
const fanSpin: SceneActor = {
	layer: 'back',
	draw(p, s) {
		const lv = level(s, 0, 4);
		drawFanBlades(p, (s.tick * [0, 0.25, 0.5, 1][lv] * Math.PI) / 4);
	}
};

/** Round 1: drops of sweat roll down the lifter's face. */
const sweat: SceneActor = {
	draw(p, s) {
		const lv = level(s, 0, 4);
		if (!lv) return;
		const every = [0, 40, 8, 4][lv];
		const b = buildOf(s.frameIndex);
		for (let k = 0; k < 3; k++) {
			const age = (s.tick + k * Math.floor(every / 2)) % every;
			if (age > 5) continue;
			const side = k % 2 === 0 ? -1 : 1;
			const x = Math.round(HX + side * (b.headW / 2));
			const y = HEAD_TOP + 3 + age * 2;
			p.put(x, y, 'l');
			p.put(x, y + 1, 'l');
		}
	}
};

/** Round 2: a cat naps by the mat, waking up during breaks. */
const cat: SceneActor = {
	draw(p, s) {
		const lv = level(s, 5, 8);
		if (!lv) return;
		const x = CAT_X;
		const y = GROUND - 3;
		const awake = lv === 3 || (lv === 2 && s.tick % 60 < 12);
		if (awake) {
			ellipse(p, x + 4, y - 5, 4, 5, FUR);
			ellipse(p, x + 5, y - 12, 3, 3, FUR);
			p.put(x + 3, y - 15, 'B');
			p.put(x + 7, y - 15, 'B');
			p.put(x + 4, y - 12, 'y');
			p.put(x + 6, y - 12, 'y');
			const tail = s.tick % 4 < 2 ? -1 : 1;
			rect(p, x + 9, y - 2, x + 11, y - 2, 'B');
			rect(p, x + 11, y - 5 + tail, x + 11, y - 2, 'B');
		} else {
			ellipse(p, x + 5, y - 3, 6, 3, FUR);
			ellipse(p, x + 1, y - 4, 2.5, 2.5, FUR);
			p.put(x, y - 7, 'B');
			p.put(x + 2, y - 7, 'B');
			rect(p, x, y - 4, x + 1, y - 4, 'k');
			const breath = s.tick % 8 < 4 ? 0 : 1;
			rect(p, x + 3, y - 6 - breath, x + 8, y - 6 - breath, 'b');
		}
	}
};

/** Round 2: the towel hanging from the pulley arm sways (behind the lifter). */
const towel: SceneActor = {
	layer: 'back',
	draw(p, s) {
		const lv = level(s, 5, 8);
		if (lv < 2) return;
		const sway = Math.round(Math.sin(s.tick / (lv === 3 ? 1.5 : 3)) * 1.5);
		for (let y = TOWEL.y0; y <= TOWEL.y1; y++) {
			for (let x = TOWEL.x0 - 2; x <= TOWEL.x1 + 2; x++) p.put(x, y, '.');
		}
		drawTowel(p, sway);
	}
};

/** Round 2: bubbles rise inside the water bottle (behind the lifter). */
const bubbles: SceneActor = {
	layer: 'back',
	draw(p, s) {
		const lv = level(s, 5, 8);
		if (!lv) return;
		const every = [0, 12, 4, 2][lv];
		for (let k = 0; k < 3; k++) {
			const age = (s.tick + k * every) % (every * 3);
			if (age > 7) continue;
			p.put(BOTTLE_X + (k % 2), GROUND - 4 - age, 'W');
		}
	}
};

/** Round 3: a bird perches on the pulley arm. */
const towerBird: SceneActor = {
	draw(p, s) {
		const lv = level(s, 9, 12);
		if (!lv) return;
		const hop = lv === 3 && s.tick % 10 < 2 ? 2 : 0;
		const x = TOWER_X - 6;
		const y = BEAM_Y - 3 - hop;
		const tones = { light: 'l', mid: 'B', dark: 'k', line: 'k' };
		ellipse(p, x, y, 4, 2.5, tones);
		ellipse(p, x + 4, y - 3, 2, 2, tones);
		p.put(x + 5, y - 3, 'k');
		p.put(x + 6, y - 3, 'y');
		p.put(x + 7, y - 3, 'y');
		const tail = lv >= 2 && s.tick % 12 < 2 ? -2 : 0;
		rect(p, x - 6, y - 1 + tail, x - 4, y - 1 + tail, 'B');
		const flap = lv === 3 && s.tick % 2 === 0;
		rect(p, x - 2, y - (flap ? 4 : 1), x + 1, y - (flap ? 4 : 1), 'b');
		rect(p, x - 1, y + 3, x - 1, y + 3, 'y');
		rect(p, x + 1, y + 3, x + 1, y + 3, 'y');
	}
};

/** Round 3: the stopwatch on the tower counts the set (behind the lifter). */
const stopwatch: SceneActor = {
	layer: 'back',
	draw(p, s) {
		const lv = level(s, 9, 12);
		if (!lv) return;
		drawStopwatch(p, Math.floor(s.tick / 4), lv === 1 || s.tick % (lv === 3 ? 2 : 4) < 2);
	}
};

/** Round 3: glints run across the plates on the floor (behind the lifter). */
const plateShine: SceneActor = {
	layer: 'back',
	draw(p, s) {
		const lv = level(s, 10, 12);
		if (lv < 2) return;
		const period = lv === 3 ? 6 : 10;
		const k = Math.floor(s.tick / 2) % period;
		if (k > 6) return;
		for (let row = 0; row < 3; row++) {
			for (const dy of [3, 4]) {
				p.put(PLATES_X + k, GROUND - dy - row * 3, 'y');
				p.put(PLATES_X + Math.max(0, k - 1), GROUND - dy - row * 3, 'o');
			}
		}
	}
};

/** Round 4: a dog wags its tail next to the lifter. */
const dog: SceneActor = {
	draw(p, s) {
		const lv = level(s, 13, 16);
		if (!lv) return;
		const hop = lv === 3 && s.tick % 6 < 2 ? 2 : 0;
		const x = DOG_X;
		const y = GROUND - 3 - hop;
		const tones = { light: 'n', mid: 's', dark: 'k', line: 'k' };
		ellipse(p, x + 5, y - 5, 5, 3, tones);
		rect(p, x + 1, y - 3, x + 2, y, 's');
		rect(p, x + 7, y - 3, x + 8, y, 's');
		ellipse(p, x + 10, y - 9, 3, 3, tones);
		p.put(x + 9, y - 12, 'k');
		p.put(x + 11, y - 12, 'k');
		p.put(x + 11, y - 9, 'k');
		p.put(x + 13, y - 8, 'k');
		if (lv === 3) rect(p, x + 12, y - 7, x + 12, y - 5, 'r');
		const wag = s.tick % 2 === 0 ? -2 : 0;
		rect(p, x - 2, y - 6 + wag, x - 1, y - 6 + wag, 's');
		p.put(x, y - 6, 's');
	}
};

/** Round 4: stage lights on the rack sweep across the scene (behind the lifter). */
const stageLights: SceneActor = {
	layer: 'back',
	draw(p, s) {
		const lv = level(s, 13, 16);
		if (!lv) return;
		const b = buildOf(s.frameIndex);
		const shoulderY = standingHip(b) - b.torso;
		const reach = b.shoulder + 18;
		const speed = lv === 3 ? 4 : 9;
		for (const side of [-1, 1] as const) {
			const x0 = HX + side * reach;
			const y0 = shoulderY - 13;
			const spread = 0.35 + 0.25 * Math.sin(s.tick / speed + (side > 0 ? 1.5 : 0));
			for (let r = 4; r < 60; r += 3) {
				p.put(x0 - side * r * spread, y0 + r, 'p');
			}
		}
	}
};

/** Round 4: golden sparks of effort around the lifter. */
const sparks: SceneActor = {
	draw(p, s) {
		const lv = level(s, 13, 16);
		if (!lv) return;
		const b = buildOf(s.frameIndex);
		const count = lv === 3 ? 7 : 4;
		for (let k = 0; k < count; k++) {
			const phase = (s.tick + k * 5) % 10;
			if (phase > 3) continue;
			const angle = k * 1.7 + Math.floor((s.tick + k * 5) / 10) * 0.9;
			const x = Math.round(HX + Math.cos(angle) * (b.shoulder + 9));
			const y = Math.round(HEAD_TOP + 8 + Math.sin(angle) * 10);
			p.put(x, y, 'y');
			if (phase === 1 || phase === 2) {
				p.put(x - 1, y, 'n');
				p.put(x + 1, y, 'n');
				p.put(x, y - 1, 'n');
				p.put(x, y + 1, 'n');
			}
		}
	}
};

/** The cycle's reward: a gold medal drops onto the mat when a new cycle starts. */
const medal: SceneActor = {
	draw(p, s) {
		if (s.harvestAge === null || s.harvestAge > 10) return;
		const k = Math.min(1, (s.harvestAge / 8) ** 2);
		const y = Math.round(BEAM_Y + (GROUND - 10 - BEAM_Y) * k);
		const x = Math.round(HX - 16);
		rect(p, x - 1, y - 5, x - 1, y - 2, 'i');
		rect(p, x + 1, y - 5, x + 1, y - 2, 'o');
		disc(p, x, y + 1, 2.5, 'y');
		p.put(x - 1, y, 'n');
	}
};

const chalk: SceneActor = {
	layer: 'back',
	draw: pollen({ originX: 44, originY: GROUND - 6, ink: 'p' }).draw
};

const mix = (token: string, pct: number, base = 'var(--background)') =>
	`color-mix(in oklab, var(${token}) ${pct}%, ${base})`;

export const gymGains: PlantModel = Object.freeze({
	id: 'gym-gains',
	label: 'Skinny to giant',
	width: W,
	height: H,
	groundY: GROUND,
	palette: Object.freeze({
		W: mix('--accent-rose', 70, 'white'),
		S: 'var(--accent-rose)',
		Z: mix('--accent-rose', 75, 'black'),
		O: mix('--accent-rose', 45, 'black'),
		H: 'var(--text-muted)',
		h: 'var(--text-subtle)',
		I: mix('--accent-iris', 70, 'white'),
		T: 'var(--accent-iris)',
		U: mix('--accent-iris', 60, 'black'),
		J: mix('--accent-pine', 70, 'white'),
		P: 'var(--accent-pine)',
		Q: mix('--accent-pine', 60, 'black'),
		K: 'var(--text-subtle)',
		A: mix('--accent-iris', 40),
		f: mix('--text-muted', 75),
		F: mix('--text-muted', 60),
		g: 'var(--accent-pine)',
		l: 'var(--accent-foam)',
		i: 'var(--accent-iris)',
		o: 'var(--accent-rose)',
		y: 'var(--accent-gold)',
		n: 'var(--accent-gold)',
		s: mix('--accent-gold', 70),
		p: mix('--accent-gold', 45),
		r: 'var(--accent-love)',
		b: 'var(--text-subtle)',
		B: 'var(--text-muted)',
		k: mix('--text-muted', 60),
		e: mix('--text-muted', 42),
		E: mix('--text-muted', 54),
		D: mix('--text-muted', 78)
	}),
	idle: Object.freeze<Record<string, IdleInk>>({
		L: { role: 'glint', ink: 'l', alt: 'k' },
		Y: { role: 'glint', ink: 'y', alt: 's' },
		X: { role: 'glint', ink: 'o', alt: 'y' }
	}),
	frames: Object.freeze(Array.from({ length: FRAMES }, (_, frame) => buildFrame(frame))),
	hero: athlete,
	actors: Object.freeze([
		chalk,
		fanSpin,
		musicNotes,
		sweat,
		cat,
		towel,
		bubbles,
		towerBird,
		stopwatch,
		plateShine,
		dog,
		stageLights,
		sparks,
		medal
	])
});
