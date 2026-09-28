import type { PlantModel, PixelRun } from './types';

/** Small mutable grid used to author frames with drawing primitives instead of hand-typed rows. */
export class PixelCanvas {
	private readonly grid: string[][];

	constructor(
		readonly width: number,
		readonly height: number
	) {
		this.grid = Array.from({ length: height }, () => Array<string>(width).fill('.'));
	}

	put(x: number, y: number, ink: string): void {
		if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
		this.grid[y][x] = ink;
	}

	get(x: number, y: number): string {
		return this.grid[y]?.[x] ?? '.';
	}

	hline(x0: number, x1: number, y: number, ink: string): void {
		for (let x = x0; x <= x1; x++) this.put(x, y, ink);
	}

	vline(x: number, y0: number, y1: number, ink: string): void {
		for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.put(x, y, ink);
	}

	toRows(): string[] {
		return this.grid.map((row) => row.join(''));
	}
}

/** Deterministic pseudo-random value so organic edges look hand-placed yet never change between renders. */
export function pixelHash(x: number, y: number): number {
	let h = (x * 374761393 + y * 668265263) | 0;
	h = (h ^ (h >>> 13)) * 1274126177;
	return ((h ^ (h >>> 16)) >>> 0) % 100;
}

export function selectFrameIndex(frameCount: number, growth: number): number {
	if (frameCount <= 1 || !Number.isFinite(growth) || growth <= 0) return 0;
	return Math.min(frameCount - 1, Math.floor(growth * (frameCount - 1) + 1e-6));
}

/** Collapses consecutive same-ink pixels in a row into one rect to keep the DOM small. */
export function toPixelRuns(rows: readonly string[], palette: PlantModel['palette']): PixelRun[] {
	const runs: PixelRun[] = [];
	rows.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			const key = row[x];
			let end = x + 1;
			while (end < row.length && row[end] === key) end++;
			const ink = palette[key];
			if (ink) runs.push({ x, y, width: end - x, fill: ink.fill, idle: ink.idle });
			x = end;
		}
	});
	return runs;
}
