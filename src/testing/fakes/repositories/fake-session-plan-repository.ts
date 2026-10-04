import type { SessionPlan } from '$lib/domain/planning/session-plan.entity';
import type { ISessionPlanRepository } from '$lib/domain/ports/session-plan-repository.port';

/**
 * In-memory test fake implementing ISessionPlanRepository.
 * Manages active session plan in-memory and tracks call counts for test assertions.
 */
export class FakeSessionPlanRepository implements ISessionPlanRepository {
	private activePlan: SessionPlan | null = null;
	public getActivePlanCallCount = 0;
	public saveActivePlanCallCount = 0;
	public clearActivePlanCallCount = 0;

	constructor(initialPlan: SessionPlan | null = null) {
		this.activePlan = initialPlan;
	}

	async getActivePlan(): Promise<SessionPlan | null> {
		this.getActivePlanCallCount++;
		return this.activePlan;
	}

	async saveActivePlan(plan: SessionPlan): Promise<void> {
		this.saveActivePlanCallCount++;
		this.activePlan = plan;
	}

	async clearActivePlan(): Promise<void> {
		this.clearActivePlanCallCount++;
		this.activePlan = null;
	}
}
