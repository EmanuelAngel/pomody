import { describe, it, expect } from 'vitest';
import { DEFAULT_TIMER_CONFIG } from './timer-fsm';

describe('Timer Domain Config', () => {
	it('should have standard pomodoro focus duration of 25 minutes', () => {
		expect(DEFAULT_TIMER_CONFIG.focusDurationSeconds).toBe(1500);
	});

	it('should have short break of 5 minutes', () => {
		expect(DEFAULT_TIMER_CONFIG.shortBreakDurationSeconds).toBe(300);
	});

	it('should have long break of 15 minutes', () => {
		expect(DEFAULT_TIMER_CONFIG.longBreakDurationSeconds).toBe(900);
	});
});
