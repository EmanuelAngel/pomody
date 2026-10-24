import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	FocusHistoryState,
	createFocusHistoryState,
	focusHistoryState
} from './focus-history.svelte';
import {
	FOCUS_HISTORY_STORAGE_KEY,
	LocalFocusHistoryRepository
} from '../adapters/storage/local-focus-history-repository';
import { InMemoryStorage } from '../adapters/storage/in-memory-storage';
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

const NOW = new Date('2026-10-23T14:05:00.000Z');
const OFFSET = 0 - NOW.getTimezoneOffset();

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

interface TasksDouble {
	activeTask: { id: string; title: string } | null;
}

function completed(overrides: Partial<BlockCompletedEvent> = {}): BlockCompletedEvent {
	return {
		type: 'block-completed',
		mode: 'focus',
		round: 1,
		totalRoundsCompleted: 1,
		durationMs: 1_500_000,
		elapsedMs: 1_500_000,
		completedAt: NOW,
		...overrides
	};
}

function skipped(overrides: Partial<BlockSkippedEvent> = {}): BlockSkippedEvent {
	return {
		type: 'block-skipped',
		mode: 'focus',
		round: 1,
		totalRoundsCompleted: 0,
		durationMs: 1_500_000,
		elapsedMs: 300_000,
		skippedAt: NOW,
		...overrides
	};
}

function abandoned(overrides: Partial<BlockAbandonedEvent> = {}): BlockAbandonedEvent {
	return {
		type: 'block-abandoned',
		mode: 'focus',
		round: 1,
		totalRoundsCompleted: 0,
		durationMs: 1_500_000,
		elapsedMs: 600_000,
		abandonedAt: NOW,
		...overrides
	};
}

describe('FocusHistoryState', () => {
	let storage: InMemoryStorage;
	let repository: LocalFocusHistoryRepository;
	let timer: MockTimerEmitter;
	let tasks: TasksDouble;
	let state: FocusHistoryState;

	beforeEach(() => {
		storage = new InMemoryStorage();
		repository = new LocalFocusHistoryRepository(storage, () => NOW);
		timer = new MockTimerEmitter();
		tasks = { activeTask: null };
		state = createFocusHistoryState({ repository, timer, tasks, nowProvider: () => NOW });
	});

	afterEach(() => {
		state.destroy();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it('starts empty and subscribes to the timer', async () => {
		await state.whenIdle();

		expect(state.entries).toEqual([]);
		expect(timer.subscribers.size).toBe(1);
	});

	it('loads the entries already stored', async () => {
		const stored: FocusHistoryEntry = {
			mode: 'focus',
			outcome: 'completed',
			plannedMs: 1_500_000,
			elapsedMs: 1_500_000,
			endedAt: NOW.getTime() - 1000,
			utcOffsetMinutes: 0
		};
		await repository.append(stored);

		const other = createFocusHistoryState({ repository, timer, tasks, nowProvider: () => NOW });
		await other.whenIdle();

		expect(other.entries).toEqual([stored]);
		other.destroy();
	});

	describe('recording', () => {
		it('records a completed focus block and persists it', async () => {
			timer.emit(completed());
			await state.whenIdle();

			const expected = {
				mode: 'focus',
				outcome: 'completed',
				plannedMs: 1_500_000,
				elapsedMs: 1_500_000,
				endedAt: NOW.getTime(),
				utcOffsetMinutes: OFFSET
			};
			expect(state.entries).toEqual([expected]);
			expect(await repository.getAll()).toEqual([expected]);
		});

		it('records a skipped focus block with its partial elapsed time', async () => {
			timer.emit(skipped());
			await state.whenIdle();

			expect(state.entries).toEqual([
				expect.objectContaining({ mode: 'focus', outcome: 'skipped', elapsedMs: 300_000 })
			]);
		});

		it('records an abandoned focus block', async () => {
			timer.emit(abandoned());
			await state.whenIdle();

			expect(state.entries).toEqual([
				expect.objectContaining({ mode: 'focus', outcome: 'abandoned', elapsedMs: 600_000 })
			]);
		});

		it('records short and long breaks for every outcome', async () => {
			timer.emit(completed({ mode: 'shortBreak', durationMs: 300_000, elapsedMs: 300_000 }));
			timer.emit(skipped({ mode: 'longBreak', durationMs: 900_000, elapsedMs: 0 }));
			timer.emit(abandoned({ mode: 'shortBreak', durationMs: 300_000, elapsedMs: 100_000 }));
			await state.whenIdle();

			expect(state.entries.map((e) => [e.mode, e.outcome, e.plannedMs, e.elapsedMs])).toEqual([
				['shortBreak', 'completed', 300_000, 300_000],
				['longBreak', 'skipped', 900_000, 0],
				['shortBreak', 'abandoned', 300_000, 100_000]
			]);
		});

		it('copies the active task id and title at the time of the event', async () => {
			tasks.activeTask = { id: 't_3', title: 'Write report' };
			timer.emit(completed());
			tasks.activeTask = { id: 't_4', title: 'Another' };
			await state.whenIdle();

			expect(state.entries[0]).toMatchObject({ taskId: 't_3', taskTitle: 'Write report' });
		});

		it('leaves both task fields absent without an active task', async () => {
			timer.emit(completed());
			await state.whenIdle();

			expect(Object.keys(state.entries[0])).not.toContain('taskId');
			expect(Object.keys(state.entries[0])).not.toContain('taskTitle');
		});

		it('records a cold skip with elapsedMs 0', async () => {
			timer.emit(skipped({ elapsedMs: 0 }));
			await state.whenIdle();

			expect(state.entries).toEqual([
				expect.objectContaining({ outcome: 'skipped', elapsedMs: 0 })
			]);
		});

		it('keeps one entry per event when events arrive back to back', async () => {
			timer.emit(completed({ round: 1 }));
			timer.emit(completed({ mode: 'shortBreak', durationMs: 300_000, elapsedMs: 300_000 }));
			timer.emit(completed({ round: 2 }));
			await state.whenIdle();

			expect(await repository.getAll()).toHaveLength(3);
			expect(state.entries).toHaveLength(3);
		});
	});

	describe('skip pressed from the completed state (L8)', () => {
		it('ignores a block-skipped that follows a block-completed of the same mode and round', async () => {
			timer.emit(completed());
			timer.emit(skipped({ elapsedMs: 1_500_000 }));
			await state.whenIdle();

			expect(state.entries).toEqual([expect.objectContaining({ outcome: 'completed' })]);
		});

		it('only suppresses that one skip', async () => {
			timer.emit(completed());
			timer.emit(skipped({ elapsedMs: 1_500_000 }));
			timer.emit(skipped({ elapsedMs: 0 }));
			await state.whenIdle();

			expect(state.entries.map((e) => [e.outcome, e.elapsedMs])).toEqual([
				['completed', 1_500_000],
				['skipped', 0]
			]);
		});

		it('still records a skip of a different round or mode', async () => {
			timer.emit(completed({ round: 1 }));
			timer.emit(skipped({ round: 2, elapsedMs: 1_500_000 }));
			timer.emit(completed({ round: 3 }));
			timer.emit(
				skipped({ mode: 'shortBreak', round: 3, durationMs: 300_000, elapsedMs: 300_000 })
			);
			await state.whenIdle();

			expect(state.entries.map((e) => e.outcome)).toEqual([
				'completed',
				'skipped',
				'completed',
				'skipped'
			]);
		});

		it('still records a genuine mid-block skip in the same mode and round', async () => {
			timer.emit(completed());
			timer.emit(skipped({ elapsedMs: 120_000 }));
			await state.whenIdle();

			expect(state.entries.map((e) => e.outcome)).toEqual(['completed', 'skipped']);
		});

		it('does not suppress a skip once another event came in between', async () => {
			timer.emit(completed());
			timer.emit(abandoned({ round: 2 }));
			timer.emit(skipped({ elapsedMs: 1_500_000 }));
			await state.whenIdle();

			expect(state.entries.map((e) => e.outcome)).toEqual(['completed', 'abandoned', 'skipped']);
		});
	});

	describe('clear', () => {
		it('clears the repository and the exposed entries', async () => {
			timer.emit(completed());
			await state.whenIdle();

			await state.clear();

			expect(state.entries).toEqual([]);
			expect(await repository.getAll()).toEqual([]);
			expect(storage.getItem(FOCUS_HISTORY_STORAGE_KEY)).toBeNull();
		});

		it('leaves the history empty when clear() runs right after an append is queued', async () => {
			timer.emit(completed());
			await state.clear();
			await state.whenIdle();

			expect(state.entries).toEqual([]);
			expect(await repository.getAll()).toEqual([]);
		});
	});

	describe('external changes', () => {
		it('refreshes the entries when another tab writes the same key', async () => {
			const target = new EventTarget();
			vi.stubGlobal('window', target);
			const tab = createFocusHistoryState({ repository, timer, tasks, nowProvider: () => NOW });
			await tab.whenIdle();

			const otherTabRepository = new LocalFocusHistoryRepository(storage, () => NOW);
			await otherTabRepository.append({
				mode: 'focus',
				outcome: 'completed',
				plannedMs: 1_500_000,
				elapsedMs: 1_500_000,
				endedAt: NOW.getTime() - 1000,
				utcOffsetMinutes: 0
			});
			target.dispatchEvent(Object.assign(new Event('storage'), { key: FOCUS_HISTORY_STORAGE_KEY }));
			await tab.whenIdle();

			expect(tab.entries).toHaveLength(1);
			tab.destroy();
		});

		it('stops listening after destroy', async () => {
			const target = new EventTarget();
			vi.stubGlobal('window', target);
			const tab = createFocusHistoryState({ repository, timer, tasks, nowProvider: () => NOW });
			await tab.whenIdle();
			tab.destroy();

			await repository.append({
				mode: 'focus',
				outcome: 'completed',
				plannedMs: 1_500_000,
				elapsedMs: 1_500_000,
				endedAt: NOW.getTime() - 1000,
				utcOffsetMinutes: 0
			});
			target.dispatchEvent(Object.assign(new Event('storage'), { key: FOCUS_HISTORY_STORAGE_KEY }));
			await tab.whenIdle();

			expect(tab.entries).toEqual([]);
		});
	});

	describe('destroy', () => {
		it('unsubscribes from the timer so later events are ignored', async () => {
			state.destroy();
			timer.emit(completed());
			await state.whenIdle();

			expect(timer.subscribers.size).toBe(0);
			expect(await repository.getAll()).toEqual([]);
		});

		it('is idempotent', () => {
			state.destroy();

			expect(() => state.destroy()).not.toThrow();
		});
	});
});

describe('FocusHistoryState legacy migration', () => {
	const LEGACY_TODAY = JSON.stringify({
		version: 1,
		stats: { date: '2026-10-23', completedBlocks: 3, accumulatedMinutes: 75 }
	});
	// A local-time clock keeps the legacy date equal to today's wherever the tests run.
	const LOCAL_NOW = new Date(2026, 9, 23, 14, 5, 0);

	let storage: InMemoryStorage;
	let repository: LocalFocusHistoryRepository;
	let timer: MockTimerEmitter;
	const states: FocusHistoryState[] = [];

	function createState(migrate = true): FocusHistoryState {
		const state = createFocusHistoryState({
			repository,
			timer,
			tasks: { activeTask: null },
			nowProvider: () => LOCAL_NOW,
			...(migrate
				? {
						migrateLegacy: (repo, now) =>
							migrateLegacyDailyStats({ storage, repository: repo, now })
					}
				: {})
		});
		states.push(state);
		return state;
	}

	beforeEach(() => {
		storage = new InMemoryStorage();
		repository = new LocalFocusHistoryRepository(storage, () => LOCAL_NOW);
		timer = new MockTimerEmitter();
		storage.setItem(LEGACY_DAILY_STATS_STORAGE_KEY, LEGACY_TODAY);
	});

	afterEach(() => {
		states.splice(0).forEach((state) => state.destroy());
		vi.restoreAllMocks();
	});

	it('migrates before the first load, so the exposed entries already include them', async () => {
		const state = createState();
		await state.whenIdle();

		expect(state.entries).toHaveLength(3);
		expect(state.entries.every((entry) => entry.migrated === true)).toBe(true);
		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBeNull();
	});

	it('migrates only once across restarts', async () => {
		await createState().whenIdle();

		const restarted = createState();
		await restarted.whenIdle();

		expect(restarted.entries).toHaveLength(3);
	});

	it('records a block finished while the migration is pending after the migrated ones', async () => {
		const state = createState();
		timer.emit(completed());
		await state.whenIdle();

		expect(state.entries).toHaveLength(4);
		expect(state.entries.filter((entry) => entry.migrated === true)).toHaveLength(3);
	});

	it('leaves the legacy record alone when no migration is configured', async () => {
		const state = createState(false);
		await state.whenIdle();

		expect(state.entries).toEqual([]);
		expect(storage.getItem(LEGACY_DAILY_STATS_STORAGE_KEY)).toBe(LEGACY_TODAY);
	});

	it('starts normally when the migration fails', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const state = createFocusHistoryState({
			repository,
			timer,
			tasks: { activeTask: null },
			nowProvider: () => LOCAL_NOW,
			migrateLegacy: () => Promise.reject(new Error('boom'))
		});
		states.push(state);
		timer.emit(completed());
		await state.whenIdle();

		expect(state.entries).toHaveLength(1);
	});
});

describe('focusHistoryState singleton', () => {
	it('exposes a ready-to-use shared instance', () => {
		expect(focusHistoryState).toBeInstanceOf(FocusHistoryState);
		expect(Array.isArray(focusHistoryState.entries)).toBe(true);
	});
});
