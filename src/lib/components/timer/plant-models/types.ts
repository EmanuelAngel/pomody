/**
 * How lively the scene is right now:
 * - calm: timer idle, paused or focusing — gentle wind, occasional visitors.
 * - break: break running — stronger wind and fauna comes out.
 */
export type SceneActivity = 'calm' | 'break';

/**
 * Idle roles animate single pixels without redrawing frames.
 * - sway-a / sway-b: alternate visibility (grass tips leaning left/right with the wind).
 * - glint: briefly swaps to `alt`, like light moving through leaves.
 */
export interface IdleInk {
	readonly role: 'sway-a' | 'sway-b' | 'glint';
	readonly ink: string;
	readonly alt?: string;
}

export interface SceneState {
	/** Animation clock; advances a few times per second only while animated and visible. */
	readonly tick: number;
	readonly animated: boolean;
	readonly activity: SceneActivity;
	readonly frameIndex: number;
	/** The current base frame, so actors can react to it (e.g. perch on the canopy). */
	readonly frame: readonly string[];
	/** Ticks since a cycle restarted from full maturity, or null when no harvest is playing. */
	readonly harvestAge: number | null;
}

export interface ScenePainter {
	readonly width: number;
	readonly height: number;
	put(x: number, y: number, ink: string): void;
}

/** Anything drawn on top of the base frame each tick: fauna, particles, one-shot moments. */
export interface SceneActor {
	draw(painter: ScenePainter, state: SceneState): void;
}

/**
 * Contract every plant model fulfils. To add a model: draw its frames, pick its actors,
 * then register it in `plant-models/index.ts`. Nothing else needs to change.
 */
export interface PlantModel {
	readonly id: string;
	readonly label: string;
	readonly width: number;
	readonly height: number;
	/** Row of the grass line; the host aligns it with the timer controls and fades the soil below. */
	readonly groundY: number;
	/** Ink character → CSS color (theme tokens welcome). '.' is always transparent. */
	readonly palette: Readonly<Record<string, string>>;
	/** Ink characters that animate while idle, resolved to palette inks when composed. */
	readonly idle?: Readonly<Record<string, IdleInk>>;
	/** Ordered growth frames: the first starts a cycle, the last is full maturity. */
	readonly frames: readonly (readonly string[])[];
	readonly actors?: readonly SceneActor[];
}
