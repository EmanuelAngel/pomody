import type { TimerSnapshotRecord } from '$lib/domain/timer/timer-snapshot.entity';
import type { ITimerStateRepository } from '$lib/domain/ports/timer-state-repository.port';

/**
 * In-memory test fake implementing ITimerStateRepository.
 * Keeps the last saved snapshot and tracks call counts for assertions.
 */
export class FakeTimerStateRepository implements ITimerStateRepository {
	private snapshot: TimerSnapshotRecord | null = null;
	public loadCallCount = 0;
	public saveCallCount = 0;
	public clearCallCount = 0;

	constructor(initialSnapshot: TimerSnapshotRecord | null = null) {
		this.snapshot = initialSnapshot;
	}

	async load(): Promise<TimerSnapshotRecord | null> {
		this.loadCallCount++;
		return this.snapshot;
	}

	async save(snapshot: TimerSnapshotRecord): Promise<void> {
		this.saveCallCount++;
		this.snapshot = snapshot;
	}

	async clear(): Promise<void> {
		this.clearCallCount++;
		this.snapshot = null;
	}

	/** Test-only accessor for the last written snapshot. */
	public peek(): TimerSnapshotRecord | null {
		return this.snapshot;
	}
}
