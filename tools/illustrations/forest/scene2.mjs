// Forest phases 2-5 (P = 1..4), authored on the 320x180 art grid. Same toolkit as phase 1.
import { Canvas, W, H, rng, vnoise, vnoise2, lerp, interp } from './lib.mjs';
import { id } from './fpal.mjs';

const GROUND = 143;
const rad = (deg) => (deg * Math.PI) / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function build(P) {
	const cv = new Canvas();
	const R = rng(7000 + P * 131);
	const pick = (arr) => arr[Math.floor(R() * arr.length)];
	const cells = []; // canopy cells where fruit can hang

	// ---- Sky ---------------------------------------------------------------------------------
	const levels = ['s0', 's1', 's2', 's3', 's4', 's5'];
	const bounds = [24, 38, 54, 70, 85];
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

	// ---- Far haze: crowned silhouettes + trunk columns ---------------------------------------
	const blob = (cx, cy, rx, ry, c, seed) => {
		for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++)
			for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
				const d =
					((x - cx) / rx) ** 2 +
					((y - cy) / ry) ** 2 +
					0.6 * vnoise2(x * 0.4, y * 0.4, seed) +
					(R() < 0.07 ? 0.4 : 0);
				if (d < 1) cv.set(x, y, id[c]);
			}
	};
	const fog = (x, top, tw, crown, c) => {
		const ty = crown ? top + crown[1] : top;
		for (let y = Math.round(ty); y < 130; y++)
			cv.rect(Math.round(x - tw / 2 + 0.6 * vnoise(y, 9, x)), y, tw, 1, id[c]);
		if (crown) {
			blob(x, top + crown[1] * 0.7, crown[0], crown[1], c, x);
			cv.path(
				[
					[x, top + crown[1]],
					[x - crown[0] * 0.7, top + crown[1] * 0.4]
				],
				id[c],
				2
			);
			cv.path(
				[
					[x, top + crown[1]],
					[x + crown[0] * 0.7, top + crown[1] * 0.4]
				],
				id[c],
				2
			);
		}
	};
	const FOG = [
		[
			[72, 14, 3, [22, 17], 'far4'],
			[236, 22, 3, [16, 14], 'far4'],
			[30, 20, 3, null, 'far3'],
			[44, 24, 3, null, 'far3'],
			[280, 20, 4, null, 'far3'],
			[292, 40, 3, null, 'far3'],
			[130, 70, 2, null, 'far4'],
			[196, 74, 2, null, 'far4']
		],
		[
			[12, 30, 4, null, 'far3'],
			[38, 36, 4, [14, 10], 'far3'],
			[70, 24, 3, [18, 12], 'far4'],
			[118, 60, 3, [10, 8], 'far4'],
			[216, 56, 3, [11, 9], 'far4'],
			[262, 28, 3, [14, 11], 'far3'],
			[304, 36, 4, null, 'far3'],
			[186, 44, 2, null, 'far4']
		],
		[
			[44, 30, 3, [14, 11], 'far3'],
			[70, 44, 3, [16, 12], 'far4'],
			[104, 70, 2, null, 'far4'],
			[226, 36, 3, [14, 11], 'far4'],
			[262, 28, 3, null, 'far3'],
			[296, 20, 4, [14, 10], 'far3']
		],
		[
			[82, 60, 4, null, 'far4'],
			[60, 26, 3, [14, 10], 'far3'],
			[226, 32, 3, [14, 12], 'far4'],
			[262, 44, 3, null, 'far3'],
			[300, 24, 3, [14, 10], 'far3']
		]
	];
	for (const [x, top, tw, crown, c] of FOG[P - 1]) fog(x, top, tw, crown, c);
	const hz = (cx, cy, rx, ry, seed) => {
		blob(cx, cy, rx, ry, 's6', seed);
		cv.rect(
			Math.round(cx) - 1,
			Math.round(cy + ry * 0.6),
			2,
			124 - Math.round(cy + ry * 0.6),
			id.s6
		);
	};
	hz(178, 105, 8, 9, 41);
	hz(205, 102, 11, 9, 42);
	hz(135, 110, 6, 5, 43);
	hz(236, 100, 7, 7, 45);

	// ---- Hills ---------------------------------------------------------------------------------
	const hill = (pts, cols, xa, xb, fogAmt, amp, scale, seed) => {
		const x0 = Math.max(0, Math.floor(pts[0][0]));
		const x1 = Math.min(W - 1, Math.ceil(pts[pts.length - 1][0]));
		for (let x = x0; x <= x1; x++) {
			const yTop = Math.round(interp(pts, x) + amp * vnoise(x, scale, seed));
			const t = clamp((x - xa) / (xb - xa), 0, 1);
			for (let y = yTop; y < 150; y++) {
				const idx =
					t * (cols.length - 1) +
					fogAmt * Math.min(1, (y - yTop) / 30) +
					0.55 * vnoise(x * 0.6 + y * 0.9, 7, seed + 3);
				cv.set(x, y, id[cols[clamp(Math.round(idx), 0, cols.length - 1)]]);
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

	// ---- Ground: banded grass (phase 4 is darker soil under the flowers) -----------------------------
	const groundTop = (x) => {
		let y = GROUND;
		if (x < 30) y -= (30 - x) / 6;
		y -= 2.4 * Math.exp(-(((x - 84) / 14) ** 2));
		y -= 3.2 * Math.exp(-(((x - 244) / 16) ** 2));
		y += 2 * Math.max(0, (x - 280) / 40);
		return Math.round(y + 0.8 * vnoise(x, 5, 21));
	};
	const dark = P === 3;
	const tones = dark
		? ['gr3', 'gr4', 'd5', 'd5', 'd6', 'gr5', 'd7']
		: ['gr1', 'gr2', 'gr3', 'gr4', 'gr5', 'd6', 'd7'];
	const WA = dark ? [8, 14, 22, 24, 18, 10, 4] : [16, 28, 28, 18, 8, 2, 0];
	const WB = dark ? [3, 10, 18, 22, 22, 16, 9] : [6, 16, 26, 28, 16, 6, 2];
	const WC = dark ? [1, 4, 10, 16, 20, 28, 22] : [1, 5, 12, 24, 30, 18, 10];
	const mixW = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
	const weightsAt = (y) =>
		y <= 151
			? WA
			: y <= 162
				? mixW(WA, WB, (y - 151) / 11)
				: y <= 174
					? mixW(WB, WC, (y - 162) / 12)
					: WC;
	const field = [];
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++)
			field.push({
				i: y * W + x,
				v: vnoise2(x / 16, y / 1.9, 51 + P) * 0.78 + vnoise2(x / 7, y / 1.2, 52 + P) * 0.22
			});
	const sorted = [...field].sort((a, b) => a.v - b.v);
	const uni = new Float32Array(W * H);
	sorted.forEach((f, rank) => (uni[f.i] = rank / (W * H)));
	for (let y = GROUND - 8; y < H; y++) {
		const w = weightsAt(y);
		for (let x = 0; x < W;) {
			const len = 3 + Math.floor(R() * R() * 16);
			const cx = Math.min(W - 1, x + (len >> 1));
			const tot = w.reduce((a, b) => a + b, 0);
			let u = uni[y * W + cx] * tot;
			let k = 0;
			while (k < w.length - 1 && u > w[k]) u -= w[k++];
			for (let xx = x; xx < Math.min(W, x + len); xx++)
				if (y >= groundTop(xx)) cv.set(xx, y, id[tones[k]]);
			x += len;
		}
	}
	for (let x = 0; x < W; x++) {
		const t = groundTop(x);
		cv.set(x, t, id.gr2);
		if (R() < 0.6) cv.set(x, t + 1, id.gr3);
	}

	// ---- Helpers -------------------------------------------------------------------------------
	const lf = (x, y, deg, len, c, hi) => cv.leaf(x, y, rad(deg), len, id[c], id[hi]);
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
			cv.set(x, yb + 1, id.bk);
		}
	};
	const rock = (x, y, w) => {
		for (let i = 0; i < w; i++) {
			const h = i === 0 || i === w - 1 ? 1 : i < 2 || i > w - 3 ? 2 : 3;
			for (let k = 0; k < h; k++) cv.set(x + i, y - k + 2, k === h - 1 ? id.r1 : id.r2);
		}
	};
	const sprite = (x, y, rows, map) => cv.sprite(Math.round(x), Math.round(y), rows, map);

	/** Rounded leafy mass: bumpy lobes lit from the upper left, optionally open (gap) so sky shows. */
	const canopy = (cx, cy, rx, ry, o = {}) => {
		const S = rng(Math.round(cx * 31 + cy * 17 + rx * 7));
		const n = o.lobes ?? Math.max(5, Math.round((rx * ry) / 38));
		const lobes = [{ x: cx, y: cy, rx: rx * 0.72, ry: ry * 0.72 }];
		for (let k = 0; k < n; k++) {
			const a = S() * Math.PI * 2;
			const r = Math.sqrt(S());
			const lrx = rx * (0.26 + S() * 0.22);
			const lry = ry * (0.3 + S() * 0.25);
			lobes.push({
				x: cx + Math.cos(a) * r * (rx - lrx * 0.7),
				y: cy + Math.sin(a) * r * (ry - lry * 0.7),
				rx: lrx,
				ry: lry
			});
		}
		lobes.sort((a, b) => a.y - b.y);
		cv.group = 1;
		const paint = (L, base) => {
			for (let y = Math.floor(L.y - L.ry - 1); y <= Math.ceil(L.y + L.ry + 1); y++)
				for (let x = Math.floor(L.x - L.rx - 1); x <= Math.ceil(L.x + L.rx + 1); x++) {
					const nx = (x - L.x) / L.rx;
					const ny = (y - L.y) / L.ry;
					const ragged = 0.32 * vnoise2(x * 0.5, y * 0.5, 5) + (S() < 0.16 ? 0.28 : 0);
					if (nx * nx + ny * ny + ragged >= 1) continue;
					if (o.gap && vnoise2(x * 0.3, y * 0.3, 11) > 1 - o.gap * 2) continue;
					let c;
					if (base) c = 'ld2';
					else {
						const v =
							0.55 - 0.5 * ny - 0.26 * nx + 0.24 * vnoise2(x * 0.9, y * 0.9, 9) + (S() - 0.5) * 0.2;
						c =
							v > 0.92
								? 'o1'
								: v > 0.74
									? 'lt'
									: v > 0.58
										? 'lh'
										: v > 0.42
											? 'lm'
											: v > 0.26
												? 'll'
												: v > 0.12
													? 'ld'
													: 'ld2';
						if (o.fruit && v > 0.3) cells.push([x, y]);
					}
					cv.set(x, y, id[c]);
				}
		};
		paint({ x: cx, y: cy, rx: rx * 0.92, ry: ry * 0.92 }, true);
		for (const L of lobes) paint(L, false);
		cv.group = 0;
	};

	/** Thick tapering limb with a shadow underside and a lit top edge. */
	const limb = (pts, w0, w1) => {
		const path = [];
		for (let i = 1; i < pts.length; i++) {
			const [x0, y0] = pts[i - 1];
			const [x1, y1] = pts[i];
			const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
			for (let k = 0; k < n; k++) path.push([lerp(x0, x1, k / n), lerp(y0, y1, k / n)]);
		}
		path.push(pts[pts.length - 1]);
		const wAt = (i) => Math.max(1, Math.round(lerp(w0, w1, i / (path.length - 1))));
		path.forEach(([x, y], i) =>
			cv.rect(Math.round(x - wAt(i) / 2) + 1, Math.round(y - wAt(i) / 2) + 1, wAt(i), wAt(i), id.bk)
		);
		path.forEach(([x, y], i) =>
			cv.rect(Math.round(x - wAt(i) / 2), Math.round(y - wAt(i) / 2), wAt(i), wAt(i), id.t3)
		);
		path.forEach(([x, y], i) => {
			const w = wAt(i);
			if (w >= 2)
				cv.rect(
					Math.round(x - w / 2),
					Math.round(y - w / 2),
					Math.max(1, w - 1),
					Math.max(1, w - 1),
					id.t2
				);
			if (w >= 4) cv.rect(Math.round(x - w / 2), Math.round(y - w / 2), 1, w - 1, id.t1);
		});
	};

	/** Big trunk: lit left, mid, shaded right, vertical bark streaks. */
	const bark = (centre, widths, seed) => {
		const cols = [id.t1, id.t2, id.t3, id.bk];
		const s = [...centre].sort((a, b) => a[1] - b[1]);
		const wp = [...widths].sort((a, b) => a[0] - b[0]);
		const S = rng(seed);
		for (let y = Math.round(s[0][1]); y <= Math.round(s[s.length - 1][1]); y++) {
			const cx =
				interp(
					s.map((p) => [p[1], p[0]]),
					y
				) +
				0.7 * vnoise(y, 6, seed);
			const w = Math.max(1, Math.round(interp(wp, y)));
			const xl = Math.round(cx - w / 2);
			for (let k = 0; k < w; k++) {
				const u = (k + 0.5) / w;
				let tone = w >= 3 ? (u < 0.18 ? 0 : u < 0.55 ? 1 : u < 0.85 ? 2 : 3) : 1;
				if (w >= 6) {
					const n = vnoise2((xl + k) * 0.9, y * 0.07, seed);
					tone = clamp(tone + (n > 0.3 ? -1 : n < -0.35 ? 1 : 0) + (S() < 0.04 ? 1 : 0), 0, 3);
				}
				cv.set(xl + k, y, cols[tone]);
			}
		}
	};
	const slim = (centre, widths) =>
		cv.trunk(centre, widths, [id.t1, id.t2, id.t3], { jit: 0.8, tex: R });

	const vine = (x, y0, len, seed, col = 'vine') => {
		cv.group = 1;
		let xx = x;
		for (let i = 0; i < len; i++) {
			if (i % 5 === 0) xx = x + Math.round(2 * vnoise(i / 5, 1, seed));
			cv.set(xx, y0 + i, id[col]);
			if (i > 3 && R() < 0.13) cv.set(xx + (R() < 0.5 ? -1 : 1), y0 + i, id.lm);
		}
		cv.group = 0;
	};

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

	/** Dense bush with blossoms or berries scattered over it. */
	const bush = (cx, cy, rx, ry, dots, n) => {
		canopy(cx, cy, rx, ry, { lobes: Math.round((rx * ry) / 22) });
		for (let i = 0; i < n; i++) {
			const a = R() * Math.PI * 2;
			const r = Math.sqrt(R()) * 0.85;
			const x = Math.round(cx + Math.cos(a) * rx * r);
			const y = Math.round(cy + Math.sin(a) * ry * r);
			cv.set(x, y, id[pick(dots)]);
			if (R() < 0.35) cv.set(x + 1, y, id[pick(dots)]);
		}
	};

	const bloom = (x, y, h, col, big = false) => {
		cv.path(
			[
				[x, y],
				[x, y - h]
			],
			id.ll
		);
		if (h > 3 && R() < 0.6) cv.set(x + (R() < 0.5 ? -1 : 1), y - Math.floor(h / 2), id.lm);
		const c = id[col];
		cv.set(x, y - h - 1, id.fY);
		cv.set(x - 1, y - h - 1, c);
		cv.set(x + 1, y - h - 1, c);
		cv.set(x, y - h - 2, c);
		if (big) {
			cv.set(x, y - h, c);
			cv.set(x - 1, y - h - 2, c);
			cv.set(x + 1, y - h - 2, c);
		}
	};
	const petals = (x, y, col) => {
		cv.set(x, y, id.fY);
		for (const [dx, dy] of [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1]
		])
			cv.set(x + dx, y + dy, id[col]);
	};

	const MUSH = ['.rrr.', 'rwrwr', '..s..', '..s..'];
	const mapM = { r: id.fR, w: id.fW, s: id.ms };
	const APPLE = ['.hh.', 'rrrr', 'rrrr', '.rr.'];
	const ORANGE = ['.oo.', 'ooyo', 'oooo', '.oo.'];
	const BIRD = ['....bb...', '..bbbbb..', 'bbbbbbbo.', '.bbbbboo.', '..b.b....'];
	const BUTTER = ['vv.vv', '.vbv.', 'vv.vv'];
	const BEE = ['.ww.', 'ybyb', '.yy.'];
	const fruitMap = { h: id.fP, r: id.fR, o: id.fO, y: id.fY };
	const fruit = (n, kinds) => {
		const used = [];
		for (let tries = 0; used.length < n && tries < n * 30; tries++) {
			const [x, y] = pick(cells);
			if (used.some(([a, b]) => Math.abs(a - x) < 7 && Math.abs(b - y) < 6)) continue;
			// keep the centre of the sky clear for the timer
			if (x > 112 && x < 208 && y < 120) continue;
			used.push([x, y]);
			sprite(x, y, pick(kinds), fruitMap);
		}
	};

	const grassBlade = (x, base, h, lean, col) => {
		for (let i = 0; i < h; i++) cv.set(x + Math.round((lean * i) / h), base - i, id[col]);
	};
	const tuft = (x0, x1, base, hMin, hMax, cols, step) => {
		cv.group = 2;
		for (let x = x0; x <= x1; x += step + Math.floor(R() * 2))
			grassBlade(
				x,
				base + Math.floor(R() * 3),
				hMin + Math.floor(R() * (hMax - hMin + 1)),
				Math.floor(R() * 3) - 1,
				pick(cols)
			);
		cv.group = 0;
	};

	// ---- Logs, moss and rocks ----------------------------------------------------------------------
	cv.path(
		[
			[50, 148],
			[70, 147],
			[90, 148]
		],
		id.bk,
		2
	);
	cv.path(
		[
			[196, 148],
			[220, 147],
			[240, 148]
		],
		id.bk,
		2
	);
	moss(58, 150, 16, 3, -0.04, 2);
	moss(110, 151, 20, 4, 0.18, 3);
	cv.path(
		[
			[118, 156],
			[128, 157],
			[138, 156],
			[144, 155]
		],
		id.bk,
		2
	);
	moss(72, 172, 24, 5, 0.1, 4);
	moss(212, 150, 14, 3, -0.15, 5);
	moss(228, 155, 16, 4, 0.04, 6);
	if (P === 2) moss(250, 156, 50, 5, -0.06, 9);
	moss(2, 146, 16, 2, 0.05, 8);
	rock(42, 160, 7);
	rock(177, 152, 6);
	rock(205, 168, 7);
	rock(274, 165, 10);

	// ---- Phase scenes ------------------------------------------------------------------------------
	if (P === 1) {
		// left edge tree
		bark(
			[
				[14, 22],
				[11, 50],
				[8, 85],
				[5, 115],
				[4, 142]
			],
			[
				[22, 5],
				[60, 7],
				[100, 9],
				[142, 12]
			],
			11
		);
		limb(
			[
				[13, 40],
				[24, 30],
				[34, 21],
				[46, 16]
			],
			3,
			1
		);
		limb(
			[
				[11, 62],
				[6, 54],
				[2, 48]
			],
			2,
			1
		);
		canopy(30, 11, 38, 15);
		canopy(5, 43, 9, 8);
		// hero tree
		slim(
			[
				[100, 46],
				[98, 70],
				[96, 95],
				[92, 120],
				[90, 142]
			],
			[
				[46, 2],
				[70, 3],
				[100, 4],
				[140, 7]
			]
		);
		limb(
			[
				[98, 62],
				[104, 58],
				[112, 57]
			],
			2,
			1
		);
		limb(
			[
				[97, 66],
				[90, 64],
				[84, 63]
			],
			2,
			1
		);
		limb(
			[
				[99, 52],
				[93, 46],
				[88, 40]
			],
			2,
			1
		);
		canopy(101, 30, 22, 17);
		canopy(113, 58, 13, 8);
		canopy(83, 64, 11, 7);
		canopy(104, 81, 6, 4);
		// right trees
		slim(
			[
				[257, 70],
				[258, 100],
				[260, 125],
				[262, 142]
			],
			[
				[70, 2],
				[100, 3],
				[142, 5]
			]
		);
		limb(
			[
				[257, 76],
				[250, 71],
				[245, 68]
			],
			2,
			1
		);
		canopy(255, 42, 18, 22);
		canopy(247, 68, 10, 7);
		canopy(266, 60, 9, 7);
		slim(
			[
				[226, 92],
				[228, 110],
				[231, 130],
				[233, 141]
			],
			[
				[92, 2],
				[141, 4]
			]
		);
		canopy(227, 86, 9, 9);
		canopy(222, 102, 6, 5);
		canopy(233, 108, 6, 5);
		slim(
			[
				[300, 28],
				[302, 60],
				[305, 100],
				[309, 142]
			],
			[
				[28, 2],
				[60, 4],
				[142, 7]
			]
		);
		limb(
			[
				[301, 36],
				[292, 26],
				[284, 20]
			],
			2,
			1
		);
		canopy(297, 11, 28, 13);
		canopy(312, 36, 10, 8);
		// left sapling
		slim(
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
			]
		);
		cv.group = 1;
		lf(48, 106, 115, 8, 'lm', 'lh');
		lf(50, 105, 60, 8, 'lm', 'lh');
		lf(44, 112, 150, 8, 'lm', 'lh');
		lf(52, 112, 25, 8, 'lm', 'lh');
		cv.group = 0;
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
					[20, 130],
					[24, 122],
					[26, 114]
				]
			],
			['ld2', 'ld', 'll'],
			['ll', 'lm', 'ld'],
			0.6
		);
		shrub(
			[
				[
					[117, 142],
					[117, 135],
					[118, 128],
					[120, 122]
				],
				[
					[119, 140],
					[124, 134],
					[127, 129]
				]
			],
			['ll', 'lm', 'ld'],
			['lm', 'lh'],
			0.85
		);
		shrub(
			[
				[
					[143, 142],
					[143, 132],
					[145, 124],
					[147, 118]
				],
				[
					[145, 138],
					[150, 132],
					[153, 126]
				],
				[
					[142, 136],
					[138, 130],
					[136, 125]
				]
			],
			['ll', 'lm', 'ld'],
			['lm', 'lh'],
			0.85
		);
		shrub(
			[
				[
					[193, 142],
					[193, 134],
					[194, 128],
					[196, 122]
				],
				[
					[195, 140],
					[200, 134],
					[203, 129]
				]
			],
			['ll', 'lm', 'ld'],
			['lm', 'lh'],
			0.85
		);
		shrub(
			[
				[
					[300, 142],
					[301, 130],
					[303, 118],
					[306, 108],
					[308, 98]
				],
				[
					[310, 141],
					[311, 128],
					[312, 116],
					[313, 104]
				],
				[
					[301, 126],
					[296, 122],
					[291, 118]
				],
				[
					[309, 130],
					[315, 126],
					[320, 122]
				]
			],
			['ld', 'll', 'ld2', 'lm'],
			['lm', 'lh', 'll'],
			0.72
		);
		tuft(14, 300, 143, 3, 8, ['lh', 'lm', 'gr1', 'lt'], 5);
	}

	if (P === 2) {
		// giant left tree
		bark(
			[
				[62, 20],
				[55, 50],
				[50, 80],
				[48, 110],
				[48, 132],
				[50, 143]
			],
			[
				[20, 11],
				[50, 14],
				[80, 17],
				[110, 20],
				[132, 25],
				[143, 34]
			],
			21
		);
		limb(
			[
				[60, 24],
				[76, 17],
				[96, 12]
			],
			6,
			2
		);
		limb(
			[
				[56, 36],
				[72, 40],
				[90, 40],
				[102, 37]
			],
			5,
			2
		);
		limb(
			[
				[52, 30],
				[40, 20],
				[28, 13]
			],
			5,
			2
		);
		limb(
			[
				[48, 125],
				[38, 133],
				[30, 140]
			],
			4,
			1
		);
		canopy(28, 9, 44, 15);
		canopy(60, 14, 30, 12);
		canopy(104, 34, 22, 14);
		// giant right tree
		bark(
			[
				[252, 14],
				[256, 40],
				[262, 70],
				[270, 100],
				[276, 125],
				[280, 143]
			],
			[
				[14, 12],
				[40, 15],
				[70, 18],
				[100, 20],
				[125, 25],
				[143, 34]
			],
			22
		);
		limb(
			[
				[254, 30],
				[238, 40],
				[226, 48]
			],
			5,
			2
		);
		limb(
			[
				[258, 20],
				[276, 11],
				[300, 7]
			],
			5,
			2
		);
		limb(
			[
				[270, 62],
				[284, 44],
				[296, 34]
			],
			4,
			1
		);
		limb(
			[
				[274, 128],
				[286, 136],
				[296, 141]
			],
			4,
			1
		);
		canopy(284, 9, 42, 14);
		canopy(226, 50, 19, 13);
		canopy(310, 36, 14, 12);
		// thin trees
		slim(
			[
				[102, 50],
				[98, 75],
				[94, 105],
				[91, 140]
			],
			[
				[50, 2],
				[75, 3],
				[140, 5]
			]
		);
		cv.group = 1;
		for (const [x, y, a, l] of [
			[101, 52, 80, 7],
			[99, 60, 20, 8],
			[97, 70, 160, 8],
			[100, 56, 150, 6],
			[96, 82, 30, 7]
		])
			lf(x, y, a, l, 'lm', 'lh');
		cv.group = 0;
		slim(
			[
				[224, 92],
				[227, 112],
				[231, 140]
			],
			[
				[92, 2],
				[140, 4]
			]
		);
		cv.group = 1;
		for (const [x, y, a, l] of [
			[224, 93, 100, 8],
			[226, 98, 30, 7],
			[222, 104, 160, 7]
		])
			lf(x, y, a, l, 'lm', 'lh');
		cv.group = 0;
		// flowering bushes
		bush(15, 120, 15, 22, ['fW', 'fW', 'fY', 'lt'], 26);
		bush(122, 124, 30, 17, ['fW', 'fY', 'fV', 'fW'], 34);
		bush(205, 128, 21, 12, ['fV', 'fY', 'fV', 'fW'], 22);
		bush(306, 116, 16, 23, ['fP', 'fW', 'fP', 'fY'], 26);
		tuft(10, 310, 143, 4, 12, ['lh', 'lt', 'lm', 'gr1', 'o1'], 3);
		for (const [x, y, c] of [
			[70, 160, 'fV'],
			[150, 158, 'fW'],
			[180, 162, 'fV'],
			[230, 158, 'fW']
		])
			petals(x, y, c);
	}

	if (P === 3) {
		// giant left tree with hanging vines
		bark(
			[
				[22, 0],
				[30, 40],
				[38, 80],
				[42, 115],
				[40, 142]
			],
			[
				[0, 14],
				[40, 18],
				[80, 21],
				[115, 25],
				[142, 33]
			],
			31
		);
		limb(
			[
				[30, 38],
				[52, 22],
				[80, 10],
				[112, 3]
			],
			6,
			2
		);
		limb(
			[
				[34, 56],
				[50, 46],
				[68, 36]
			],
			4,
			1
		);
		canopy(20, 6, 28, 9, { gap: 0.08 });
		canopy(62, 4, 20, 7, { gap: 0.1 });
		canopy(118, 4, 14, 7, { gap: 0.1 });
		for (const [x, y, l] of [
			[34, 22, 42],
			[42, 18, 30],
			[58, 12, 46],
			[66, 10, 34],
			[76, 8, 28],
			[88, 6, 20]
		])
			vine(x, y, l, x);
		// giant right tree
		bark(
			[
				[300, 0],
				[298, 40],
				[296, 80],
				[292, 115],
				[290, 142]
			],
			[
				[0, 16],
				[40, 20],
				[80, 23],
				[115, 26],
				[142, 32]
			],
			32
		);
		limb(
			[
				[290, 30],
				[262, 16],
				[236, 8],
				[214, 4]
			],
			6,
			2
		);
		limb(
			[
				[294, 60],
				[316, 46]
			],
			4,
			1
		);
		canopy(290, 6, 36, 11, { gap: 0.08 });
		canopy(210, 4, 30, 8, { gap: 0.1 });
		canopy(176, 10, 12, 6, { gap: 0.1 });
		for (const [x, y, l] of [
			[222, 6, 40],
			[232, 8, 30],
			[252, 14, 24],
			[268, 18, 36],
			[244, 11, 16]
		])
			vine(x, y, l, x);
		for (const [x, y] of [
			[36, 88],
			[32, 104],
			[14, 116],
			[40, 120],
			[20, 98]
		])
			petals(x, y, 'fR');
		for (const [x, y] of [
			[289, 92],
			[296, 104],
			[283, 124],
			[298, 118],
			[300, 86]
		])
			petals(x, y, 'fO');
		// mid trees
		slim(
			[
				[102, 40],
				[98, 70],
				[94, 105],
				[92, 140]
			],
			[
				[40, 2],
				[70, 3],
				[140, 5]
			]
		);
		canopy(102, 28, 17, 14, { gap: 0.12 });
		canopy(88, 58, 10, 8, { gap: 0.12 });
		canopy(106, 55, 11, 8, { gap: 0.12 });
		canopy(101, 80, 8, 6, { gap: 0.12 });
		for (let y = 96; y < 128; y += 3) cv.set(93 + Math.round(vnoise(y, 3, 4)), y, id.fR);
		slim(
			[
				[262, 66],
				[262, 100],
				[262, 142]
			],
			[
				[66, 2],
				[142, 4]
			]
		);
		canopy(262, 50, 13, 17, { gap: 0.1 });
		canopy(255, 74, 9, 7, { gap: 0.1 });
		slim(
			[
				[226, 98],
				[228, 120],
				[231, 142]
			],
			[
				[98, 2],
				[142, 4]
			]
		);
		canopy(228, 94, 10, 12, { gap: 0.12 });
		// ferns
		for (const [fx, fy] of [
			[58, 128],
			[68, 132],
			[50, 134]
		]) {
			cv.group = 1;
			for (let k = 0; k < 7; k++) {
				lf(fx, fy, 30 + k * 20, 14 - Math.abs(3 - k) * 1.5, k % 2 ? 'lm' : 'll', 'lh');
			}
			cv.group = 0;
		}
		shrub(
			[
				[
					[302, 142],
					[302, 132],
					[304, 122],
					[307, 114]
				],
				[
					[312, 140],
					[312, 128],
					[314, 118]
				]
			],
			['ld', 'll', 'lm'],
			['lm', 'lh'],
			0.8
		);
		tuft(14, 306, 143, 3, 9, ['lh', 'lm', 'll', 'gr1'], 5);
		// ground flowers
		const cols = ['fR', 'fR', 'fP', 'fY', 'fV', 'fO', 'fR', 'fP'];
		for (let i = 0; i < 90; i++) {
			const y = 144 + Math.floor(R() * 32);
			const x = 8 + Math.floor(R() * 304);
			const depth = (y - 144) / 32;
			bloom(x, y, 2 + Math.round(depth * 4), pick(cols), depth > 0.5);
		}
		// bees and fireflies
		sprite(186, 73, BEE, { w: id.fW, y: id.fY, b: id.bk });
		sprite(130, 94, BEE, { w: id.fW, y: id.fY, b: id.bk });
		for (const [x, y] of [
			[176, 48],
			[92, 118],
			[150, 58],
			[218, 90]
		])
			cv.set(x, y, id.fY);
	}

	if (P === 4) {
		// giant left tree, heavy canopy
		bark(
			[
				[28, 10],
				[18, 40],
				[10, 75],
				[6, 110],
				[5, 142]
			],
			[
				[10, 12],
				[40, 16],
				[75, 19],
				[110, 21],
				[142, 26]
			],
			41
		);
		limb(
			[
				[22, 30],
				[44, 20],
				[70, 14],
				[92, 12]
			],
			6,
			2
		);
		limb(
			[
				[14, 60],
				[30, 52],
				[52, 46]
			],
			4,
			1
		);
		canopy(28, 10, 46, 17, { fruit: true });
		canopy(88, 30, 24, 16, { fruit: true });
		// mid-left tree with fruit
		bark(
			[
				[102, 60],
				[98, 90],
				[94, 115],
				[91, 142]
			],
			[
				[60, 5],
				[90, 6],
				[115, 7],
				[142, 9]
			],
			42
		);
		limb(
			[
				[100, 66],
				[112, 60],
				[122, 56]
			],
			3,
			1
		);
		canopy(103, 50, 26, 22, { fruit: true });
		canopy(80, 70, 10, 8, { fruit: true });
		// right giant
		bark(
			[
				[294, 10],
				[296, 45],
				[296, 80],
				[294, 115],
				[292, 142]
			],
			[
				[10, 14],
				[45, 18],
				[80, 21],
				[115, 24],
				[142, 28]
			],
			43
		);
		limb(
			[
				[290, 28],
				[262, 18],
				[238, 10]
			],
			6,
			2
		);
		limb(
			[
				[292, 60],
				[276, 50],
				[262, 46]
			],
			4,
			1
		);
		canopy(284, 10, 52, 17, { fruit: true });
		canopy(228, 26, 26, 14, { fruit: true });
		canopy(223, 50, 14, 16, { fruit: true });
		slim(
			[
				[262, 78],
				[262, 110],
				[262, 142]
			],
			[
				[78, 2],
				[142, 5]
			]
		);
		canopy(262, 72, 13, 15, { fruit: true });
		canopy(250, 98, 9, 8, { fruit: true });
		slim(
			[
				[226, 80],
				[228, 110],
				[231, 142]
			],
			[
				[80, 2],
				[142, 4]
			]
		);
		canopy(136, 2, 15, 5, { gap: 0.1 });
		canopy(192, 2, 15, 5, { gap: 0.1 });
		for (const [x, y, l] of [
			[130, 4, 34],
			[136, 5, 24],
			[143, 5, 38],
			[188, 4, 30],
			[195, 5, 24],
			[201, 5, 18]
		])
			vine(x, y, l, x);
		fruit(34, [APPLE, ORANGE, ORANGE, APPLE]);
		// berry bushes
		bush(40, 128, 17, 14, ['fR', 'fB', 'fR', 'fB', 'fW'], 22);
		bush(298, 126, 19, 15, ['fR', 'fB', 'fB', 'fR'], 24);
		tuft(10, 310, 143, 4, 11, ['lh', 'lt', 'lm', 'gr1', 'o1'], 3);
		// mushrooms and ground fruit
		for (const [x, y] of [
			[100, 132],
			[37, 147],
			[217, 139],
			[245, 138],
			[128, 140]
		])
			sprite(x, y, MUSH, mapM);
		for (const [x, y] of [
			[69, 152],
			[132, 154],
			[255, 151],
			[280, 152]
		])
			sprite(x, y, APPLE, fruitMap);
		for (const [x, y] of [
			[104, 153],
			[200, 158]
		])
			sprite(x, y, ORANGE, fruitMap);
		const cols = ['fB', 'fB', 'fR', 'fV', 'fP', 'fY'];
		for (let i = 0; i < 40; i++)
			bloom(
				8 + Math.floor(R() * 304),
				150 + Math.floor(R() * 26),
				2 + Math.floor(R() * 4),
				pick(cols),
				false
			);
		// wildlife
		sprite(52, 48, BIRD, { b: id.fB, o: id.fO });
		sprite(206, 58, BIRD, { b: id.fB, o: id.fO });
		for (const [x, y] of [
			[77, 116],
			[274, 102],
			[268, 63]
		])
			sprite(x, y, BUTTER, { v: pick([id.fV, id.fP]), b: id.bk });
		for (const [x, y] of [
			[117, 118],
			[246, 104],
			[217, 126]
		])
			sprite(x, y, BEE, { w: id.fW, y: id.fY, b: id.bk });
	}

	// ---- Dark foreground brambles ------------------------------------------------------------------
	const stem = (pts, shoots = []) => {
		cv.path(pts, id.br);
		for (const [i, deg, len] of shoots) {
			const [x, y] = pts[i];
			const turn = deg > 90 ? 28 : -28;
			cv.path(
				[
					[x, y],
					[x + Math.cos(rad(deg)) * len * 0.6, y - Math.sin(rad(deg)) * len * 0.6],
					[x + Math.cos(rad(deg + turn)) * len, y - Math.sin(rad(deg + turn)) * len]
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
			[3, 140, 7]
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
			[300, 174],
			[299, 166],
			[298, 158],
			[299, 150],
			[298, 145]
		],
		[
			[1, 40, 9],
			[2, 140, 9],
			[3, 35, 7]
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

	return cv;
}
