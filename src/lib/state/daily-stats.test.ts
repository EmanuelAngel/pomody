import { describe, it, expect, beforeEach } from 'vitest';
import { FakeDailyStatsRepository } from '$tests/fakes/repositories/fake-daily-stats-repository';
import {
	DailyStatsState,
	createDailyStatsState,
	dailyStatsState,
	formatDailyDuration,
	formatDailyStatsSummary
} from './daily-stats.svelte';
import type {
	DomainEvent,
	BlockCompletedEvent,
	BlockSkippedEvent
} from '../domain/events/block-completed.event';

class MockTimerEmitter {
	public subscribers = new Set<(event: DomainEvent) => void>();

	onEvent(fn: (event: DomainEvent) => void): () => void {
		this.subscribers.add(fn);
		return () => {
			this.subscribers.delete(fn);
		};
	}

	emit(event: DomainEvent): void {
		for (const sub of Array.from(this.subscribers)) {
			sub(event);
		}
	}
}

describe('formatDailyDuration', () => {
	it('should format durations under 60 minutes as Xm', () => {
		expect(formatDailyDuration(0)).toBe('0m');
		expect(formatDailyDuration(1)).toBe('1m');
		expect(formatDailyDuration(25)).toBe('25m');
		expect(formatDailyDuration(50)).toBe('50m');
		expect(formatDailyDuration(59)).toBe('59m');
	});

	it('should format durations of 60 minutes or more as Xh Ym', () => {
		expect(formatDailyDuration(60)).toBe('1h 0m');
		expect(formatDailyDuration(61)).toBe('1h 1m');
		expect(formatDailyDuration(90)).toBe('1h 30m');
		expect(formatDailyDuration(100)).toBe('1h 40m');
		expect(formatDailyDuration(120)).toBe('2h 0m');
		expect(formatDailyDuration(125)).toBe('2h 5m');
	});

	it('should guard against negative, NaN, or non-finite numbers', () => {
		expect(formatDailyDuration(-10)).toBe('0m');
		expect(formatDailyDuration(NaN)).toBe('0m');
		expect(formatDailyDuration(Infinity)).toBe('0m');
	});
});

describe('formatDailyStatsSummary', () => {
	it('should format 0 completed blocks as "0 blocks · 0m" regardless of accumulated minutes', () => {
		expect(formatDailyStatsSummary(0, 0)).toBe('0 blocks · 0m');
		expect(formatDailyStatsSummary(0, 25)).toBe('0 blocks · 0m');
	});

	it('should format singular "1 block · Xm"', () => {
		expect(formatDailyStatsSummary(1, 25)).toBe('1 block · 25m');
		expect(formatDailyStatsSummary(1, 60)).toBe('1 block · 1h 0m');
	});

	it('should format plural "N blocks · Xm"', () => {
		expect(formatDailyStatsSummary(2, 50)).toBe('2 blocks · 50m');
		expect(formatDailyStatsSummary(4, 60)).toBe('4 blocks · 1h 0m');
		expect(formatDailyStatsSummary(4, 100)).toBe('4 blocks · 1h 40m');
	});
});

describe('DailyStatsState', () => {
	let mockRepo: FakeDailyStatsRepository;
	let mockTimer: MockTimerEmitter;
	let currentDate: Date;
	const nowProvider = () => currentDate;

	beforeEach(() => {
		currentDate = new Date(2026, 9, 3, 10, 0, 0); // 2026-10-03
		mockRepo = new FakeDailyStatsRepository({
			date: '2026-10-03',
			completedBlocks: 0,
			accumulatedMinutes: 0
		});
		mockTimer = new MockTimerEmitter();
	});

	describe('initial load from repository', () => {
		it('should load matching today stats from repository', () => {
			mockRepo.stats = {
				date: '2026-10-03',
				completedBlocks: 3,
				accumulatedMinutes: 75
			};

			const state = new DailyStatsState(mockRepo, mockTimer, nowProvider);

			expect(state.completedBlocks).toBe(3);
			expect(state.accumulatedMinutes).toBe(75);
			expect(state.date).toBe('2026-10-03');
			expect(state.formattedSummary).toBe('3 blocks · 1h 15m');
		});

		it('should initialize clean 0 stats if repository stats belong to a past date', () => {
			mockRepo.stats = {
				date: '2026-10-02',
				completedBlocks: 4,
				accumulatedMinutes: 100
			};

			const state = new DailyStatsState(mockRepo, mockTimer, nowProvider);

			expect(state.completedBlocks).toBe(0);
			expect(state.accumulatedMinutes).toBe(0);
			expect(state.date).toBe('2026-10-03');
			expect(state.formattedSummary).toBe('0 blocks · 0m');
		});
	});

	describe('event handling and accumulation', () => {
		it('should increment completedBlocks and accumulatedMinutes on focus block-completed event', () => {
			const state = new DailyStatsState(mockRepo, mockTimer, nowProvider);

			const event: BlockCompletedEvent = {
				type: 'block-completed',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 1,
				durationMs: 1500000, // 25 minutes
				completedAt: new Date()
			};

			mockTimer.emit(event);

			expect(state.completedBlocks).toBe(1);
			expect(state.accumulatedMinutes).toBe(25);
			expect(state.formattedSummary).toBe('1 block · 25m');
			expect(mockRepo.saveStatsCalls).toHaveLength(1);
			expect(mockRepo.saveStatsCalls[0]).toEqual({
				date: '2026-10-03',
				completedBlocks: 1,
				accumulatedMinutes: 25
			});
		});

		it('should accumulate multiple focus blocks sequentially', () => {
			const state = new DailyStatsState(mockRepo, mockTimer, nowProvider);

			// First 25m focus block
			mockTimer.emit({
				type: 'block-completed',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 1,
				durationMs: 1500000,
				completedAt: new Date()
			});

			// Second 25m focus block
			mockTimer.emit({
				type: 'block-completed',
				mode: 'focus',
				round: 2,
				totalRoundsCompleted: 2,
				durationMs: 1500000,
				completedAt: new Date()
			});

			expect(state.completedBlocks).toBe(2);
			expect(state.accumulatedMinutes).toBe(50);
			expect(state.formattedSummary).toBe('2 blocks · 50m');

			// Third block: 50m (long focus block)
			mockTimer.emit({
				type: 'block-completed',
				mode: 'focus',
				round: 3,
				totalRoundsCompleted: 3,
				durationMs: 3000000,
				completedAt: new Date()
			});

			expect(state.completedBlocks).toBe(3);
			expect(state.accumulatedMinutes).toBe(100);
			expect(state.formattedSummary).toBe('3 blocks · 1h 40m');
		});

		it('should ignore shortBreak and longBreak block-completed events', () => {
			const state = new DailyStatsState(mockRepo, mockTimer, nowProvider);

			const shortBreakEvent: BlockCompletedEvent = {
				type: 'block-completed',
				mode: 'shortBreak',
				round: 1,
				totalRoundsCompleted: 1,
				durationMs: 300000,
				completedAt: new Date()
			};

			const longBreakEvent: BlockCompletedEvent = {
				type: 'block-completed',
				mode: 'longBreak',
				round: 4,
				totalRoundsCompleted: 4,
				durationMs: 900000,
				completedAt: new Date()
			};

			mockTimer.emit(shortBreakEvent);
			mockTimer.emit(longBreakEvent);

			expect(state.completedBlocks).toBe(0);
			expect(state.accumulatedMinutes).toBe(0);
			expect(mockRepo.saveStatsCalls).toHaveLength(0);
		});

		it('should ignore block-skipped events regardless of mode', () => {
			const state = new DailyStatsState(mockRepo, mockTimer, nowProvider);

			const focusSkipped: BlockSkippedEvent = {
				type: 'block-skipped',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 0,
				skippedAt: new Date()
			};

			const breakSkipped: BlockSkippedEvent = {
				type: 'block-skipped',
				mode: 'shortBreak',
				round: 1,
				totalRoundsCompleted: 1,
				skippedAt: new Date()
			};

			mockTimer.emit(focusSkipped);
			mockTimer.emit(breakSkipped);

			expect(state.completedBlocks).toBe(0);
			expect(state.accumulatedMinutes).toBe(0);
			expect(mockRepo.saveStatsCalls).toHaveLength(0);
		});
	});

	describe('day rollover logic', () => {
		it('should reset stats before accumulating when date changes to next day', () => {
			const state = new DailyStatsState(mockRepo, mockTimer, nowProvider);

			// Complete 2 blocks on 2026-10-03
			mockTimer.emit({
				type: 'block-completed',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 1,
				durationMs: 1500000,
				completedAt: new Date()
			});
			mockTimer.emit({
				type: 'block-completed',
				mode: 'focus',
				round: 2,
				totalRoundsCompleted: 2,
				durationMs: 1500000,
				completedAt: new Date()
			});

			expect(state.completedBlocks).toBe(2);
			expect(state.accumulatedMinutes).toBe(50);
			expect(state.date).toBe('2026-10-03');

			// Advance date to tomorrow (2026-10-04)
			currentDate = new Date(2026, 9, 4, 9, 0, 0);

			// First focus block of the new day
			mockTimer.emit({
				type: 'block-completed',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 3,
				durationMs: 1500000,
				completedAt: new Date()
			});

			expect(state.completedBlocks).toBe(1);
			expect(state.accumulatedMinutes).toBe(25);
			expect(state.date).toBe('2026-10-04');
			expect(state.formattedSummary).toBe('1 block · 25m');
		});

		it('should reset and return true from checkRollover when date has changed', () => {
			const state = new DailyStatsState(mockRepo, mockTimer, nowProvider);

			mockTimer.emit({
				type: 'block-completed',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 1,
				durationMs: 1500000,
				completedAt: new Date()
			});

			expect(state.checkRollover()).toBe(false);

			// Advance date to next day
			currentDate = new Date(2026, 9, 4, 0, 1, 0);

			expect(state.checkRollover()).toBe(true);
			expect(state.completedBlocks).toBe(0);
			expect(state.accumulatedMinutes).toBe(0);
			expect(state.date).toBe('2026-10-04');
			expect(state.formattedSummary).toBe('0 blocks · 0m');
		});
	});

	describe('reset', () => {
		it('should reset state to zero and invoke repository.resetStats()', () => {
			mockRepo.stats = {
				date: '2026-10-03',
				completedBlocks: 4,
				accumulatedMinutes: 100
			};
			const state = new DailyStatsState(mockRepo, mockTimer, nowProvider);

			expect(state.completedBlocks).toBe(4);
			expect(state.formattedSummary).toBe('4 blocks · 1h 40m');

			state.reset();

			expect(state.completedBlocks).toBe(0);
			expect(state.accumulatedMinutes).toBe(0);
			expect(state.formattedSummary).toBe('0 blocks · 0m');
			expect(mockRepo.resetStatsCalls).toBe(1);
		});
	});

	describe('destroy', () => {
		it('should unsubscribe from timer events upon destroy', () => {
			const state = new DailyStatsState(mockRepo, mockTimer, nowProvider);

			expect(mockTimer.subscribers.size).toBe(1);

			state.destroy();

			expect(mockTimer.subscribers.size).toBe(0);

			// Emitting after destroy should not change state
			mockTimer.emit({
				type: 'block-completed',
				mode: 'focus',
				round: 1,
				totalRoundsCompleted: 1,
				durationMs: 1500000,
				completedAt: new Date()
			});

			expect(state.completedBlocks).toBe(0);
			expect(state.accumulatedMinutes).toBe(0);
		});
	});

	describe('singleton and factory function', () => {
		it('should export a singleton dailyStatsState instance', () => {
			expect(dailyStatsState).toBeInstanceOf(DailyStatsState);
		});

		it('should allow creating isolated state instances via createDailyStatsState', () => {
			const isolated = createDailyStatsState(mockRepo, null, nowProvider);
			expect(isolated).toBeInstanceOf(DailyStatsState);
			expect(isolated.completedBlocks).toBe(0);
		});
	});
});
