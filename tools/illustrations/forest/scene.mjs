// Forest · phase 1 scene, authored layer by layer on the 320x180 art grid.
import { Canvas, W, H, rng, vnoise, vnoise2, lerp, interp } from './lib.mjs';

// Palette as Rosé Pine token recipes: [[token, share], ...]; whatever is left is --bg-base.
// Every colour is made only of theme tokens, so each theme restyles the scene by itself.
// Ladders (light -> dark) are built with different tokens, not with opacity alone, so the order
// holds in Dawn (tokens darker than the page) and in Dark/OLED (tokens lighter than the page).
export const RECIPES = {
	// sky: foam mist at the top, gold glow toward the horizon
	s0: [['foam', 0.18]],
	s1: [['foam', 0.13]],
	s2: [['foam', 0.08]],
	s3: [['gold', 0.05]],
	s4: [['gold', 0.08]],
	s5: [['gold', 0.11]],
	s6: [['gold', 0.2]],
	// far silhouettes and haze
	far1: [['foam', 0.24]],
	far2: [['iris', 0.2]],
	far3: [['iris', 0.26]],
	far4: [['iris', 0.15]],
	w1: [['gold', 0.22]],
	w2: [['gold', 0.28]],
	w3: [['foam', 0.3]],
	// hills, far -> near
	m1: [['foam', 0.36]],
	m2: [['foam', 0.44]],
	m3: [['foam', 0.52]],
	m4: [['pine', 0.42]],
	m5: [['pine', 0.54]],
	m6: [['pine', 0.68]],
	// vegetation: foam (light) -> pine (dark)
	lh: [['foam', 1]],
	lm: [
		['foam', 0.6],
		['pine', 0.4]
	],
	ll: [
		['foam', 0.3],
		['pine', 0.7]
	],
	ld: [['pine', 1]],
	ld2: [['pine', 1]],
	o1: [['foam', 0.75]],
	o2: [['pine', 0.75]],
	// soil: gold -> rose -> pine (muted; love only in small doses)
	d1: [['gold', 0.45]],
	d2: [
		['gold', 0.35],
		['rose', 0.15]
	],
	d3: [
		['rose', 0.35],
		['gold', 0.15]
	],
	d4: [
		['rose', 0.3],
		['pine', 0.15]
	],
	d5: [
		['rose', 0.25],
		['pine', 0.3]
	],
	d6: [
		['pine', 0.4],
		['rose', 0.15]
	],
	d7: [['pine', 0.5]],
	// trunks and brambles: rose -> iris -> pine
	t1: [
		['rose', 0.4],
		['iris', 0.2]
	],
	t2: [
		['iris', 0.45],
		['pine', 0.25]
	],
	t3: [
		['iris', 0.2],
		['pine', 0.6]
	],
	br: [['pine', 1]],
	// rocks
	r1: [['iris', 0.55]],
	r2: [
		['iris', 0.3],
		['pine', 0.5]
	]
};
export const NAMES = Object.keys(RECIPES);
const id = Object.fromEntries(NAMES.map((n, i) => [n, i + 1]));

const GROUND = 143; // soil horizon

export function build() {
	const cv = new Canvas();
	const R = rng(20261022);
	const pick = (arr) => arr[Math.floor(R() * arr.length)];
	const rad = (deg) => (deg * Math.PI) / 180;

	// ---- Sky: dithered bands, greener toward the edges -------------------------------------
	const levels = ['s0', 's1', 's2', 's3', 's4', 's5'];
	const bounds = [24, 38, 54, 70, 85]; // y where level k+1 starts at the centre
	const bayer = [
		[-1.5, 0.5],
		[1.5, -0.5]
	];
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			const edge = Math.pow(Math.abs(x - 165) / 165, 2) * 24;
			const yy = y + bayer[y & 1][x & 1] - edge - 2.5 * vnoise(x, 18, 3);
			let lv = 0;
			while (lv < bounds.length && yy >= bounds[lv]) lv++;
			cv.set(x, y, id[levels[lv]]);
		}

	// ---- Far pale hills + warm silhouettes -----------------------------------------------
	cv.ridge(
		[
			[0, 64],
			[8, 62],
			[22, 60],
			[40, 64],
			[54, 70],
			[62, 82],
			[70, 96]
		],
		150,
		id.far1,
		2.6,
		3,
		31
	);
	cv.ridge(
		[
			[262, 72],
			[268, 64],
			[274, 58],
			[282, 55],
			[292, 60],
			[298, 58],
			[304, 50],
			[312, 43],
			[320, 41]
		],
		150,
		id.far1,
		0
	);
	cv.ridge(
		[
			[84, 118],
			[100, 112],
			[120, 114],
			[140, 116],
			[160, 118],
			[180, 118],
			[200, 116],
			[220, 116],
			[240, 108],
			[252, 102]
		],
		150,
		id.s6,
		1.5,
		5,
		4
	);
	// far tree crowns: ragged blobs on thin trunks, glowing against the haze
	const crown = (cx, cy, rx, ry, col, seed, trunkTo = 124) => {
		for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++)
			for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
				const d =
					((x - cx) / rx) ** 2 +
					((y - cy) / ry) ** 2 +
					0.55 * vnoise(x * 1.3 + y * 0.7, 3.2, seed) +
					(R() < 0.08 ? 0.5 : 0);
				if (d < 1) cv.set(x, y, id[col]);
			}
		cv.rect(
			Math.round(cx) - 1,
			Math.round(cy + ry * 0.6),
			2,
			trunkTo - Math.round(cy + ry * 0.6),
			id[col]
		);
		for (const s of [-1, 1])
			cv.path(
				[
					[cx, cy + ry * 0.5],
					[cx + s * rx * 0.9, cy - ry * 0.2]
				],
				id[col]
			);
	};
	crown(178, 105, 8, 9, 's6', 41);
	crown(205, 102, 11, 9, 's6', 42, 126);
	crown(135, 110, 6, 5, 's6', 43, 124);
	crown(152, 112, 5, 4, 's6', 44, 124);
	crown(236, 100, 7, 7, 's6', 45, 126);
	crown(162, 108, 4, 6, 's6', 46, 124);
	cv.ridge(
		[
			[84, 122],
			[100, 113],
			[115, 116],
			[128, 118],
			[140, 116],
			[150, 121],
			[160, 124],
			[172, 124],
			[185, 121],
			[200, 118],
			[212, 113],
			[226, 112]
		],
		150,
		id.w1,
		1.6,
		4,
		5
	);
	cv.ridge(
		[
			[80, 128],
			[100, 126],
			[120, 128],
			[140, 131],
			[160, 133],
			[180, 132],
			[200, 129],
			[215, 124],
			[225, 118]
		],
		150,
		id.w2,
		1.4,
		4,
		6
	);

	// ---- Distant dead trees (behind the sage hills where they overlap) -------------------
	const dead = (centre, widths, col, branches) => {
		cv.trunk(
			centre,
			widths.map(([y, w]) => [y, w * 1.35]),
			[id[col], id[col], id[col]],
			{ jit: 0.6 }
		);
		for (const b of branches) cv.taper(b, 2, 1, id[col]);
	};
	dead(
		[
			[1, 34],
			[2, 60],
			[2, 95]
		],
		[
			[34, 2],
			[60, 4],
			[95, 5]
		],
		'm3',
		[
			[
				[3, 60],
				[5, 52]
			]
		]
	);
	dead(
		[
			[33, 29],
			[32, 45],
			[30, 62],
			[29, 100]
		],
		[
			[29, 1],
			[45, 2],
			[62, 3],
			[100, 4]
		],
		'm3',
		[
			[
				[30, 62],
				[27, 58],
				[22, 50],
				[20, 48]
			],
			[
				[32, 50],
				[36, 42],
				[39, 38]
			],
			[
				[30, 78],
				[35, 70],
				[39, 62]
			]
		]
	);
	dead(
		[
			[43, 21],
			[44, 40],
			[44, 60],
			[45, 100]
		],
		[
			[21, 1],
			[40, 2],
			[60, 3],
			[100, 5]
		],
		'm3',
		[
			[
				[44, 42],
				[47, 36],
				[49, 30]
			],
			[
				[43, 48],
				[40, 44],
				[36, 40]
			],
			[
				[46, 62],
				[52, 56],
				[58, 50]
			],
			[
				[43, 68],
				[40, 72]
			]
		]
	);
	dead(
		[
			[70, 24],
			[71, 45],
			[71, 70],
			[72, 132]
		],
		[
			[24, 1],
			[45, 2],
			[70, 3],
			[132, 4]
		],
		'far3',
		[
			[
				[71, 34],
				[67, 30],
				[65, 32]
			],
			[
				[72, 40],
				[76, 34],
				[78, 32]
			],
			[
				[70, 60],
				[66, 64],
				[65, 72]
			],
			[
				[73, 60],
				[77, 56],
				[79, 58]
			]
		]
	);
	dead(
		[
			[85, 45],
			[84, 70],
			[84, 132]
		],
		[
			[45, 1],
			[70, 2],
			[132, 4]
		],
		'far4',
		[
			[
				[84, 50],
				[81, 47]
			],
			[
				[85, 60],
				[88, 56]
			],
			[
				[84, 78],
				[82, 82]
			]
		]
	);
	dead(
		[
			[246, 25],
			[245, 45],
			[243, 70],
			[244, 105]
		],
		[
			[25, 1],
			[45, 2],
			[105, 4]
		],
		'far4',
		[
			[
				[245, 40],
				[239, 36],
				[231, 34]
			],
			[
				[243, 50],
				[239, 56],
				[238, 62]
			],
			[
				[247, 50],
				[252, 44],
				[256, 44]
			],
			[
				[243, 72],
				[238, 78],
				[236, 84]
			]
		]
	);
	dead(
		[
			[281, 10],
			[282, 25],
			[284, 45],
			[287, 60],
			[288, 105]
		],
		[
			[10, 2],
			[25, 3],
			[45, 5],
			[60, 6],
			[105, 8]
		],
		'm3',
		[
			[
				[283, 38],
				[276, 32],
				[272, 30]
			],
			[
				[286, 45],
				[290, 38],
				[291, 32]
			],
			[
				[286, 54],
				[292, 48]
			],
			[
				[284, 66],
				[278, 62],
				[274, 58]
			],
			[
				[285, 74],
				[280, 78],
				[278, 84]
			]
		]
	);
	dead(
		[
			[304, 30],
			[304, 45],
			[306, 60],
			[307, 100]
		],
		[
			[30, 1],
			[45, 2],
			[60, 3],
			[100, 4]
		],
		'm3',
		[
			[
				[305, 48],
				[300, 45],
				[298, 47]
			],
			[
				[305, 58],
				[309, 50],
				[311, 44]
			],
			[
				[306, 66],
				[311, 64]
			]
		]
	);

	// ---- Sage hills: colour slides from sage at the edges to warm haze at the centre ----------
	const hill = (pts, cols, xa, xb, fog, amp, scale, seed) => {
		const x0 = Math.max(0, Math.floor(pts[0][0]));
		const x1 = Math.min(W - 1, Math.ceil(pts[pts.length - 1][0]));
		for (let x = x0; x <= x1; x++) {
			const yTop = Math.round(interp(pts, x) + amp * vnoise(x, scale, seed));
			const t = Math.max(0, Math.min(1, (x - xa) / (xb - xa)));
			for (let y = yTop; y < 150; y++) {
				// fog pools toward the valley floor; Bayer dither blends neighbouring tones
				const idx =
					t * (cols.length - 1) +
					fog * Math.min(1, (y - yTop) / 30) +
					0.55 * vnoise(x * 0.6 + y * 0.9, 7, seed + 3);
				cv.set(x, y, id[cols[Math.max(0, Math.min(cols.length - 1, Math.round(idx)))]]);
			}
		}
	};
	const WARM = ['m5', 'm3', 'm2', 'm1', 'w3', 'w2', 'w1'];
	hill(
		[
			[0, 88],
			[10, 90],
			[22, 92],
			[30, 94],
			[48, 97],
			[56, 100],
			[64, 104],
			[72, 108],
			[80, 112],
			[88, 116],
			[100, 120],
			[116, 124],
			[132, 129],
			[148, 133],
			[160, 136],
			[172, 136]
		],
		WARM,
		0,
		165,
		0.9,
		2,
		3.5,
		7
	);
	hill(
		[
			[160, 136],
			[176, 134],
			[190, 131],
			[204, 128],
			[214, 123],
			[222, 118],
			[228, 112],
			[236, 107],
			[246, 102],
			[258, 100],
			[268, 99],
			[280, 96],
			[292, 93],
			[304, 92],
			[320, 90]
		],
		WARM,
		320,
		175,
		0.9,
		2,
		3.5,
		8
	);
	hill(
		[
			[0, 108],
			[14, 108],
			[26, 114],
			[34, 118],
			[44, 122],
			[56, 126],
			[68, 132],
			[78, 138],
			[86, 143]
		],
		['m6', 'm5', 'm4', 'm3'],
		0,
		120,
		0.8,
		2,
		3,
		9
	);
	hill(
		[
			[262, 130],
			[276, 124],
			[284, 118],
			[292, 112],
			[300, 108],
			[310, 106],
			[320, 106]
		],
		['m6', 'm5', 'm4', 'm3'],
		320,
		240,
		0.8,
		2,
		3,
		10
	);
	hill(
		[
			[0, 126],
			[20, 124],
			[40, 130],
			[60, 136],
			[80, 140],
			[100, 141]
		],
		['m6', 'm5', 'm4'],
		0,
		110,
		0.6,
		1.6,
		3,
		11
	);
	hill(
		[
			[286, 134],
			[300, 128],
			[320, 126]
		],
		['m6', 'm5'],
		320,
		260,
		0.5,
		1.6,
		3,
		12
	);

	const twiggy = (x, y, col, n = 6) => {
		for (let i = 0; i < n; i++) {
			const a = -Math.PI / 2 + (R() - 0.5) * 2.0;
			const len = 5 + R() * 6;
			cv.line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, id[col]);
		}
	};
	twiggy(60, 134, 'm4', 7);
	twiggy(123, 140, 'm4', 7);
	twiggy(247, 130, 'm4', 6);
	twiggy(218, 140, 'm5', 5);

	// ---- Soil: tone shares per depth band measured on the reference ---------------------------
	// Patches come from anisotropic 2-D value noise ranked to a uniform field, so each band hits its
	// measured tone mix while the patches stretch sideways like the reference strata.
	const groundTop = (x) => {
		let y = GROUND;
		if (x < 30) y -= (30 - x) / 6; // rise toward the left
		y -= 2.4 * Math.exp(-(((x - 84) / 14) ** 2));
		y -= 3.2 * Math.exp(-(((x - 244) / 16) ** 2));
		y += 2 * Math.max(0, (x - 280) / 40);
		return Math.round(y + 0.8 * vnoise(x, 5, 21));
	};
	const soil = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7'];
	const SOIL_A = [15, 19, 20, 23, 22, 1, 0];
	const SOIL_B = [20, 15, 27, 18, 14, 3, 2];
	const SOIL_C = [1, 0, 7, 7, 56, 24, 5];
	const mixW = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
	const weightsAt = (y) =>
		y <= 151
			? SOIL_A
			: y <= 162
				? mixW(SOIL_A, SOIL_B, (y - 151) / 11)
				: y <= 174
					? mixW(SOIL_B, SOIL_C, (y - 162) / 12)
					: SOIL_C;
	const field = [];
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++)
			field.push({
				i: y * W + x,
				v: vnoise2(x / 16, y / 1.9, 51) * 0.78 + vnoise2(x / 7, y / 1.2, 52) * 0.22
			});
	const sorted = [...field].sort((a, b) => a.v - b.v);
	const uni = new Float32Array(W * H);
	sorted.forEach((f, rank) => (uni[f.i] = rank / (W * H)));
	for (let y = GROUND - 8; y < H; y++) {
		const w = weightsAt(y);
		for (let x = 0; x < W;) {
			const len = 4 + Math.floor(R() * R() * 20);
			const cx = Math.min(W - 1, x + (len >> 1));
			const ww = w.map((v, k) => (k >= 5 && (cx < 40 || cx > 280) ? v * 2.2 : v));
			const tot = ww.reduce((a, b) => a + b, 0);
			let u = uni[y * W + cx] * tot;
			let k = 0;
			while (k < ww.length - 1 && u > ww[k]) u -= ww[k++];
			for (let xx = x; xx < Math.min(W, x + len); xx++)
				if (y >= groundTop(xx)) cv.set(xx, y, id[soil[k]]);
			x += len;
		}
	}
	for (let x = 0; x < W; x++) {
		const t = groundTop(x);
		cv.set(x, t, id.d4);
		if (R() < 0.6) cv.set(x, t + 1, id.d3);
	}

	// ---- Helpers -----------------------------------------------------------------------------
	const grass = (x, base, h, lean, col) => {
		for (let i = 0; i < h; i++) cv.set(x + Math.round((lean * i) / h), base - i, id[col]);
	};
	/** Elongated mossy mound along a slope: lit top, mid body, dark underside. */
	const moss = (x0, y0, len, thick, slope, seed) => {
		for (let t = 0; t <= len; t++) {
			const x = x0 + t;
			const yb = y0 + slope * t;
			const th = Math.max(
				1,
				Math.round(thick * Math.sin((Math.PI * (t + 0.5)) / (len + 1)) + 0.8 * vnoise(t, 2.5, seed))
			);
			for (let k = 0; k < th; k++)
				cv.set(x, yb - k, id[k >= th - 1 ? 'lh' : k >= th - 2 && th > 2 ? 'lm' : 'll']);
			cv.set(x, yb + 1, id.d6);
		}
	};

	// ---- Moss + logs ---------------------------------------------------------------------
	moss(58, 150, 16, 3, -0.04, 2);
	moss(110, 151, 20, 4, 0.18, 3);
	cv.path(
		[
			[118, 156],
			[128, 157],
			[138, 156],
			[144, 155]
		],
		id.d6,
		2
	);
	moss(72, 172, 24, 5, 0.1, 4);
	moss(212, 150, 14, 3, -0.15, 5);
	moss(228, 155, 16, 4, 0.04, 6);
	moss(300, 146, 20, 2, 0, 7);
	moss(2, 146, 16, 2, 0.05, 8);

	// ---- Rocks -----------------------------------------------------------------------------
	const rock = (x, y, w) => {
		for (let i = 0; i < w; i++) {
			const h = i === 0 || i === w - 1 ? 1 : i < 2 || i > w - 3 ? 2 : 3;
			for (let k = 0; k < h; k++) cv.set(x + i, y - k + 2, k === h - 1 ? id.r1 : id.r2);
		}
	};
	rock(42, 160, 7);
	rock(177, 152, 6);
	rock(205, 168, 7);
	rock(274, 165, 10);
	rock(196, 143, 4);

	// ---- Trees ---------------------------------------------------------------------------------
	const lf = (x, y, deg, len, c, hi) => cv.leaf(x, y, rad(deg), len, id[c], id[hi]);
	const T = [id.t1, id.t2, id.t3];
	// hero tree
	cv.trunk(
		[
			[103, 33],
			[102, 45],
			[100, 55],
			[98, 65],
			[97, 75],
			[95, 85],
			[93, 95],
			[91, 105],
			[91, 115],
			[90, 125],
			[90, 135],
			[91, 143]
		],
		[
			[33, 1],
			[45, 2],
			[60, 3],
			[80, 5],
			[100, 6],
			[120, 6],
			[135, 7],
			[143, 10]
		],
		T,
		{ jit: 0.8, tex: R }
	);
	cv.poly(
		[
			[85, 143],
			[97, 143],
			[95, 138],
			[87, 138]
		],
		id.t3
	);
	for (const p of [
		[
			[100, 46],
			[96, 44]
		],
		[
			[101, 52],
			[105, 49]
		],
		[
			[97, 54],
			[94, 52]
		],
		[
			[98, 66],
			[104, 66],
			[107, 62]
		],
		[
			[95, 70],
			[92, 71],
			[88, 70]
		],
		[
			[96, 82],
			[101, 82]
		],
		[
			[95, 73],
			[93, 77]
		]
	])
		cv.path(p, id.t3);
	cv.group = 1;
	lf(100, 36, 110, 7, 'lm', 'lh');
	lf(94, 44, 125, 8, 'lm', 'lh');
	lf(104, 41, 20, 7, 'lm', 'lh');
	lf(96, 52, 170, 9, 'lm', 'lh');
	lf(107, 62, 70, 8, 'lm', 'lh');
	lf(106, 66, 5, 7, 'll', 'lm');
	lf(92, 71, 160, 9, 'lm', 'lh');
	lf(101, 82, 10, 7, 'lm', 'lh');
	cv.group = 0;
	// left sapling
	cv.trunk(
		[
			[49, 104],
			[49, 112],
			[48, 122],
			[48, 132],
			[48, 141]
		],
		[
			[104, 2],
			[115, 3],
			[130, 4],
			[141, 6]
		],
		T,
		{ jit: 0.8, tex: R }
	);
	cv.path(
		[
			[48, 118],
			[45, 115],
			[43, 112]
		],
		id.t3
	);
	cv.path(
		[
			[49, 113],
			[52, 111],
			[54, 110]
		],
		id.t3
	);
	cv.path(
		[
			[48, 122],
			[44, 121]
		],
		id.t3
	);
	cv.group = 1;
	lf(48, 106, 115, 8, 'lm', 'lh');
	lf(50, 105, 60, 8, 'lm', 'lh');
	lf(44, 112, 150, 8, 'lm', 'lh');
	lf(52, 112, 25, 8, 'lm', 'lh');
	lf(44, 121, 195, 8, 'll', 'lm');
	lf(47, 116, 205, 5, 'll', 'lm');
	cv.group = 0;
	// right saplings
	cv.trunk(
		[
			[224, 92],
			[226, 100],
			[228, 110],
			[230, 120],
			[232, 130],
			[233, 141]
		],
		[
			[92, 1],
			[105, 3],
			[125, 4],
			[141, 6]
		],
		T,
		{ jit: 0.8, tex: R }
	);
	cv.path(
		[
			[229, 112],
			[233, 112]
		],
		id.t3
	);
	cv.path(
		[
			[227, 108],
			[224, 110]
		],
		id.t3
	);
	cv.group = 1;
	lf(223, 93, 100, 8, 'lm', 'lh');
	lf(226, 96, 40, 8, 'lm', 'lh');
	lf(222, 100, 160, 8, 'lm', 'lh');
	lf(233, 111, 25, 8, 'lm', 'lh');
	lf(224, 110, 165, 5, 'll', 'lm');
	cv.group = 0;
	cv.trunk(
		[
			[255, 62],
			[256, 75],
			[257, 90],
			[258, 105],
			[260, 120],
			[262, 132],
			[263, 142]
		],
		[
			[62, 1],
			[75, 2],
			[95, 4],
			[125, 5],
			[142, 7]
		],
		T,
		{ jit: 0.8, tex: R }
	);
	cv.path(
		[
			[256, 84],
			[252, 82]
		],
		id.t3
	);
	cv.path(
		[
			[257, 76],
			[261, 72]
		],
		id.t3
	);
	cv.group = 1;
	lf(255, 64, 100, 8, 'lm', 'lh');
	lf(254, 68, 150, 8, 'lm', 'lh');
	lf(256, 66, 40, 8, 'lm', 'lh');
	lf(252, 74, 160, 5, 'll', 'lm');
	lf(260, 72, 20, 8, 'lm', 'lh');
	lf(252, 82, 190, 8, 'll', 'lm');
	lf(258, 90, 30, 5, 'lm', 'lh');
	cv.group = 0;
	cv.path(
		[
			[225, 141],
			[225, 132],
			[223, 129]
		],
		id.t2
	);
	cv.path(
		[
			[225, 134],
			[228, 131]
		],
		id.t2
	);

	// ---- Airy leafy shrubs: bare skeleton, side twigs ending in small leaf clusters -----------
	const shrub = (stems, cols, hiCols, dens = 0.8) => {
		const leafAt = (x, y, ang, len) => {
			cv.group = 1;
			cv.leaf(x, y, ang, len, id[pick(cols)], id[pick(hiCols)]);
			cv.group = 0;
		};
		for (const s of stems) {
			cv.path(s, id.t3, 1);
			cv.path(s.slice(0, 2), id.t3, 2);
			for (let i = 1; i < s.length; i++) {
				const [x0, y0] = s[i - 1];
				const [x1, y1] = s[i];
				const base = Math.atan2(-(y1 - y0), x1 - x0);
				const steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3));
				for (let k = i === 1 ? 2 : 1; k <= steps; k++) {
					const px = lerp(x0, x1, k / steps);
					const py = lerp(y0, y1, k / steps);
					for (const side of [-1, 1]) {
						if (R() < dens) {
							const ang = base + side * rad(40 + R() * 30);
							const len = 3 + R() * 4;
							const ex = px + Math.cos(ang) * len;
							const ey = py - Math.sin(ang) * len;
							cv.line(px, py, ex, ey, id.t3);
							leafAt(ex, ey, ang + side * rad(R() * 30), 5 + Math.floor(R() * 3));
							if (R() < 0.75)
								leafAt(ex, ey, ang - side * rad(35 + R() * 25), 4 + Math.floor(R() * 3));
						}
					}
				}
			}
			const [tx, ty] = s[s.length - 1];
			for (let k = 0; k < 4; k++) leafAt(tx, ty, rad(50 + k * 28 + R() * 20), 7);
		}
	};
	shrub(
		[
			[
				[12, 141],
				[12, 130],
				[13, 120],
				[15, 110],
				[17, 104]
			],
			[
				[17, 139],
				[21, 131],
				[26, 125],
				[30, 120],
				[33, 116]
			],
			[
				[12, 128],
				[8, 122],
				[4, 116],
				[2, 110]
			],
			[
				[14, 124],
				[10, 116],
				[9, 108]
			],
			[
				[20, 130],
				[24, 122],
				[26, 114]
			],
			[
				[15, 118],
				[21, 112],
				[25, 106]
			]
		],
		['ld2', 'ld', 'ld', 'll'],
		['ll', 'lm', 'ld'],
		0.5
	);
	shrub(
		[
			[
				[300, 142],
				[301, 130],
				[303, 118],
				[306, 108],
				[308, 98],
				[309, 95]
			],
			[
				[310, 141],
				[311, 128],
				[312, 116],
				[313, 104],
				[315, 95]
			],
			[
				[301, 126],
				[296, 122],
				[291, 118],
				[289, 114]
			],
			[
				[309, 130],
				[315, 126],
				[320, 122]
			],
			[
				[305, 112],
				[300, 106],
				[297, 100]
			],
			[
				[312, 110],
				[317, 106],
				[320, 100]
			]
		],
		['ld', 'll', 'll', 'ld2', 'lm'],
		['lm', 'lh', 'll'],
		0.72
	);

	// ---- Tiny charred saplings along the horizon ----------------------------------------------------
	for (const [x, h] of [
		[36, 9],
		[41, 6],
		[56, 8],
		[62, 10],
		[70, 6],
		[112, 7],
		[150, 5],
		[238, 6],
		[196, 5]
	]) {
		cv.path(
			[
				[x, 143],
				[x, 143 - h]
			],
			id.t3
		);
		cv.path(
			[
				[x, 143 - Math.round(h * 0.6)],
				[x + 3, 143 - Math.round(h * 0.6) - 3]
			],
			id.t3
		);
		cv.path(
			[
				[x, 143 - Math.round(h * 0.4)],
				[x - 3, 143 - Math.round(h * 0.4) - 2]
			],
			id.t3
		);
		cv.set(x + 3, 143 - Math.round(h * 0.6) - 4, id.lm);
		cv.set(x, 143 - h - 1, id.lh);
	}

	// ---- Grass blades -----------------------------------------------------------------------------
	cv.group = 2;
	const tuft = (x0, x1, base, hMin, hMax, cols, step) => {
		for (let x = x0; x <= x1; x += step + Math.floor(R() * 2))
			grass(
				x,
				base,
				hMin + Math.floor(R() * (hMax - hMin + 1)),
				Math.floor(R() * 3) - 1,
				pick(cols)
			);
	};
	tuft(78, 108, 142, 4, 12, ['ld', 'o2', 'll'], 2);
	tuft(238, 294, 143, 6, 17, ['lm', 'lh', 'o1', 'lh', 'lm'], 2);
	tuft(14, 76, 142, 3, 8, ['ld', 'll', 'ld'], 3);
	tuft(110, 236, 143, 2, 4, ['ll', 'ld'], 9);

	// ---- Seedlings: chunky two-tone leaves ---------------------------------------------------------
	const Y9 = [
		'hh.....hh',
		'hhh...hhh',
		'.hmh.hmh.',
		'..hmhmh..',
		'...hmh...',
		'....m....',
		'....m....',
		'....m....'
	];
	const Y7 = ['hh...hh', 'hmh.hmh', '.hmhmh.', '..hmh..', '...m...', '...m...'];
	const Y5 = ['hh.hh', 'hmhmh', '.hmh.', '..m..', '..m..'];
	const y2 = ['h.h', 'mhm', '.m.', '.m.'];
	const zig = ['.h.', 'hh.', '.mh', '.m.', 'hm.', '.m.', '.m.'];
	const mp = { h: id.lh, m: id.lm };
	for (const [x, y] of [
		[193, 154],
		[181, 162],
		[130, 160],
		[244, 158]
	])
		cv.sprite(x, y, Y9, mp);
	for (const [x, y] of [
		[166, 166],
		[270, 156],
		[213, 154]
	])
		cv.sprite(x, y, Y7, mp);
	for (const [x, y] of [
		[166, 168],
		[150, 167],
		[155, 170],
		[213, 156],
		[97, 160],
		[41, 148],
		[218, 160],
		[236, 158],
		[70, 160],
		[270, 158]
	])
		cv.sprite(x, y, Y5, mp);
	for (const [x, y] of [
		[76, 149],
		[86, 152],
		[105, 149],
		[208, 163],
		[163, 147],
		[53, 158],
		[292, 156],
		[120, 158],
		[230, 165]
	])
		cv.sprite(x, y, y2, mp);
	for (const [x, y] of [
		[28, 150],
		[240, 146],
		[190, 143],
		[140, 148],
		[224, 150],
		[66, 146]
	])
		cv.sprite(x, y, zig, mp);
	cv.group = 0;

	// ---- Dark foreground brambles: thin curved stems with a few side shoots -------------------------
	const stem = (pts, shoots = []) => {
		cv.path(pts, id.br);
		for (const [i, deg, len] of shoots) {
			const [x, y] = pts[i];
			const turn = deg > 90 ? 28 : -28;
			const mx = x + Math.cos(rad(deg)) * len * 0.6;
			const my = y - Math.sin(rad(deg)) * len * 0.6;
			const ex = x + Math.cos(rad(deg + turn)) * len;
			const ey = y - Math.sin(rad(deg + turn)) * len;
			cv.path(
				[
					[x, y],
					[mx, my],
					[ex, ey]
				],
				id.br
			);
		}
	};
	stem(
		[
			[18, 174],
			[18, 166],
			[20, 158],
			[21, 150],
			[20, 146]
		],
		[
			[1, 150, 8],
			[2, 30, 9],
			[3, 140, 7],
			[3, 35, 6]
		]
	);
	stem(
		[
			[14, 172],
			[11, 166],
			[7, 160],
			[5, 155]
		],
		[
			[1, 40, 6],
			[2, 130, 6]
		]
	);
	stem(
		[
			[22, 172],
			[26, 166],
			[30, 160],
			[31, 154]
		],
		[
			[1, 140, 6],
			[2, 40, 6]
		]
	);
	cv.path(
		[
			[40, 180],
			[48, 170],
			[56, 160],
			[60, 153],
			[61, 150]
		],
		id.br,
		2
	);
	cv.path(
		[
			[58, 163],
			[70, 160],
			[84, 162]
		],
		id.br,
		2
	);
	stem(
		[
			[268, 174],
			[267, 166],
			[264, 160],
			[263, 154],
			[264, 150]
		],
		[
			[1, 40, 8],
			[2, 140, 8],
			[3, 50, 6]
		]
	);
	stem(
		[
			[266, 170],
			[260, 164],
			[256, 158]
		],
		[[1, 60, 6]]
	);
	stem(
		[
			[270, 172],
			[276, 166],
			[280, 160]
		],
		[[1, 120, 6]]
	);
	stem(
		[
			[300, 174],
			[299, 166],
			[298, 158],
			[299, 150],
			[298, 145]
		],
		[
			[1, 40, 9],
			[2, 140, 9],
			[3, 35, 7],
			[3, 145, 7]
		]
	);
	stem(
		[
			[308, 174],
			[309, 166],
			[311, 158],
			[313, 152]
		],
		[
			[1, 40, 7],
			[2, 140, 7]
		]
	);
	stem(
		[
			[315, 174],
			[316, 166],
			[317, 158]
		],
		[[1, 140, 6]]
	);
	stem(
		[
			[304, 172],
			[300, 166],
			[294, 162]
		],
		[[1, 120, 6]]
	);

	return cv;
}
