import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import EndSessionDialog from './end-session-dialog.svelte';
import { createPlanningState } from '$lib/state/planning.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { localeState } from '$lib/state/locale.svelte';
import type { ISessionPlanRepository } from '$lib/domain/ports/session-plan-repository.port';
import type { SessionPlan } from '$lib/domain/planning/session-plan.entity';
import type { ITaskRepository } from '$lib/domain/ports/task-repository.port';
import type { FocusTask } from '$lib/domain/tasks/task.entity';

class MockSessionPlanRepository implements ISessionPlanRepository {
	private plan: SessionPlan | null = null;
	async getActivePlan(): Promise<SessionPlan | null> {
		return this.plan;
	}
	async saveActivePlan(plan: SessionPlan): Promise<void> {
		this.plan = plan;
	}
	async clearActivePlan(): Promise<void> {
		this.plan = null;
	}
}

class MockTaskRepository implements ITaskRepository {
	async getAll(): Promise<readonly FocusTask[]> {
		return [];
	}
	async getPending(): Promise<readonly FocusTask[]> {
		return [];
	}
	async save(): Promise<void> {}
	async saveBatch(): Promise<void> {}
	async delete(): Promise<void> {}
	async clearCompleted(): Promise<void> {}
	async clearAll(): Promise<void> {}
}

describe('EndSessionDialog (UX-02)', () => {
	it('opens confirmation dialog on trigger click and cancels without ending session', async () => {
		const planRepo = new MockSessionPlanRepository();
		const taskRepo = new MockTaskRepository();
		const timerState = createTimerState();
		const tasksState = createTasksState(taskRepo);
		const planningState = createPlanningState(planRepo, timerState, tasksState);

		await planningState.load();
		await planningState.startSession(timerState, tasksState);
		expect(planningState.isSessionActive).toBe(true);

		const screen = await render(EndSessionDialog, { planningState, timerState });

		const triggerBtn = screen.getByRole('button', { name: 'End Session Plan' });
		await expect.element(triggerBtn).toBeVisible();
		await triggerBtn.click();

		// Dialog content should be visible
		await expect.element(screen.getByText('End Active Session?')).toBeVisible();
		await expect
			.element(
				screen.getByText(
					'This will cancel your ongoing session plan, clear block progression, and reset the active timer.'
				)
			)
			.toBeVisible();

		// Click Cancel
		const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
		await expect.element(cancelBtn).toBeVisible();
		await cancelBtn.click();

		// Session should remain active
		expect(planningState.isSessionActive).toBe(true);
	});

	it('confirms ending session on action button click', async () => {
		const planRepo = new MockSessionPlanRepository();
		const taskRepo = new MockTaskRepository();
		const timerState = createTimerState();
		const tasksState = createTasksState(taskRepo);
		const planningState = createPlanningState(planRepo, timerState, tasksState);

		await planningState.load();
		await planningState.startSession(timerState, tasksState);
		expect(planningState.isSessionActive).toBe(true);

		const screen = await render(EndSessionDialog, { planningState, timerState });

		const triggerBtn = screen.getByRole('button', { name: 'End Session Plan' });
		await triggerBtn.click();

		const confirmBtn = screen.getByRole('button', { name: 'End Session', exact: true });
		await expect.element(confirmBtn).toBeVisible();
		await confirmBtn.click();

		// Session should be ended
		expect(planningState.isSessionActive).toBe(false);
	});

	it('reactively updates translations when switching to Spanish', async () => {
		localeState.setLocale('es');

		const planRepo = new MockSessionPlanRepository();
		const taskRepo = new MockTaskRepository();
		const timerState = createTimerState();
		const tasksState = createTasksState(taskRepo);
		const planningState = createPlanningState(planRepo, timerState, tasksState);

		await planningState.load();
		await planningState.startSession(timerState, tasksState);

		const screen = await render(EndSessionDialog, { planningState, timerState });

		const triggerBtn = screen.getByRole('button', { name: 'Terminar plan de sesión' });
		await expect.element(triggerBtn).toBeVisible();
		await triggerBtn.click();

		await expect.element(screen.getByText('¿Terminar sesión activa?')).toBeVisible();
		await expect
			.element(
				screen.getByText(
					'Esto cancelará tu plan de sesión en curso, borrará la progresión de bloques y reiniciará el temporizador activo.'
				)
			)
			.toBeVisible();

		const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
		await expect.element(cancelBtn).toBeVisible();

		const confirmBtn = screen.getByRole('button', { name: 'Terminar sesión', exact: true });
		await expect.element(confirmBtn).toBeVisible();
	});
});
