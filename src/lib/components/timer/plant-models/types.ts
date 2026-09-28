/**
 * Idle roles drive the living animation. Pixels without a role stay still.
 * - sway-a / sway-b: alternate visibility (grass tips leaning left/right).
 * - glint: briefly dims from highlight to base green, like light through leaves.
 */
export type IdleRole = 'sway-a' | 'sway-b' | 'glint';

export interface PixelInk {
	readonly fill: string;
	readonly idle?: IdleRole;
}

export interface PixelPoint {
	readonly x: number;
	readonly y: number;
}

/**
 * Contract every plant model fulfils. To add a model: draw its frames, then
 * register it in `plant-models/index.ts`. Nothing else needs to change.
 */
export interface PlantModel {
	readonly id: string;
	readonly label: string;
	readonly width: number;
	readonly height: number;
	/** Each character in a frame row maps to an ink; unmapped characters are transparent. */
	readonly palette: Readonly<Record<string, PixelInk>>;
	/** Ordered growth frames: the first is the start of a cycle, the last is full maturity. */
	readonly frames: readonly (readonly string[])[];
	/** Optional one-shot moment when a mature plant restarts: a pixel falls from `from` to `to`. */
	readonly harvest?: { readonly from: PixelPoint; readonly to: PixelPoint; readonly fill: string };
	/** Optional drifting particle (pollen, fireflies) shown while idle animation is on. */
	readonly particle?: { readonly origin: PixelPoint; readonly fill: string };
}

export interface PixelRun {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly fill: string;
	readonly idle?: IdleRole;
}
