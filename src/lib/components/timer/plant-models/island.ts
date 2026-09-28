import { pixelHash } from './pixel-canvas';

export interface IslandOptions {
	readonly width: number;
	readonly centerX: number;
	readonly groundY: number;
	/** Rows of soil below the ground line before the island tapers to its tip. */
	readonly depth: number;
}

export interface IslandShape {
	/** Half-width at a depth below the ground line, or -1 outside the island. */
	halfWidth(depth: number): number;
	inside(x: number, y: number): boolean;
	/** Lowest row of the island in a column, or -1 when the column misses it. */
	bottom(x: number): number;
}

/** Floating-island silhouette shared by every model: wide on top, tapering to a ragged tip. */
export function islandShape(o: IslandOptions): IslandShape {
	const halfWidth = (depth: number) => {
		if (depth < 0 || depth > o.depth) return -1;
		const t = depth / o.depth;
		const jitter = depth > 2 ? (pixelHash(depth, 7) % 3) - 1 : 0;
		return Math.max(0, (o.width / 2 - 1.5) * (1 - t ** 1.6) + jitter);
	};
	const inside = (x: number, y: number) => {
		const hw = halfWidth(y - o.groundY);
		return hw >= 0 && Math.abs(x - o.centerX) <= hw;
	};
	const bottom = (x: number) => {
		for (let y = o.groundY + o.depth; y >= o.groundY; y--) if (inside(x, y)) return y;
		return -1;
	};
	return { halfWidth, inside, bottom };
}
