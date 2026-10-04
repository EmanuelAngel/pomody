import { describe, it, expect } from 'vitest';
import { FakeSessionPlanRepository } from '$tests/fakes/repositories/fake-session-plan-repository';
import type { ISessionPlanRepository } from './session-plan-repository.port';
import { calculateSessionBudgetByBlocks } from '../planning/session-plan.entity';
import { DEFAULT_TIMER_CONFIG } from '../timer/timer-fsm';

describe('ISessionPlanRepository port contract', () => {
	it('should satisfy the ISessionPlanRepository contract across all operations', async () => {
		const repo: ISessionPlanRepository = new FakeSessionPlanRepository();

		expect(await repo.getActivePlan()).toBeNull();

		const plan = calculateSessionBudgetByBlocks({
			blockCount: 2,
			sessionConfig: DEFAULT_TIMER_CONFIG
		});

		await repo.saveActivePlan(plan);
		expect(await repo.getActivePlan()).toEqual(plan);

		await repo.clearActivePlan();
		expect(await repo.getActivePlan()).toBeNull();
	});
});
