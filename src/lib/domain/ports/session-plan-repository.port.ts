import type { SessionPlan } from '../planning/session-plan.entity';

/**
 * Domain port defining persistence operations for the active SessionPlan.
 * Follows Hexagonal Architecture: pure TypeScript, zero dependencies on DOM, Svelte, or Tauri.
 */
export interface ISessionPlanRepository {
	/**
	 * Retrieves the currently active session plan from persistence.
	 * Returns `null` if no active plan is stored or if storage is corrupted/unsupported.
	 */
	getActivePlan(): Promise<SessionPlan | null>;

	/**
	 * Persists the given session plan as the active plan.
	 */
	saveActivePlan(plan: SessionPlan): Promise<void>;

	/**
	 * Clears the active session plan from persistence.
	 */
	clearActivePlan(): Promise<void>;
}
