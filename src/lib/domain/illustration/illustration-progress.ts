/**
 * Pure progression rules for the living companion illustrations.
 *
 * One step equals 25 focus minutes; a full day caps at 15 steps (375 minutes).
 * Phases are 0-indexed and always clamp to the last declared phase.
 */

export const MINUTES_PER_STEP = 25;
export const TOTAL_STEPS = 15;

/** Native pixel-art canvas. Integer multiples keep the grid crisp. */
export const ART_WIDTH = 320;
export const ART_HEIGHT = 180;

/**
 * Smallest integer scale that covers the available space (like `object-fit: cover`).
 * Integer multiples keep the pixel grid crisp; the overflow is cropped by the layer.
 * Never returns less than 1 so the scene is always rendered.
 */
export function calculatePixelScale(
	width: number,
	height: number,
	artWidth: number = ART_WIDTH,
	artHeight: number = ART_HEIGHT
): number {
	if (
		!Number.isFinite(width) ||
		!Number.isFinite(height) ||
		width <= 0 ||
		height <= 0 ||
		artWidth <= 0 ||
		artHeight <= 0
	) {
		return 1;
	}

	return Math.max(1, Math.ceil(Math.max(width / artWidth, height / artHeight)));
}

/**
 * Converts accumulated focus minutes into a step in the 0..15 range.
 * Invalid, negative or non-finite input is treated as 0.
 */
export function calculateStep(accumulatedMinutes: number): number {
	if (!Number.isFinite(accumulatedMinutes) || accumulatedMinutes <= 0) {
		return 0;
	}

	return Math.min(TOTAL_STEPS, Math.floor(accumulatedMinutes / MINUTES_PER_STEP));
}

/**
 * Maps a step to a 0-indexed phase for an illustration with `phaseCount` phases.
 * The final clamp is required: step 15 would otherwise produce `phaseCount`.
 */
export function calculatePhase(step: number, phaseCount: number): number {
	if (!Number.isInteger(phaseCount) || phaseCount < 1 || !Number.isFinite(step)) {
		return 0;
	}

	const clampedStep = Math.min(TOTAL_STEPS, Math.max(0, Math.floor(step)));
	const phase = Math.floor((clampedStep * phaseCount) / TOTAL_STEPS);

	return Math.min(phaseCount - 1, phase);
}

/**
 * Convenience composition used by the reactive state.
 */
export function resolvePhase(accumulatedMinutes: number, phaseCount: number): number {
	return calculatePhase(calculateStep(accumulatedMinutes), phaseCount);
}
