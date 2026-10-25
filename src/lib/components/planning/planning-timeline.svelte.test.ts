import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PlanningTimeline from './planning-timeline.svelte';
import { createNavigationState } from '$lib/state/navigation.svelte';
import { createPlanningState } from '$lib/state/planning.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { FakeSessionPlanRepository } from '$tests/fakes/repositories/fake-session-plan-repository';
import { FakeTaskRepository } from '$tests/fakes/repositories/fake-task-repository';

async function setupScreen() {
	const planRepo = new FakeSessionPlanRepository();
	const timerState = createTimerState();
	const tasksState = createTasksState(new FakeTaskRepository());
	await tasksState.load();
	const planningState = createPlanningState(planRepo, timerState, tasksState);
	const navigationState = createNavigationState('planning');

	planningState.setFocusMinutes(45);
	planningState.setShortBreakMinutes(15);
	planningState.setLongBreakInterval(3);
	planningState.setBlockCount(2);
	planningState.setScheduledStartTime('12:00');

	const screen = await render(PlanningTimeline, {
		planningState,
		tasksState,
		timerState,
		navigationState
	});

	return { screen, planningState };
}

describe('PlanningTimeline estimated block windows (Client Browser)', () => {
	it('shows the estimated start-end window of every block from the session config', async () => {
		const { screen } = await setupScreen();

		await expect.element(screen.getByText('12:00 – 12:45')).toBeVisible();
		await expect.element(screen.getByText('12:45 – 13:00')).toBeVisible();
		await expect.element(screen.getByText('13:00 – 13:45')).toBeVisible();
	});

	it('re-projects the windows when the cadence changes', async () => {
		const { screen, planningState } = await setupScreen();

		planningState.setFocusMinutes(30);

		await expect.element(screen.getByText('12:00 – 12:30')).toBeVisible();
		await expect.element(screen.getByText('12:30 – 12:45')).toBeVisible();
	});
});
