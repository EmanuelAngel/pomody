// "Living pixels": a few edge pixels of the foliage and seedlings hop to a free neighbour cell and
// back, each on its own period. The scene itself never moves; only single pixels do.
import { W, H, rng, maskToPath } from './lib.mjs';

export const HOP_GROUPS = 10;
const SHARE = 0.1; // share of eligible edge cells that come alive

/** Returns { groups: [{ kind, n, paths }], count } where kind is 'static' | 'from' | 'to'. */
export function emitLive(cv, nColors) {
	const R = rng(4242);
	const moving = (i) => cv.g[i] !== 0;
	const hop = new Int16Array(W * H).fill(-1); // group index of a living cell
	const dest = new Int32Array(W * H).fill(-1); // neighbour cell it hops to
	const taken = new Uint8Array(W * H); // destinations already claimed

	for (let y = 1; y < H - 1; y++)
		for (let x = 1; x < W - 1; x++) {
			const i = y * W + x;
			if (!moving(i) || R() > SHARE) continue;
			// prefer hopping up or sideways: leaf tips lift, they do not sink
			const options = [
				[0, -1],
				[-1, 0],
				[1, 0]
			]
				.map(([dx, dy]) => (y + dy) * W + (x + dx))
				.filter((j) => !moving(j) && !taken[j] && hop[j] < 0);
			if (!options.length) continue;
			const j = options[Math.floor(R() * options.length)];
			taken[j] = 1;
			hop[i] = Math.floor(R() * HOP_GROUPS);
			dest[i] = j;
		}

	const groups = [];
	let count = 0;
	const build = (kind, n, pick) => {
		const paths = [];
		for (let id = 1; id <= nColors; id++) {
			const mask = new Uint8Array(W * H);
			let any = false;
			for (let i = 0; i < W * H; i++)
				if (pick(i) === id) {
					mask[i] = 1;
					any = true;
				}
			if (any) {
				const d = maskToPath(mask);
				count += (d.match(/M/g) || []).length;
				paths.push({ id, d });
			}
		}
		groups.push({ kind, n, paths });
	};

	// a living pixel rests on what sat under it, so it leaves no hole while it hops away
	build('static', 0, (i) => (hop[i] >= 0 ? cv.u[i] : cv.c[i]));
	for (let n = 0; n < HOP_GROUPS; n++) {
		build('from', n, (i) => (hop[i] === n ? cv.c[i] : 0));
		build('to', n, (i) => {
			// the destination cell takes the colour of the cell that hops into it
			for (const src of [i + W, i + 1, i - 1])
				if (hop[src] === n && dest[src] === i) return cv.c[src];
			return 0;
		});
	}
	return { groups, count };
}
