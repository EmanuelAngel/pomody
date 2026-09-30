import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import TaskItem from './task-item.svelte';
import { createFocusTask, toggleFocusTask } from '$lib/domain/tasks/task.entity';

describe('TaskItem (Client Browser)', () => {
	it('renders pending task with title, unchecked checkbox, pin, and delete buttons', async () => {
		const task = createFocusTask({ title: 'Plan architectural boundary' });
		const screen = await render(TaskItem, { task });

		await expect.element(screen.getByText('Plan architectural boundary')).toBeVisible();

		const checkbox = screen.getByRole('checkbox', {
			name: 'Mark "Plan architectural boundary" as completed'
		});
		await expect.element(checkbox).toBeVisible();
		await expect.element(checkbox).toHaveAttribute('aria-checked', 'false');

		const pinBtn = screen.getByRole('button', {
			name: 'Set as active in timer "Plan architectural boundary"'
		});
		await expect.element(pinBtn).toBeVisible();
		await expect.element(pinBtn).toHaveAttribute('aria-pressed', 'false');

		const deleteBtn = screen.getByRole('button', {
			name: 'Delete task "Plan architectural boundary"'
		});
		await expect.element(deleteBtn).toBeVisible();
	});

	it('renders active task with active styling and aria-pressed', async () => {
		const task = createFocusTask({ title: 'Active Focus Task' });
		const screen = await render(TaskItem, { task, isActive: true });

		const pinBtn = screen.getByRole('button', {
			name: 'Unset active task "Active Focus Task"'
		});
		await expect.element(pinBtn).toBeVisible();
		await expect.element(pinBtn).toHaveAttribute('aria-pressed', 'true');
	});

	it('renders completed task with line-through and no pin button', async () => {
		const task = toggleFocusTask(createFocusTask({ title: 'Completed Task' }));
		const screen = await render(TaskItem, { task });

		const titleSpan = screen.getByText('Completed Task');
		await expect.element(titleSpan).toBeVisible();
		await expect.element(titleSpan).toHaveClass('line-through');

		const checkbox = screen.getByRole('checkbox', {
			name: 'Mark "Completed Task" as pending'
		});
		await expect.element(checkbox).toBeVisible();
		await expect.element(checkbox).toHaveAttribute('aria-checked', 'true');

		await expect
			.element(screen.getByRole('button', { name: /active in timer/i }))
			.not.toBeInTheDocument();

		const deleteBtn = screen.getByRole('button', {
			name: 'Delete task "Completed Task"'
		});
		await expect.element(deleteBtn).toBeVisible();
	});

	it('allows inline editing of title via Enter key', async () => {
		const task = createFocusTask({ title: 'Original Title' });
		const ontitlechange = vi.fn();
		const screen = await render(TaskItem, { task, ontitlechange });

		const titleBtn = screen.getByRole('button', { name: 'Edit task "Original Title"' });
		await titleBtn.click();

		const input = screen.getByRole('textbox', { name: 'Edit task title' });
		await expect.element(input).toBeVisible();

		await input.fill('Renamed Title');
		await userEvent.keyboard('{Enter}');

		expect(ontitlechange).toHaveBeenCalledWith(task.id, 'Renamed Title');
		await expect
			.element(screen.getByRole('textbox', { name: 'Edit task title' }))
			.not.toBeInTheDocument();
	});

	it('cancels inline editing via Escape key without calling ontitlechange', async () => {
		const task = createFocusTask({ title: 'Original Title' });
		const ontitlechange = vi.fn();
		const screen = await render(TaskItem, { task, ontitlechange });

		const titleBtn = screen.getByRole('button', { name: 'Edit task "Original Title"' });
		await titleBtn.click();

		const input = screen.getByRole('textbox', { name: 'Edit task title' });
		await input.fill('Will Cancel');
		await userEvent.keyboard('{Escape}');

		expect(ontitlechange).not.toHaveBeenCalled();
		await expect
			.element(screen.getByRole('textbox', { name: 'Edit task title' }))
			.not.toBeInTheDocument();
		await expect
			.element(screen.getByRole('button', { name: 'Edit task "Original Title"' }))
			.toBeVisible();
	});

	it('calls ontoggle when clicking checkbox', async () => {
		const task = createFocusTask({ title: 'Toggle Me' });
		const ontoggle = vi.fn();
		const screen = await render(TaskItem, { task, ontoggle });

		const checkbox = screen.getByRole('checkbox', {
			name: 'Mark "Toggle Me" as completed'
		});
		await checkbox.click();

		expect(ontoggle).toHaveBeenCalledTimes(1);
		expect(ontoggle).toHaveBeenCalledWith(task.id);
	});

	it('calls ontogglepin when clicking pin button', async () => {
		const task = createFocusTask({ title: 'Pin Me' });
		const ontogglepin = vi.fn();
		const screen = await render(TaskItem, { task, ontogglepin });

		const pinBtn = screen.getByRole('button', {
			name: 'Set as active in timer "Pin Me"'
		});
		await pinBtn.click();

		expect(ontogglepin).toHaveBeenCalledTimes(1);
		expect(ontogglepin).toHaveBeenCalledWith(task.id);
	});

	it('calls ondelete when clicking delete button', async () => {
		const task = createFocusTask({ title: 'Delete Me' });
		const ondelete = vi.fn();
		const screen = await render(TaskItem, { task, ondelete });

		const deleteBtn = screen.getByRole('button', {
			name: 'Delete task "Delete Me"'
		});
		await deleteBtn.click();

		expect(ondelete).toHaveBeenCalledTimes(1);
		expect(ondelete).toHaveBeenCalledWith(task.id);
	});

	it('calls onslot when clicking slot button on pending task', async () => {
		const task = createFocusTask({ title: 'Slot Me' });
		const onslot = vi.fn();
		const screen = await render(TaskItem, { task, onslot });

		const slotBtn = screen.getByRole('button', {
			name: 'Slot task "Slot Me" into next focus block'
		});
		await expect.element(slotBtn).toBeVisible();
		await slotBtn.click();

		expect(onslot).toHaveBeenCalledTimes(1);
		expect(onslot).toHaveBeenCalledWith(task.id);
	});
});
