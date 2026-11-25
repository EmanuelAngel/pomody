import type { FadeParams, FlyParams } from 'svelte/transition';

/**
 * The JS half of the motion vocabulary declared in `src/app.css`.
 *
 * `svelte/transition` does not read `prefers-reduced-motion` — an `in:fly` runs
 * for everybody — so every transition in the app asks this module for its params
 * instead of hard-coding numbers. There is exactly one in-recipe and one
 * out-recipe, and both collapse to `duration: 0` when the user has asked for
 * still motion.
 *
 * Durations mirror the CSS tokens: an entry is `--duration-fast` (150ms) and an
 * exit is shorter (100ms). An exit that takes as long as an entry makes a
 * dismissed surface feel sticky, because the user has already moved on while the
 * element is still leaving; keeping it under the entry duration is what makes the
 * swap read as one gesture rather than a queue.
 */
const ENTER_MS = 150;
const EXIT_MS = 100;

/** How far a surface travels while it fades in. Small on purpose: this is a hint, not a slide. */
const ENTER_OFFSET_PX = 8;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Read live, at transition time, never at module load: the query must survive SSR
 * (`window` is undefined there) and must honour the user flipping the OS setting
 * without a reload.
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return false;
	}

	return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * The shape of `--ease-out-quart` (`cubic-bezier(0.25, 1, 0.5, 1)`): decelerates
 * hard at the start, so most of the distance is covered in the first frames.
 */
function easeOutQuart(t: number): number {
	const inverse = 1 - t;

	return 1 - inverse ** 4;
}

/**
 * The in-recipe: fade plus a small upward settle.
 *
 * Call it at the directive (`in:fly={motionIn()}`) instead of passing the function:
 * Svelte evaluates the argument when the transition is created, so the
 * `prefers-reduced-motion` check still happens per transition and not at import.
 */
export function motionIn(): FlyParams {
	if (prefersReducedMotion()) {
		return { duration: 0 };
	}

	return { y: ENTER_OFFSET_PX, duration: ENTER_MS, easing: easeOutQuart };
}

/** The out-recipe: a short fade, no travel. Exit is a dismissal, not a second reveal. */
export function motionOut(): FadeParams {
	if (prefersReducedMotion()) {
		return { duration: 0 };
	}

	return { duration: EXIT_MS };
}
