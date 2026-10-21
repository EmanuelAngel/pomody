import type { SessionPlan } from '../domain/planning/session-plan.entity';
import type { ITimerStateRepository } from '../domain/ports/timer-state-repository.port';
import { LocalTimerStateRepository } from '../adapters/storage/local-timer-state-repository';
import { resolveTimerRestore, type ActivePlanView } from '../domain/timer/timer-snapshot.entity';
import { PlanningState, planningState as defaultPlanningState } from './planning.svelte';
import { TimerState, timerState as defaultTimerState } from './timer.svelte';
import { TasksState, tasksState as defaultTasksState } from './tasks.svelte';

/**
 * Projects the active plan into the structural view the restore resolver validates against,
 * keeping `domain/timer` independent from `domain/planning`.
 */
export function toActivePlanView(plan: SessionPlan, activeBlockIndex: number): ActivePlanView {
	const completed =
		plan.blocks.length > 0 &&
		plan.blocks.every((block) => block.status === 'completed' || block.status === 'skipped');

	return {
		id: plan.id,
		activeBlockIndex,
		completed,
		blocks: plan.blocks.map((block) => ({
			index: block.index,
			mode: block.mode,
			durationSeconds: block.durationSeconds,
			status: block.status
		}))
	};
}

export interface AppBootstrapDependencies {
	planning?: PlanningState;
	timer?: TimerState;
	tasks?: TasksState;
	timerRepository?: ITimerStateRepository;
	now?: () => number;
}

/**
 * Restores the previous session before the application shell renders:
 * plan, timer execution snapshot and active task.
 *
 * The shell must wait for `isReady` so the UI never flashes an idle 25:00 that jumps to
 * the restored block on the next frame.
 */
export class AppBootstrap {
	private readonly planning: PlanningState;
	private readonly timer: TimerState;
	private readonly tasks: TasksState;
	private readonly timerRepository: ITimerStateRepository;
	private readonly now: () => number;

	private _isReady = $state(false);

	constructor(deps: AppBootstrapDependencies = {}) {
		this.planning = deps.planning ?? defaultPlanningState;
		this.timer = deps.timer ?? defaultTimerState;
		this.tasks = deps.tasks ?? defaultTasksState;
		this.timerRepository = deps.timerRepository ?? new LocalTimerStateRepository();
		this.now = deps.now ?? (() => Date.now());
	}

	public get isReady(): boolean {
		return this._isReady;
	}

	/**
	 * Runs the restore pipeline exactly once. A failure never blocks startup:
	 * the app falls back to the default timer and the error is traced.
	 */
	public async restore(): Promise<void> {
		if (this._isReady) {
			return;
		}

		try {
			await this.planning.load();

			const plan = this.planning.activePlan;
			const planView = plan ? toActivePlanView(plan, this.planning.activeBlockIndex) : null;
			const persisted = await this.timerRepository.load();
			const decision = resolveTimerRestore({ persisted, plan: planView, now: this.now() });

			if (decision.kind !== 'adopt') {
				await this.timerRepository.clear();
			}

			this.timer.applyRestoreDecision(decision, plan?.sessionConfig);

			await this.tasks.load();
			this.restoreActiveTask(plan, planView);

			this.timer.persistNow();
		} catch (error) {
			console.error('Failed to restore the previous session; starting from defaults.', error);
		} finally {
			this._isReady = true;
		}
	}

	/**
	 * Derives the task pill from the plan instead of persisting a second copy.
	 * During a break the pill is hidden, so the state is left untouched and the plan
	 * restores it when the next focus block starts.
	 */
	private restoreActiveTask(plan: SessionPlan | null, planView: ActivePlanView | null): void {
		if (!plan || planView?.completed) {
			return;
		}

		const activeBlock = plan.blocks[this.planning.activeBlockIndex];
		if (!activeBlock || activeBlock.mode !== 'focus') {
			return;
		}

		this.tasks.setActiveTask(activeBlock.assignedTaskId ?? null);
	}
}

/** Global singleton bootstrap used by the application shell. */
export const appBootstrap = new AppBootstrap();
