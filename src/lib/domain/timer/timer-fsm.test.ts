import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_TIMER_CONFIG, InvalidTimerConfigError, TimerFSM } from './timer-fsm';

describe('Phase 1: Types, Errors, and Config Validation', () => {
	describe('DEFAULT_TIMER_CONFIG', () => {
		it('should define default standard Pomodoro intervals and rounds', () => {
			expect(DEFAULT_TIMER_CONFIG).toEqual({
				focusDurationSeconds: 1500,
				shortBreakDurationSeconds: 300,
				longBreakDurationSeconds: 900,
				roundsBeforeLongBreak: 4
			});
		});
	});

	describe('TimerFSM Initialization & Default Config', () => {
		it('should initialize with default configuration and idle state (Scenario 1)', () => {
			const fsm = new TimerFSM();

			expect(fsm.state).toBe('idle');
			expect(fsm.mode).toBe('focus');
			expect(fsm.durationMs).toBe(1500 * 1000);
			expect(fsm.remainingMs).toBe(1500 * 1000);
			expect(fsm.currentRound).toBe(1);
			expect(fsm.totalRoundsCompleted).toBe(0);
			expect(fsm.progress).toBe(0.0);

			expect(fsm.snapshot).toEqual({
				state: 'idle',
				mode: 'focus',
				durationMs: 1500000,
				remainingMs: 1500000,
				currentRound: 1,
				totalRoundsCompleted: 0,
				progress: 0.0
			});
		});

		it('should accept valid custom configuration (Scenario 2)', () => {
			const fsm = new TimerFSM({
				focusDurationSeconds: 1200,
				shortBreakDurationSeconds: 180,
				longBreakDurationSeconds: 600,
				roundsBeforeLongBreak: 3
			});

			expect(fsm.durationMs).toBe(1200 * 1000);
			expect(fsm.remainingMs).toBe(1200 * 1000);
			expect(fsm.state).toBe('idle');
			expect(fsm.mode).toBe('focus');
			expect(fsm.currentRound).toBe(1);
			expect(fsm.totalRoundsCompleted).toBe(0);
		});

		it('should merge partial configuration with default values', () => {
			const fsm = new TimerFSM({
				focusDurationSeconds: 1800
			});

			expect(fsm.durationMs).toBe(1800 * 1000);
			expect(fsm.remainingMs).toBe(1800 * 1000);
			expect(fsm.snapshot.durationMs).toBe(1800000);
		});
	});

	describe('TimerFSM Configuration Boundary Validations (Scenario 2)', () => {
		it('should reject zero duration for focusDurationSeconds', () => {
			expect(() => new TimerFSM({ focusDurationSeconds: 0 })).toThrow(InvalidTimerConfigError);
		});

		it('should reject negative duration for focusDurationSeconds', () => {
			expect(() => new TimerFSM({ focusDurationSeconds: -10 })).toThrow(InvalidTimerConfigError);
		});

		it('should reject decimal/floating-point values for focusDurationSeconds', () => {
			expect(() => new TimerFSM({ focusDurationSeconds: 1500.5 })).toThrow(InvalidTimerConfigError);
		});

		it('should reject non-positive or decimal shortBreakDurationSeconds', () => {
			expect(() => new TimerFSM({ shortBreakDurationSeconds: 0 })).toThrow(InvalidTimerConfigError);
			expect(() => new TimerFSM({ shortBreakDurationSeconds: -1 })).toThrow(
				InvalidTimerConfigError
			);
			expect(() => new TimerFSM({ shortBreakDurationSeconds: 300.2 })).toThrow(
				InvalidTimerConfigError
			);
		});

		it('should reject non-positive or decimal longBreakDurationSeconds', () => {
			expect(() => new TimerFSM({ longBreakDurationSeconds: 0 })).toThrow(InvalidTimerConfigError);
			expect(() => new TimerFSM({ longBreakDurationSeconds: -5 })).toThrow(InvalidTimerConfigError);
			expect(() => new TimerFSM({ longBreakDurationSeconds: 600.8 })).toThrow(
				InvalidTimerConfigError
			);
		});

		it('should reject non-positive or decimal roundsBeforeLongBreak', () => {
			expect(() => new TimerFSM({ roundsBeforeLongBreak: 0 })).toThrow(InvalidTimerConfigError);
			expect(() => new TimerFSM({ roundsBeforeLongBreak: -2 })).toThrow(InvalidTimerConfigError);
			expect(() => new TimerFSM({ roundsBeforeLongBreak: 4.5 })).toThrow(InvalidTimerConfigError);
		});

		it('should reject NaN or Infinity values in configuration', () => {
			expect(() => new TimerFSM({ focusDurationSeconds: NaN })).toThrow(InvalidTimerConfigError);
			expect(() => new TimerFSM({ roundsBeforeLongBreak: Infinity })).toThrow(
				InvalidTimerConfigError
			);
		});
	});
});

describe('Phase 2: State Transitions & Invariant Guards', () => {
	describe('start action (Scenario 3)', () => {
		it('should transition from idle to running and maintain remainingMs', () => {
			const fsm = new TimerFSM();
			fsm.start();

			expect(fsm.state).toBe('running');
			expect(fsm.remainingMs).toBe(1500000);
			expect(fsm.snapshot.state).toBe('running');
		});

		it('should be a no-op when start is called while already running', () => {
			const fsm = new TimerFSM();
			fsm.start();
			fsm.start();

			expect(fsm.state).toBe('running');
			expect(fsm.remainingMs).toBe(1500000);
		});

		it('should be a safe no-op when start is called while paused (Scenario 11)', () => {
			const fsm = new TimerFSM();
			fsm.start();
			fsm.pause();
			expect(fsm.state).toBe('paused');

			fsm.start();
			expect(fsm.state).toBe('paused');
		});
	});

	describe('pause and resume actions (Scenario 6)', () => {
		it('should transition from running to paused and freeze remainingMs', () => {
			const fsm = new TimerFSM();
			fsm.start();
			fsm.pause();

			expect(fsm.state).toBe('paused');
			expect(fsm.remainingMs).toBe(1500000);
			expect(fsm.snapshot.state).toBe('paused');
		});

		it('should be a safe no-op when pause is called while idle (Scenario 11)', () => {
			const fsm = new TimerFSM();
			fsm.pause();
			expect(fsm.state).toBe('idle');
		});

		it('should be a safe no-op when pause is called while already paused', () => {
			const fsm = new TimerFSM();
			fsm.start();
			fsm.pause();
			fsm.pause();
			expect(fsm.state).toBe('paused');
		});

		it('should transition from paused to running via resume', () => {
			const fsm = new TimerFSM();
			fsm.start();
			fsm.pause();
			fsm.resume();

			expect(fsm.state).toBe('running');
			expect(fsm.remainingMs).toBe(1500000);
		});

		it('should be a safe no-op when resume is called while idle (Scenario 11)', () => {
			const fsm = new TimerFSM();
			fsm.resume();
			expect(fsm.state).toBe('idle');
		});

		it('should be a safe no-op when resume is called while already running', () => {
			const fsm = new TimerFSM();
			fsm.start();
			fsm.resume();
			expect(fsm.state).toBe('running');
		});
	});

	describe('reset action (Scenario 7)', () => {
		it('should reset running timer to idle and restore full duration', () => {
			const fsm = new TimerFSM();
			fsm.start();
			// Manually simulate a tick or just reset
			fsm.reset();

			expect(fsm.state).toBe('idle');
			expect(fsm.mode).toBe('focus');
			expect(fsm.remainingMs).toBe(1500000);
			expect(fsm.currentRound).toBe(1);
		});

		it('should reset paused timer to idle and restore full duration', () => {
			const fsm = new TimerFSM();
			fsm.start();
			fsm.pause();
			fsm.reset();

			expect(fsm.state).toBe('idle');
			expect(fsm.remainingMs).toBe(1500000);
			expect(fsm.currentRound).toBe(1);
		});

		it('should keep idle state when reset is called from idle', () => {
			const fsm = new TimerFSM();
			fsm.reset();

			expect(fsm.state).toBe('idle');
			expect(fsm.remainingMs).toBe(1500000);
			expect(fsm.currentRound).toBe(1);
		});
	});

	describe('skip action (Scenario 8)', () => {
		it('should skip running focus mode, transition to idle shortBreak, and not increment totalRoundsCompleted', () => {
			const fsm = new TimerFSM();
			fsm.start();
			fsm.skip();

			expect(fsm.state).toBe('idle');
			expect(fsm.mode).toBe('shortBreak');
			expect(fsm.remainingMs).toBe(300000);
			expect(fsm.durationMs).toBe(300000);
			expect(fsm.totalRoundsCompleted).toBe(0);
			expect(fsm.currentRound).toBe(1);
		});

		it('should skip from idle state to next mode', () => {
			const fsm = new TimerFSM();
			fsm.skip();

			expect(fsm.state).toBe('idle');
			expect(fsm.mode).toBe('shortBreak');
			expect(fsm.remainingMs).toBe(300000);
			expect(fsm.totalRoundsCompleted).toBe(0);
		});

		it('should skip from paused state to next mode', () => {
			const fsm = new TimerFSM();
			fsm.start();
			fsm.pause();
			fsm.skip();

			expect(fsm.state).toBe('idle');
			expect(fsm.mode).toBe('shortBreak');
			expect(fsm.remainingMs).toBe(300000);
			expect(fsm.totalRoundsCompleted).toBe(0);
		});
	});
});

describe('Phase 3: Time Stepping & Clamping (tick(deltaMs))', () => {
	it('should decrement remainingMs deterministically on regular stepping (Scenario 4)', () => {
		const fsm = new TimerFSM();
		fsm.start();

		fsm.tick(1000);
		expect(fsm.remainingMs).toBe(1499000);
		expect(fsm.state).toBe('running');
		expect(fsm.progress).toBeCloseTo((1500000 - 1499000) / 1500000);
	});

	it('should handle uneven 60fps frame deltas (~16.67ms) (Scenario 4)', () => {
		const fsm = new TimerFSM();
		fsm.start();

		fsm.tick(16.67);
		expect(fsm.remainingMs).toBeCloseTo(1499983.33, 2);
		expect(fsm.state).toBe('running');
	});

	it('should handle large throttled background deltas (60,000ms) without error (Scenario 4)', () => {
		const fsm = new TimerFSM();
		fsm.start();

		fsm.tick(60000);
		expect(fsm.remainingMs).toBe(1440000);
		expect(fsm.state).toBe('running');
	});

	it('should ignore non-positive deltas (<= 0) (Scenario 11)', () => {
		const fsm = new TimerFSM();
		fsm.start();

		fsm.tick(0);
		expect(fsm.remainingMs).toBe(1500000);

		fsm.tick(-500);
		expect(fsm.remainingMs).toBe(1500000);
	});

	it('should not decrement when timer is not in running state', () => {
		const idleFsm = new TimerFSM();
		idleFsm.tick(1000);
		expect(idleFsm.remainingMs).toBe(1500000);
		expect(idleFsm.state).toBe('idle');

		const pausedFsm = new TimerFSM();
		pausedFsm.start();
		pausedFsm.tick(1000);
		pausedFsm.pause();
		expect(pausedFsm.remainingMs).toBe(1499000);
		pausedFsm.tick(5000);
		expect(pausedFsm.remainingMs).toBe(1499000);
		expect(pausedFsm.state).toBe('paused');
	});

	it('should clamp remainingMs to 0 and transition to completed on overshoot (Scenario 5)', () => {
		const fsm = new TimerFSM({ focusDurationSeconds: 1 }); // 1000ms
		fsm.start();
		fsm.tick(500);
		expect(fsm.remainingMs).toBe(500);

		fsm.tick(600); // 100ms overshoot
		expect(fsm.remainingMs).toBe(0);
		expect(fsm.state).toBe('completed');
		expect(fsm.progress).toBe(1.0);
		expect(fsm.totalRoundsCompleted).toBe(1);
	});

	it('should transition to completed on exact delta reaching 0', () => {
		const fsm = new TimerFSM({ focusDurationSeconds: 1 });
		fsm.start();
		fsm.tick(1000);

		expect(fsm.remainingMs).toBe(0);
		expect(fsm.state).toBe('completed');
		expect(fsm.progress).toBe(1.0);
	});

	it('should be a no-op when tick is called in completed state', () => {
		const fsm = new TimerFSM({ focusDurationSeconds: 1 });
		fsm.start();
		fsm.tick(1000);
		expect(fsm.state).toBe('completed');

		fsm.tick(500);
		expect(fsm.remainingMs).toBe(0);
		expect(fsm.state).toBe('completed');
	});
});

describe('Phase 4: Pomodoro Cycle Progression & Round Management', () => {
	it('should execute a full 4-round Pomodoro cycle through to long break (Scenario 9)', () => {
		const fsm = new TimerFSM(); // 4 rounds before long break

		// --- Round 1 Focus ---
		expect(fsm.mode).toBe('focus');
		expect(fsm.currentRound).toBe(1);
		expect(fsm.totalRoundsCompleted).toBe(0);
		fsm.start();
		fsm.tick(1500000);
		expect(fsm.state).toBe('completed');
		expect(fsm.totalRoundsCompleted).toBe(1);
		expect(fsm.currentRound).toBe(1);

		// Transition to Short Break 1
		fsm.start();
		expect(fsm.state).toBe('running');
		expect(fsm.mode).toBe('shortBreak');
		expect(fsm.remainingMs).toBe(300000);
		expect(fsm.currentRound).toBe(1);
		fsm.tick(300000);
		expect(fsm.state).toBe('completed');
		expect(fsm.totalRoundsCompleted).toBe(1); // Short break does not increment totalRoundsCompleted

		// --- Round 2 Focus ---
		fsm.start();
		expect(fsm.state).toBe('running');
		expect(fsm.mode).toBe('focus');
		expect(fsm.currentRound).toBe(2);
		expect(fsm.remainingMs).toBe(1500000);
		fsm.tick(1500000);
		expect(fsm.state).toBe('completed');
		expect(fsm.totalRoundsCompleted).toBe(2);

		// Transition to Short Break 2
		fsm.start();
		expect(fsm.mode).toBe('shortBreak');
		expect(fsm.currentRound).toBe(2);
		fsm.tick(300000);
		expect(fsm.state).toBe('completed');

		// --- Round 3 Focus ---
		fsm.start();
		expect(fsm.mode).toBe('focus');
		expect(fsm.currentRound).toBe(3);
		fsm.tick(1500000);
		expect(fsm.state).toBe('completed');
		expect(fsm.totalRoundsCompleted).toBe(3);

		// Transition to Short Break 3
		fsm.start();
		expect(fsm.mode).toBe('shortBreak');
		expect(fsm.currentRound).toBe(3);
		fsm.tick(300000);
		expect(fsm.state).toBe('completed');

		// --- Round 4 Focus ---
		fsm.start();
		expect(fsm.mode).toBe('focus');
		expect(fsm.currentRound).toBe(4);
		fsm.tick(1500000);
		expect(fsm.state).toBe('completed');
		expect(fsm.totalRoundsCompleted).toBe(4);
		expect(fsm.currentRound).toBe(4);

		// Transition to Long Break
		fsm.start();
		expect(fsm.state).toBe('running');
		expect(fsm.mode).toBe('longBreak');
		expect(fsm.remainingMs).toBe(900000);
		expect(fsm.currentRound).toBe(4);
	});

	it('should reset to round 1 focus mode after long break completes (Scenario 10)', () => {
		const fsm = new TimerFSM();
		// Advance to longBreak directly via skips
		// Skip Focus 1 -> Short Break 1
		fsm.skip();
		// Skip Short Break 1 -> Focus 2
		fsm.skip();
		// Skip Focus 2 -> Short Break 2
		fsm.skip();
		// Skip Short Break 2 -> Focus 3
		fsm.skip();
		// Skip Focus 3 -> Short Break 3
		fsm.skip();
		// Skip Short Break 3 -> Focus 4
		fsm.skip();
		expect(fsm.mode).toBe('focus');
		expect(fsm.currentRound).toBe(4);

		// Skip Focus 4 -> Long Break
		fsm.skip();
		expect(fsm.mode).toBe('longBreak');
		expect(fsm.currentRound).toBe(4);

		// Run long break to completion
		fsm.start();
		fsm.tick(900000);
		expect(fsm.state).toBe('completed');
		expect(fsm.mode).toBe('longBreak');

		// Start next cycle
		fsm.start();
		expect(fsm.state).toBe('running');
		expect(fsm.mode).toBe('focus');
		expect(fsm.currentRound).toBe(1);
		expect(fsm.remainingMs).toBe(1500000);
	});

	it('should reset to round 1 focus mode when long break is skipped (Scenario 10)', () => {
		const fsm = new TimerFSM();
		// Advance to longBreak
		fsm.skip(); // shortBreak round 1
		fsm.skip(); // focus round 2
		fsm.skip(); // shortBreak round 2
		fsm.skip(); // focus round 3
		fsm.skip(); // shortBreak round 3
		fsm.skip(); // focus round 4
		fsm.skip(); // longBreak round 4
		expect(fsm.mode).toBe('longBreak');
		expect(fsm.currentRound).toBe(4);

		// Skip during longBreak
		fsm.skip();
		expect(fsm.state).toBe('idle');
		expect(fsm.mode).toBe('focus');
		expect(fsm.currentRound).toBe(1);
		expect(fsm.remainingMs).toBe(1500000);
	});

	it('should support custom roundsBeforeLongBreak cycle progression', () => {
		const fsm = new TimerFSM({ roundsBeforeLongBreak: 2 });

		// Focus 1
		fsm.start();
		fsm.tick(1500000);
		expect(fsm.totalRoundsCompleted).toBe(1);

		// Short Break 1
		fsm.start();
		expect(fsm.mode).toBe('shortBreak');
		fsm.tick(300000);

		// Focus 2
		fsm.start();
		expect(fsm.mode).toBe('focus');
		expect(fsm.currentRound).toBe(2);
		fsm.tick(1500000);
		expect(fsm.totalRoundsCompleted).toBe(2);

		// Long Break (since roundsBeforeLongBreak === 2)
		fsm.start();
		expect(fsm.mode).toBe('longBreak');
		expect(fsm.currentRound).toBe(2);
	});
});

describe('Phase 5: Observer Subscription Mechanism', () => {
	it('should synchronously notify subscribers on state mutations (start, pause, resume, reset, skip)', () => {
		const fsm = new TimerFSM();
		const history: string[] = [];

		const unsubscribe = fsm.subscribe((snapshot) => {
			history.push(`${snapshot.state}:${snapshot.mode}:${snapshot.remainingMs}`);
		});

		fsm.start();
		expect(history).toEqual(['running:focus:1500000']);

		fsm.pause();
		expect(history).toEqual(['running:focus:1500000', 'paused:focus:1500000']);

		fsm.resume();
		expect(history).toEqual([
			'running:focus:1500000',
			'paused:focus:1500000',
			'running:focus:1500000'
		]);

		fsm.reset();
		expect(history).toEqual([
			'running:focus:1500000',
			'paused:focus:1500000',
			'running:focus:1500000',
			'idle:focus:1500000'
		]);

		fsm.skip();
		expect(history).toEqual([
			'running:focus:1500000',
			'paused:focus:1500000',
			'running:focus:1500000',
			'idle:focus:1500000',
			'idle:shortBreak:300000'
		]);

		unsubscribe();
	});

	it('should synchronously notify subscribers on tick updates', () => {
		const fsm = new TimerFSM();
		const remainingTimes: number[] = [];

		fsm.start();
		fsm.subscribe((snapshot) => {
			remainingTimes.push(snapshot.remainingMs);
		});

		fsm.tick(1000);
		fsm.tick(2000);

		expect(remainingTimes).toEqual([1499000, 1497000]);
	});

	it('should not notify subscribers on no-op actions', () => {
		const fsm = new TimerFSM();
		let callCount = 0;

		fsm.subscribe(() => {
			callCount++;
		});

		// Invalid actions from idle
		fsm.pause();
		fsm.resume();
		fsm.tick(1000);
		expect(callCount).toBe(0);

		// Start timer
		fsm.start();
		expect(callCount).toBe(1);

		// No-ops while running
		fsm.start();
		fsm.resume();
		fsm.tick(0);
		fsm.tick(-100);
		expect(callCount).toBe(1);
	});

	it('should properly unsubscribe and teardown listener', () => {
		const fsm = new TimerFSM();
		let sub1Calls = 0;
		let sub2Calls = 0;

		const unsub1 = fsm.subscribe(() => {
			sub1Calls++;
		});
		fsm.subscribe(() => {
			sub2Calls++;
		});

		fsm.start();
		expect(sub1Calls).toBe(1);
		expect(sub2Calls).toBe(1);

		unsub1();

		fsm.pause();
		expect(sub1Calls).toBe(1); // sub1 was unsubscribed
		expect(sub2Calls).toBe(2); // sub2 still active
	});

	it('should maintain listener isolation even if one subscriber throws an error', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const fsm = new TimerFSM();
		let secondSubCalled = false;

		fsm.subscribe(() => {
			throw new Error('Subscriber error simulation');
		});

		fsm.subscribe(() => {
			secondSubCalled = true;
		});

		expect(() => fsm.start()).not.toThrow();
		expect(secondSubCalled).toBe(true);
		consoleSpy.mockRestore();
	});

	it('should guarantee defensive immutability of TimerSnapshot', () => {
		const fsm = new TimerFSM();
		const snapshot = fsm.snapshot;

		expect(Object.isFrozen(snapshot)).toBe(true);
		expect(() => {
			// @ts-expect-error mutating frozen object
			snapshot.remainingMs = 0;
		}).toThrow(TypeError);
	});
});

describe('TimerFSM Configuration Updates (updateConfig)', () => {
	it('should update config and reset remainingMs to new duration when idle', () => {
		const fsm = new TimerFSM();
		expect(fsm.state).toBe('idle');
		expect(fsm.durationMs).toBe(1500000);
		expect(fsm.remainingMs).toBe(1500000);

		fsm.updateConfig({ focusDurationSeconds: 1200 });

		expect(fsm.config.focusDurationSeconds).toBe(1200);
		expect(fsm.durationMs).toBe(1200000);
		expect(fsm.remainingMs).toBe(1200000);
		expect(fsm.snapshot.durationMs).toBe(1200000);
		expect(fsm.snapshot.remainingMs).toBe(1200000);
	});

	it('should update shortBreak duration and remainingMs when idle in shortBreak mode', () => {
		const fsm = new TimerFSM();
		fsm.skip(); // advances to shortBreak, idle
		expect(fsm.mode).toBe('shortBreak');
		expect(fsm.state).toBe('idle');
		expect(fsm.remainingMs).toBe(300000);

		fsm.updateConfig({ shortBreakDurationSeconds: 600 });

		expect(fsm.config.shortBreakDurationSeconds).toBe(600);
		expect(fsm.durationMs).toBe(600000);
		expect(fsm.remainingMs).toBe(600000);
	});

	it('should update config but preserve active block duration and remainingMs when running (active block uninterrupted)', () => {
		const fsm = new TimerFSM();
		fsm.start();
		fsm.tick(300000); // 1500s - 300s = 1200s (1,200,000 ms remaining)
		expect(fsm.state).toBe('running');
		expect(fsm.remainingMs).toBe(1200000);

		fsm.updateConfig({ focusDurationSeconds: 1800 });

		expect(fsm.config.focusDurationSeconds).toBe(1800);
		// Active block's baseline duration and remaining time must be preserved
		expect(fsm.durationMs).toBe(1500000);
		expect(fsm.remainingMs).toBe(1200000);
		expect(fsm.snapshot.remainingMs).toBe(1200000);
		expect(fsm.snapshot.durationMs).toBe(1500000);
		expect(fsm.progress).toBeCloseTo(0.2);
	});

	it('should update config but preserve active block duration and remainingMs when paused (active block uninterrupted)', () => {
		const fsm = new TimerFSM();
		fsm.start();
		fsm.tick(500000); // 1,000,000 ms remaining
		fsm.pause();
		expect(fsm.state).toBe('paused');
		expect(fsm.remainingMs).toBe(1000000);

		fsm.updateConfig({ focusDurationSeconds: 2400 });

		expect(fsm.config.focusDurationSeconds).toBe(2400);
		// Active block's baseline duration and remaining time must be preserved
		expect(fsm.durationMs).toBe(1500000);
		expect(fsm.remainingMs).toBe(1000000);
		expect(fsm.snapshot.remainingMs).toBe(1000000);
		expect(fsm.snapshot.durationMs).toBe(1500000);
		expect(fsm.progress).toBeCloseTo(1 / 3);
	});

	it('should preserve active block duration when config duration is decreased while running so remainingMs never exceeds durationMs', () => {
		const fsm = new TimerFSM();
		fsm.start();
		fsm.tick(300000); // 1,200,000 ms remaining out of 1,500,000 ms
		expect(fsm.remainingMs).toBe(1200000);

		// Decrease focus to 10 min (600s = 600,000 ms) which is less than remainingMs
		fsm.updateConfig({ focusDurationSeconds: 600 });

		expect(fsm.config.focusDurationSeconds).toBe(600);
		expect(fsm.durationMs).toBe(1500000);
		expect(fsm.remainingMs).toBe(1200000);
		expect(fsm.remainingMs).toBeLessThanOrEqual(fsm.durationMs);
		expect(fsm.progress).toBeCloseTo(0.2);
	});

	it('should notify subscribers with updated snapshot upon config update', () => {
		const fsm = new TimerFSM();
		let callCount = 0;
		let lastSnapshotDuration = 0;
		let lastSnapshotRemaining = 0;

		fsm.subscribe((snapshot) => {
			callCount++;
			lastSnapshotDuration = snapshot.durationMs;
			lastSnapshotRemaining = snapshot.remainingMs;
		});

		fsm.updateConfig({ focusDurationSeconds: 900 });

		expect(callCount).toBe(1);
		expect(lastSnapshotDuration).toBe(900000);
		expect(lastSnapshotRemaining).toBe(900000);
	});

	it('should freeze the merged config object defensively', () => {
		const fsm = new TimerFSM();
		fsm.updateConfig({ focusDurationSeconds: 1000 });

		expect(Object.isFrozen(fsm.config)).toBe(true);
		expect(() => {
			// @ts-expect-error mutating frozen config
			fsm.config.focusDurationSeconds = 2000;
		}).toThrow(TypeError);
	});

	it('should reject invalid values with InvalidTimerConfigError and not alter state', () => {
		const fsm = new TimerFSM();
		let notified = false;
		fsm.subscribe(() => {
			notified = true;
		});

		expect(() => fsm.updateConfig({ focusDurationSeconds: 0 })).toThrow(InvalidTimerConfigError);
		expect(() => fsm.updateConfig({ focusDurationSeconds: -10 })).toThrow(InvalidTimerConfigError);
		expect(() => fsm.updateConfig({ shortBreakDurationSeconds: 25.5 })).toThrow(
			InvalidTimerConfigError
		);
		expect(() => fsm.updateConfig({ longBreakDurationSeconds: NaN })).toThrow(
			InvalidTimerConfigError
		);
		expect(() => fsm.updateConfig({ roundsBeforeLongBreak: Infinity })).toThrow(
			InvalidTimerConfigError
		);

		// Config and state remain unmodified
		expect(fsm.config.focusDurationSeconds).toBe(1500);
		expect(fsm.remainingMs).toBe(1500000);
		expect(notified).toBe(false);
	});
});
