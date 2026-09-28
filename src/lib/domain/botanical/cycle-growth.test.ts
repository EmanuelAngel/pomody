import { describe, it, expect } from 'vitest';
import { getCycleGrowth, isHarvest } from './cycle-growth';

const at = (
	mode: 'focus' | 'shortBreak' | 'longBreak',
	currentRound: number,
	progress: number,
	roundsBeforeLongBreak = 4
) => getCycleGrowth({ mode, currentRound, progress, roundsBeforeLongBreak });

describe('getCycleGrowth', () => {
	it('starts a fresh cycle at 0 and grows during the first focus block', () => {
		expect(at('focus', 1, 0)).toBe(0);
		expect(at('focus', 1, 0.5)).toBe(0.125);
		expect(at('focus', 1, 1)).toBe(0.25);
	});

	it('holds growth during short breaks', () => {
		expect(at('shortBreak', 1, 0)).toBe(0.25);
		expect(at('shortBreak', 1, 0.9)).toBe(0.25);
		expect(at('focus', 2, 0)).toBe(0.25);
	});

	it('reaches full maturity exactly at the long break', () => {
		expect(at('focus', 4, 1)).toBe(1);
		expect(at('longBreak', 4, 0)).toBe(1);
	});

	it('stretches the same story across longer cycles', () => {
		expect(at('shortBreak', 2, 0, 8)).toBe(0.25);
		expect(at('longBreak', 8, 0, 8)).toBe(1);
		expect(at('shortBreak', 3, 0, 12)).toBe(0.25);
		expect(at('longBreak', 12, 0, 12)).toBe(1);
	});

	it('keeps a 4-round scale for shorter cycles, so they never fully mature', () => {
		expect(at('longBreak', 2, 0, 2)).toBe(0.5);
	});

	it('clamps corrupt inputs into 0..1', () => {
		expect(at('focus', 1, Number.NaN)).toBe(0);
		expect(at('focus', 0, -1)).toBe(0);
		expect(at('focus', 99, 1)).toBe(1);
	});
});

describe('isHarvest', () => {
	it('only fires when a mature plant restarts from zero', () => {
		expect(isHarvest(1, 0)).toBe(true);
		expect(isHarvest(0.75, 0)).toBe(false);
		expect(isHarvest(1, 1)).toBe(false);
		expect(isHarvest(1, 0.1)).toBe(false);
	});
});
