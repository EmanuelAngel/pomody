import { PixelCanvas, pixelHash } from './pixel-canvas';
import type { PixelInk, PlantModel } from './types';

const W = 32;
const H = 32;
const CX = 15;
const GROUND = 24;

type Tip = 'shoot' | 'bud' | 'flower' | 'bloom';
type Leaf = readonly [y: number, dir: -1 | 1, size: 1 | 2 | 3 | 4];

interface Canopy {
	readonly rx: number;
	readonly ry: number;
	readonly sides?: number;
}

interface FrameSpec {
	readonly seed?: boolean;
	readonly roots: number;
	readonly stemTop?: number;
	readonly tip?: Tip;
	readonly leaves?: readonly Leaf[];
	readonly trunkTop?: number;
	readonly branches?: 0 | 1 | 2;
	readonly crown?: number;
	readonly canopy?: Canopy;
	readonly blossoms?: number;
	readonly unripe?: number;
	readonly fruits?: number;
}

const ROOTS: readonly (readonly [number, number])[] = [
	[15, 27],
	[15, 28],
	[14, 29],
	[16, 29],
	[15, 30],
	[13, 30],
	[17, 30],
	[12, 31],
	[18, 31],
	[13, 28],
	[17, 28],
	[12, 29],
	[18, 29],
	[11, 30],
	[19, 30],
	[10, 31],
	[20, 31]
];

const TUFTS = [4, 9, 22, 27];

const LEAF_SHAPES: Record<Leaf[2], readonly (readonly [number, number, string])[]> = {
	1: [[1, 0, 'g']],
	2: [
		[1, 0, 'g'],
		[2, -1, 'f']
	],
	3: [
		[1, 0, 'g'],
		[2, 0, 'g'],
		[2, -1, 'g'],
		[3, -1, 'f']
	],
	4: [
		[1, 0, 'g'],
		[2, 0, 'g'],
		[3, 0, 'G'],
		[2, -1, 'g'],
		[3, -1, 'g'],
		[4, -1, 'f'],
		[4, -2, 'f']
	]
};

const LEFT_BRANCH = [
	[14, 16],
	[13, 15],
	[12, 14],
	[11, 13]
] as const;
const RIGHT_BRANCH = [
	[17, 14],
	[18, 13],
	[19, 12],
	[20, 11]
] as const;

const CANOPY_CENTER = { x: 15.5, y: 8 };
const FRUIT_SPOTS: readonly (readonly [number, number])[] = [
	[10, 7],
	[19, 5],
	[14, 10],
	[21, 10],
	[16, 3],
	[7, 11],
	[24, 12],
	[12, 4]
];

function drawGround(c: PixelCanvas): void {
	c.hline(2, 29, GROUND, 'g');
	for (let y = GROUND + 1; y <= GROUND + 3; y++) c.hline(1, 30, y, 'd');
	c.hline(1, 30, GROUND + 4, 'e');
	c.hline(1, 30, GROUND + 5, 'e');
	c.hline(2, 29, GROUND + 6, 'e');
	c.hline(4, 27, GROUND + 7, 'e');
	for (const [x, y] of [
		[5, 27],
		[24, 26],
		[9, 30],
		[27, 29],
		[21, 30],
		[3, 29]
	]) {
		c.put(x, y, 'D');
	}
	for (const x of TUFTS) {
		c.put(x, GROUND - 1, 'g');
		c.put(x - 1, GROUND - 2, 'w');
		c.put(x + 1, GROUND - 2, 'v');
	}
}

function drawLeaf(c: PixelCanvas, [y, dir, size]: Leaf): void {
	for (const [dx, dy, ink] of LEAF_SHAPES[size]) c.put(CX + dx * dir, y + dy, ink);
}

function drawTip(c: PixelCanvas, tip: Tip, top: number): void {
	switch (tip) {
		case 'shoot':
			c.put(CX, top, 'f');
			return;
		case 'bud':
			c.put(CX, top - 1, 'i');
			return;
		case 'flower':
			c.put(CX, top - 1, 'y');
			c.put(CX - 1, top - 1, 'i');
			c.put(CX + 1, top - 1, 'i');
			c.put(CX, top - 2, 'i');
			return;
		case 'bloom':
			c.put(CX, top - 2, 'y');
			for (const [dx, dy] of [
				[-1, -1],
				[1, -1],
				[-2, -2],
				[2, -2],
				[-1, -3],
				[1, -3],
				[0, -4]
			]) {
				c.put(CX + dx, top + dy, 'i');
			}
			c.put(CX - 1, top - 2, 'o');
			c.put(CX + 1, top - 2, 'o');
			c.put(CX, top - 3, 'o');
			c.put(CX, top - 1, 'g');
	}
}

function drawBlob(c: PixelCanvas, cx: number, cy: number, rx: number, ry: number): void {
	for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
		for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
			const nx = (x - cx) / rx;
			const ny = (y - cy) / ry;
			const d = nx * nx + ny * ny;
			if (d > 1) continue;
			const hash = pixelHash(x, y);
			if (d > 0.72 && hash < 30) continue;
			let ink = 'g';
			if (ny > 0.4) ink = 'G';
			else if (nx + ny < -0.55 && hash % 3 === 0) ink = 'f';
			c.put(x, y, ink);
		}
	}
}

function drawFruit(c: PixelCanvas, x: number, y: number, ink: 'r' | 'y' | 'o'): void {
	if (ink === 'o') {
		c.put(x, y, 'o');
		return;
	}
	c.put(x, y, ink === 'r' ? 'o' : 'y');
	c.put(x + 1, y, ink);
	c.put(x, y + 1, ink);
	c.put(x + 1, y + 1, ink);
}

function buildFrame(spec: FrameSpec): string[] {
	const c = new PixelCanvas(W, H);
	drawGround(c);

	for (const [x, y] of ROOTS.slice(0, spec.roots)) c.put(x, y, 'b');

	if (spec.seed) {
		c.put(CX, GROUND + 1, 's');
		c.put(CX + 1, GROUND + 1, 's');
		c.put(CX, GROUND + 2, 's');
		c.put(CX + 1, GROUND + 2, 'y');
	}

	if (spec.stemTop !== undefined) c.vline(CX, GROUND, spec.stemTop, 'g');

	const trunkTop = spec.trunkTop ?? GROUND + 1;
	if (spec.trunkTop !== undefined) {
		c.vline(CX, GROUND, spec.trunkTop, 'b');
		c.vline(CX + 1, GROUND, spec.trunkTop, 'B');
		c.put(CX - 1, GROUND, 'b');
		c.put(CX + 2, GROUND, 'B');
	}

	if (spec.branches) {
		for (const [x, y] of LEFT_BRANCH) c.put(x, y, 'b');
		if (spec.branches > 1) for (const [x, y] of RIGHT_BRANCH) c.put(x, y, 'B');
	}

	for (const leaf of spec.leaves ?? []) {
		if (leaf[0] < trunkTop - 1) drawLeaf(c, leaf);
	}

	if (spec.crown) {
		const ry = spec.crown * 0.8;
		const crownY = spec.stemTop ?? trunkTop - ry + 1;
		drawBlob(c, CANOPY_CENTER.x, crownY, spec.crown, ry);
		if (spec.branches) drawBlob(c, 10.5, 12, spec.crown * 0.6, spec.crown * 0.5);
		if (spec.branches && spec.branches > 1)
			drawBlob(c, 20.5, 10, spec.crown * 0.6, spec.crown * 0.5);
	}

	if (spec.canopy) {
		const { rx, ry, sides = 0 } = spec.canopy;
		if (sides) {
			drawBlob(c, 9.5, 11, sides, sides * 0.7);
			drawBlob(c, 21.5, 10, sides, sides * 0.7);
		}
		drawBlob(c, CANOPY_CENTER.x, CANOPY_CENTER.y, rx, ry);
	}

	if (spec.tip && spec.stemTop !== undefined) drawTip(c, spec.tip, spec.stemTop);

	FRUIT_SPOTS.slice(0, spec.blossoms ?? 0).forEach(([x, y]) => drawFruit(c, x, y, 'o'));
	FRUIT_SPOTS.slice(0, spec.unripe ?? 0).forEach(([x, y]) => drawFruit(c, x, y, 'y'));
	FRUIT_SPOTS.slice(0, spec.fruits ?? 0).forEach(([x, y]) => drawFruit(c, x, y, 'r'));

	return c.toRows();
}

const FRAME_SPECS: readonly FrameSpec[] = [
	// Round 1 — a seed putting down roots, ending as a small flower
	{ seed: true, roots: 1 },
	{ seed: true, roots: 3, stemTop: 23, tip: 'shoot' },
	{
		seed: true,
		roots: 5,
		stemTop: 21,
		tip: 'shoot',
		leaves: [
			[22, -1, 1],
			[22, 1, 1]
		]
	},
	{
		roots: 7,
		stemTop: 19,
		tip: 'bud',
		leaves: [
			[21, -1, 2],
			[21, 1, 2]
		]
	},
	{
		roots: 9,
		stemTop: 18,
		tip: 'flower',
		leaves: [
			[21, -1, 2],
			[20, 1, 2]
		]
	},
	// Round 2 — the seedling rises into a plant with a green stem
	{
		roots: 9,
		stemTop: 16,
		tip: 'flower',
		leaves: [
			[21, -1, 3],
			[19, 1, 2]
		]
	},
	{
		roots: 9,
		stemTop: 14,
		tip: 'flower',
		leaves: [
			[21, -1, 3],
			[19, 1, 3],
			[16, -1, 2]
		]
	},
	{
		roots: 9,
		stemTop: 12,
		tip: 'flower',
		leaves: [
			[21, -1, 3],
			[19, 1, 3],
			[16, -1, 3],
			[14, 1, 2]
		]
	},
	{
		roots: 9,
		stemTop: 10,
		tip: 'bloom',
		leaves: [
			[21, -1, 4],
			[19, 1, 3],
			[16, -1, 3],
			[14, 1, 3],
			[12, -1, 2]
		]
	},
	// Round 3 — the stem hardens into a trunk carrying leaves
	{
		roots: 11,
		stemTop: 10,
		trunkTop: 21,
		tip: 'bloom',
		leaves: [
			[19, 1, 3],
			[16, -1, 3],
			[14, 1, 3],
			[12, -1, 2]
		]
	},
	{
		roots: 13,
		stemTop: 9,
		trunkTop: 18,
		crown: 2,
		leaves: [
			[16, -1, 3],
			[14, 1, 3],
			[12, -1, 3]
		]
	},
	{
		roots: 15,
		trunkTop: 15,
		branches: 1,
		crown: 3,
		leaves: [
			[14, 1, 3],
			[12, -1, 3]
		]
	},
	{ roots: 17, trunkTop: 12, branches: 2, crown: 4 },
	// Round 4 — the trunk grows into a full tree bearing fruit
	{ roots: 17, trunkTop: 10, branches: 2, canopy: { rx: 6, ry: 5, sides: 3 } },
	{ roots: 17, trunkTop: 10, branches: 2, canopy: { rx: 7, ry: 5.5, sides: 4 }, blossoms: 6 },
	{ roots: 17, trunkTop: 10, branches: 2, canopy: { rx: 8, ry: 6, sides: 4.5 }, unripe: 5 },
	{ roots: 17, trunkTop: 10, branches: 2, canopy: { rx: 8.5, ry: 6.5, sides: 5 }, fruits: 8 }
];

const mix = (token: string, pct: number) =>
	`color-mix(in oklab, var(${token}) ${pct}%, var(--background))`;

export const seedToTree: PlantModel = Object.freeze({
	id: 'seed-to-tree',
	label: 'Seed to fruit tree',
	width: W,
	height: H,
	palette: Object.freeze<Record<string, PixelInk>>({
		g: { fill: 'var(--accent-pine)' },
		G: { fill: mix('--accent-pine', 70) },
		f: { fill: 'var(--accent-foam)', idle: 'glint' },
		w: { fill: 'var(--accent-pine)', idle: 'sway-a' },
		v: { fill: 'var(--accent-pine)', idle: 'sway-b' },
		i: { fill: 'var(--accent-iris)' },
		o: { fill: 'var(--accent-rose)' },
		y: { fill: 'var(--accent-gold)' },
		s: { fill: mix('--accent-gold', 75) },
		r: { fill: 'var(--accent-love)' },
		b: { fill: 'var(--text-subtle)' },
		B: { fill: 'var(--text-muted)' },
		d: { fill: mix('--text-muted', 35) },
		e: { fill: mix('--text-muted', 50) },
		D: { fill: mix('--text-muted', 75) }
	}),
	frames: Object.freeze(FRAME_SPECS.map(buildFrame)),
	harvest: { from: { x: 19, y: 5 }, to: { x: CX, y: GROUND + 1 }, fill: 'var(--accent-love)' },
	particle: { origin: { x: 12, y: GROUND - 2 }, fill: 'var(--accent-gold)' }
});
