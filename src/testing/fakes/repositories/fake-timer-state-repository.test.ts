import { describe, it, expect } from 'vitest';
import { FakeTimerStateRepository } from './fake-timer-state-repository';
import { buildTimerSnapshotRecord } from '$lib/domain/timer/timer-snapshot.entity';

describe('FakeTimerStateRepository', () => {
	const snapshot = buildTimerSnapshotRecord({
		state: 'paused',
		mode: 'shortBreak',
		durationMs: 300_000,
		remainingMs: 120_000,
		currentRound: 1,
		totalRoundsCompleted: 0,
		planId: null,
		activeBlockIndex: null,
		now: 1_700_000_000_000
	});

	it('returns null before any save', async () => {
		const repo = new FakeTimerStateRepository();
		expect(await repo.load()).toBeNull();
	});

	it('stores the last saved snapshot', async () => {
		const repo = new FakeTimerStateRepository();
		await repo.save(snapshot);

		expect(await repo.load()).toEqual(snapshot);
		expect(repo.peek()).toEqual(snapshot);
		expect(repo.saveCallCount).toBe(1);
	});

	it('clears the snapshot and counts calls', async () => {
		const repo = new FakeTimerStateRepository(snapshot);
		await repo.clear();

		expect(await repo.load()).toBeNull();
		expect(repo.clearCallCount).toBe(1);
		expect(repo.loadCallCount).toBe(1);
	});
});
