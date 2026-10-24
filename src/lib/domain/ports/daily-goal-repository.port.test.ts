import { describe, it, expect, vi } from 'vitest';
import { InMemoryStorage } from '../../adapters/storage/in-memory-storage';
import { LocalDailyGoalRepository } from '../../adapters/storage/local-daily-goal-repository';
import type { IDailyGoalRepository } from './daily-goal-repository.port';
import type { DailyGoalChange } from '../goals/daily-goal.entity';

function change(overrides: Partial<DailyGoalChange> = {}): DailyGoalChange {
	return { effectiveFrom: '2026-10-20', minutes: 120, restWeekdays: [6, 7], ...overrides };
}

describe('IDailyGoalRepository port contract', () => {
	it('should satisfy the IDailyGoalRepository contract across all operations', async () => {
		const repository: IDailyGoalRepository = new LocalDailyGoalRepository(new InMemoryStorage());

		expect(await repository.getHistory()).toEqual([]);

		const later = change({ effectiveFrom: '2026-10-23', minutes: 90 });
		await repository.applyChange(later);
		await repository.applyChange(change());

		expect(await repository.getHistory()).toEqual([change(), later]);

		const listener = vi.fn();
		const unsubscribe = repository.onExternalChange(listener);
		expect(typeof unsubscribe).toBe('function');
		unsubscribe();
	});
});
