import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import UnderflowAlert from './underflow-alert.svelte';
import { createPlanningState } from '$lib/state/planning.svelte';
import { FakeSessionPlanRepository } from '$tests/fakes/repositories/fake-session-plan-repository';

describe('UnderflowAlert (UX-01)', () => {
	it('renders alert and quick recovery button when time window is insufficient in end_time mode', async () => {
		const repo = new FakeSessionPlanRepository();
		const planningState = createPlanningState(repo);
		await planningState.load();

		planningState.setTargetMode('end_time');
		planningState.setScheduledStartTime('12:00');
		planningState.setFocusMinutes(25);
		planningState.setTargetEndTime('12:10');

		const screen = await render(UnderflowAlert, { planningState });

		const alert = screen.getByRole('alert');
		await expect.element(alert).toBeVisible();
		await expect
			.element(screen.getByText('Time window is too short for a full focus block.'))
			.toBeVisible();

		const adjustBtn = screen.getByRole('button', { name: /Adjust to minimum/i });
		await expect.element(adjustBtn).toBeVisible();

		await adjustBtn.click();

		expect(planningState.projectedPlan.blocks.length).toBeGreaterThanOrEqual(1);
	});

	it('does not render alert when target mode is blocks', async () => {
		const repo = new FakeSessionPlanRepository();
		const planningState = createPlanningState(repo);
		await planningState.load();

		planningState.setTargetMode('blocks');

		const screen = await render(UnderflowAlert, { planningState });

		const alert = screen.getByRole('alert');
		await expect.element(alert).not.toBeInTheDocument();
	});

	it('does not render alert when time window accommodates focus blocks in end_time mode', async () => {
		const repo = new FakeSessionPlanRepository();
		const planningState = createPlanningState(repo);
		await planningState.load();

		planningState.setTargetMode('end_time');
		planningState.setScheduledStartTime('12:00');
		planningState.setFocusMinutes(25);
		planningState.setTargetEndTime('14:00');

		const screen = await render(UnderflowAlert, { planningState });

		const alert = screen.getByRole('alert');
		await expect.element(alert).not.toBeInTheDocument();
	});
});
