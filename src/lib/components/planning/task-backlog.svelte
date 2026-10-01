<script lang="ts">
	import TaskItem from './task-item.svelte';
	import Pin from '@lucide/svelte/icons/pin';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import { tasksState as defaultTasksState, type TasksState } from '$lib/state/tasks.svelte';
	import {
		planningState as defaultPlanningState,
		type PlanningState
	} from '$lib/state/planning.svelte';

	interface Props {
		tasksState?: TasksState;
		planningState?: PlanningState;
		class?: string;
	}

	let {
		tasksState = defaultTasksState,
		planningState = defaultPlanningState,
		class: className = ''
	}: Props = $props();

	let newTaskTitle = $state('');
	let isCompletedOpen = $state(true);

	const pendingTasks = $derived(tasksState.pendingTasks);
	const completedTasks = $derived(tasksState.completedTasks);
	const activeTaskId = $derived(tasksState.activeTaskId);
	const pendingCount = $derived(pendingTasks.length);
	const completedCount = $derived(completedTasks.length);

	async function handleCreateTask() {
		const trimmed = newTaskTitle.trim();
		if (!trimmed) return;
		try {
			await tasksState.createTask(trimmed);
			newTaskTitle = '';
		} catch {
			// Ignore validation errors to preserve UI stability
		}
	}

	function handleInputKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleCreateTask();
		}
	}

	async function handleToggle(taskId: string) {
		await tasksState.toggleTask(taskId);
	}

	function handleTogglePin(taskId: string) {
		if (tasksState.activeTaskId === taskId) {
			tasksState.setActiveTask(null);
		} else {
			tasksState.setActiveTask(taskId);
		}
	}

	async function handleTitleChange(taskId: string, newTitle: string) {
		await tasksState.updateTitle(taskId, newTitle);
	}

	async function handleDelete(taskId: string) {
		await tasksState.deleteTask(taskId);
	}

	async function handleClearCompleted() {
		await tasksState.clearCompleted();
	}
</script>

<section class={cn('space-y-4 lg:col-span-5', className)} aria-label="Task Backlog">
	<!-- Backlog Header -->
	<div class="flex items-center justify-between px-1">
		<div class="flex items-center gap-2">
			<div
				class="flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground"
			>
				<Pin class="size-3.5" />
			</div>
			<div>
				<h3 class="text-sm font-semibold tracking-tight text-foreground">Tasks Backlog</h3>
			</div>
		</div>
		<span class="text-xs font-medium text-muted-foreground">
			{pendingCount} remaining
		</span>
	</div>

	<!-- Quick Task Capture -->
	<div class="relative flex items-center">
		<Input
			id="new-task-input"
			placeholder="Add a new focus task... (Enter to add)"
			aria-label="Add a new focus task... (Enter to add)"
			bind:value={newTaskTitle}
			onkeydown={handleInputKeyDown}
			class="h-10 pr-10 text-sm"
		/>
		{#if newTaskTitle.trim().length > 0}
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Add task"
				onclick={handleCreateTask}
				class="absolute right-1 text-muted-foreground hover:text-foreground"
			>
				<Plus class="size-4" />
			</Button>
		{/if}
	</div>

	<!-- Pending Tasks Section -->
	<div class="space-y-2">
		<div class="flex items-center justify-between px-1">
			<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Pending ({pendingCount})
			</span>
		</div>

		{#if pendingTasks.length === 0}
			<div
				class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-10 text-center"
			>
				<p class="text-sm font-medium text-muted-foreground">
					No pending tasks. Add one to plan your session.
				</p>
			</div>
		{:else}
			<ul class="space-y-1.5" role="list">
				{#each pendingTasks as task (task.id)}
					<TaskItem
						{task}
						isActive={task.id === activeTaskId}
						ontoggle={handleToggle}
						ontogglepin={handleTogglePin}
						ontitlechange={handleTitleChange}
						ondelete={handleDelete}
						onslot={(taskId) => planningState.slotTaskIntoNextAvailableBlock(taskId)}
					/>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- Completed Tasks Section -->
	{#if completedTasks.length > 0}
		<div class="space-y-2 pt-2">
			<div class="flex items-center justify-between px-1">
				<button
					type="button"
					onclick={() => (isCompletedOpen = !isCompletedOpen)}
					aria-expanded={isCompletedOpen}
					class="flex cursor-pointer items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
				>
					{#if isCompletedOpen}
						<ChevronDown class="size-3.5" />
					{:else}
						<ChevronRight class="size-3.5" />
					{/if}
					<span>Completed ({completedCount})</span>
				</button>

				<button
					type="button"
					aria-label="Clear completed"
					onclick={handleClearCompleted}
					class="cursor-pointer text-xs text-muted-foreground/70 transition-colors hover:text-destructive"
				>
					Clear completed
				</button>
			</div>

			{#if isCompletedOpen}
				<ul class="space-y-1.5" role="list">
					{#each completedTasks as task (task.id)}
						<TaskItem {task} ontoggle={handleToggle} ondelete={handleDelete} />
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</section>
