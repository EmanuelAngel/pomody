// Pixel-art authoring toolkit: a 320x180 canvas of palette ids + drawing primitives + SVG emitter.
export const W = 320;
export const H = 180;

export function rng(seed) {
	let s = seed >>> 0;
	return () => {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** 1-D value noise in [-1, 1], smooth, period ~ `scale` px. */
export function vnoise(x, scale, seed = 1) {
	const r = (i) => {
		let t = (Math.imul(i + seed * 374761393, 668265263) ^ 0x5bd1e995) >>> 0;
		t = Math.imul(t ^ (t >>> 13), 1274126177) >>> 0;
		return (((t ^ (t >>> 16)) >>> 0) / 4294967296) * 2 - 1;
	};
	const p = x / scale;
	const i = Math.floor(p);
	const f = p - i;
	const u = f * f * (3 - 2 * f);
	return r(i) * (1 - u) + r(i + 1) * u;
}

export const lerp = (a, b, t) => a + (b - a) * t;

/** 2-D value noise in [-1, 1]. */
export function vnoise2(x, y, seed = 1) {
	const h = (ix, iy) => {
		let t = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
		t = Math.imul(t ^ (t >>> 13), 1274126177);
		return (((t ^ (t >>> 16)) >>> 0) / 4294967296) * 2 - 1;
	};
	const ix = Math.floor(x),
		iy = Math.floor(y);
	const fx = x - ix,
		fy = y - iy;
	const u = fx * fx * (3 - 2 * fx),
		v = fy * fy * (3 - 2 * fy);
	return lerp(lerp(h(ix, iy), h(ix + 1, iy), u), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), u), v);
}

/** Piecewise-linear interpolation over [[x, y], ...] sorted by x. */
export function interp(pts, x) {
	if (x <= pts[0][0]) return pts[0][1];
	for (let i = 1; i < pts.length; i++) {
		if (x <= pts[i][0]) {
			const [x0, y0] = pts[i - 1];
			const [x1, y1] = pts[i];
			return lerp(y0, y1, (x - x0) / (x1 - x0 || 1));
		}
	}
	return pts[pts.length - 1][1];
}

/** x cut points between foliage clusters (5 groups) and seedling clusters (3 groups). */
export const FOLIAGE_CUTS = [65, 150, 240, 280];
export const SPROUT_CUTS = [110, 205];

export class Canvas {
	constructor() {
		this.c = new Uint8Array(W * H); // palette id (0 = empty)
		this.g = new Uint8Array(W * H); // animation group (0 = static)
		this.u = new Uint8Array(W * H); // colour that sat under a moving cell
		this.group = 0;
		// lean: every row is shifted by shear * (shearBase - y), so a whole element tilts as one
		// piece (no gaps) the way a wide lens bends the edges of a scene
		this.shear = 0;
		this.shearBase = H;
	}

	set(x, y, c) {
		x = Math.round(x + this.shear * (this.shearBase - y));
		y = Math.round(y);
		if (x < 0 || y < 0 || x >= W || y >= H) return;
		const i = y * W + x;
		const g =
			this.group === 1
				? 1 + FOLIAGE_CUTS.filter((cut) => x >= cut).length
				: this.group === 2
					? 6 + SPROUT_CUTS.filter((cut) => x >= cut).length
					: 0;
		if (g && this.g[i] === 0) this.u[i] = this.c[i];
		this.c[i] = c;
		this.g[i] = g;
	}

	get(x, y) {
		x = Math.round(x);
		y = Math.round(y);
		if (x < 0 || y < 0 || x >= W || y >= H) return 0;
		return this.c[y * W + x];
	}

	rect(x, y, w, h, c) {
		for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.set(x + xx, y + yy, c);
	}

	/** Even-odd scanline polygon fill. */
	poly(pts, c) {
		const ys = pts.map((p) => p[1]);
		const y0 = Math.max(0, Math.floor(Math.min(...ys)));
		const y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
		for (let y = y0; y <= y1; y++) {
			const yc = y + 0.5;
			const xs = [];
			for (let i = 0; i < pts.length; i++) {
				const [ax, ay] = pts[i];
				const [bx, by] = pts[(i + 1) % pts.length];
				if ((ay <= yc && by > yc) || (by <= yc && ay > yc))
					xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
			}
			xs.sort((a, b) => a - b);
			for (let k = 0; k + 1 < xs.length; k += 2)
				for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, c);
		}
	}

	/** Bresenham 1px line; `t` > 1 widens it with a square brush. */
	line(x0, y0, x1, y1, c, t = 1) {
		x0 = Math.round(x0);
		y0 = Math.round(y0);
		x1 = Math.round(x1);
		y1 = Math.round(y1);
		const dx = Math.abs(x1 - x0);
		const dy = -Math.abs(y1 - y0);
		const sx = x0 < x1 ? 1 : -1;
		const sy = y0 < y1 ? 1 : -1;
		let err = dx + dy;
		for (;;) {
			if (t === 1) this.set(x0, y0, c);
			else this.rect(x0, y0, t, t, c);
			if (x0 === x1 && y0 === y1) break;
			const e2 = 2 * err;
			if (e2 >= dy) {
				err += dy;
				x0 += sx;
			}
			if (e2 <= dx) {
				err += dx;
				y0 += sy;
			}
		}
	}

	/** Polyline of 1px (or t px) segments. */
	path(pts, c, t = 1) {
		for (let i = 1; i < pts.length; i++)
			this.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, t);
	}

	/**
	 * Fill a silhouette from a top-edge polyline down to `base`.
	 * `amp` adds a gentle 1-D value-noise wobble so edges read as hand-stepped.
	 */
	ridge(pts, base, c, amp = 0, scale = 7, seed = 1) {
		const x0 = Math.max(0, Math.floor(pts[0][0]));
		const x1 = Math.min(W - 1, Math.ceil(pts[pts.length - 1][0]));
		for (let x = x0; x <= x1; x++) {
			const y = Math.round(interp(pts, x) + amp * vnoise(x, scale, seed));
			for (let yy = y; yy < base; yy++) this.set(x, yy, c);
		}
	}

	/**
	 * Near-vertical tapered stroke along a centre path. `widths` is interpolated
	 * along y. `cols` = [light, mid, dark]: 1px light left edge, 1px dark right edge.
	 */
	trunk(centre, widths, cols, opts = {}) {
		const y0 = Math.round(centre[0][1]);
		const y1 = Math.round(centre[centre.length - 1][1]);
		const sorted = [...centre].sort((a, b) => a[1] - b[1]);
		const wp = [...widths].sort((a, b) => a[0] - b[0]);
		for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
			const cx =
				interp(
					sorted.map((p) => [p[1], p[0]]),
					y
				) + (opts.jit ? opts.jit * vnoise(y, 5, 9) : 0);
			const w = Math.max(1, Math.round(interp(wp, y)));
			const xl = Math.round(cx - w / 2);
			for (let k = 0; k < w; k++) {
				let col = cols[1];
				if (w >= 3 && k === 0) col = cols[0];
				else if (w >= 2 && k === w - 1) col = cols[2];
				if (opts.tex && w >= 3 && opts.tex() < 0.14)
					col = cols[Math.max(0, Math.min(2, cols.indexOf(col) + (opts.tex() < 0.5 ? -1 : 1)))];
				this.set(xl + k, y, col);
			}
		}
	}

	/** Pointed leaf, 3px wide in the middle, light edge on one side. */
	leaf(x, y, ang, len, c, hi = c) {
		const dx = Math.cos(ang);
		const dy = -Math.sin(ang);
		const px = -dy;
		const py = dx;
		for (let s = 0; s <= len; s++) {
			const bx = x + dx * s;
			const by = y + dy * s;
			this.set(bx, by, c);
			if (s >= 1 && s <= len - 1) {
				this.set(bx + px, by + py, c);
				this.set(bx - px, by - py, hi);
				if (len >= 8 && s >= 3 && s <= len - 3) this.set(bx + 2 * px, by + 2 * py, c);
			}
		}
	}

	/** Branch that thins from w0 to w1 along a polyline. */
	taper(pts, w0, w1, c) {
		const segs = [];
		for (let i = 1; i < pts.length; i++) segs.push([pts[i - 1], pts[i]]);
		const total = segs.reduce((s, [p, q]) => s + Math.hypot(q[0] - p[0], q[1] - p[1]), 0) || 1;
		let done = 0;
		for (const [p, q] of segs) {
			const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
			const n = Math.max(1, Math.ceil(len));
			for (let k = 0; k <= n; k++) {
				const t = (done + (len * k) / n) / total;
				const w = Math.max(1, Math.round(w0 + (w1 - w0) * t));
				const x = p[0] + ((q[0] - p[0]) * k) / n;
				const y = p[1] + ((q[1] - p[1]) * k) / n;
				this.rect(Math.round(x - (w - 1) / 2), Math.round(y), w, 1, c);
			}
			done += len;
		}
	}

	/** Place a tiny sprite from rows of chars; `map` maps char -> palette id. */
	sprite(x, y, rows, map) {
		rows.forEach((row, yy) =>
			[...row].forEach((ch, xx) => {
				if (ch !== '.' && map[ch]) this.set(x + xx, y + yy, map[ch]);
			})
		);
	}
}

// ---------------------------------------------------------------------------
// Emitter
// ---------------------------------------------------------------------------
/** Greedy rectangle merge of one colour mask -> compact path data. */
export function maskToPath(mask) {
	const open = new Map(); // key x:w -> {x, y, w, h}
	const rects = [];
	for (let y = 0; y <= H; y++) {
		const runs = [];
		if (y < H) {
			let x = 0;
			while (x < W) {
				if (!mask[y * W + x]) {
					x++;
					continue;
				}
				let e = x;
				while (e < W && mask[y * W + e]) e++;
				runs.push([x, e - x]);
				x = e;
			}
		}
		const next = new Map();
		for (const [x, w] of runs) {
			const k = `${x}:${w}`;
			if (open.has(k)) {
				const r = open.get(k);
				r.h++;
				next.set(k, r);
				open.delete(k);
			} else {
				const r = { x, y, w, h: 1 };
				rects.push(r);
				next.set(k, r);
			}
		}
		open.clear();
		for (const [k, r] of next) open.set(k, r);
	}
	return rects.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`).join('');
}

/** Returns { groups: [{ group, paths: [{ id, d }] }], count } with the "under" layer folded into group 0. */
export function emit(cv, nColors) {
	const groups = [];
	let rectCount = 0;
	const maxGroup = Math.max(...cv.g);
	for (let g = 0; g <= maxGroup; g++) {
		const paths = [];
		for (let id = 1; id <= nColors; id++) {
			const mask = new Uint8Array(W * H);
			let any = false;
			for (let i = 0; i < W * H; i++) {
				const col = g === 0 ? (cv.g[i] === 0 ? cv.c[i] : cv.u[i]) : cv.g[i] === g ? cv.c[i] : 0;
				if (col === id) {
					mask[i] = 1;
					any = true;
				}
			}
			if (any) {
				const d = maskToPath(mask);
				rectCount += (d.match(/M/g) || []).length;
				paths.push({ id, d });
			}
		}
		groups.push({ group: g, paths });
	}
	return { groups, count: rectCount };
}
