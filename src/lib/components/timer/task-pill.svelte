<script lang="ts">
	import { onMount } from 'svelte';
	import * as Popover from '$lib/components/ui/popover';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Check from '@lucide/svelte/icons/check';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Plus from '@lucide/svelte/icons/plus';
	import { cn } from '$lib/utils';
	import { tasksState as defaultTasksState, type TasksState } from '$lib/state/tasks.svelte';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		isRunning?: boolean;
		tasksState?: TasksState;
		portalProps?: { disabled?: boolean };
	}

	let { isRunning = false, tasksState = defaultTasksState, portalProps }: Props = $props();

	let open = $state(false);
	let newTaskTitle = $state('');

	const activeTask = $derived(tasksState.activeTask);
	const pendingTasks = $derived(tasksState.pendingTasks);
	const activeTaskId = $derived(tasksState.activeTaskId);

	onMount(() => {
		if (!tasksState.isLoaded && !tasksState.isLoading) {
			tasksState.load();
		}
	});

	function handleOpenChange(nextOpen: boolean) {
		open = nextOpen;
		if (!nextOpen) {
			newTaskTitle = '';
		}
	}

	async function handleToggleCompleted(e: MouseEvent) {
		e.stopPropagation();
		if (!activeTask) return;
		await tasksState.toggleTask(activeTask.id);
	}

	async function handleSubmitNewTask() {
		const trimmed = newTaskTitle.trim();
		if (!trimmed) return;
		try {
			const created = await tasksState.createTask(trimmed);
			tasksState.setActiveTask(created.id);
			newTaskTitle = '';
			open = false;
		} catch {
			// Validation error ignored for UI stability
		}
	}

	function handleInputKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSubmitNewTask();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			open = false;
		}
	}

	function handleSelectTask(taskId: string | null) {
		tasksState.setActiveTask(taskId);
		open = false;
	}
</script>

<Popover.Root bind:open onOpenChange={handleOpenChange}>
	<div
		data-slot="task-pill"
		class={cn(
			'group inline-flex h-8 items-center rounded-full border border-border/40 bg-muted/40 shadow-xs transition-all duration-200 sm:text-sm',
			activeTask ? 'gap-2 px-3 text-xs' : 'p-0 text-xs text-muted-foreground/80',
			isRunning
				? 'opacity-60 transition-opacity hover:opacity-100'
				: 'opacity-100 hover:bg-muted/60'
		)}
	>
		{#if activeTask}
			<button
				type="button"
				role="checkbox"
				aria-checked={activeTask.completed}
				aria-label={activeTask.completed
					? t.task_pill_mark_as_pending({ title: activeTask.title })
					: t.task_pill_mark_as_completed({ title: activeTask.title })}
				onclick={handleToggleCompleted}
				class={cn(
					'flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-150 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none',
					activeTask.completed
						? 'border-primary bg-primary text-primary-foreground'
						: 'border-muted-foreground/50 hover:border-foreground'
				)}
			>
				{#if activeTask.completed}
					<Check class="size-2.5 stroke-[3]" />
				{/if}
			</button>
		{/if}

		<Popover.Trigger
			class={cn(
				'inline-flex h-full cursor-pointer items-center gap-1.5 select-none focus-visible:outline-none',
				activeTask
					? 'text-foreground'
					: cn(
							'rounded-full px-3.5 text-muted-foreground/80 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring',
							isRunning ? 'opacity-60' : 'opacity-100'
						)
			)}
			aria-label={activeTask
				? t.task_pill_change_active_task({ title: activeTask.title })
				: t.task_pill_select_focus_task()}
		>
			{#if activeTask}
				{#if !open}
					<Tooltip.Provider delayDuration={300}>
						<Tooltip.Root>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									<span
										{...props}
										class={cn(
											'inline-block max-w-[160px] truncate font-medium transition-colors sm:max-w-[220px]',
											activeTask.completed && 'text-muted-foreground/60 line-through'
										)}
									>
										{activeTask.title}
									</span>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content side="top" sideOffset={6} class="max-w-xs text-center font-normal">
								{activeTask.title}
							</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				{:else}
					<span
						class={cn(
							'inline-block max-w-[160px] truncate font-medium transition-colors sm:max-w-[220px]',
							activeTask.completed && 'text-muted-foreground/60 line-through'
						)}
					>
						{activeTask.title}
					</span>
				{/if}
			{:else}
				<span class="font-normal">{t.task_pill_free_focus()}</span>
			{/if}
			<ChevronDown
				class="size-3 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180"
			/>
		</Popover.Trigger>
	</div>

	<Popover.Content
		{portalProps}
		side="bottom"
		sideOffset={8}
		align="center"
		class="z-50 w-72 animate-in rounded-xl border border-border/60 bg-popover/95 p-3 text-popover-foreground shadow-lg backdrop-blur-md fade-in-0 outline-none zoom-in-95 data-[side=bottom]:slide-in-from-top-2 sm:w-80"
	>
		<!-- Quick Add Input -->
		<div class="relative mb-2 flex items-center">
			<input
				type="text"
				placeholder={t.task_pill_new_task_placeholder()}
				aria-label={t.task_pill_create_and_pin_aria()}
				bind:value={newTaskTitle}
				onkeydown={handleInputKeyDown}
				class="h-8 w-full rounded-lg border border-input/60 bg-muted/30 px-2.5 pr-8 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
			/>
			{#if newTaskTitle.trim().length > 0}
				<button
					type="button"
					aria-label={t.task_pill_add_task_aria()}
					onclick={handleSubmitNewTask}
					class="absolute right-1 flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none"
				>
					<Plus class="size-3.5" />
				</button>
			{/if}
		</div>

		<!-- Free focus (unassign) option -->
		<button
			type="button"
			role="option"
			aria-selected={activeTaskId === null}
			onclick={() => handleSelectTask(null)}
			class={cn(
				'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60',
				activeTaskId === null && 'bg-muted/50 font-medium text-foreground'
			)}
		>
			<div class="flex min-w-0 items-center gap-2">
				<span class="size-2 rounded-full border border-muted-foreground/40"></span>
				<span class="truncate">{t.task_pill_free_focus()}</span>
			</div>
			{#if activeTaskId === null}
				<Check class="size-3.5 shrink-0 text-primary" />
			{/if}
		</button>

		<div class="my-1.5 h-px bg-border/40"></div>

		<!-- Pending tasks list -->
		<div
			class="px-2 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground/80 uppercase"
		>
			{t.task_pill_pending_tasks_heading()}
		</div>
		<div class="max-h-48 space-y-0.5 overflow-y-auto" role="listbox">
			{#if pendingTasks.length === 0}
				<p class="px-2.5 py-2 text-center text-xs text-muted-foreground/60 italic">
					{t.task_pill_no_pending_tasks()}
				</p>
			{:else}
				{#each pendingTasks as task (task.id)}
					<button
						type="button"
						role="option"
						aria-selected={task.id === activeTaskId}
						onclick={() => handleSelectTask(task.id)}
						class={cn(
							'group flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60',
							task.id === activeTaskId && 'bg-muted/50 font-medium text-foreground'
						)}
					>
						<span class="truncate">{task.title}</span>
						{#if task.id === activeTaskId}
							<Check class="size-3.5 shrink-0 text-primary" />
						{/if}
					</button>
				{/each}
			{/if}
		</div>
	</Popover.Content>
</Popover.Root>
