import { describe, expect, it } from 'vitest';
import {
	ART_HEIGHT,
	ART_WIDTH,
	MINUTES_PER_STEP,
	TOTAL_STEPS,
	calculatePhase,
	calculatePixelScale,
	calculateStep,
	resolvePhase
} from './illustration-progress';

describe('illustration progress constants', () => {
	it('defines 25-minute steps and 15 steps per day', () => {
		expect(MINUTES_PER_STEP).toBe(25);
		expect(TOTAL_STEPS).toBe(15);
	});
});

describe('calculateStep', () => {
	it('starts at step 0 with no accumulated minutes', () => {
		expect(calculateStep(0)).toBe(0);
	});

	it('keeps step 0 until the first 25 minutes are complete', () => {
		expect(calculateStep(1)).toBe(0);
		expect(calculateStep(24)).toBe(0);
	});

	it('advances one step per completed 25-minute block', () => {
		expect(calculateStep(25)).toBe(1);
		expect(calculateStep(50)).toBe(2);
		expect(calculateStep(90)).toBe(3);
	});

	it('caps at 15 steps (375 focus minutes)', () => {
		expect(calculateStep(375)).toBe(15);
		expect(calculateStep(1000)).toBe(15);
	});

	it('treats negative and non-finite input as 0', () => {
		expect(calculateStep(-25)).toBe(0);
		expect(calculateStep(Number.NaN)).toBe(0);
		expect(calculateStep(Number.POSITIVE_INFINITY)).toBe(0);
	});
});

describe('calculatePhase', () => {
	it('stays at phase 0 during the first phase window with 5 phases', () => {
		expect(calculatePhase(0, 5)).toBe(0);
		expect(calculatePhase(2, 5)).toBe(0);
	});

	it('advances every 3 steps with 5 phases', () => {
		expect(calculatePhase(3, 5)).toBe(1);
		expect(calculatePhase(6, 5)).toBe(2);
		expect(calculatePhase(9, 5)).toBe(3);
		expect(calculatePhase(12, 5)).toBe(4);
	});

	it('clamps to the last phase at step 15 with 5 phases', () => {
		expect(calculatePhase(14, 5)).toBe(4);
		expect(calculatePhase(15, 5)).toBe(4);
	});

	it('maps 3 phases every 5 steps and clamps at step 15', () => {
		expect(calculatePhase(0, 3)).toBe(0);
		expect(calculatePhase(4, 3)).toBe(0);
		expect(calculatePhase(5, 3)).toBe(1);
		expect(calculatePhase(9, 3)).toBe(1);
		expect(calculatePhase(10, 3)).toBe(2);
		expect(calculatePhase(14, 3)).toBe(2);
		expect(calculatePhase(15, 3)).toBe(2);
	});

	it('maps 15 phases one to one and clamps at step 15', () => {
		expect(calculatePhase(0, 15)).toBe(0);
		expect(calculatePhase(7, 15)).toBe(7);
		expect(calculatePhase(15, 15)).toBe(14);
	});

	it('always returns phase 0 for a single phase', () => {
		expect(calculatePhase(0, 1)).toBe(0);
		expect(calculatePhase(15, 1)).toBe(0);
	});

	it('ignores out-of-range steps and invalid phase counts', () => {
		expect(calculatePhase(-3, 5)).toBe(0);
		expect(calculatePhase(99, 5)).toBe(4);
		expect(calculatePhase(5, 0)).toBe(0);
		expect(calculatePhase(5, -2)).toBe(0);
		expect(calculatePhase(5, 4.5)).toBe(0);
	});
});

describe('resolvePhase', () => {
	it('composes step and phase from accumulated minutes', () => {
		expect(resolvePhase(0, 5)).toBe(0);
		expect(resolvePhase(75, 5)).toBe(1);
		expect(resolvePhase(300, 5)).toBe(4);
		expect(resolvePhase(375, 5)).toBe(4);
	});

	it('keeps the last phase reachable with 3 phases', () => {
		expect(resolvePhase(250, 3)).toBe(2);
		expect(resolvePhase(375, 3)).toBe(2);
	});
});

describe('calculatePixelScale', () => {
	it('uses the smallest integer multiple that covers the viewport', () => {
		expect(ART_WIDTH).toBe(320);
		expect(ART_HEIGHT).toBe(180);
		expect(calculatePixelScale(1280, 720)).toBe(4);
		expect(calculatePixelScale(1920, 1080)).toBe(6);
		expect(calculatePixelScale(1440, 900)).toBe(5);
		expect(calculatePixelScale(1000, 720)).toBe(4);
		expect(calculatePixelScale(800, 600)).toBe(4);
	});

	it('never returns less than 1', () => {
		expect(calculatePixelScale(100, 100)).toBe(1);
		expect(calculatePixelScale(0, 0)).toBe(1);
	});

	it('treats invalid or negative bounds as a single scale', () => {
		expect(calculatePixelScale(Number.NaN, 720)).toBe(1);
		expect(calculatePixelScale(-1280, 720)).toBe(1);
		expect(calculatePixelScale(1280, 720, 0, 180)).toBe(1);
	});
});
