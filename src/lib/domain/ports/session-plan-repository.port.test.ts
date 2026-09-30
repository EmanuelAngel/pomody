import { describe, it, expect } from 'vitest';
import type { ISessionPlanRepository } from './session-plan-repository.port';
import { calculateSessionBudgetByBlocks, type SessionPlan } from '../planning/session-plan.entity';
import { DEFAULT_TIMER_CONFIG } from '../timer/timer-fsm';

describe('ISessionPlanRepository port contract', () => {
	class InMemorySessionPlanRepository implements ISessionPlanRepository {
		private plan: SessionPlan | null = null;

		public async getActivePlan(): Promise<SessionPlan | null> {
			return this.plan;
		}

		public async saveActivePlan(plan: SessionPlan): Promise<void> {
			this.plan = plan;
		}

		public async clearActivePlan(): Promise<void> {
			this.plan = null;
		}
	}

	it('should satisfy the ISessionPlanRepository contract across all operations', async () => {
		const repo: ISessionPlanRepository = new InMemorySessionPlanRepository();

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
