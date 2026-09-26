import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import TaskPill from './task-pill.svelte';
import Timer from './timer.svelte';
import { createTasksState } from '$lib/state/tasks.svelte';
import { createTimerState } from '$lib/state/timer.svelte';
import type { ITaskRepository } from '$lib/domain/ports/task-repository.port';
import { sortFocusTasks } from '$lib/domain/ports/task-repository.port';
import { createFocusTask, type FocusTask } from '$lib/domain/tasks/task.entity';

class MockTaskRepository implements ITaskRepository {
	private tasks = new Map<string, FocusTask>();

	constructor(initialTasks: FocusTask[] = []) {
		for (const task of initialTasks) {
			this.tasks.set(task.id, task);
		}
	}

	async getAll(): Promise<readonly FocusTask[]> {
		return sortFocusTasks(Array.from(this.tasks.values()));
	}

	async getPending(): Promise<readonly FocusTask[]> {
		return sortFocusTasks(Array.from(this.tasks.values()).filter((t) => !t.completed));
	}

	async save(task: FocusTask): Promise<void> {
		this.tasks.set(task.id, task);
	}

	async saveBatch(tasks: readonly FocusTask[]): Promise<void> {
		for (const task of tasks) {
			this.tasks.set(task.id, task);
		}
	}

	async delete(taskId: string): Promise<void> {
		this.tasks.delete(taskId);
	}

	async clearCompleted(): Promise<void> {
		for (const [id, task] of this.tasks.entries()) {
			if (task.completed) {
				this.tasks.delete(id);
			}
		}
	}

	async clearAll(): Promise<void> {
		this.tasks.clear();
	}
}

function createDummyTicker(isRunning = false) {
	return {
		isRunning,
		start: vi.fn(),
		stop: vi.fn(),
		destroy: vi.fn()
	};
}

describe('TaskPill (Client Browser)', () => {
	it('renders unassigned state ("Foco libre") when no active task exists', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		const pill = screen.getByRole('button', { name: 'Seleccionar tarea de enfoque' });
		await expect.element(pill).toBeVisible();
		await expect.element(screen.getByText('Foco libre')).toBeVisible();
		await expect.element(pill).toHaveClass('opacity-100');

		await expect.element(screen.getByRole('checkbox')).not.toBeInTheDocument();
	});

	it('applies Zen Mode opacity reduction when isRunning is true', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: true,
			tasksState,
			portalProps: { disabled: true }
		});

		const pill = screen.getByRole('button', { name: 'Seleccionar tarea de enfoque' });
		await expect.element(pill).toBeVisible();
		await expect.element(pill).toHaveClass('opacity-60');
	});

	it('renders active task title and inline checkbox when active task is present', async () => {
		const initialTask = createFocusTask({ title: 'Configurar Hexagonal' });
		const repo = new MockTaskRepository([initialTask]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(initialTask.id);

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Configurar Hexagonal')).toBeVisible();

		const checkbox = screen.getByRole('checkbox');
		await expect.element(checkbox).toBeVisible();
		await expect.element(checkbox).toHaveAttribute('aria-checked', 'false');

		const trigger = screen.getByRole('button', {
			name: 'Cambiar tarea activa: Configurar Hexagonal'
		});
		await expect.element(trigger).toBeVisible();
	});

	it('toggles active task completion in-place without opening popover', async () => {
		const task = createFocusTask({ title: 'Escribir tests unitarios' });
		const repo = new MockTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(task.id);

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		const checkbox = screen.getByRole('checkbox');
		await expect.element(checkbox).toHaveAttribute('aria-checked', 'false');

		// Click checkbox to complete task
		await checkbox.click();

		await expect.element(checkbox).toHaveAttribute('aria-checked', 'true');
		expect(tasksState.activeTask?.completed).toBe(true);

		// Popover should not have opened
		await expect.element(screen.getByRole('textbox')).not.toBeInTheDocument();

		// Click again to un-complete
		await checkbox.click();
		await expect.element(checkbox).toHaveAttribute('aria-checked', 'false');
		expect(tasksState.activeTask?.completed).toBe(false);
	});

	it('opens quick-select popover when clicking the pill trigger', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		const pill = screen.getByRole('button', { name: 'Seleccionar tarea de enfoque' });
		await pill.click();

		const input = screen.getByRole('textbox', { name: 'Crear y fijar nueva tarea' });
		await expect.element(input).toBeVisible();

		const freeFocusOption = screen.getByRole('option', { name: /Foco libre/i });
		await expect.element(freeFocusOption).toBeVisible();

		await expect.element(screen.getByText('No hay tareas pendientes')).toBeVisible();
	});

	it('creates new task and sets it as active on pressing Enter in input', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		// Open popover
		const pill = screen.getByRole('button', { name: 'Seleccionar tarea de enfoque' });
		await pill.click();

		const input = screen.getByRole('textbox', { name: 'Crear y fijar nueva tarea' });
		await expect.element(input).toBeVisible();

		// Type new task and press Enter
		await input.fill('Diseñar arquitectura de eventos');
		await userEvent.keyboard('{Enter}');

		// Popover should close and pill should display new active task
		await expect.element(screen.getByText('Diseñar arquitectura de eventos')).toBeVisible();
		const checkbox = screen.getByRole('checkbox');
		await expect.element(checkbox).toBeVisible();

		expect(tasksState.activeTask?.title).toBe('Diseñar arquitectura de eventos');
	});

	it('switches active task when clicking a pending task in popover list', async () => {
		const taskA = createFocusTask({ title: 'Tarea Alfa', order: 0 });
		const taskB = createFocusTask({ title: 'Tarea Beta', order: 1 });
		const repo = new MockTaskRepository([taskA, taskB]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(taskA.id);

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Tarea Alfa')).toBeVisible();

		// Open popover
		const trigger = screen.getByRole('button', {
			name: 'Cambiar tarea activa: Tarea Alfa'
		});
		await trigger.click();

		// Select Tarea Beta from the pending list
		const taskBOption = screen.getByRole('option', { name: 'Tarea Beta' });
		await expect.element(taskBOption).toBeVisible();
		await taskBOption.click();

		// Active task should now be Tarea Beta
		await expect.element(screen.getByText('Tarea Beta')).toBeVisible();
		expect(tasksState.activeTaskId).toBe(taskB.id);
	});

	it('unassigns active task when selecting "Foco libre" option', async () => {
		const task = createFocusTask({ title: 'Tarea Activa' });
		const repo = new MockTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(task.id);

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		await expect.element(screen.getByText('Tarea Activa')).toBeVisible();

		// Open popover
		const trigger = screen.getByRole('button', {
			name: 'Cambiar tarea activa: Tarea Activa'
		});
		await trigger.click();

		// Click "Foco libre"
		const freeFocusOption = screen.getByRole('option', { name: /Foco libre/i });
		await freeFocusOption.click();

		// Should revert to "Foco libre"
		await expect.element(screen.getByText('Foco libre')).toBeVisible();
		expect(tasksState.activeTaskId).toBeNull();
	});

	it('closes popover when pressing Escape', async () => {
		const repo = new MockTaskRepository();
		const tasksState = createTasksState(repo);
		await tasksState.load();

		const screen = await render(TaskPill, {
			isRunning: false,
			tasksState,
			portalProps: { disabled: true }
		});

		const pill = screen.getByRole('button', { name: 'Seleccionar tarea de enfoque' });
		await pill.click();

		const input = screen.getByRole('textbox', { name: 'Crear y fijar nueva tarea' });
		await expect.element(input).toBeVisible();

		// Press Escape
		await userEvent.keyboard('{Escape}');

		// Input should not be in the document
		await expect.element(screen.getByRole('textbox')).not.toBeInTheDocument();
	});
});

describe('TaskPill in Timer Integration (Client Browser)', () => {
	it('renders TaskPill beneath TimerControls and reflects active task', async () => {
		const task = createFocusTask({ title: 'Tarea en Temporizador' });
		const repo = new MockTaskRepository([task]);
		const tasksState = createTasksState(repo);
		await tasksState.load();
		tasksState.setActiveTask(task.id);

		const ticker = createDummyTicker(false);
		const timerState = createTimerState({ focusDurationSeconds: 1500 }, ticker);

		const screen = await render(Timer, {
			state: timerState,
			tasksState
		});

		await expect.element(screen.getByText('FOCUS')).toBeVisible();
		await expect.element(screen.getByText('25:00')).toBeVisible();
		await expect.element(screen.getByText('Tarea en Temporizador')).toBeVisible();

		// Starts timer and verifies Zen Mode opacity on pill
		const startBtn = screen.getByRole('button', { name: 'Start timer' });
		await startBtn.click();
		expect(timerState.isRunning).toBe(true);

		const pill = screen.getByRole('button', {
			name: 'Cambiar tarea activa: Tarea en Temporizador'
		});
		await expect.element(pill).toBeVisible();
	});
});
