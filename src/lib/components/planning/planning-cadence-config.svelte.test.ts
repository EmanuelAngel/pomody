import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PlanningCadenceConfig, { CADENCE_PRESETS } from './planning-cadence-config.svelte';
import { createPlanningState } from '$lib/state/planning.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import type { ISessionPlanRepository } from '$lib/domain/ports/session-plan-repository.port';
import type { ITaskRepository } from '$lib/domain/ports/task-repository.port';
import type { SessionPlan } from '$lib/domain/planning/session-plan.entity';
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

function setupPlanningState() {
	const taskRepo = new MockTaskRepository();
	const tasksState = createTasksState(taskRepo);
	const planRepo = new MockSessionPlanRepository();
	const timerState = createTimerState();
	return createPlanningState(planRepo, timerState, tasksState);
}

describe('PlanningCadenceConfig (Client Browser)', () => {
	it('exports the standard cadence presets', () => {
		expect(CADENCE_PRESETS).toHaveLength(3);
		expect(CADENCE_PRESETS[0]).toMatchObject({
			id: 'classic',
			name: '25/5',
			label: 'Classic',
			focusMinutes: 25,
			shortBreakMinutes: 5
		});
		expect(CADENCE_PRESETS[1]).toMatchObject({
			id: 'deep-focus',
			name: '50/10',
			label: 'Deep Focus',
			focusMinutes: 50,
			shortBreakMinutes: 10
		});
		expect(CADENCE_PRESETS[2]).toMatchObject({
			id: 'ultradian',
			name: '90/20',
			label: 'Ultradian Rhythm',
			focusMinutes: 90,
			shortBreakMinutes: 20
		});
	});

	it('renders preset chips and highlights active 25/5 preset by default', async () => {
		const planningState = setupPlanningState();
		const screen = await render(PlanningCadenceConfig, { planningState });

		const classicBtn = screen.getByRole('button', { name: /25\/5 Classic/i });
		const deepFocusBtn = screen.getByRole('button', { name: /50\/10 Deep Focus/i });
		const ultradianBtn = screen.getByRole('button', { name: /90\/20 Ultradian Rhythm/i });

		await expect.element(classicBtn).toBeVisible();
		await expect.element(deepFocusBtn).toBeVisible();
		await expect.element(ultradianBtn).toBeVisible();

		// Classic should be active (aria-pressed=true)
		await expect.element(classicBtn).toHaveAttribute('aria-pressed', 'true');
		await expect.element(deepFocusBtn).toHaveAttribute('aria-pressed', 'false');
	});

	it('switches cadence when clicking a preset chip', async () => {
		const planningState = setupPlanningState();
		const screen = await render(PlanningCadenceConfig, { planningState });

		const deepFocusBtn = screen.getByRole('button', { name: /50\/10 Deep Focus/i });
		await deepFocusBtn.click();

		expect(planningState.focusMinutes).toBe(50);
		expect(planningState.shortBreakMinutes).toBe(10);
		expect(planningState.longBreakMinutes).toBe(20);
		expect(planningState.longBreakInterval).toBe(4);

		await expect.element(deepFocusBtn).toHaveAttribute('aria-pressed', 'true');

		// Click ultradian preset
		const ultradianBtn = screen.getByRole('button', { name: /90\/20 Ultradian Rhythm/i });
		await ultradianBtn.click();

		expect(planningState.focusMinutes).toBe(90);
		expect(planningState.shortBreakMinutes).toBe(20);
		expect(planningState.longBreakMinutes).toBe(30);
		expect(planningState.longBreakInterval).toBe(3);
		await expect.element(ultradianBtn).toHaveAttribute('aria-pressed', 'true');
	});

	it('adjusts block count in blocks mode', async () => {
		const planningState = setupPlanningState();
		const screen = await render(PlanningCadenceConfig, { planningState });

		expect(planningState.blockCount).toBe(4);

		const incBtn = screen.getByRole('button', { name: 'Increase block count' });
		await incBtn.click();
		expect(planningState.blockCount).toBe(5);

		const decBtn = screen.getByRole('button', { name: 'Decrease block count' });
		await decBtn.click();
		expect(planningState.blockCount).toBe(4);
	});

	it('renders target end time and scheduled start in end_time mode', async () => {
		const planningState = setupPlanningState();
		planningState.setTargetMode('end_time');

		const screen = await render(PlanningCadenceConfig, { planningState });

		await expect.element(screen.getByLabelText('Target finish time')).toBeVisible();
		await expect.element(screen.getByLabelText('Scheduled start time')).toBeVisible();
		await expect.element(screen.getByRole('button', { name: 'Now' })).toBeVisible();
	});

	it('toggles progressive disclosure panel and reveals fine-tuning steppers', async () => {
		const planningState = setupPlanningState();
		const screen = await render(PlanningCadenceConfig, { planningState });

		const toggleBtn = screen.getByRole('button', { name: 'Customize cadence' });
		await expect.element(toggleBtn).toBeVisible();
		await expect.element(toggleBtn).toHaveAttribute('aria-expanded', 'false');

		// Steppers should not be in document initially
		await expect
			.element(screen.getByRole('button', { name: 'Increase focus duration' }))
			.not.toBeInTheDocument();

		// Expand
		await toggleBtn.click();
		await expect.element(toggleBtn).toHaveAttribute('aria-expanded', 'true');

		const incFocusBtn = screen.getByRole('button', { name: 'Increase focus duration' });
		await expect.element(incFocusBtn).toBeVisible();

		// Tweak focus to custom 30m
		await incFocusBtn.click();
		expect(planningState.focusMinutes).toBe(30);

		// "Custom" badge should now be visible
		await expect.element(screen.getByText('Custom', { exact: true })).toBeVisible();

		// Collapse
		await toggleBtn.click();
		await expect.element(toggleBtn).toHaveAttribute('aria-expanded', 'false');
		await expect
			.element(screen.getByRole('button', { name: 'Increase focus duration' }))
			.not.toBeInTheDocument();
	});
});
