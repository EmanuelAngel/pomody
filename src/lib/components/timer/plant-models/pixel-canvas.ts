import type { PlantModel, SceneActivity, SceneState } from './types';

/** Small mutable grid used to author frames with drawing primitives instead of hand-typed rows. */
export class PixelCanvas {
	private readonly grid: string[][];

	constructor(
		readonly width: number,
		readonly height: number,
		rows?: readonly string[]
	) {
		this.grid = rows
			? rows.map((row) => row.split(''))
			: Array.from({ length: height }, () => Array<string>(width).fill('.'));
	}

	put(x: number, y: number, ink: string): void {
		const cx = Math.round(x);
		const cy = Math.round(y);
		if (cx < 0 || cy < 0 || cx >= this.width || cy >= this.height) return;
		this.grid[cy][cx] = ink;
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

	/** Bresenham line, used for branches. */
	line(x0: number, y0: number, x1: number, y1: number, ink: string): void {
		let x = Math.round(x0);
		let y = Math.round(y0);
		const tx = Math.round(x1);
		const ty = Math.round(y1);
		const dx = Math.abs(tx - x);
		const dy = -Math.abs(ty - y);
		const sx = x < tx ? 1 : -1;
		const sy = y < ty ? 1 : -1;
		let err = dx + dy;
		for (;;) {
			this.put(x, y, ink);
			if (x === tx && y === ty) return;
			const e2 = 2 * err;
			if (e2 >= dy) {
				err += dy;
				x += sx;
			}
			if (e2 <= dx) {
				err += dx;
				y += sy;
			}
		}
	}

	toRows(): string[] {
		return this.grid.map((row) => row.join(''));
	}
}

/** Deterministic 0..99 noise so organic edges look hand-placed yet never change between renders. */
export function pixelHash(x: number, y: number): number {
	let h = (Math.round(x) * 374761393 + Math.round(y) * 668265263) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) % 100;
}

export function selectFrameIndex(frameCount: number, growth: number): number {
	if (frameCount <= 1 || !Number.isFinite(growth) || growth <= 0) return 0;
	return Math.min(frameCount - 1, Math.floor(growth * (frameCount - 1) + 1e-6));
}

const WIND_PERIOD: Record<SceneActivity, number> = { break: 2, calm: 4 };

/**
 * Composes the final pixel grid for one moment: base frame, idle pixels resolved for the
 * current tick, then actors on top. Pure, so it is testable without a canvas.
 */
export function composeScene(
	model: PlantModel,
	state: Omit<SceneState, 'frame'>
): { rows: string[]; frame: readonly string[] } {
	const frame = model.frames[state.frameIndex] ?? model.frames[0];
	const canvas = new PixelCanvas(model.width, model.height, frame);
	const idle = model.idle ?? {};
	const phase = Math.floor(state.tick / WIND_PERIOD[state.activity]) % 2;

	for (let y = 0; y < model.height; y++) {
		for (let x = 0; x < model.width; x++) {
			const spec = idle[canvas.get(x, y)];
			if (!spec) continue;
			if (spec.role === 'sway-a') {
				canvas.put(x, y, !state.animated || phase === 0 ? spec.ink : '.');
			} else if (spec.role === 'sway-b') {
				canvas.put(x, y, state.animated && phase === 1 ? spec.ink : '.');
			} else {
				const glinting = state.animated && (state.tick + pixelHash(x, y)) % 20 < 2;
				canvas.put(x, y, glinting && spec.alt ? spec.alt : spec.ink);
			}
		}
	}

	if (state.animated) {
		const full: SceneState = { ...state, frame };
		for (const actor of model.actors ?? []) actor.draw(canvas, full);
	}

	return { rows: canvas.toRows(), frame };
}
