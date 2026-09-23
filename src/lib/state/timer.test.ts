import { describe, it, expect, beforeEach } from 'vitest';
import { TimerState, createTimerState, formatTime, timerState } from './timer.svelte';
import type { ITimerTicker, TickCallback } from '../domain/ports/timer-ticker.port';

describe('formatTime', () => {
	it('should format full standard Pomodoro duration as 25:00', () => {
		expect(formatTime(1500000)).toBe('25:00');
	});

	it('should format short break duration as 05:00', () => {
		expect(formatTime(300000)).toBe('05:00');
	});

	it('should use ceiling so initial millisecond elapsed does not drop a full second immediately', () => {
		expect(formatTime(1500000)).toBe('25:00');
		expect(formatTime(1499500)).toBe('25:00');
		expect(formatTime(1499001)).toBe('25:00');
		expect(formatTime(1498999)).toBe('24:59');
	});

	it('should format small remaining milliseconds as 00:01 until 0', () => {
		expect(formatTime(1000)).toBe('00:01');
		expect(formatTime(500)).toBe('00:01');
		expect(formatTime(1)).toBe('00:01');
		expect(formatTime(0)).toBe('00:00');
	});

	it('should defensively guard negative milliseconds as 00:00', () => {
		expect(formatTime(-100)).toBe('00:00');
	});
});

class MockTicker implements ITimerTicker {
	public isRunning = false;
	public tickCallback: TickCallback | null = null;
	public startCallCount = 0;
	public stopCallCount = 0;
	public destroyCallCount = 0;

	start(onTick: TickCallback): void {
		this.isRunning = true;
		this.tickCallback = onTick;
		this.startCallCount++;
	}

	stop(): void {
		this.isRunning = false;
		this.stopCallCount++;
	}

	destroy(): void {
		this.isRunning = false;
		this.destroyCallCount++;
	}

	simulateTick(deltaMs: number): void {
		if (this.isRunning && this.tickCallback) {
			this.tickCallback(deltaMs);
		}
	}
}

describe('TimerState Composition Root', () => {
	let mockTicker: MockTicker;

	beforeEach(() => {
		mockTicker = new MockTicker();
	});

	it('should initialize with default Pomodoro state and idle status', () => {
		const timer = createTimerState(undefined, mockTicker);

		expect(timer.state).toBe('idle');
		expect(timer.mode).toBe('focus');
		expect(timer.remainingMs).toBe(1500000);
		expect(timer.durationMs).toBe(1500000);
		expect(timer.currentRound).toBe(1);
		expect(timer.totalRoundsCompleted).toBe(0);
		expect(timer.progress).toBe(0);
		expect(timer.formattedRemainingTime).toBe('25:00');
		expect(timer.formattedTime).toBe('25:00');
		expect(timer.isRunning).toBe(false);
	});

	it('should support custom configuration', () => {
		const timer = createTimerState(
			{
				focusDurationSeconds: 10,
				shortBreakDurationSeconds: 5,
				longBreakDurationSeconds: 20,
				roundsBeforeLongBreak: 2
			},
			mockTicker
		);

		expect(timer.remainingMs).toBe(10000);
		expect(timer.formattedRemainingTime).toBe('00:10');
	});

	it('should start ticking when start() is called from idle', () => {
		const timer = createTimerState({ focusDurationSeconds: 10 }, mockTicker);

		timer.start();

		expect(timer.state).toBe('running');
		expect(timer.isRunning).toBe(true);
		expect(mockTicker.startCallCount).toBe(1);
		expect(mockTicker.isRunning).toBe(true);

		// Advance 3 seconds
		mockTicker.simulateTick(3000);
		expect(timer.remainingMs).toBe(7000);
		expect(timer.formattedTime).toBe('00:07');
		expect(timer.progress).toBe(0.3);
	});

	it('should pause and stop ticker on pause(), and resume on resume()', () => {
		const timer = createTimerState({ focusDurationSeconds: 10 }, mockTicker);

		timer.start();
		mockTicker.simulateTick(2000);
		expect(timer.remainingMs).toBe(8000);

		timer.pause();
		expect(timer.state).toBe('paused');
		expect(timer.isRunning).toBe(false);
		expect(mockTicker.isRunning).toBe(false);

		// Ticks while paused should not affect remaining time
		mockTicker.simulateTick(2000);
		expect(timer.remainingMs).toBe(8000);

		timer.resume();
		expect(timer.state).toBe('running');
		expect(timer.isRunning).toBe(true);
		expect(mockTicker.isRunning).toBe(true);

		mockTicker.simulateTick(3000);
		expect(timer.remainingMs).toBe(5000);
	});

	it('should reset timer back to initial duration and idle state on reset()', () => {
		const timer = createTimerState({ focusDurationSeconds: 10 }, mockTicker);

		timer.start();
		mockTicker.simulateTick(4000);
		expect(timer.remainingMs).toBe(6000);

		timer.reset();
		expect(timer.state).toBe('idle');
		expect(timer.remainingMs).toBe(10000);
		expect(timer.formattedTime).toBe('00:10');
		expect(timer.progress).toBe(0);
		expect(mockTicker.isRunning).toBe(false);
	});

	it('should advance to next mode on skip()', () => {
		const timer = createTimerState(
			{
				focusDurationSeconds: 10,
				shortBreakDurationSeconds: 5,
				roundsBeforeLongBreak: 4
			},
			mockTicker
		);

		timer.start();
		mockTicker.simulateTick(2000);

		timer.skip();
		expect(timer.state).toBe('idle');
		expect(timer.mode).toBe('shortBreak');
		expect(timer.remainingMs).toBe(5000);
		expect(timer.formattedTime).toBe('00:05');
		expect(mockTicker.isRunning).toBe(false);
	});

	it('should transition to completed and stop ticker when time reaches 0', () => {
		const timer = createTimerState(
			{
				focusDurationSeconds: 4,
				shortBreakDurationSeconds: 2,
				roundsBeforeLongBreak: 2
			},
			mockTicker
		);

		timer.start();
		mockTicker.simulateTick(4000);

		expect(timer.state).toBe('completed');
		expect(timer.remainingMs).toBe(0);
		expect(timer.formattedTime).toBe('00:00');
		expect(timer.progress).toBe(1.0);
		expect(timer.totalRoundsCompleted).toBe(1);
		expect(mockTicker.isRunning).toBe(false);

		// Starting from completed advances to next mode (shortBreak) and runs
		timer.start();
		expect(timer.state).toBe('running');
		expect(timer.mode).toBe('shortBreak');
		expect(timer.remainingMs).toBe(2000);
		expect(mockTicker.isRunning).toBe(true);
	});

	it('should clean up ticker resources on destroy()', () => {
		const timer = createTimerState(undefined, mockTicker);
		timer.start();
		timer.destroy();

		expect(mockTicker.destroyCallCount).toBe(1);
		expect(mockTicker.isRunning).toBe(false);
	});

	it('should instantiate successfully with default WebWorkerTimerTicker in Node/Vitest without crashing', () => {
		const timer = new TimerState();
		expect(timer.state).toBe('idle');
		expect(timer.formattedTime).toBe('25:00');
		timer.destroy();
	});

	it('should export a valid global timerState instance', () => {
		expect(timerState).toBeInstanceOf(TimerState);
		expect(timerState.state).toBe('idle');
	});
});
