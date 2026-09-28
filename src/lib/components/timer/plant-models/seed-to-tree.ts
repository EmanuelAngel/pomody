import { PixelCanvas, pixelHash } from './pixel-canvas';
import {
	bee,
	bird,
	butterfly,
	climber,
	harvestDrop,
	ladybug,
	perchedButterfly,
	pollen
} from './fauna';
import type { IdleInk, PlantModel } from './types';

const W = 48;
const H = 136;
const CX = 23;
const GROUND = 96;
const TREE_HEIGHT = 44;

type Tip = 'sprout' | 'shoot' | 'bud' | 'flower' | 'bloom';
/** A leaf pair member: height above the grass, side, and length in pixels. */
type Leaf = readonly [height: number, dir: -1 | 1, size: number];
type Blossom = 'bud' | 'rose' | 'gold' | 'iris';

/** A side branch of the herb: grows diagonally from the stem and ends in a bud or flower. */
interface Shoot {
	readonly at: number;
	readonly dir: -1 | 1;
	readonly len: number;
	readonly head: Blossom;
}

interface Herb {
	readonly height: number;
	readonly thick?: boolean;
	readonly tip: Tip;
	readonly leaves: readonly Leaf[];
	readonly shoots?: readonly Shoot[];
	/** 0..3: leafy clumps around the base that make the plant feel full. */
	readonly basal?: number;
	/** Leaf clumps at each node along the stem. */
	readonly nodes?: boolean;
	/** Height of the woody base while the stem turns into a trunk. */
	readonly woody?: number;
}

interface FrameSpec {
	readonly seed?: boolean;
	readonly herb?: Herb;
	/** Tree scale 0..1 of the mature canopy. */
	readonly tree?: number;
	/** Small flowers still hanging on in a young tree. */
	readonly flowersLeft?: number;
	readonly nest?: boolean;
	readonly blossoms?: number;
	readonly unripe?: number;
	readonly fruits?: number;
}

// ---------------------------------------------------------------- environment

const TUFTS: readonly (readonly [x: number, fromFrame: number])[] = [
	[4, 0],
	[10, 0],
	[38, 0],
	[44, 0],
	[15, 3],
	[32, 3],
	[7, 6],
	[41, 6],
	[29, 9],
	[17, 10],
	[1, 12],
	[46, 12]
];

const WILDFLOWERS: readonly (readonly [
	x: number,
	fromFrame: number,
	petal: string,
	height: number
])[] = [
	[6, 3, 'y', 3],
	[40, 3, 'o', 4],
	[13, 6, 'i', 5],
	[35, 9, 'y', 3],
	[45, 12, 'i', 4],
	[2, 14, 'o', 5],
	[19, 15, 'y', 3]
];

const MUSHROOMS: readonly (readonly [x: number, fromFrame: number])[] = [
	[36, 5],
	[33, 8]
];

const PEBBLES: readonly (readonly [number, number])[] = [
	[5, 99],
	[17, 103],
	[33, 98],
	[41, 106],
	[9, 112],
	[29, 115],
	[44, 101],
	[2, 108],
	[38, 117],
	[21, 110],
	[12, 122],
	[35, 126],
	[6, 131],
	[27, 129]
];

function drawGround(c: PixelCanvas, frame: number): void {
	c.hline(0, W - 1, GROUND, 'g');
	for (let x = 0; x < W; x++) if (pixelHash(x, GROUND) < 20) c.put(x, GROUND, 'l');
	for (let y = GROUND + 1; y <= GROUND + 4; y++) c.hline(0, W - 1, y, 'd');
	for (let y = GROUND + 5; y <= GROUND + 12; y++) c.hline(0, W - 1, y, 'e');
	for (let y = GROUND + 13; y < H; y++) c.hline(0, W - 1, y, 'E');
	for (const [x, y] of PEBBLES) {
		c.put(x, y, 'D');
		c.put(x + 1, y, 'D');
	}

	for (const [x, from] of TUFTS) {
		if (frame < from) continue;
		const tall = frame >= from + 4;
		c.put(x, GROUND - 1, 'g');
		const top = tall ? GROUND - 3 : GROUND - 2;
		if (tall) c.put(x, GROUND - 2, 'g');
		c.put(x - 1, top, 'w');
		c.put(x + 1, top, 'v');
	}

	for (const [x, from, petal, h] of WILDFLOWERS) {
		if (frame < from) continue;
		const head = GROUND - h;
		c.vline(x, GROUND - 1, head + 1, 'g');
		c.put(x + 1, GROUND - 2, 'g');
		c.put(x - 1, head, petal);
		c.put(x + 1, head, petal);
		c.put(x, head - 1, petal);
		c.put(x, head, petal === 'y' ? 'o' : 'y');
	}

	for (const [x, from] of MUSHROOMS) {
		if (frame < from) continue;
		c.put(x, GROUND - 1, 'b');
		c.put(x, GROUND - 2, 'b');
		c.hline(x - 1, x + 1, GROUND - 3, 'r');
		c.put(x, GROUND - 4, 'r');
		c.put(x - 1, GROUND - 3, 'o');
	}

	if (frame >= 10) {
		drawCluster(c, 5, GROUND - 4, 5, 3.5);
		if (frame >= 15) {
			c.put(3, GROUND - 5, 'r');
			c.put(7, GROUND - 6, 'r');
			c.put(5, GROUND - 3, 'r');
		}
	}

	if (frame >= 12) {
		c.hline(40, 44, GROUND - 1, 'B');
		c.hline(41, 43, GROUND - 2, 'b');
		c.put(41, GROUND - 1, 'k');
	}
}

// ---------------------------------------------------------------- roots & seedling

interface RootStrand {
	/** Polyline control points relative to the stem base on the grass line. */
	readonly path: readonly (readonly [number, number])[];
	/** First frame the strand shows, and the frame where it reaches full length. */
	readonly from: number;
	readonly full: number;
	/** Thickens near the trunk once the plant becomes a tree. */
	readonly thick?: boolean;
}

const ROOT_STRANDS: readonly RootStrand[] = [
	// seedling: a deep taproot and long laterals
	{
		path: [
			[0, 3],
			[0, 12],
			[1, 20],
			[0, 28],
			[-1, 36]
		],
		from: 0,
		full: 8,
		thick: true
	},
	{
		path: [
			[0, 5],
			[-4, 8],
			[-8, 12],
			[-11, 17],
			[-13, 23]
		],
		from: 1,
		full: 6,
		thick: true
	},
	{
		path: [
			[0, 6],
			[4, 9],
			[8, 13],
			[10, 18],
			[12, 24]
		],
		from: 2,
		full: 7,
		thick: true
	},
	{
		path: [
			[0, 4],
			[-5, 5],
			[-10, 7],
			[-14, 10]
		],
		from: 3,
		full: 8
	},
	{
		path: [
			[1, 4],
			[6, 6],
			[11, 7],
			[15, 10]
		],
		from: 4,
		full: 9
	},
	{
		path: [
			[0, 14],
			[-4, 18],
			[-6, 24],
			[-9, 31]
		],
		from: 5,
		full: 10
	},
	{
		path: [
			[1, 16],
			[5, 21],
			[7, 27],
			[10, 33]
		],
		from: 6,
		full: 11
	},
	// tree: a wide, deep system reaching almost as far as the canopy
	{
		path: [
			[-1, 2],
			[-9, 4],
			[-16, 6],
			[-21, 10],
			[-24, 16]
		],
		from: 10,
		full: 15,
		thick: true
	},
	{
		path: [
			[2, 2],
			[9, 3],
			[16, 6],
			[20, 9],
			[24, 15]
		],
		from: 10,
		full: 15,
		thick: true
	},
	{
		path: [
			[-8, 12],
			[-14, 16],
			[-18, 23],
			[-20, 32]
		],
		from: 11,
		full: 16
	},
	{
		path: [
			[8, 13],
			[14, 18],
			[17, 25],
			[19, 34]
		],
		from: 11,
		full: 16
	},
	{
		path: [
			[-11, 17],
			[-16, 20],
			[-22, 22]
		],
		from: 12,
		full: 16
	},
	{
		path: [
			[10, 18],
			[15, 22],
			[21, 24]
		],
		from: 12,
		full: 16
	},
	{
		path: [
			[-1, 28],
			[-4, 33],
			[-3, 39]
		],
		from: 12,
		full: 16
	},
	{
		path: [
			[1, 24],
			[4, 30],
			[3, 39]
		],
		from: 13,
		full: 16
	},
	{
		path: [
			[-16, 6],
			[-19, 3],
			[-23, 4]
		],
		from: 14,
		full: 16
	},
	{
		path: [
			[16, 6],
			[19, 4],
			[23, 5]
		],
		from: 14,
		full: 16
	}
];

function rasterize(path: RootStrand['path']): [number, number][] {
	const pixels: [number, number][] = [];
	for (let i = 0; i < path.length - 1; i++) {
		const [x0, y0] = path[i];
		const [x1, y1] = path[i + 1];
		const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
		for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
			pixels.push([
				Math.round(x0 + ((x1 - x0) * k) / steps),
				Math.round(y0 + ((y1 - y0) * k) / steps)
			]);
		}
	}
	return pixels;
}

const ROOT_PIXELS = ROOT_STRANDS.map((strand) => rasterize(strand.path));

function drawRoots(c: PixelCanvas, frame: number, isTree: boolean): void {
	ROOT_STRANDS.forEach((strand, i) => {
		if (frame < strand.from) return;
		const pixels = ROOT_PIXELS[i];
		const reach = Math.min(1, (frame - strand.from + 1) / (strand.full - strand.from + 1));
		const count = Math.max(1, Math.round(pixels.length * reach));
		pixels.slice(0, count).forEach(([dx, dy], k) => {
			c.put(CX + dx, GROUND + dy, 'b');
			if (isTree && strand.thick && k < 10) c.put(CX + dx + 1, GROUND + dy, 'B');
		});
	});
}

function drawLeaf(c: PixelCanvas, [h, dir, size]: Leaf, thick: boolean): void {
	const y = GROUND - h;
	const start = dir > 0 ? CX + (thick ? 1 : 0) : CX;
	for (let i = 1; i <= size; i++) {
		const x = start + dir * i;
		const ly = y - Math.floor((i - 1) / 2);
		c.put(x, ly, i === size ? 'f' : 'g');
		if (i > 1 && i < size) c.put(x, ly - 1, 'g');
		if (size >= 4 && i > 1 && i < size - 1) c.put(x, ly + 1, 'G');
		if (size >= 6 && i > 2 && i < size - 2) c.put(x, ly - 2, i % 2 ? 'l' : 'g');
	}
}

function drawFlower(c: PixelCanvas, cx: number, cy: number, r: number): void {
	for (let dy = -r; dy <= r; dy++) {
		for (let dx = -r; dx <= r; dx++) {
			const d = dx * dx + dy * dy;
			if (d > r * r + (r > 1 ? 1 : 0)) continue;
			if (d === 0 || (r >= 2 && d === 1)) c.put(cx + dx, cy + dy, 'y');
			else if (d >= r * r) c.put(cx + dx, cy + dy, 'o');
			else c.put(cx + dx, cy + dy, 'i');
		}
	}
}

const BLOSSOM_INKS: Record<Exclude<Blossom, 'bud'>, readonly [petal: string, centre: string]> = {
	rose: ['o', 'y'],
	gold: ['y', 'o'],
	iris: ['i', 'y']
};

function drawBlossom(c: PixelCanvas, x: number, y: number, head: Blossom): void {
	if (head === 'bud') {
		c.put(x, y + 1, 'G');
		c.put(x, y, 'i');
		c.put(x, y - 1, 'i');
		return;
	}
	const [petal, centre] = BLOSSOM_INKS[head];
	c.put(x - 1, y, petal);
	c.put(x + 1, y, petal);
	c.put(x, y - 1, petal);
	c.put(x, y + 1, petal);
	c.put(x, y, centre);
}

function drawShoot(c: PixelCanvas, shoot: Shoot, thick: boolean): void {
	const baseX = shoot.dir > 0 ? CX + (thick ? 1 : 0) : CX;
	const baseY = GROUND - shoot.at;
	let x = baseX;
	let y = baseY;
	for (let i = 1; i <= shoot.len; i++) {
		x = baseX + shoot.dir * i;
		y = baseY - Math.round(i * 1.2);
		c.put(x, y, 'g');
		if (i === Math.ceil(shoot.len / 2)) {
			c.put(x + shoot.dir, y + 1, 'g');
			c.put(x + shoot.dir * 2, y + 1, 'f');
		}
	}
	drawBlossom(c, x, y - 2, shoot.head);
}

function drawTip(c: PixelCanvas, tip: Tip, top: number): void {
	switch (tip) {
		case 'sprout':
			c.put(CX - 1, top, 'l');
			c.put(CX - 2, top, 'l');
			c.put(CX - 2, top - 1, 'f');
			c.put(CX + 1, top, 'l');
			c.put(CX + 2, top, 'l');
			c.put(CX + 2, top - 1, 'f');
			return;
		case 'shoot':
			c.put(CX, top - 1, 'f');
			return;
		case 'bud':
			c.put(CX - 1, top - 1, 'g');
			c.put(CX + 1, top - 1, 'g');
			c.put(CX, top - 1, 'G');
			c.hline(CX - 1, CX + 1, top - 2, 'i');
			c.put(CX, top - 2, 'o');
			c.put(CX, top - 3, 'i');
			c.put(CX, top - 4, 'i');
			return;
		case 'flower':
			drawFlower(c, CX, top - 3, 2);
			return;
		case 'bloom':
			drawFlower(c, CX, top - 4, 3);
	}
}

const BASAL_SIZE = [0, 3, 4.5, 6] as const;

function drawHerb(c: PixelCanvas, herb: Herb): void {
	const top = GROUND - herb.height;
	const thick = herb.thick ?? false;
	c.vline(CX, GROUND, top, 'g');
	if (thick) c.vline(CX + 1, GROUND, top + 2, 'G');
	if (herb.woody) drawTrunk(c, GROUND - herb.woody, 2);

	const basal = BASAL_SIZE[herb.basal ?? 0];
	if (basal) {
		drawCluster(c, CX - 2 - basal * 0.6, GROUND - 2, basal, basal * 0.55);
		drawCluster(c, CX + 3 + basal * 0.6, GROUND - 2, basal, basal * 0.55);
	}

	for (const shoot of herb.shoots ?? []) drawShoot(c, shoot, thick);
	for (const leaf of herb.leaves) {
		drawLeaf(c, leaf, thick);
		if (herb.nodes && leaf[2] >= 5) {
			const [h, dir, size] = leaf;
			drawCluster(c, CX + dir * (size - 1) + (dir > 0 ? 1 : 0), GROUND - h - 2, 2.4, 1.7);
		}
	}
	for (const shoot of herb.shoots ?? []) {
		const endX = (shoot.dir > 0 ? CX + (thick ? 1 : 0) : CX) + shoot.dir * shoot.len;
		const endY = GROUND - shoot.at - Math.round(shoot.len * 1.2);
		drawBlossom(c, endX, endY - 2, shoot.head);
	}
	drawTip(c, herb.tip, top);
}

// ---------------------------------------------------------------- tree

/** Leaf clusters of the mature canopy, back to front: [dx, dy, rx, ry] around the crown anchor. */
const CLUSTERS: readonly (readonly [number, number, number, number])[] = [
	[0, -17, 8, 6],
	[-9, -12, 8, 6],
	[9, -13, 8, 6],
	[-16, -4, 6, 5],
	[16, -5, 6, 5],
	[-7, -6, 9, 7],
	[7, -7, 9, 7],
	[0, -9, 10, 7],
	[-20, 3, 4, 3],
	[20, 2, 4, 3],
	[-12, 5, 7, 5],
	[12, 4, 7, 5],
	[-15, 15, 6, 4],
	[15, 13, 6, 4],
	[-4, 6, 8, 5],
	[5, 6, 8, 5],
	[-9, 17, 6, 4],
	[9, 18, 6, 4],
	[0, 14, 7, 4]
];

const BRANCHES: readonly (readonly [number, number, number, number])[] = [
	[0, 18, -15, 15],
	[0, 16, 15, 13],
	[0, 12, -12, 5],
	[0, 10, 12, 4],
	[0, 4, -9, -8],
	[0, 2, 9, -10],
	[0, 6, -16, -2],
	[0, 5, 16, -3]
];

const FRUIT_SPOTS: readonly (readonly [number, number])[] = [
	[-8, -2],
	[6, -10],
	[-3, 4],
	[11, 2],
	[1, -15],
	[-14, 0],
	[14, -4],
	[-10, -10],
	[4, 6],
	[-18, 3],
	[17, 12],
	[-6, -13],
	[9, -2],
	[-13, 14]
];

function drawCluster(c: PixelCanvas, cx: number, cy: number, rx: number, ry: number): void {
	for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
		for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
			const nx = (x - cx) / rx;
			const ny = (y - cy) / ry;
			const d = nx * nx + ny * ny;
			const h = pixelHash(x, y);
			if (d > 1.3) continue;
			if (d > 1) {
				if (h < 9) c.put(x, y, ny > 0.3 ? 'G' : 'g');
				continue;
			}
			if (d > 0.78 && h < 26) continue;
			const light = nx * 0.6 + ny;
			let ink = 'g';
			if (light < -0.8) ink = h < 35 ? 'f' : 'l';
			else if (light < -0.6 && h < 35) ink = 'l';
			else if (light > 0.35 || h < 12) ink = 'G';
			else if (h > 97) ink = 'f';
			c.put(x, y, ink);
		}
	}
}

function drawTrunk(c: PixelCanvas, top: number, width: number): void {
	const x0 = CX - Math.floor((width - 1) / 2);
	const x1 = x0 + width - 1;
	for (let y = top; y <= GROUND; y++) {
		for (let x = x0; x <= x1; x++) {
			let ink = x === x1 ? 'B' : 'b';
			if (x !== x0 && x !== x1 && pixelHash(x, y) < 12) ink = 'k';
			c.put(x, y, ink);
		}
	}
	if (width >= 3) {
		c.put(x0 - 1, GROUND - 1, 'b');
		c.put(x0 - 1, GROUND, 'b');
		c.put(x0 - 2, GROUND, 'b');
		c.put(x1 + 1, GROUND - 1, 'B');
		c.put(x1 + 1, GROUND, 'B');
		c.put(x1 + 2, GROUND, 'B');
	}
}

function drawTree(c: PixelCanvas, spec: FrameSpec, s: number): void {
	const ax = CX + 0.5;
	const ay = GROUND - TREE_HEIGHT * s;
	const width = s < 0.55 ? 2 : s < 0.7 ? 3 : s < 0.9 ? 4 : 5;
	drawTrunk(c, Math.round(ay + 2 * s), width);

	const branchInk = (i: number) => (i % 2 === 0 ? 'b' : 'B');
	BRANCHES.forEach(([fx, fy, tx, ty], i) => {
		c.line(ax + fx * s, ay + fy * s, ax + tx * s, ay + ty * s, branchInk(i));
	});

	const scale = Math.max(s, 0.42) * 1.12;
	for (const [dx, dy, rx, ry] of CLUSTERS) {
		drawCluster(c, ax + dx * s, ay + dy * s, rx * scale, ry * scale);
	}

	const place = (count: number, draw: (x: number, y: number) => void) =>
		FRUIT_SPOTS.slice(0, count).forEach(([dx, dy]) =>
			draw(Math.round(ax + dx * s), Math.round(ay + dy * s))
		);

	place(spec.flowersLeft ?? 0, (x, y) => drawBlossom(c, x, y, x % 2 ? 'rose' : 'gold'));

	if (spec.nest) {
		const nx = Math.round(ax - 12 * s);
		const ny = Math.round(ay + 5 * s);
		for (let x = nx - 2; x <= nx + 2; x++) c.put(x, ny, x % 2 ? 'b' : 'B');
		c.put(nx - 2, ny - 1, 'b');
		c.put(nx + 2, ny - 1, 'B');
		c.put(nx - 1, ny - 1, 'l');
		c.put(nx, ny - 1, 'l');
		c.put(nx + 1, ny - 1, 'b');
	}

	place(spec.blossoms ?? 0, (x, y) => {
		c.put(x, y, 'o');
		c.put(x + 1, y - 1, 'o');
		c.put(x + 1, y, 'y');
	});
	place(spec.unripe ?? 0, (x, y) => {
		c.put(x, y, 'y');
		c.put(x, y + 1, 's');
	});
	place(spec.fruits ?? 0, (x, y) => {
		c.put(x, y, 'o');
		c.put(x + 1, y, 'r');
		c.put(x, y + 1, 'r');
		c.put(x + 1, y + 1, 'r');
		c.put(x + 1, y - 1, 'G');
		if (pixelHash(x, y) < 50) c.put(x + 1, y + 1, 'g');
	});
}

// ---------------------------------------------------------------- frames

function buildFrame(spec: FrameSpec, frame: number): string[] {
	const c = new PixelCanvas(W, H);
	drawGround(c, frame);
	drawRoots(c, frame, spec.tree !== undefined);

	if (spec.seed) {
		c.hline(CX - 1, CX + 1, GROUND + 2, 's');
		c.hline(CX - 1, CX + 1, GROUND + 3, 's');
		c.put(CX + 1, GROUND + 2, 'y');
	}
	if (spec.herb) drawHerb(c, spec.herb);
	if (spec.tree !== undefined) drawTree(c, spec, spec.tree);

	return c.toRows();
}

const LEAVES_R2_END: readonly Leaf[] = [
	[3, -1, 7],
	[4, 1, 7],
	[8, -1, 6],
	[10, 1, 6],
	[13, -1, 6],
	[16, 1, 5],
	[19, -1, 5],
	[22, 1, 4],
	[25, -1, 3]
];

const SHOOTS_R2_END: readonly Shoot[] = [
	{ at: 11, dir: 1, len: 7, head: 'rose' },
	{ at: 15, dir: -1, len: 6, head: 'gold' },
	{ at: 19, dir: 1, len: 5, head: 'iris' },
	{ at: 23, dir: -1, len: 4, head: 'rose' },
	{ at: 27, dir: 1, len: 3, head: 'gold' }
];

/**
 * Every frame is at least as tall and full as the one before: the story only ever grows.
 * Heights (rows above the grass) end each round near 35% / 60% / 80% / 100% of the tree.
 */
const FRAME_SPECS: readonly FrameSpec[] = [
	// Round 1 — a seed putting down roots, ending as a small flower
	{ seed: true },
	{ seed: true, herb: { height: 4, tip: 'sprout', leaves: [] } },
	{
		herb: {
			height: 10,
			tip: 'shoot',
			leaves: [
				[3, -1, 3],
				[3, 1, 3],
				[7, -1, 2],
				[7, 1, 2]
			]
		}
	},
	{
		herb: {
			height: 15,
			tip: 'bud',
			basal: 1,
			leaves: [
				[3, -1, 4],
				[4, 1, 4],
				[8, -1, 4],
				[9, 1, 3],
				[12, -1, 3]
			]
		}
	},
	{
		herb: {
			height: 19,
			tip: 'flower',
			basal: 1,
			leaves: [
				[3, -1, 5],
				[4, 1, 5],
				[8, -1, 5],
				[10, 1, 4],
				[13, -1, 4],
				[15, 1, 3]
			],
			shoots: [{ at: 10, dir: 1, len: 3, head: 'bud' }]
		}
	},
	// Round 2 — the flower becomes a bushy plant with a green stem and many blossoms
	{
		herb: {
			height: 23,
			tip: 'flower',
			basal: 2,
			leaves: [
				[3, -1, 6],
				[4, 1, 6],
				[8, -1, 5],
				[10, 1, 5],
				[13, -1, 5],
				[16, 1, 4],
				[19, -1, 3]
			],
			shoots: [
				{ at: 11, dir: 1, len: 4, head: 'rose' },
				{ at: 15, dir: -1, len: 3, head: 'bud' }
			]
		}
	},
	{
		herb: {
			height: 27,
			tip: 'flower',
			basal: 2,
			leaves: [
				[3, -1, 6],
				[4, 1, 6],
				[8, -1, 6],
				[10, 1, 5],
				[13, -1, 5],
				[16, 1, 5],
				[19, -1, 4],
				[22, 1, 3]
			],
			shoots: [
				{ at: 11, dir: 1, len: 5, head: 'rose' },
				{ at: 15, dir: -1, len: 4, head: 'gold' },
				{ at: 19, dir: 1, len: 3, head: 'bud' }
			]
		}
	},
	{
		herb: {
			height: 29,
			thick: true,
			tip: 'bloom',
			basal: 3,
			nodes: true,
			leaves: LEAVES_R2_END,
			shoots: [
				{ at: 11, dir: 1, len: 6, head: 'rose' },
				{ at: 15, dir: -1, len: 5, head: 'gold' },
				{ at: 19, dir: 1, len: 4, head: 'iris' },
				{ at: 23, dir: -1, len: 3, head: 'bud' }
			]
		}
	},
	{
		herb: {
			height: 34,
			thick: true,
			tip: 'bloom',
			basal: 3,
			nodes: true,
			leaves: [...LEAVES_R2_END, [27, 1, 3], [30, -1, 2]],
			shoots: SHOOTS_R2_END
		}
	},
	// Round 3 — the stem turns woody and bursts into a young tree, larger than the plant
	{
		herb: {
			height: 37,
			thick: true,
			woody: 12,
			tip: 'bloom',
			basal: 3,
			nodes: true,
			leaves: [...LEAVES_R2_END, [27, 1, 4], [30, -1, 3], [33, 1, 2]],
			shoots: [...SHOOTS_R2_END, { at: 30, dir: -1, len: 3, head: 'iris' }]
		}
	},
	{ tree: 0.68, flowersLeft: 5 },
	{ tree: 0.74, flowersLeft: 3 },
	{ tree: 0.8, flowersLeft: 1, nest: true },
	// Round 4 — the young tree fills out into a lush tree bearing fruit
	{ tree: 0.85, nest: true },
	{ tree: 0.9, nest: true, blossoms: 10 },
	{ tree: 0.95, nest: true, blossoms: 4, unripe: 9 },
	{ tree: 1, nest: true, fruits: FRUIT_SPOTS.length }
];

const mix = (token: string, pct: number) =>
	`color-mix(in oklab, var(${token}) ${pct}%, var(--background))`;

export const seedToTree: PlantModel = Object.freeze({
	id: 'seed-to-tree',
	label: 'Seed to fruit tree',
	width: W,
	height: H,
	groundY: GROUND,
	palette: Object.freeze({
		g: 'var(--accent-pine)',
		G: 'color-mix(in oklab, var(--accent-pine) 72%, black)',
		l: 'var(--accent-foam)',
		i: 'var(--accent-iris)',
		o: 'var(--accent-rose)',
		y: 'var(--accent-gold)',
		s: mix('--accent-gold', 70),
		r: 'var(--accent-love)',
		b: 'var(--text-subtle)',
		B: 'var(--text-muted)',
		k: mix('--text-muted', 60),
		d: mix('--text-muted', 30),
		e: mix('--text-muted', 42),
		E: mix('--text-muted', 54),
		D: mix('--text-muted', 78),
		m: 'var(--accent-rose)',
		n: 'var(--accent-gold)',
		p: mix('--accent-gold', 85)
	}),
	idle: Object.freeze<Record<string, IdleInk>>({
		w: { role: 'sway-a', ink: 'g' },
		v: { role: 'sway-b', ink: 'g' },
		f: { role: 'glint', ink: 'l', alt: 'g' }
	}),
	frames: Object.freeze(FRAME_SPECS.map(buildFrame)),
	actors: Object.freeze([
		pollen({ originX: 8, originY: GROUND - 3, ink: 'p' }),
		ladybug({ groundY: GROUND - 1, shell: 'r', head: 'B' }),
		butterfly({
			wing: 'm',
			body: 'B',
			seed: 0,
			centerX: 24,
			centerY: 62,
			rangeX: 16,
			rangeY: 14,
			visitsWhenCalm: true
		}),
		butterfly({ wing: 'n', body: 'B', seed: 1, centerX: 22, centerY: 70, rangeX: 17, rangeY: 12 }),
		climber({
			fromFrame: 2,
			toFrame: 5,
			column: CX + 1,
			groundY: GROUND,
			body: 'r',
			head: 'B',
			length: 2,
			pace: 3
		}),
		climber({
			fromFrame: 7,
			toFrame: 9,
			column: CX + 2,
			groundY: GROUND,
			body: 'l',
			head: 'y',
			length: 4,
			pace: 5
		}),
		bee({
			fromFrame: 3,
			toFrame: 9,
			column: CX,
			groundY: GROUND,
			body: 'y',
			stripe: 'B',
			wing: 'l'
		}),
		perchedButterfly({
			fromFrame: 5,
			toFrame: 9,
			flower: 'o',
			fromX: CX + 4,
			groundY: GROUND,
			wing: 'm',
			body: 'B'
		}),
		bird({ fromFrame: 11, toFrame: 13, column: 14, body: 'B', wing: 'l', beak: 'y' }),
		bird({ fromFrame: 14, column: 31, body: 'B', wing: 'l', beak: 'y' }),
		harvestDrop({
			from: { x: CX + 6, y: 40 },
			to: { x: CX, y: GROUND + 2 },
			fruit: 'r',
			highlight: 'o',
			duration: 10
		})
	])
});
