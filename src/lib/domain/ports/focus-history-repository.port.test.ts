import { describe, it, expect, vi } from 'vitest';
import { InMemoryStorage } from '../../adapters/storage/in-memory-storage';
import { LocalFocusHistoryRepository } from '../../adapters/storage/local-focus-history-repository';
import type { IFocusHistoryRepository } from './focus-history-repository.port';
import type { FocusHistoryEntry } from '../history/focus-history-entry.entity';

const NOW = new Date('2026-10-23T14:05:00.000Z');

function entry(endedAt: number): FocusHistoryEntry {
	return {
		mode: 'focus',
		outcome: 'completed',
		plannedMs: 1_500_000,
		elapsedMs: 1_500_000,
		endedAt,
		utcOffsetMinutes: 0
	};
}

describe('IFocusHistoryRepository port contract', () => {
	it('should satisfy the IFocusHistoryRepository contract across all operations', async () => {
		const repository: IFocusHistoryRepository = new LocalFocusHistoryRepository(
			new InMemoryStorage(),
			() => NOW
		);

		expect(await repository.getAll()).toEqual([]);

		const later = entry(NOW.getTime() - 1000);
		const earlier = entry(NOW.getTime() - 5000);
		await repository.append(later);
		await repository.append(earlier);

		expect(await repository.getAll()).toEqual([earlier, later]);

		const listener = vi.fn();
		const unsubscribe = repository.onExternalChange(listener);
		expect(typeof unsubscribe).toBe('function');
		unsubscribe();

		await repository.clearAll();
		expect(await repository.getAll()).toEqual([]);
	});
});
