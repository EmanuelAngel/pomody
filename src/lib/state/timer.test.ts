import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TimerState, createTimerState, formatTime, timerState } from './timer.svelte';
import { TimerFSM } from '../domain/timer/timer-fsm';
import type { ITimerTicker, TickCallback } from '../domain/ports/timer-ticker.port';
import type { IAudioNotifier } from '../domain/ports/IAudioNotifier';

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

	it('should not restart ticker if start() or resume() is called while already running (JD-03)', () => {
		const timer = createTimerState({ focusDurationSeconds: 10 }, mockTicker);

		timer.start();
		expect(mockTicker.startCallCount).toBe(1);

		// Redundant start() while running
		timer.start();
		expect(mockTicker.startCallCount).toBe(1);

		// Redundant resume() while running
		timer.resume();
		expect(mockTicker.startCallCount).toBe(1);

		timer.destroy();
	});

	it('should execute FSM unsubscribe callback on destroy() (JD-04)', () => {
		const unsubscribeMock = vi.fn();
		const originalSubscribe = TimerFSM.prototype.subscribe;
		const subscribeSpy = vi.spyOn(TimerFSM.prototype, 'subscribe').mockImplementation(function (
			this: TimerFSM,
			subscriber
		) {
			const realUnsub = originalSubscribe.call(this, subscriber);
			return () => {
				realUnsub();
				unsubscribeMock();
			};
		});

		const timer = createTimerState(undefined, mockTicker);
		expect(unsubscribeMock).not.toHaveBeenCalled();

		timer.destroy();
		expect(unsubscribeMock).toHaveBeenCalledTimes(1);

		subscribeSpy.mockRestore();
	});

	it('should export a valid global timerState instance', () => {
		expect(timerState).toBeInstanceOf(TimerState);
		expect(timerState.state).toBe('idle');
	});

	it('should expose current config via config getter', () => {
		const timer = createTimerState(
			{
				focusDurationSeconds: 1200,
				shortBreakDurationSeconds: 240,
				longBreakDurationSeconds: 600,
				roundsBeforeLongBreak: 3
			},
			mockTicker
		);

		expect(timer.config).toEqual({
			focusDurationSeconds: 1200,
			shortBreakDurationSeconds: 240,
			longBreakDurationSeconds: 600,
			roundsBeforeLongBreak: 3
		});
		timer.destroy();
	});

	it('should update config and reactive snapshot when updateConfig is called in idle state', () => {
		const timer = createTimerState(undefined, mockTicker);
		expect(timer.remainingMs).toBe(1500000);
		expect(timer.formattedTime).toBe('25:00');

		timer.updateConfig({ focusDurationSeconds: 1800 });

		expect(timer.config.focusDurationSeconds).toBe(1800);
		expect(timer.durationMs).toBe(1800000);
		expect(timer.remainingMs).toBe(1800000);
		expect(timer.formattedTime).toBe('30:00');
		timer.destroy();
	});

	it('should update config but preserve active durationMs and remainingMs when updateConfig is called while running', () => {
		const timer = createTimerState({ focusDurationSeconds: 10 }, mockTicker);
		timer.start();
		mockTicker.simulateTick(3000); // 7000ms remaining
		expect(timer.remainingMs).toBe(7000);

		timer.updateConfig({ focusDurationSeconds: 20 });

		expect(timer.config.focusDurationSeconds).toBe(20);
		// Active block duration is preserved while running
		expect(timer.durationMs).toBe(10000);
		expect(timer.remainingMs).toBe(7000);
		expect(timer.formattedTime).toBe('00:07');
		timer.destroy();
	});

	it('should reactively update config property when FSM subscriber notification fires (JD-5)', () => {
		const timer = createTimerState(undefined, mockTicker);
		expect(timer.config.focusDurationSeconds).toBe(1500);

		timer.updateConfig({ focusDurationSeconds: 1200 });
		expect(timer.config.focusDurationSeconds).toBe(1200);

		timer.destroy();
	});

	it('should propagate validation errors on invalid updateConfig calls', () => {
		const timer = createTimerState(undefined, mockTicker);
		expect(() => timer.updateConfig({ focusDurationSeconds: 0 })).toThrow();
		expect(timer.config.focusDurationSeconds).toBe(1500);
		timer.destroy();
	});

	describe('IAudioNotifier & soundEnabled wiring', () => {
		let mockAudioNotifier: IAudioNotifier;

		beforeEach(() => {
			mockAudioNotifier = {
				notifyBlockCompleted: vi.fn(),
				unlock: vi.fn()
			};
		});

		it('should default soundEnabled to true', () => {
			const timer = createTimerState(undefined, mockTicker, mockAudioNotifier);
			expect(timer.soundEnabled).toBe(true);
			timer.destroy();
		});

		it('should update soundEnabled reactively via setSoundEnabled and toggleSound', () => {
			const timer = createTimerState(undefined, mockTicker, mockAudioNotifier);
			expect(timer.soundEnabled).toBe(true);

			timer.setSoundEnabled(false);
			expect(timer.soundEnabled).toBe(false);

			timer.toggleSound();
			expect(timer.soundEnabled).toBe(true);

			timer.toggleSound();
			expect(timer.soundEnabled).toBe(false);

			timer.destroy();
		});

		it('should call mockAudioNotifier.notifyBlockCompleted with "focus" when focus block completes', () => {
			const timer = createTimerState(undefined, mockTicker, mockAudioNotifier);
			timer.start();

			expect(mockAudioNotifier.notifyBlockCompleted).not.toHaveBeenCalled();

			mockTicker.simulateTick(1500000);

			expect(timer.state).toBe('completed');
			expect(mockAudioNotifier.notifyBlockCompleted).toHaveBeenCalledTimes(1);
			expect(mockAudioNotifier.notifyBlockCompleted).toHaveBeenCalledWith('focus');

			timer.destroy();
		});

		it('should NOT call mockAudioNotifier.notifyBlockCompleted when soundEnabled is false', () => {
			const timer = createTimerState(undefined, mockTicker, mockAudioNotifier);
			timer.setSoundEnabled(false);
			timer.start();

			mockTicker.simulateTick(1500000);

			expect(timer.state).toBe('completed');
			expect(mockAudioNotifier.notifyBlockCompleted).not.toHaveBeenCalled();

			timer.destroy();
		});

		it('should call mockAudioNotifier.unlock() when start() is called', () => {
			const timer = createTimerState(undefined, mockTicker, mockAudioNotifier);
			expect(mockAudioNotifier.unlock).not.toHaveBeenCalled();

			timer.start();

			expect(mockAudioNotifier.unlock).toHaveBeenCalledTimes(1);

			timer.destroy();
		});

		it('should call mockAudioNotifier.unlock() when resume() is called', () => {
			const timer = createTimerState(undefined, mockTicker, mockAudioNotifier);
			timer.start();
			expect(mockAudioNotifier.unlock).toHaveBeenCalledTimes(1);

			timer.pause();
			timer.resume();

			expect(mockAudioNotifier.unlock).toHaveBeenCalledTimes(2);

			timer.destroy();
		});

		it('should call mockAudioNotifier.notifyBlockCompleted with break mode when break block completes', () => {
			const timer = createTimerState(
				{ focusDurationSeconds: 1, shortBreakDurationSeconds: 2 },
				mockTicker,
				mockAudioNotifier
			);
			timer.start();
			mockTicker.simulateTick(1000); // completes focus
			expect(mockAudioNotifier.notifyBlockCompleted).toHaveBeenLastCalledWith('focus');

			timer.start(); // starts shortBreak
			mockTicker.simulateTick(2000); // completes shortBreak
			expect(mockAudioNotifier.notifyBlockCompleted).toHaveBeenLastCalledWith('shortBreak');

			timer.destroy();
		});

		it('should unsubscribe from FSM domain events on destroy()', () => {
			const unsubscribeEventsMock = vi.fn();
			const originalOnEvent = TimerFSM.prototype.onEvent;
			const onEventSpy = vi.spyOn(TimerFSM.prototype, 'onEvent').mockImplementation(function (
				this: TimerFSM,
				subscriber
			) {
				const realUnsub = originalOnEvent.call(this, subscriber);
				return () => {
					realUnsub();
					unsubscribeEventsMock();
				};
			});

			const timer = createTimerState(undefined, mockTicker, mockAudioNotifier);
			expect(unsubscribeEventsMock).not.toHaveBeenCalled();

			timer.destroy();
			expect(unsubscribeEventsMock).toHaveBeenCalledTimes(1);

			onEventSpy.mockRestore();
		});
	});
});
