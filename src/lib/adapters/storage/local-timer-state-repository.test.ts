import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	LocalTimerStateRepository,
	TIMER_STATE_STORAGE_KEY,
	TIMER_STATE_STORAGE_VERSION
} from './local-timer-state-repository';
import { InMemoryStorage } from './in-memory-storage';
import { buildTimerSnapshotRecord } from '../../domain/timer/timer-snapshot.entity';

const NOW = 1_700_000_000_000;

function makeRecord() {
	return buildTimerSnapshotRecord({
		state: 'running',
		mode: 'focus',
		durationMs: 1_500_000,
		remainingMs: 600_000,
		currentRound: 1,
		totalRoundsCompleted: 0,
		planId: 'plan-1',
		activeBlockIndex: 0,
		now: NOW
	});
}

describe('LocalTimerStateRepository', () => {
	let storage: InMemoryStorage;

	beforeEach(() => {
		storage = new InMemoryStorage();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns null when nothing is stored', async () => {
		const repo = new LocalTimerStateRepository(storage);
		expect(await repo.load()).toBeNull();
	});

	it('round-trips a valid snapshot', async () => {
		const repo = new LocalTimerStateRepository(storage);
		const record = makeRecord();

		await repo.save(record);

		expect(await repo.load()).toEqual(record);
	});

	it('writes a versioned envelope', async () => {
		const repo = new LocalTimerStateRepository(storage);
		await repo.save(makeRecord());

		const parsed = JSON.parse(storage.getItem(TIMER_STATE_STORAGE_KEY) ?? '{}');
		expect(parsed.version).toBe(TIMER_STATE_STORAGE_VERSION);
		expect(parsed.snapshot.planId).toBe('plan-1');
	});

	it('ignores an envelope from an unknown version', async () => {
		const repo = new LocalTimerStateRepository(storage);
		storage.setItem(
			TIMER_STATE_STORAGE_KEY,
			JSON.stringify({ version: TIMER_STATE_STORAGE_VERSION + 1, snapshot: makeRecord() })
		);

		expect(await repo.load()).toBeNull();
	});

	it('ignores corrupt JSON', async () => {
		const repo = new LocalTimerStateRepository(storage);
		storage.setItem(TIMER_STATE_STORAGE_KEY, '{not json');

		expect(await repo.load()).toBeNull();
	});

	it('ignores a snapshot that fails sanitization', async () => {
		const repo = new LocalTimerStateRepository(storage);
		storage.setItem(
			TIMER_STATE_STORAGE_KEY,
			JSON.stringify({ version: TIMER_STATE_STORAGE_VERSION, snapshot: { state: 'running' } })
		);

		expect(await repo.load()).toBeNull();
	});

	it('refuses to persist an invalid snapshot', async () => {
		const repo = new LocalTimerStateRepository(storage);
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await repo.save({ ...makeRecord(), state: 'running', endsAt: undefined } as never);

		expect(storage.getItem(TIMER_STATE_STORAGE_KEY)).toBeNull();
		expect(errorSpy).toHaveBeenCalled();
	});

	it('clears the stored snapshot', async () => {
		const repo = new LocalTimerStateRepository(storage);
		await repo.save(makeRecord());

		await repo.clear();

		expect(storage.getItem(TIMER_STATE_STORAGE_KEY)).toBeNull();
	});

	it('aborts a write when storage holds a newer envelope', async () => {
		storage.setItem(
			TIMER_STATE_STORAGE_KEY,
			JSON.stringify({ version: TIMER_STATE_STORAGE_VERSION + 1, snapshot: makeRecord() })
		);
		const repo = new LocalTimerStateRepository(storage);
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await repo.save(makeRecord());

		const parsed = JSON.parse(storage.getItem(TIMER_STATE_STORAGE_KEY) ?? '{}');
		expect(parsed.version).toBe(TIMER_STATE_STORAGE_VERSION + 1);
		expect(warnSpy).toHaveBeenCalled();
	});

	it('absorbs storage exceptions on save and clear', async () => {
		const throwing = new InMemoryStorage();
		vi.spyOn(throwing, 'setItem').mockImplementation(() => {
			throw new Error('QuotaExceededError');
		});
		vi.spyOn(throwing, 'removeItem').mockImplementation(() => {
			throw new Error('SecurityError');
		});
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const repo = new LocalTimerStateRepository(throwing);

		await expect(repo.save(makeRecord())).resolves.toBeUndefined();
		await expect(repo.clear()).resolves.toBeUndefined();
	});

	it('falls back to in-memory storage outside the browser', async () => {
		const repo = new LocalTimerStateRepository();
		const record = makeRecord();

		await repo.save(record);

		expect(await repo.load()).toEqual(record);
	});
});
