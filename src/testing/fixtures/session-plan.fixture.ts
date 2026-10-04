import {
	calculateSessionBudgetByBlocks,
	type CalculateSessionBudgetByBlocksParams,
	type SessionPlan
} from '$lib/domain/planning/session-plan.entity';
import { DEFAULT_TIMER_CONFIG } from '$lib/domain/timer/timer-fsm';

/**
 * Creates a valid SessionPlan fixture with sensible defaults.
 */
export function createSessionPlanFixture(
	overrides: Partial<CalculateSessionBudgetByBlocksParams> = {}
): SessionPlan {
	return calculateSessionBudgetByBlocks({
		blockCount: 4,
		sessionConfig: DEFAULT_TIMER_CONFIG,
		id: 'plan-fixture-1',
		createdAt: 1000,
		...overrides
	});
}
