import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import CujTestShell from './cuj-test-shell.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { createNavigationState } from '$lib/state/navigation.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import { createPlanningState } from '$lib/state/planning.svelte';
import { FakeTaskRepository } from '$tests/fakes/repositories/fake-task-repository';
import { FakeSessionPlanRepository } from '$tests/fakes/repositories/fake-session-plan-repository';
import { FakeTicker } from '$tests/fakes/engine/fake-ticker';

describe('CUJ 2: Planning-to-Timer Handover (Browser)', () => {
	it('navigates from Timer to Planning, captures and pins a focus task, and verifies reactive handover back in Timer TaskPill', async () => {
		// 1. Arrange: setup isolated in-memory test fakes and state instances
		const fakeTasksRepo = new FakeTaskRepository([]);
		const tasksState = createTasksState(fakeTasksRepo);
		await tasksState.load();

		const navigationState = createNavigationState('timer');
		const fakeTicker = new FakeTicker();
		const timerState = createTimerState(undefined, fakeTicker);
		const planningRepo = new FakeSessionPlanRepository();
		const planningState = createPlanningState(planningRepo);
		await planningState.load();

		// Render isolated CUJ test harness
		const screen = await render(CujTestShell, {
			tasksState,
			navigationState,
			timerState,
			planningState
		});

		// Paso 1: Inicio en Timer
		await expect.element(screen.getByText('Free focus')).toBeVisible();
		await expect.element(screen.getByRole('tabpanel', { name: 'Timer' })).toBeVisible();

		// Paso 2: Navegación a Planning
		const planningTab = screen.getByRole('tab', { name: 'Planning' });
		await planningTab.click();

		await expect.element(screen.getByRole('tabpanel', { name: 'Planning' })).toBeVisible();
		await expect.element(screen.getByLabelText('Task Backlog')).toBeVisible();

		// Paso 3: Captura de Tarea en Backlog
		const input = screen.getByRole('textbox', {
			name: 'Add a new focus task... (Enter to add)'
		});
		await expect.element(input).toBeVisible();
		await input.fill('Implement OAuth authentication');
		await userEvent.keyboard('{Enter}');

		await expect.element(screen.getByText('Implement OAuth authentication')).toBeVisible();

		// Paso 4: Activar Tarea en Timer (Pin)
		const pinButton = screen.getByRole('button', {
			name: 'Set as active in timer "Implement OAuth authentication"'
		});
		await expect.element(pinButton).toBeVisible();
		await pinButton.click();

		const createdTask = tasksState.tasks.find(
			(task) => task.title === 'Implement OAuth authentication'
		);
		expect(createdTask).toBeDefined();
		expect(tasksState.activeTaskId).toBe(createdTask?.id);

		const unsetPinButton = screen.getByRole('button', {
			name: 'Unset active task "Implement OAuth authentication"'
		});
		await expect.element(unsetPinButton).toBeVisible();
		await expect.element(unsetPinButton).toHaveAttribute('aria-pressed', 'true');

		// Paso 5: Regreso a Timer y Verificación de Handover
		const timerTab = screen.getByRole('tab', { name: 'Timer' });
		await timerTab.click();

		await expect.element(screen.getByRole('tabpanel', { name: 'Timer' })).toBeVisible();

		// En TaskPill: título de la tarea visible y trigger accesible actualizado
		await expect.element(screen.getByText('Implement OAuth authentication')).toBeVisible();
		await expect.element(screen.getByText('Free focus')).not.toBeInTheDocument();

		const activeTaskTrigger = screen.getByRole('button', {
			name: 'Change active task: Implement OAuth authentication'
		});
		await expect.element(activeTaskTrigger).toBeVisible();

		// Cleanup
		timerState.destroy();
		planningState.destroy();
	});
});
