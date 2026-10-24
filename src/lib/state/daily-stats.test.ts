import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	DailyStatsState,
	createDailyStatsState,
	dailyStatsState,
	formatDailyDuration,
	formatDailyStatsSummary
} from './daily-stats.svelte';
import { createFocusHistoryState, type FocusHistoryState } from './focus-history.svelte';
import { InMemoryStorage } from '../adapters/storage/in-memory-storage';
import { LocalFocusHistoryRepository } from '../adapters/storage/local-focus-history-repository';
import {
	LEGACY_DAILY_STATS_STORAGE_KEY,
	migrateLegacyDailyStats
} from '../adapters/storage/legacy-daily-stats-migration';
import type {
	BlockAbandonedEvent,
	BlockCompletedEvent,
	BlockSkippedEvent,
	DomainEvent
} from '../domain/events/block-completed.event';
import type { FocusHistoryEntry } from '../domain/history/focus-history-entry.entity';
import type { TimerMode } from '../domain/timer/timer-fsm';

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

	it('should format 1 completed block with singular label "block"', () => {
		expect(formatDailyStatsSummary(1, 25)).toBe('1 block · 25m');
		expect(formatDailyStatsSummary(1, 60)).toBe('1 block · 1h 0m');
	});

	it('should format multiple completed blocks with plural label "blocks"', () => {
		expect(formatDailyStatsSummary(2, 50)).toBe('2 blocks · 50m');
		expect(formatDailyStatsSummary(4, 60)).toBe('4 blocks · 1h 0m');
		expect(formatDailyStatsSummary(4, 100)).toBe('4 blocks · 1h 40m');
	});
});

describe('DailyStatsState (derived from the focus history)', () => {
	// Local-time clock: the counter compares local calendar days.
	let currentDate: Date;
	const nowProvider = () => currentDate;

	let storage: InMemoryStorage;
	let repository: LocalFocusHistoryRepository;
	let timer: MockTimerEmitter;
	let history: FocusHistoryState;
	let state: DailyStatsState;

	function offsetOf(date: Date): number {
		return 0 - date.getTimezoneOffset();
	}

	function entry(overrides: Partial<FocusHistoryEntry> = {}): FocusHistoryEntry {
		return {
			mode: 'focus',
			outcome: 'completed',
			plannedMs: 1_500_000,
			elapsedMs: 1_500_000,
			endedAt: currentDate.getTime(),
			utcOffsetMinutes: offsetOf(currentDate),
			...overrides
		};
	}

	async function seed(...entries: FocusHistoryEntry[]): Promise<void> {
		for (const seeded of entries) {
			await repository.append(seeded);
		}
		history.destroy();
		history = createFocusHistoryState({ repository, timer, nowProvider });
		state = createDailyStatsState(history, nowProvider);
		await history.whenIdle();
	}

	function blockEvent(
		type: 'block-completed' | 'block-skipped' | 'block-abandoned',
		mode: TimerMode,
		durationMs: number,
		round = 1
	): DomainEvent {
		const base = { mode, round, totalRoundsCompleted: round, durationMs, elapsedMs: durationMs };
		if (type === 'block-completed') {
			return { type, ...base, completedAt: currentDate } satisfies BlockCompletedEvent;
		}
		if (type === 'block-skipped') {
			return { type, ...base, skippedAt: currentDate } satisfies BlockSkippedEvent;
		}
		return { type, ...base, abandonedAt: currentDate } satisfies BlockAbandonedEvent;
	}

	async function completeFocus(durationMs: number, round = 1): Promise<void> {
		timer.emit(blockEvent('block-completed', 'focus', durationMs, round));
		await history.whenIdle();
	}

	beforeEach(() => {
		currentDate = new Date(2026, 9, 3, 10, 0, 0); // 2026-10-03
		storage = new InMemoryStorage();
		repository = new LocalFocusHistoryRepository(storage, nowProvider);
		timer = new MockTimerEmitter();
		history = createFocusHistoryState({ repository, timer, nowProvider });
		state = createDailyStatsState(history, nowProvider);
	});

	afterEach(() => {
		history.destroy();
	});

	describe('previous outputs (differential)', () => {
		const cases: ReadonlyArray<{ durationsMs: number[]; expected: string }> = [
			{ durationsMs: [], expected: '0 blocks · 0m' },
			{ durationsMs: [1_500_000], expected: '1 block · 25m' },
			{
				durationsMs: [1_500_000, 1_500_000, 1_500_000, 1_500_000],
				expected: '4 blocks · 1h 40m'
			},
			{ durationsMs: [90_000, 30_000], expected: '2 blocks · 3m' },
			{ durationsMs: [29_999], expected: '1 block · 0m' },
			{ durationsMs: [3_000_000, 1_500_000, 1_500_000], expected: '3 blocks · 1h 40m' }
		];

		it.each(cases)(
			'shows $expected for the blocks $durationsMs, same as the previous counter',
			async ({ durationsMs, expected }) => {
				for (const [index, durationMs] of durationsMs.entries()) {
					await completeFocus(durationMs, index + 1);
				}

				expect(state.formattedSummary).toBe(expected);
			}
		);
	});

	describe('initial load from the history', () => {
		it('starts at zero with today’s date when the history is empty', async () => {
			await history.whenIdle();

			expect(state.completedBlocks).toBe(0);
			expect(state.accumulatedMinutes).toBe(0);
			expect(state.date).toBe('2026-10-03');
			expect(state.formattedSummary).toBe('0 blocks · 0m');
		});

		it('counts the focus blocks already completed today', async () => {
			await seed(entry(), entry(), entry({ plannedMs: 1_500_000 }));

			expect(state.completedBlocks).toBe(3);
			expect(state.accumulatedMinutes).toBe(75);
			expect(state.formattedSummary).toBe('3 blocks · 1h 15m');
		});

		it('does not count yesterday’s or tomorrow’s blocks', async () => {
			const day = 24 * 60 * 60 * 1000;
			await seed(
				entry({ endedAt: currentDate.getTime() - day }),
				entry({ endedAt: currentDate.getTime() + day }),
				entry()
			);

			expect(state.completedBlocks).toBe(1);
			expect(state.accumulatedMinutes).toBe(25);
		});
	});

	describe('what counts', () => {
		it('adds a block to the counter as soon as the timer completes it', async () => {
			expect(state.formattedSummary).toBe('0 blocks · 0m');

			await completeFocus(1_500_000);

			expect(state.completedBlocks).toBe(1);
			expect(state.accumulatedMinutes).toBe(25);
			expect(state.formattedSummary).toBe('1 block · 25m');
		});

		it('ignores breaks, skipped and abandoned blocks', async () => {
			timer.emit(blockEvent('block-completed', 'shortBreak', 300_000));
			timer.emit(blockEvent('block-completed', 'longBreak', 900_000));
			timer.emit(blockEvent('block-skipped', 'focus', 1_500_000));
			timer.emit(blockEvent('block-skipped', 'shortBreak', 300_000));
			timer.emit(blockEvent('block-abandoned', 'focus', 1_500_000));
			await history.whenIdle();

			expect(history.entries.length).toBeGreaterThan(0);
			expect(state.completedBlocks).toBe(0);
			expect(state.accumulatedMinutes).toBe(0);
			expect(state.formattedSummary).toBe('0 blocks · 0m');
		});

		it('attributes an entry to the day of its stored offset, not the machine’s', async () => {
			// 23:50 on 2026-10-03 at UTC-03:00, whatever offset this machine has.
			const lateNight = Date.UTC(2026, 9, 4, 2, 50, 0);
			await seed(entry({ endedAt: lateNight, utcOffsetMinutes: -180 }));

			expect(state.completedBlocks).toBe(1);
		});

		it('leaves out an entry that is already the next day for its own offset', async () => {
			// 00:10 on 2026-10-04 at UTC+02:00 is still 22:10 UTC on the 3rd.
			const afterMidnight = Date.UTC(2026, 9, 3, 22, 10, 0);
			await seed(entry({ endedAt: afterMidnight, utcOffsetMinutes: 120 }));

			expect(state.completedBlocks).toBe(0);
		});

		it('counts entries migrated from the legacy counter', async () => {
			await seed(
				entry({ migrated: true, plannedMs: 1_500_000, elapsedMs: 1_500_000 }),
				entry({ migrated: true, plannedMs: 1_500_000, elapsedMs: 1_500_000 })
			);

			expect(state.formattedSummary).toBe('2 blocks · 50m');
		});

		it('shows what the legacy counter showed after the migration (4 blocks, 100 minutes)', async () => {
			storage.setItem(
				LEGACY_DAILY_STATS_STORAGE_KEY,
				JSON.stringify({
					version: 1,
					stats: { date: '2026-10-03', completedBlocks: 4, accumulatedMinutes: 100 }
				})
			);
			history.destroy();
			history = createFocusHistoryState({
				repository,
				timer,
				nowProvider,
				migrateLegacy: (repo, now) => migrateLegacyDailyStats({ storage, repository: repo, now })
			});
			state = createDailyStatsState(history, nowProvider);
			await history.whenIdle();

			expect(state.formattedSummary).toBe('4 blocks · 1h 40m');
		});

		it('drops back to zero when the history is cleared', async () => {
			await completeFocus(1_500_000);
			await completeFocus(1_500_000, 2);
			expect(state.completedBlocks).toBe(2);

			await history.clear();

			expect(state.completedBlocks).toBe(0);
			expect(state.accumulatedMinutes).toBe(0);
			expect(state.formattedSummary).toBe('0 blocks · 0m');
		});
	});

	describe('day rollover', () => {
		it('starts the new day at zero without writing anything', async () => {
			await completeFocus(1_500_000);
			await completeFocus(1_500_000, 2);
			expect(state.completedBlocks).toBe(2);
			const stored = storage.getItem('pomody:focus-history');
			const writes: string[] = [];
			const realSetItem = storage.setItem.bind(storage);
			storage.setItem = (key, value) => {
				writes.push(key);
				realSetItem(key, value);
			};

			currentDate = new Date(2026, 9, 4, 0, 1, 0);

			expect(state.checkRollover()).toBe(true);
			expect(state.completedBlocks).toBe(0);
			expect(state.accumulatedMinutes).toBe(0);
			expect(state.date).toBe('2026-10-04');
			expect(state.formattedSummary).toBe('0 blocks · 0m');
			expect(writes).toEqual([]);
			expect(storage.getItem('pomody:focus-history')).toBe(stored);
		});

		it('returns false from checkRollover while the date has not changed', async () => {
			await completeFocus(1_500_000);

			expect(state.checkRollover()).toBe(false);
			expect(state.completedBlocks).toBe(1);
			expect(state.date).toBe('2026-10-03');
		});

		it('counts the first block of the new day on its own, without a previous checkRollover', async () => {
			await completeFocus(1_500_000);
			await completeFocus(1_500_000, 2);
			expect(state.completedBlocks).toBe(2);

			currentDate = new Date(2026, 9, 4, 9, 0, 0);
			await completeFocus(1_500_000, 3);

			expect(state.completedBlocks).toBe(1);
			expect(state.accumulatedMinutes).toBe(25);
			expect(state.date).toBe('2026-10-04');
			expect(state.formattedSummary).toBe('1 block · 25m');
		});

		it('brings yesterday’s count back if the clock returns to yesterday', async () => {
			await completeFocus(1_500_000);
			currentDate = new Date(2026, 9, 4, 0, 1, 0);
			state.checkRollover();
			expect(state.completedBlocks).toBe(0);

			currentDate = new Date(2026, 9, 3, 23, 59, 0);

			expect(state.checkRollover()).toBe(true);
			expect(state.completedBlocks).toBe(1);
		});
	});

	describe('singleton and factory function', () => {
		it('should export a singleton dailyStatsState instance', () => {
			expect(dailyStatsState).toBeInstanceOf(DailyStatsState);
		});

		it('should allow creating isolated state instances via createDailyStatsState', () => {
			const isolated = createDailyStatsState(history, nowProvider);
			expect(isolated).toBeInstanceOf(DailyStatsState);
			expect(isolated.completedBlocks).toBe(0);
		});
	});
});
