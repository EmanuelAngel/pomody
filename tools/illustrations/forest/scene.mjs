// The forest scene, phases 1-5, as one build: the same place seen five times while it comes back to
// life. Everything has a fixed spot and its own seed, so a later phase keeps every pixel of the
// earlier ones that it does not grow over. Nothing ever regresses between phases.
//
// Layers, back to front: sky -> far forest -> hills -> valley -> mist -> ground -> giants ->
// trees -> bushes -> ground cover -> foreground -> fauna.
import { Canvas, W, H, rng, vnoise, vnoise2 } from './lib.mjs';
import { id } from './palette.mjs';

export const GROUND = 143; // horizon of the clearing

const BAYER = [
	[0, 8, 2, 10],
	[12, 4, 14, 6],
	[3, 11, 1, 9],
	[15, 7, 13, 5]
];
/** Ordered dither threshold in (-0.5, 0.5) for blending bands pixel by pixel. */
const dither = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16 - 0.5;
const pick = (cols, v) => id[cols[Math.max(0, Math.min(cols.length - 1, Math.floor(v)))]];

const LEAF = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'];
const BARK = ['b1', 'b2', 'b3', 'b4', 'b5'];
const SOIL = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'];
const GRASS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];

// Tone ramps, light -> dark. Vignette, fog and ground relief move a pixel along its own ramp, so
// they recolour any material the same way in every theme.
const RAMPS = [
	['s4', 's3', 's2', 's1', 's0'],
	['f1', 'f2', 'f3', 'h1', 'h2', 'h3', 'h4'],
	SOIL,
	GRASS,
	LEAF,
	BARK,
	['r1', 'r2', 'r3']
];
const PLACE = new Map(RAMPS.flatMap((ramp) => ramp.map((n, i) => [id[n], [ramp, i]])));
const shift = (c, steps) => {
	const at = PLACE.get(c);
	if (!at || !steps) return c;
	const [ramp, i] = at;
	return id[ramp[Math.max(0, Math.min(ramp.length - 1, i + steps))]];
};
/** Darkens (steps > 0) or lightens a pixel in place, and what rests under it if it is alive. */
function tone(cv, x, y, steps) {
	x = Math.round(x);
	y = Math.round(y);
	if (x < 0 || y < 0 || x >= W || y >= H) return;
	const i = y * W + x;
	cv.c[i] = shift(cv.c[i], steps);
	if (cv.g[i]) cv.u[i] = shift(cv.u[i], steps);
}

/**
 * Draws one standing element leaning outward, more the closer its base is to an edge: the slight
 * wide-lens bend of the reference. The whole element shears as one piece, so it never tears.
 */
function lean(cv, baseX, draw) {
	cv.shear = shearFor(baseX);
	cv.shearBase = GROUND;
	draw();
	cv.shear = 0;
}
const shearFor = (baseX) => Math.sign(baseX - 160) * 0.065 * (Math.abs(baseX - 160) / 160) ** 1.6;

export function build(P) {
	const cv = new Canvas();

	sky(cv);
	farForest(cv, P >= 3);
	hills(cv);
	valley(cv);
	fog(cv);
	mist(cv);
	ground(cv, P);
	relief(cv);

	giants(cv, P);
	lean(cv, 93, () => hero(cv, P));
	lean(cv, 244, () => rightTrees(cv, P));
	lean(cv, 48, () => leftSapling(cv, P));
	cornerBushes(cv, P);
	centreBushes(cv, P);

	groundCover(cv, P);
	foreground(cv, P);
	fauna(cv, P);
	vignette(cv);
	stars(cv);
	return cv;
}

/** Edges and bottom corners one or two tones deeper, the frame of the reference art. */
function vignette(cv) {
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const e =
				((x - 160) / 170) ** 2 * 1.1 +
				((y - 70) / 125) ** 2 +
				(y > GROUND ? ((y - GROUND) / 37) ** 2 * 0.25 : 0);
			const v = e + vnoise2(x / 5, y / 3, 33) * 0.18;
			tone(cv, x, y, v > 1.35 ? 2 : v > 0.95 ? 1 : 0);
		}
}

/** A thin veil of fog over the far forest and the hills, densest low down, drifting in bands. */
function fog(cv) {
	for (let y = 30; y < GROUND; y++)
		for (let x = 0; x < W; x++) {
			const at = PLACE.get(cv.get(x, y));
			if (!at || at[0] !== RAMPS[1]) continue;
			const band = Math.max(0, 1 - Math.abs(y - 114) / 42);
			const m = band * 1.3 + vnoise2(x / 26, y / 7, 31) * 0.5 + vnoise2(x / 4, y / 3, 32) * 0.12;
			tone(cv, x, y, m > 1.15 ? -2 : m > 0.65 ? -1 : 0);
		}
}

/**
 * Bumps and hollows in the clearing, wider the nearer they are: a lit crest and a shadow at the
 * foot for a bump, a shaded far rim and a lit near rim for a hollow.
 */
function relief(cv) {
	const R = rng(270);
	for (let k = 0; k < 30; k++) {
		const my = GROUND + 3 + R() ** 1.2 * 34;
		const t = (my - GROUND) / 37;
		const w = 8 + t * 28 + R() * 8;
		const h = 1.2 + t * 3.5;
		const mx = R() * W;
		const hollow = R() < 0.35;
		for (let y = Math.floor(my - h); y <= my + 1; y++)
			for (let x = Math.floor(mx - w / 2); x <= mx + w / 2; x++) {
				const u = (x - mx) / (w / 2);
				const top = my - h * Math.sqrt(Math.max(0, 1 - u * u)) + vnoise(x, 5, 271 + k) * 0.8;
				if (y < top) continue;
				const crest = y <= top + 1;
				const foot = y >= my;
				if (hollow) tone(cv, x, y, crest ? 2 : foot ? -1 : 1);
				else tone(cv, x, y, crest ? (u < 0.3 ? -2 : -1) : foot ? 2 : 0);
			}
	}
}

/**
 * Stars, lit only in OLED: in Dawn and Dark their colours equal the top of the sky, so they are
 * placed last and only on pixels still showing that top band, never over a branch or a leaf.
 */
function stars(cv) {
	const R = rng(600);
	const free = (x, y) => cv.get(x, y) === id.s0;
	for (let k = 0; k < 70; k++) {
		const x = Math.floor(R() * W);
		const y = Math.floor(2 + R() ** 1.4 * 70);
		const big = R() < 0.12;
		if (!free(x, y)) continue;
		cv.set(x, y, id[big || R() < 0.45 ? 'st' : 'st2']);
		if (big)
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			])
				if (free(x + dx, y + dy)) cv.set(x + dx, y + dy, id.st2);
	}
}

// ---------------------------------------------------------------------------------------------
// Backdrop: identical in every phase except the far forest, which leafs out from phase 3
// ---------------------------------------------------------------------------------------------
function sky(cv) {
	for (let y = 0; y < GROUND; y++)
		for (let x = 0; x < W; x++) {
			const glow = Math.max(0, 1 - Math.hypot((x - 165) / 175, (y - 112) / 100));
			const v =
				(y / GROUND) * 2.2 + glow * 2.6 + vnoise2(x / 40, y / 6, 3) * 0.35 + dither(x, y) * 0.18;
			cv.set(x, y, pick(['s0', 's1', 's2', 's3', 's4'], v));
		}
}

// [x, top, width, layer]: layer 1 is the palest, farthest row; layer 3 stands on the hills
const FAR = [
	[42, 40, 3, 1],
	[84, 30, 3, 1],
	[106, 58, 2, 1],
	[214, 52, 2, 1],
	[232, 26, 3, 1],
	[290, 36, 3, 1],
	[3, 12, 5, 2],
	[28, 22, 4, 2],
	[55, 18, 4, 2],
	[246, 20, 4, 2],
	[275, 14, 5, 2],
	[304, 8, 5, 2],
	[10, 36, 6, 3],
	[36, 54, 4, 3],
	[64, 62, 3, 3],
	[268, 50, 4, 3],
	[300, 30, 6, 3]
];

function farForest(cv, leafy) {
	for (const layer of [1, 2, 3])
		FAR.filter((t) => t[3] === layer).forEach(([x, top, w], k) => {
			const c = id[['f1', 'f2', 'f3'][layer - 1]];
			const R = rng(500 + x);
			const tilt = (R() - 0.5) * 4;
			cv.shear = shearFor(x);
			cv.shearBase = GROUND;
			const centre = [
				[x, GROUND],
				[x + tilt, top]
			];
			cv.trunk(
				centre,
				[
					[top, 1],
					[top + 25, w - 1],
					[GROUND, w + 1]
				],
				[c, c, c]
			);
			// a few forks reaching up, the dead trunks of the clearing
			const forks = 2 + Math.floor(R() * 3);
			for (let f = 0; f < forks; f++) {
				const by = top + 8 + R() * 40;
				const bx = x + tilt * (1 - (by - top) / (GROUND - top));
				const side = (f + k) % 2 ? 1 : -1;
				const len = 7 + R() * 10;
				cv.path(
					[
						[bx, by],
						[bx + side * len * 0.5, by - len * 0.6],
						[bx + side * len * 0.7, by - len]
					],
					c
				);
			}
			if (leafy) {
				const cc = id[['f2', 'f3', 'h2'][layer - 1]];
				const n = 3 + Math.floor(R() * 3);
				for (let b = 0; b < n; b++) {
					const bx = x + tilt + (R() - 0.5) * 18;
					const by = top + 4 + R() * 26;
					blob(cv, bx, by, 5 + R() * 5, 4 + R() * 3, cc, 700 + x + b);
				}
			}
			cv.shear = 0;
		});
}

/** Soft lobed silhouette, for haze and far foliage. */
function blob(cv, cx, cy, rx, ry, c, seed) {
	for (let y = Math.floor(cy - ry - 2); y <= cy + ry + 2; y++)
		for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
			const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
			if (d < 1 + 0.25 * vnoise2(x / 2.5, y / 2.5, seed)) cv.set(x, y, c);
		}
}

/** Rounded shrubs along a ridge line, so a slope reads as bushes and not as a smooth curve. */
function crest(cv, pts, c, seed) {
	const R = rng(seed);
	for (let x = pts[0][0]; x <= pts[pts.length - 1][0]; x += 4 + R() * 5) {
		let k = 1;
		while (k < pts.length - 1 && pts[k][0] < x) k++;
		const [x0, y0] = pts[k - 1];
		const [x1, y1] = pts[k];
		const y = y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
		const r = 2.5 + R() * 3.5;
		blob(cv, x, y + r * 0.4, r, r * 0.8, c, seed + Math.round(x));
	}
}

function hills(cv) {
	const back = [
		[0, 94],
		[40, 102],
		[85, 115],
		[125, 127],
		[160, 133],
		[195, 128],
		[240, 113],
		[285, 101],
		[320, 94]
	];
	cv.ridge(back, GROUND, id.h1, 2.5, 5, 11);
	crest(cv, back, id.h1, 1100);
	// the nearer slopes, darker, with a shrubby crest and a few bare snags
	const left = [
		[-4, 108],
		[35, 113],
		[70, 121],
		[110, 133],
		[140, 140]
	];
	const right = [
		[185, 140],
		[215, 131],
		[250, 120],
		[285, 113],
		[324, 108]
	];
	for (const [x, top] of [
		[22, 92],
		[58, 104],
		[236, 106],
		[292, 96]
	]) {
		cv.line(x, top, x, 125, id.h3);
		cv.line(x, top + 6, x - 4, top + 1, id.h3);
		cv.line(x, top + 10, x + 3, top + 6, id.h3);
	}
	for (const [pts, seed] of [
		[left, 12],
		[right, 13]
	]) {
		cv.ridge(pts, GROUND, id.h3, 2, 3, seed);
		crest(cv, pts, id.h3, 1200 + seed);
	}
	// light along the crests, deeper at the foot of the slopes
	for (let x = 0; x < W; x++) {
		let depth = -1;
		for (let y = 80; y < GROUND; y++) {
			if (cv.get(x, y) !== id.h3) {
				depth = -1;
				continue;
			}
			depth++;
			if (depth <= 1) cv.set(x, y, id.h2);
			else if (depth > 7 && vnoise2(x / 9, y / 4, 14) > 0.05) cv.set(x, y, id.h4);
		}
	}
}

/** The far trees at the end of the valley: the same in every phase. */
function valley(cv) {
	const c = id.f2;
	cv.trunk(
		[
			[172, 128],
			[171, 98]
		],
		[
			[98, 1],
			[128, 2]
		],
		[c, c, c]
	);
	cv.path(
		[
			[171, 112],
			[166, 104],
			[164, 99]
		],
		c
	);
	cv.path(
		[
			[171, 106],
			[176, 100],
			[178, 96]
		],
		c
	);
	cv.path(
		[
			[146, 130],
			[147, 118],
			[150, 112]
		],
		c
	);
	for (const [x, y, r] of [
		[196, 100, 7],
		[204, 96, 6],
		[208, 106, 5]
	])
		blob(cv, x, y, r, r * 0.85, c, 900 + x);
	cv.trunk(
		[
			[200, 128],
			[199, 104]
		],
		[
			[104, 1],
			[128, 2]
		],
		[c, c, c]
	);
	blob(cv, 186, 116, 5, 4, id.f1, 931);
}

/** Mist lifting from the valley floor, thickest at the centre, in soft wisps. */
function mist(cv) {
	for (let y = 108; y < GROUND; y++)
		for (let x = 0; x < W; x++) {
			const m = ((y - 108) / 35) * (1 - Math.abs(x - 162) / 105) + vnoise2(x / 18, y / 3, 7) * 0.2;
			if (m > 0.7) cv.set(x, y, id.s4);
			else if (m > 0.52) cv.set(x, y, id.s3);
		}
}

// ---------------------------------------------------------------------------------------------
// Ground: soil in phase 1, grass spreading over it from phase 2
// ---------------------------------------------------------------------------------------------
function ground(cv, P) {
	const cover = [0, -1, 0.45, 0.8, 0.85, 0.9][P];
	for (let y = GROUND; y < H; y++)
		for (let x = 0; x < W; x++) {
			const t = (y - GROUND) / (H - GROUND);
			const corner = Math.max(0, Math.abs(x - 160) / 160) ** 2 * t * 2.4;
			// long horizontal streaks, the way soil reads in perspective
			const n = vnoise2(x / 20, y / 1.6, 21) * 1.3 + vnoise2(x / 6, y / 1.2, 23) * 0.6;
			const tone = 1.6 + t ** 1.1 * 4.2 + n * 1.25 + corner + dither(x, y) * 0.35;
			// grass spreads in long patches; their edges break up into single blades
			const grass =
				vnoise2(x / 24, y / 2.5, 22) + vnoise2(x / 4, y / 1.5, 24) * 0.15 + cover - t * 0.2 > 0.2;
			cv.set(x, y, grass ? pick(GRASS, tone * 0.85) : pick(SOIL, tone));
		}
	// horizon: the lit edge of the clearing
	for (let x = 0; x < W; x++) {
		const c = cv.get(x, GROUND);
		if (c === id.d1 || c === id.d2) cv.set(x, GROUND, id.d1);
		if (c === id.g1 || c === id.g2 || c === id.g3) cv.set(x, GROUND, id.g1);
	}
}

// ---------------------------------------------------------------------------------------------
// Foliage
// ---------------------------------------------------------------------------------------------
/**
 * One pointed leaf, `len` px from its root along `ang`, up to 3 px wide. It is shaded on its own
 * outline (lit where it faces the upper left, darker where it faces the lower right), so a leaf
 * drawn over another stays readable as a separate leaf. `tone` indexes LEAF (1 lit .. 4 deep).
 */
function leafShape(cv, x0, y0, ang, len, tone) {
	const dx = Math.cos(ang);
	const dy = Math.sin(ang);
	const cells = new Set();
	for (let s = 0; s <= len; s += 0.5) {
		const half = 1.6 * Math.sin((Math.PI * (s + 0.6)) / (len + 1.2));
		for (let t = -half; t <= half; t += 0.5)
			cells.add(`${Math.round(x0 + dx * s - dy * t)},${Math.round(y0 + dy * s + dx * t)}`);
	}
	const has = (x, y) => cells.has(`${x},${y}`);
	for (const key of cells) {
		const [x, y] = key.split(',').map(Number);
		let t = tone;
		if (!has(x, y + 1) || !has(x + 1, y)) t = Math.min(5, tone + 1);
		if (!has(x, y - 1) && !has(x - 1, y)) t = Math.max(0, tone - 1);
		cv.set(x, y, id[LEAF[t]]);
	}
}

/**
 * A crown of leaf clumps lit from the upper left. Each clump is a dark mass covered, top row first,
 * by fans of pointed leaves: every leaf has a lit upper edge and a shaded lower edge and overlaps
 * the ones above it. Fans on the rim point outward, so the outline breaks into single leaves.
 * `shade` darkens the whole crown (0 lit .. 1 deep), for trees further back or under a canopy.
 */
function canopy(cv, clumps, seed, { shade = 0, fruit = null } = {}) {
	const R = rng(seed);
	cv.group = 1;
	for (const { x: cx, y: cy, r } of clumps)
		for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
			for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
				const d = Math.hypot(x - cx, (y - cy) * 1.2) / r;
				if (d < 0.68 + 0.16 * vnoise2(x / 2.5, y / 2.5, seed))
					cv.set(x, y, id[(y - cy) / r > 0.25 ? 'l6' : 'l5']);
			}
	// the crown as a whole is lit from above too: its lower clumps sit in its own shadow
	const top = Math.min(...clumps.map((c) => c.y - c.r));
	const bottom = Math.max(...clumps.map((c) => c.y + c.r));
	const depth = (y) => ((y - top) / (bottom - top || 1)) * 0.9 - 0.3;
	const clusters = [];
	for (const { x: cx, y: cy, r } of clumps)
		for (let row = 0, gy = -r; gy <= r; row++, gy += 3.6)
			for (let gx = -r; gx <= r; gx += 4.4) {
				const x = cx + gx + (R() - 0.5) * 2.4 + (row % 2 ? 2.2 : 0);
				const y = cy + gy + (R() - 0.5) * 1.8;
				const d = Math.hypot(x - cx, (y - cy) * 1.2) / r;
				if (d > 0.95 || R() < 0.08) continue;
				const light =
					((-(x - cx) * 0.5 - (y - cy) * 0.9) / r) * 0.8 -
					depth(y) +
					(R() - 0.5) * 0.35 -
					shade * 1.1;
				clusters.push({ x, y, light, cx, cy, r, rr: d > 0.8 ? 1.6 + R() * 0.6 : 1.9 + R() * 0.8 });
			}
	clusters.sort((a, b) => a.y - b.y);
	for (const { x, y, light, rr, cx, cy, r } of clusters) {
		const tone = light > 0.5 ? 1 : light > 0.12 ? 2 : light > -0.3 ? 3 : 4;
		if (tone === 4 && light < -0.75) continue;
		// a fan of pointed leaves: outward on the rim, up and out inside the crown
		const rim = Math.hypot(x - cx, (y - cy) * 1.2) / r > 0.7;
		const out = Math.atan2(y - cy, x - cx);
		const ang = rim ? out : -Math.PI / 2 + ((x - cx) / r) * 0.9 + (R() - 0.5) * 0.6;
		const n = rr > 2 ? 3 : 2;
		for (let k = 0; k < n; k++) {
			const a = ang + (k - (n - 1) / 2) * 0.8 + (R() - 0.5) * 0.3;
			const t = Math.max(1, Math.min(4, tone + (R() < 0.2 ? 1 : 0)));
			leafShape(cv, x - Math.cos(ang), y - Math.sin(ang), a, rim ? 5 + R() * 2 : 4 + R() * 2, t);
		}
	}
	cv.group = 0;
	if (fruit) {
		const F = rng(seed + 77);
		for (const { x: cx, y: cy, r } of clumps)
			if (F() < fruit.share)
				for (let k = 0; k < fruit.per; k++) {
					const a = F() * Math.PI * 2;
					const d = (0.3 + F() * 0.6) * r;
					drawFruit(cv, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, fruit.kind(F));
				}
	}
}

/**
 * Clumps packed into one crown: an ellipse centred on (cx, cy) filled on a staggered grid, with a
 * few rim clumps left out so the outline breaks into lobes instead of reading as a ball.
 */
function crown(cx, cy, rx, ry, seed, r = 8) {
	const R = rng(seed);
	const clumps = [];
	const step = r * 1.15;
	for (let row = 0, y = cy - ry; y <= cy + ry; row++, y += step * 0.8)
		for (let x = cx - rx + (row % 2) * step * 0.5; x <= cx + rx; x += step) {
			const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
			if (d > 1 || (d > 0.6 && R() < 0.3)) continue;
			clumps.push({
				x: x + (R() - 0.5) * r * 0.5,
				y: y + (R() - 0.5) * r * 0.4,
				r: r * (0.85 + R() * 0.3) * (d > 0.75 ? 0.85 : 1)
			});
		}
	return clumps;
}

/** Round 3x3 fruit with a highlight: 'aR' apple or 'aO' orange. */
function drawFruit(cv, x, y, kind) {
	x = Math.round(x);
	y = Math.round(y);
	const [lit, dark] = kind === 'aR' ? ['aR', 'aR2'] : ['aO', 'aO2'];
	cv.sprite(x - 1, y - 1, ['.ab', 'aab', '.b.'], { a: id[lit], b: id[dark] });
	cv.set(x - 1, y - 1, id.aH);
	cv.set(x, y - 2, id.b4);
}

/** Tapered limb with a lit upper edge. */
function limb(cv, pts, w0, w1) {
	cv.taper(pts, w0, w1, id.b3);
	cv.taper(
		pts.map(([x, y]) => [x, y - Math.max(1, w0 / 3)]),
		Math.max(1, w0 / 2.5),
		1,
		id.b2
	);
}

/**
 * Slim trunk of a young tree, bark lit on the left. Each edge is rounded on its own, so the outline
 * steps smoothly as the trunk leans and thins instead of jumping when the width changes.
 */
function slimTrunk(cv, centre, widths, seed) {
	const pts = [...centre].sort((a, b) => a[1] - b[1]);
	const ws = [...widths].sort((a, b) => a[0] - b[0]);
	const along = (list, y, k) => {
		if (y <= list[0][k ? 0 : 1]) return list[0][k];
		for (let i = 1; i < list.length; i++) {
			const [a, b] = [list[i - 1], list[i]];
			const ya = a[k ? 0 : 1];
			const yb = b[k ? 0 : 1];
			if (y <= yb) return a[k] + ((b[k] - a[k]) * (y - ya)) / (yb - ya || 1);
		}
		return list[list.length - 1][k];
	};
	for (let y = Math.round(pts[0][1]); y <= Math.round(pts[pts.length - 1][1]); y++) {
		const cx = along(pts, y, 0);
		const w = Math.max(1, along(ws, y, 1));
		const xl = Math.round(cx - w / 2);
		const xr = Math.max(xl, Math.round(cx + w / 2) - 1);
		for (let x = xl; x <= xr; x++) {
			let c = 'b2';
			if (xr - xl >= 2 && x === xl) c = 'b1';
			else if (xr > xl && x === xr) c = 'b4';
			else if (xr - xl >= 3 && vnoise2(x / 1.5, y / 2.5, seed) > 0.6) c = 'b3';
			cv.set(x, y, id[c]);
		}
	}
}

/** Twig ending in a little fan of leaves: how the saplings carry their first leaves. */
function sprig(cv, x, y, dir, len, leaves, seed) {
	const R = rng(seed);
	const ex = x + dir * len * 0.8;
	const ey = y - len * 0.7;
	cv.line(x, y, ex, ey, id.b3);
	cv.group = 1;
	// the same pointed leaf as the crowns (leafShape takes screen angles: y grows downward)
	if (len > 6) leafShape(cv, (x + ex) / 2, (y + ey) / 2, -Math.PI / 2 - dir * 0.9, 3.5, 2);
	for (let k = 0; k < leaves; k++) {
		const ang = Math.PI / 2 - dir * (0.3 + k * 0.55) + (R() - 0.5) * 0.3;
		leafShape(cv, ex, ey, -ang, 4.5, k % 2 ? 2 : 1);
	}
	cv.group = 0;
}

// ---------------------------------------------------------------------------------------------
// The giants at both edges: slim edge trees in phase 2 that grow into the frame of the clearing
// ---------------------------------------------------------------------------------------------
function giants(cv, P) {
	if (P < 2) return;
	const big = P >= 3;
	for (const side of [-1, 1]) {
		const bx = side < 0 ? 24 : 296; // fixed spot of each giant
		const sx = (x) => (side < 0 ? x : 320 - x); // mirror helper: x measured from the edge
		cv.shear = shearFor(bx);
		cv.shearBase = GROUND;
		if (!big) {
			slimTrunk(
				cv,
				[
					[bx, GROUND + 2],
					[sx(22), 70],
					[sx(20), 10]
				],
				[
					[10, 3],
					[GROUND, 6]
				],
				60 + side
			);
			limb(
				cv,
				[
					[sx(21), 52],
					[sx(32), 34],
					[sx(42), 26]
				],
				3,
				1
			);
			canopy(cv, crown(sx(22), 10, 26, 24, 80 + side, 8), 80 + side);
			continue;
		}
		giantTrunk(cv, bx, side, sx, P);
		// the crown runs off the top edge, so the giants never look cut
		const clumps = [
			...crown(sx(56), 10, 60, 32, 92 + side, 11),
			...crown(sx(94), 40, 14, 10, 94 + side, 8)
		];
		canopy(cv, clumps, 90 + side, {
			fruit:
				P >= 5
					? { share: 0.8, per: 3, kind: (F) => (F() < (side < 0 ? 0.6 : 0.4) ? 'aR' : 'aO') }
					: null
		});
	}
	cv.shear = 0;
}

function giantTrunk(cv, bx, side, sx, P) {
	const R = rng(40 + side);
	// centre line and half-width per row: a flared root plate, a waist, then the fork
	const centre = (y) => bx + side * (Math.max(0, (90 - y) / 90) ** 1.4 * -8);
	const half = (y) => {
		const root = Math.max(0, (y - 118) / 25) ** 2 * 9;
		return 7 + (y / GROUND) * 4 + root;
	};
	for (let y = 20; y <= GROUND + 3; y++) {
		const c = centre(y);
		const h = half(y);
		for (let x = Math.floor(c - h); x <= Math.ceil(c + h); x++) {
			const u = (x - (c - h)) / (2 * h); // 0 left edge .. 1 right edge
			const streak = vnoise2(x / 1.6, y / 8, 41 + side) * 0.9;
			let tone = 1 + u * 2.6 + streak;
			if (u < 0.12) tone = 0.2 + streak * 0.5;
			cv.set(x, y, pick(BARK, tone + dither(x, y) * 0.4));
		}
	}
	// the two big limbs carrying the canopy
	limb(
		cv,
		[
			[centre(40), 40],
			[sx(44), 26],
			[sx(70), 18],
			[sx(96), 12]
		],
		6,
		2
	);
	limb(
		cv,
		[
			[centre(30), 30],
			[sx(16), 18],
			[sx(6), 10]
		],
		5,
		2
	);
	if (side > 0)
		limb(
			cv,
			[
				[centre(60), 60],
				[sx(78), 52],
				[sx(92), 48]
			],
			4,
			1
		);
	// roots spreading over the soil
	for (const d of [-1, 1]) {
		const x0 = centre(GROUND) + d * half(GROUND);
		cv.taper(
			[
				[x0 - d * 4, GROUND - 4],
				[x0 + d * 4, GROUND + 2],
				[x0 + d * (8 + R() * 4), GROUND + 5]
			],
			4,
			1,
			id.b3
		);
	}
	if (P >= 4) mossAndVines(cv, centre, half, side, P);
	if (P >= 5) shelfFungus(cv, centre, half, side);
}

function mossAndVines(cv, centre, half, side, P) {
	const R = rng(300 + side);
	// moss on the lit side of the trunk
	for (let y = 60; y < GROUND; y++) {
		const x0 = Math.round(centre(y) - half(y));
		if (vnoise(y, 6, 301 + side) > 0.1) cv.set(x0 + 1, y, id.g3);
		if (vnoise(y, 6, 301 + side) > 0.45) cv.set(x0 + 2, y, id.g4);
	}
	// a flowering climber spiralling up the trunk
	cv.group = 1;
	let px = centre(GROUND - 2) - half(GROUND - 2) * 0.5;
	for (let y = GROUND - 2; y > 50; y -= 1) {
		const x = centre(y) + Math.sin(y / 7 + side) * half(y) * 0.7;
		cv.set(x, y, id.l4);
		if (Math.abs(x - px) > 1) cv.set((x + px) / 2, y, id.l4);
		px = x;
		if (y % 4 === 0) cv.leaf(x, y, side < 0 ? 2.4 : 0.7, 2, id.l3, id.l2);
		if (y % 9 === 0 && R() < 0.8) {
			const c = id[R() < 0.5 ? 'fR' : 'fO'];
			cv.group = 0;
			cv.sprite(Math.round(x) - 1, y - 1, ['.a.', 'aya', '.a.'], { a: c, y: id.fY });
			cv.group = 1;
		}
	}
	cv.group = 0;
	// lianas hanging from the canopy, outside the centre
	const xs = side < 0 ? [12, 30, 52, 66, 84, 100] : [218, 232, 248, 266, 288, 310];
	xs.forEach((x, k) => {
		const top = 14 + R() * 18;
		const len = 18 + R() * (P >= 5 ? 50 : 40);
		cv.group = 1;
		for (let y = top; y < top + len && y < 118; y++) {
			const vx = x + Math.sin(y / 9 + k) * 1.2;
			cv.set(vx, y, id[y % 3 ? 'l4' : 'l3']);
			if ((y + k) % 7 === 0) cv.leaf(vx, y, k % 2 ? 0.6 : 2.5, 2, id.l3, id.l2);
		}
		cv.group = 0;
	});
}

function shelfFungus(cv, centre, half, side) {
	for (const y of [78, 84, 100]) {
		const edge = side < 0 ? centre(y) + half(y) : centre(y) - half(y);
		const x = Math.round(edge) + (side < 0 ? 0 : -4);
		cv.sprite(x, y, ['.aaa.', 'abbbb'], { a: id.mC, b: id.mB });
	}
}

// ---------------------------------------------------------------------------------------------
// The hero tree left of the centre: a sapling that becomes an orange tree
// ---------------------------------------------------------------------------------------------
function hero(cv, P) {
	const x0 = 93;
	if (P === 1) {
		slimTrunk(
			cv,
			[
				[x0, GROUND + 1],
				[x0 - 1, 112],
				[x0 + 2, 72],
				[x0 + 4, 36]
			],
			[
				[36, 1],
				[70, 3],
				[GROUND, 5]
			],
			10
		);
		[
			[x0 + 3, 50, -1, 9, 3],
			[x0 + 3, 58, 1, 10, 3],
			[x0 + 2, 76, -1, 8, 2],
			[x0 + 2, 84, 1, 8, 3],
			[x0 + 4, 40, 1, 5, 2],
			[x0 + 4, 38, -1, 5, 2]
		].forEach(([x, y, dir, len, n], k) => sprig(cv, x, y, dir, len, n, 20 + k));
		return;
	}
	slimTrunk(
		cv,
		[
			[x0, GROUND + 1],
			[x0 - 1, 110],
			[x0 + 2, 60],
			[x0 + 3, 30]
		],
		[
			[30, 2],
			[90, 3],
			[GROUND, P >= 4 ? 6 : 5]
		],
		11
	);
	limb(
		cv,
		[
			[x0 + 1, 76],
			[x0 - 5, 64],
			[x0 - 11, 54]
		],
		2,
		1
	);
	limb(
		cv,
		[
			[x0 + 1, 82],
			[x0 + 7, 72],
			[x0 + 12, 62]
		],
		2,
		1
	);
	// two tiers with a gap where the limbs show; a little fuller once the forest is grown
	const g = P >= 3 ? 2 : 0;
	canopy(
		cv,
		[
			...crown(x0 + 1, 26, 18 + g, 16 + g, 31, 7),
			...crown(x0 - 11, 52, 9 + g, 8, 32, 6),
			...crown(x0 + 10, 60, 8, 7 + g / 2, 33, 6)
		],
		30,
		{ fruit: P >= 5 ? { share: 0.6, per: 2, kind: () => 'aO' } : null }
	);
	if (P >= 4) {
		// a flowering climber on the trunk
		for (let y = GROUND - 2; y > 78; y -= 5) {
			const x = x0 + (y % 10 ? -2 : 2);
			cv.set(x, y, id.l4);
			cv.set(x, y + 1, id.l3);
			if (y % 15 === 3) cv.set(x, y - 1, id.fR);
		}
	}
}

// ---------------------------------------------------------------------------------------------
// The two trees right of the centre (x 229 and x 258) and the small sapling on the left (x 48)
// ---------------------------------------------------------------------------------------------
function rightTrees(cv, P) {
	// x 258: a sapling, then the tall young tree of phase 2 that keeps growing under the giant
	const a = 258;
	if (P === 1) {
		slimTrunk(
			cv,
			[
				[a, GROUND + 1],
				[a - 1, 100],
				[a + 1, 64]
			],
			[
				[64, 1],
				[110, 2],
				[GROUND, 4]
			],
			12
		);
		[
			[a, 72, -1, 7, 3],
			[a, 80, 1, 8, 3],
			[a - 1, 96, -1, 7, 2],
			[a, 66, 1, 5, 2],
			[a - 1, 108, 1, 6, 2]
		].forEach(([x, y, dir, len, n], k) => sprig(cv, x, y, dir, len, n, 40 + k));
	} else {
		slimTrunk(
			cv,
			[
				[a, GROUND + 1],
				[a - 1, 100],
				[a + 1, 50],
				[a, 22]
			],
			[
				[22, 2],
				[90, 3],
				[GROUND, P >= 3 ? 5 : 4]
			],
			13
		);
		const g = P >= 3 ? 2 : 0;
		canopy(
			cv,
			[
				...crown(a, 34, 16 + g, 16, 51, 7),
				...crown(a + 11, 62, 9 + g, 8, 52, 6),
				...crown(a - 10, 72, 8, 7 + g, 53, 6)
			],
			50,
			{ shade: P >= 3 ? 0.25 : 0, fruit: P >= 5 ? { share: 0.7, per: 2, kind: () => 'aO' } : null }
		);
	}

	// x 229: the smaller one, a sapling until it crowns in phase 3
	const b = 229;
	const top = 90;
	slimTrunk(
		cv,
		[
			[b, GROUND + 1],
			[b - 1, 120],
			[b + 1, top]
		],
		[
			[top, 1],
			[120, 2],
			[GROUND, P >= 4 ? 4 : 3]
		],
		14
	);
	if (P <= 2) {
		[
			[b, 98, -1, 6, 3],
			[b, 104, 1, 7, 3],
			[b, 116, -1, 6, 2],
			[b + 1, 93, 1, 4, 2],
			...(P === 2
				? [
						[b, 110, 1, 6, 3],
						[b, 124, -1, 5, 2]
					]
				: [])
		].forEach(([x, y, dir, len, n], k) => sprig(cv, x, y, dir, len, n, 60 + k));
	} else {
		const g = P >= 4 ? 2 : 0;
		canopy(cv, crown(b, 102, 9 + g, 12 + g, 71, 5), 70, {
			fruit: P >= 5 ? { share: 0.6, per: 1, kind: () => 'aR' } : null
		});
	}
}

function leftSapling(cv, P) {
	const x0 = 48;
	slimTrunk(
		cv,
		[
			[x0, GROUND + 1],
			[x0 + 1, 120],
			[x0 - 1, 103]
		],
		[
			[103, 1],
			[GROUND, 3]
		],
		15
	);
	const sprigs = [
		[x0, 110, -1, 6, 3],
		[x0, 116, 1, 6, 3],
		[x0 - 1, 106, 1, 4, 2],
		[x0, 126, -1, 5, 2]
	];
	if (P >= 2) sprigs.push([x0, 122, 1, 6, 3], [x0 - 1, 104, -1, 4, 2]);
	sprigs.forEach(([x, y, dir, len, n], k) => sprig(cv, x, y, dir, len, n, 80 + k));
}

// ---------------------------------------------------------------------------------------------
// Bushes
// ---------------------------------------------------------------------------------------------
/** Twiggy shrub with leaf fans: the bare form every bush starts from. */
function twigShrub(cv, x, base, h, seed, leaves) {
	const R = rng(seed);
	for (let s = 0; s < 5; s++) {
		const dx = (s - 2) * 4 + (R() - 0.5) * 3;
		const top = base - h * (0.6 + R() * 0.4);
		cv.path(
			[
				[x + dx * 0.3, base],
				[x + dx * 0.7, base - h * 0.4],
				[x + dx, top]
			],
			id.b3
		);
		for (let k = 0; k < leaves; k++) {
			const t = 0.35 + R() * 0.65;
			const lx = x + dx * (0.3 + t * 0.7);
			const ly = base - (base - top) * t;
			cv.group = 1;
			leafShape(cv, lx, ly, -Math.PI / 2 + (R() - 0.5) * 2.4, 3, R() < 0.5 ? 2 : 3);
			cv.group = 0;
		}
	}
}

/** A round bush of leaf clumps, optionally dotted with flowers or berries. */
function bush(cv, clumps, seed, dots) {
	canopy(cv, clumps, seed);
	if (!dots) return;
	const R = rng(seed + 5);
	for (const { x: cx, y: cy, r } of clumps)
		for (let k = 0; k < dots.per; k++) {
			const a = R() * Math.PI * 2;
			const d = Math.sqrt(R()) * r * 0.9;
			const x = Math.round(cx + Math.cos(a) * d);
			const y = Math.round(cy + Math.sin(a) * d * 0.85);
			const c = dots.cols[Math.floor(R() * dots.cols.length)];
			if (dots.berry) cv.sprite(x, y, ['ab', 'bb'], { a: id.aH, b: id[c] });
			else cv.set(x, y, id[c]);
		}
}

function cornerBushes(cv, P) {
	if (P <= 2) {
		lean(cv, 18, () => twigShrub(cv, 18, GROUND + 2, 38, 100, P === 1 ? 4 : 5));
		lean(cv, 304, () => twigShrub(cv, 304, GROUND + 2, 40, 101, P === 1 ? 4 : 5));
		return;
	}
	const dots =
		P >= 5
			? { per: 5, cols: ['fB', 'aR', 'fB'], berry: true }
			: { per: P >= 4 ? 6 : 4, cols: P >= 4 ? ['fW', 'fP', 'fW'] : ['fW'] };
	lean(cv, 18, () =>
		bush(
			cv,
			[
				{ x: 8, y: 116, r: 10 },
				{ x: 22, y: 124, r: 9 },
				{ x: 6, y: 134, r: 9 },
				{ x: 30, y: 136, r: 7 }
			],
			110,
			dots
		)
	);
	lean(cv, 302, () =>
		bush(
			cv,
			[
				{ x: 312, y: 114, r: 10 },
				{ x: 298, y: 124, r: 9 },
				{ x: 314, y: 132, r: 9 },
				{ x: 290, y: 136, r: 7 }
			],
			111,
			dots
		)
	);
}

/** Low bushes at the foot of the clearing, below the timer (their tops stay under y 118). */
function centreBushes(cv, P) {
	if (P < 2) return;
	if (P === 2) {
		twigShrub(cv, 128, GROUND + 1, 22, 120, 4);
		twigShrub(cv, 142, GROUND + 1, 18, 121, 4);
		twigShrub(cv, 196, GROUND + 1, 20, 122, 4);
		return;
	}
	const dots = { per: P >= 4 ? 5 : 3, cols: P >= 4 ? ['fY', 'fW', 'fV', 'fP'] : ['fW', 'fY'] };
	bush(
		cv,
		[
			{ x: 120, y: 132, r: 8 },
			{ x: 134, y: 128, r: 9 },
			{ x: 148, y: 134, r: 7 },
			{ x: 110, y: 138, r: 6 }
		],
		130,
		dots
	);
	bush(
		cv,
		[
			{ x: 192, y: 132, r: 8 },
			{ x: 205, y: 134, r: 7 },
			{ x: 182, y: 138, r: 5 }
		],
		131,
		dots
	);
}

// ---------------------------------------------------------------------------------------------
// Ground cover: sprouts, grass, moss, flowers, mushrooms
// ---------------------------------------------------------------------------------------------
function sprout(cv, x, y) {
	cv.group = 2;
	cv.sprite(x - 1, y - 2, ['a.a', 'bcb', '.c.'], { a: id.l1, b: id.l2, c: id.l3 });
	cv.group = 0;
}

/** A few blades of uneven height fanning out from one root. */
function tuft(cv, x, base, h, seed) {
	const R = rng(seed);
	cv.group = 2;
	const blades = 2 + Math.floor(R() * 3);
	for (let k = 0; k < blades; k++) {
		const dx = Math.round((k - (blades - 1) / 2) * (1 + R() * 0.8));
		const bh = Math.max(2, Math.round(h * (k === 1 ? 1 : 0.45 + R() * 0.45)));
		const lean = Math.sign(dx);
		for (let s = 0; s < bh; s++) {
			const c = s === bh - 1 && bh > 3 ? 'g1' : s >= bh / 2 ? 'g2' : s > 0 ? 'g3' : 'g4';
			cv.set(x + dx + (s > bh * 0.6 ? lean : 0), base - s, id[c]);
		}
	}
	cv.group = 0;
}

function flower(cv, x, y, c) {
	cv.group = 2;
	cv.set(x, y + 1, id.g3);
	cv.set(x, y + 2, id.g4);
	cv.group = 0;
	cv.sprite(x - 1, y - 1, ['.a.', 'aya', '.a.'], { a: id[c], y: id[c === 'fY' ? 'fO' : 'fY'] });
}

function mushroom(cv, x, y, red) {
	const cap = red ? id.aR : id.mB;
	cv.sprite(x - 2, y - 3, ['.aaa.', 'awaaa', '..s..', '..s..'], { a: cap, w: id.mC, s: id.mC });
}

function moss(cv, x, y, len, seed) {
	const R = rng(seed);
	for (let k = 0; k < len; k++) {
		cv.set(x + k, y, id[k < 2 || k > len - 3 ? 'g4' : 'g3']);
		if (k > 1 && k < len - 2) cv.set(x + k, y - 1, id[R() < 0.4 ? 'g2' : 'g3']);
		if (k > 3 && k < len - 4 && R() < 0.5) cv.set(x + k, y - 2, id.g2);
	}
}

function groundCover(cv, P) {
	const R = rng(200);
	// first sprouts, everywhere from the start
	for (let k = 0; k < 26; k++) {
		const x = 6 + R() * 308;
		const y = GROUND + 4 + R() * 32;
		if (P === 1 || R() < 0.6) sprout(cv, Math.round(x), Math.round(y));
	}
	// grass along the horizon and in tufts over the clearing
	const T = rng(210);
	const tufts = [0, 14, 34, 56, 66, 74][P];
	for (let k = 0; k < 80; k++) {
		const x = Math.round(T() * 320);
		const y = Math.round(GROUND + 1 + T() ** 1.6 * 36);
		const h = 2 + T() * (P === 1 ? 3 : 5);
		if (k < tufts) tuft(cv, x, y, h, 220 + k);
	}
	// the edge of the clearing: a ragged line of grass and dry stalks, thinner towards the centre
	const E = rng(215);
	for (let x = 1; x < W; x += 2 + Math.floor(E() * 4)) {
		const side = Math.abs(x - 160) / 160;
		if (E() > side * 0.8 + vnoise(x, 14, 216) * 0.5 + (P - 1) * 0.08) continue;
		tuft(cv, x, GROUND + Math.floor(E() * 2), 2 + E() * (3 + side * 6 + P), 260 + x);
	}
	for (const [x, y, len] of [
		[78, 168, 16],
		[100, 156, 8],
		[118, 150, 12],
		[150, 160, 9],
		[214, 149, 12],
		[250, 156, 11],
		[196, 172, 10]
	])
		moss(cv, x, y, len, 230 + x);

	if (P >= 3) {
		// a fallen, mossy log at the right
		cv.taper(
			[
				[236, 158],
				[290, 152],
				[320, 150]
			],
			6,
			7,
			id.b3
		);
		cv.taper(
			[
				[236, 156],
				[290, 150],
				[320, 148]
			],
			2,
			3,
			id.b2
		);
		moss(cv, 250, 154, 30, 240);
		moss(cv, 290, 149, 24, 241);
		if (P >= 5) {
			mushroom(cv, 262, 153, false);
			mushroom(cv, 270, 152, false);
		}
	}

	if (P >= 3) {
		const F = rng(250);
		const n = [0, 0, 0, 10, 70, 70][P];
		const cols = P >= 4 ? ['fR', 'fO', 'fY', 'fP', 'fV', 'fR', 'fW'] : ['fW', 'fY'];
		for (let k = 0; k < n; k++) {
			const x = Math.round(4 + F() * 312);
			const y = Math.round(GROUND + 3 + F() ** 1.3 * 32);
			const c = cols[Math.floor(F() * cols.length)];
			if (P >= 5 && k % 9 === 0) flower(cv, x, y, 'fB');
			else flower(cv, x, y, c);
		}
	}

	if (P >= 5) {
		for (const [x, y, red] of [
			[38, 170, true],
			[104, 146, false],
			[214, 147, true],
			[232, 150, false],
			[58, 147, true]
		])
			mushroom(cv, x, y, red);
		for (const [x, y, k] of [
			[66, 164, 'aR'],
			[134, 167, 'aR'],
			[104, 160, 'aO'],
			[250, 166, 'aR'],
			[284, 170, 'aR']
		])
			drawFruit(cv, x, y, k);
	}
}

// ---------------------------------------------------------------------------------------------
// Foreground: dark fallen branches in the bottom corners and rocks, in every phase
// ---------------------------------------------------------------------------------------------
function foreground(cv) {
	const k = id.d7;
	cv.taper(
		[
			[44, 182],
			[54, 168],
			[62, 154]
		],
		3,
		1,
		k
	);
	cv.taper(
		[
			[0, 166],
			[24, 170],
			[50, 178]
		],
		3,
		2,
		k
	);
	cv.path(
		[
			[54, 168],
			[66, 162],
			[80, 160]
		],
		k
	);
	cv.path(
		[
			[20, 169],
			[16, 160],
			[10, 156]
		],
		k
	);
	cv.path(
		[
			[30, 172],
			[34, 164],
			[30, 158]
		],
		k
	);
	cv.taper(
		[
			[320, 160],
			[296, 168],
			[276, 180]
		],
		3,
		2,
		k
	);
	for (const [pts] of [
		[
			[
				[296, 168],
				[292, 158],
				[286, 152]
			]
		],
		[
			[
				[284, 176],
				[272, 168],
				[262, 166]
			]
		],
		[
			[
				[308, 164],
				[310, 154],
				[316, 148]
			]
		]
	])
		cv.path(pts, k);
	for (const [x, y, w] of [
		[45, 160, 5],
		[180, 152, 4],
		[208, 170, 5],
		[280, 163, 6]
	])
		rock(cv, x, y, w);
}

function rock(cv, x, y, w) {
	for (let yy = 0; yy < 3; yy++)
		for (let xx = 0; xx < w; xx++) {
			if (yy === 0 && (xx === 0 || xx === w - 1)) continue;
			const c = yy === 0 ? (xx < w / 2 ? 'r1' : 'r2') : yy === 1 && xx < 2 ? 'r2' : 'r3';
			cv.set(x + xx, y + yy, id[c]);
		}
}

// ---------------------------------------------------------------------------------------------
// Fauna: bees in phase 4, then birds and butterflies; never over the centre
// ---------------------------------------------------------------------------------------------
function fauna(cv, P) {
	if (P >= 4) {
		const bee = ['.ww', 'ybk', '.k.'];
		const map = { w: id.fW, y: id.fY, b: id.b5, k: id.b5 };
		cv.sprite(66, 92, bee, map);
		cv.sprite(242, 78, bee, map);
		const M = rng(400);
		for (let k = 0; k < (P >= 5 ? 14 : 8); k++) {
			const x = M() < 0.5 ? 10 + M() * 100 : 210 + M() * 100;
			cv.set(x, 60 + M() * 70, id.aH);
		}
	}
	if (P >= 5) {
		const bird = ['.bb.', 'bbbo', '.ff.'];
		cv.sprite(46, 22, bird, { b: id.fB, o: id.fO, f: id.b2 });
		cv.sprite(
			256,
			44,
			bird.map((r) => [...r].reverse().join('')),
			{ b: id.mB, o: id.fO, f: id.b2 }
		);
		const fly = ['a.a', '.b.', 'a.a'];
		cv.sprite(30, 96, fly, { a: id.fP, b: id.b5 });
		cv.sprite(276, 64, fly, { a: id.fB, b: id.b5 });
		cv.sprite(296, 102, fly, { a: id.fV, b: id.b5 });
		cv.sprite(92, 110, ['.ww', 'ybk', '.k.'], { w: id.fW, y: id.fY, b: id.b5, k: id.b5 });
	}
}
