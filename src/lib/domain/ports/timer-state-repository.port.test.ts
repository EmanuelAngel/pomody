import { describe, it, expect } from 'vitest';
import { FakeTimerStateRepository } from '$tests/fakes/repositories/fake-timer-state-repository';
import type { ITimerStateRepository } from './timer-state-repository.port';
import { buildTimerSnapshotRecord } from '../timer/timer-snapshot.entity';

describe('ITimerStateRepository port contract', () => {
	it('should satisfy the ITimerStateRepository contract across all operations', async () => {
		const repo: ITimerStateRepository = new FakeTimerStateRepository();

		expect(await repo.load()).toBeNull();

		const snapshot = buildTimerSnapshotRecord({
			state: 'running',
			mode: 'focus',
			durationMs: 1_500_000,
			remainingMs: 600_000,
			currentRound: 2,
			totalRoundsCompleted: 1,
			planId: 'plan-1',
			activeBlockIndex: 3,
			now: 1_700_000_000_000
		});

		await repo.save(snapshot);
		expect(await repo.load()).toEqual(snapshot);

		await repo.clear();
		expect(await repo.load()).toBeNull();
	});
});
