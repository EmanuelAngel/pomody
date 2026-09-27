<script lang="ts">
	import { onMount } from 'svelte';
	import { tasksState as defaultTasksState, type TasksState } from '$lib/state/tasks.svelte';
	import {
		navigationState as defaultNavigationState,
		type NavigationState
	} from '$lib/state/navigation.svelte';
	import Check from '@lucide/svelte/icons/check';
	import Plus from '@lucide/svelte/icons/plus';
	import Pin from '@lucide/svelte/icons/pin';
	import Trash from '@lucide/svelte/icons/trash';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Clock from '@lucide/svelte/icons/clock';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Layers from '@lucide/svelte/icons/layers';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { cn } from '$lib/utils';
	import type { FocusTask } from '$lib/domain/tasks/task.entity';

	interface Props {
		tasksState?: TasksState;
		navigationState?: NavigationState;
	}

	let { tasksState = defaultTasksState, navigationState = defaultNavigationState }: Props =
		$props();

	// Tasks state
	let newTaskTitle = $state('');
	let editingTaskId = $state<string | null>(null);
	let editingTitle = $state('');
	let isCompletedOpen = $state(true);

	const pendingTasks = $derived(tasksState.pendingTasks);
	const completedTasks = $derived(tasksState.completedTasks);
	const activeTaskId = $derived(tasksState.activeTaskId);
	const pendingCount = $derived(pendingTasks.length);
	const completedCount = $derived(completedTasks.length);

	// Session Planning skeleton state
	let planTargetMode = $state<'blocks' | 'end_time'>('blocks');
	let blockCount = $state(4);
	let focusMinutes = $state(25);
	let breakMinutes = $state(5);
	let targetEndTime = $state('18:00');

	// Derived metrics for skeleton preview
	const totalFocusMinutes = $derived(blockCount * focusMinutes);
	const totalBreakMinutes = $derived(Math.max(0, blockCount - 1) * breakMinutes);

	onMount(() => {
		if (!tasksState.isLoaded && !tasksState.isLoading) {
			tasksState.load();
		}
	});

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

	async function handleDelete(taskId: string) {
		await tasksState.deleteTask(taskId);
	}

	function startEditing(task: FocusTask) {
		editingTaskId = task.id;
		editingTitle = task.title;
	}

	async function saveEditing(taskId: string) {
		const trimmed = editingTitle.trim();
		if (trimmed) {
			await tasksState.updateTitle(taskId, trimmed);
		}
		editingTaskId = null;
		editingTitle = '';
	}

	function cancelEditing() {
		editingTaskId = null;
		editingTitle = '';
	}

	function handleEditKeyDown(e: KeyboardEvent, taskId: string) {
		if (e.key === 'Enter') {
			e.preventDefault();
			saveEditing(taskId);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEditing();
		}
	}

	async function handleClearCompleted() {
		await tasksState.clearCompleted();
	}
</script>

<div class="mx-auto w-full max-w-5xl space-y-8 px-2 py-4 sm:px-6">
	<!-- Planning Top Header -->
	<header
		class="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<h2 class="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Planning</h2>
			<p class="text-xs text-muted-foreground sm:text-sm">
				{pendingCount} pending {pendingCount === 1 ? 'task' : 'tasks'}
			</p>
		</div>

		<button
			type="button"
			aria-label="Back to timer"
			onclick={() => navigationState.setTab('timer')}
			class="inline-flex cursor-pointer items-center justify-center gap-1.5 self-start rounded-full border border-border/50 bg-muted/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:self-auto"
		>
			<ArrowRight class="size-3.5 rotate-180" />
			<span>Back to timer</span>
		</button>
	</header>

	<!-- Main Responsive 2-Column Grid -->
	<div class="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
		<!-- Left Column: Session Plan & Timeline (Macro) -->
		<section class="space-y-6 lg:col-span-7" aria-label="Session Planning">
			<div class="rounded-2xl border border-border/50 bg-card/40 p-5 shadow-xs transition-all">
				<!-- Section Title & Mode Switcher -->
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex items-center gap-2.5">
						<div
							class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"
						>
							<Layers class="size-4" />
						</div>
						<div>
							<h3 class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
								Session Timeline
							</h3>
							<p class="text-xs text-muted-foreground">Project focus cycles and scheduled breaks</p>
						</div>
					</div>

					<!-- Target Mode Toggle (Blocks vs End Time) -->
					<div
						class="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5 text-xs"
					>
						<button
							type="button"
							class={cn(
								'cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors',
								planTargetMode === 'blocks'
									? 'bg-background text-foreground shadow-xs'
									: 'text-muted-foreground hover:text-foreground'
							)}
							onclick={() => (planTargetMode = 'blocks')}
						>
							By Blocks
						</button>
						<button
							type="button"
							class={cn(
								'cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors',
								planTargetMode === 'end_time'
									? 'bg-background text-foreground shadow-xs'
									: 'text-muted-foreground hover:text-foreground'
							)}
							onclick={() => (planTargetMode = 'end_time')}
						>
							By End Time
						</button>
					</div>
				</div>

				<!-- Target Configuration / Metrics Strip -->
				<div
					class="mt-4 grid grid-cols-3 gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-3 text-center sm:gap-4"
				>
					<div>
						<span class="block text-[11px] font-medium text-muted-foreground">Focus Blocks</span>
						<span class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
							{blockCount} × {focusMinutes}m
						</span>
					</div>
					<div>
						<span class="block text-[11px] font-medium text-muted-foreground">Total Focus</span>
						<span class="text-sm font-semibold tracking-tight text-primary sm:text-base">
							{Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m
						</span>
					</div>
					<div>
						<span class="block text-[11px] font-medium text-muted-foreground">
							{planTargetMode === 'blocks' ? 'Total Breaks' : 'Target End'}
						</span>
						<span class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
							{planTargetMode === 'blocks' ? `${totalBreakMinutes}m` : targetEndTime}
						</span>
					</div>
				</div>

				<!-- Chronological Timeline Preview Track -->
				<div
					class="relative mt-6 space-y-3.5 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-border/60"
				>
					<!-- Block 1: Focus (Active / Current) -->
					<div class="group relative">
						<div
							class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-primary/50 bg-primary/20 text-primary shadow-xs"
						>
							<span class="text-[10px] font-bold">1</span>
						</div>
						<div class="rounded-xl border border-primary/40 bg-primary/5 p-3 transition-colors">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class="text-xs font-semibold text-foreground">Focus Block</span>
									<span
										class="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary"
									>
										{focusMinutes}m
									</span>
								</div>
								<span class="text-[11px] font-medium text-primary">Active block</span>
							</div>
							<p class="mt-1 truncate text-xs text-muted-foreground">
								{#if activeTaskId}
									Assigned: <span class="font-medium text-foreground"
										>{tasksState.activeTask?.title}</span
									>
								{:else}
									Unassigned · Will run in Free Focus
								{/if}
							</p>
						</div>
					</div>

					<!-- Block 2: Short Break -->
					<div class="group relative">
						<div
							class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground"
						>
							<Coffee class="size-3" />
						</div>
						<div class="rounded-xl border border-border/30 bg-muted/20 p-2.5 transition-colors">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class="text-xs font-medium text-muted-foreground">Short Break</span>
									<span
										class="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
									>
										{breakMinutes}m
									</span>
								</div>
								<span class="flex items-center gap-1 text-[11px] text-muted-foreground/70">
									<Sparkles class="size-3 text-amber-500/80" />
									<span>Revitalization</span>
								</span>
							</div>
							<p class="mt-0.5 text-[11px] text-muted-foreground/80">
								Guided pause: Neck & shoulder stretch or hydration
							</p>
						</div>
					</div>

					<!-- Block 3: Focus (Upcoming) -->
					<div class="group relative">
						<div
							class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground"
						>
							<span class="text-[10px] font-semibold text-muted-foreground">2</span>
						</div>
						<div class="rounded-xl border border-border/40 bg-card/60 p-3 transition-colors">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class="text-xs font-medium text-foreground">Focus Block</span>
									<span
										class="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
									>
										{focusMinutes}m
									</span>
								</div>
								<span class="text-[11px] text-muted-foreground/60">Upcoming</span>
							</div>
							<p class="mt-1 text-xs text-muted-foreground/70">
								Select next task from backlog or set during transition
							</p>
						</div>
					</div>

					<!-- Block 4: Long Break Milestone -->
					<div class="group relative">
						<div
							class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground"
						>
							<Clock class="size-3" />
						</div>
						<div
							class="rounded-xl border border-dashed border-border/50 bg-muted/10 p-2.5 transition-colors"
						>
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class="text-xs font-medium text-muted-foreground">Long Break</span>
									<span
										class="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
									>
										15m
									</span>
								</div>
								<span class="text-[11px] text-muted-foreground/60">Milestone</span>
							</div>
							<p class="mt-0.5 text-[11px] text-muted-foreground/70">
								Physical reset & mindful pause
							</p>
						</div>
					</div>
				</div>

				<!-- Forward-Only Architecture Badge / Notice -->
				<div class="mt-5 rounded-xl border border-border/30 bg-muted/10 p-3">
					<p class="text-[11px] leading-relaxed text-muted-foreground/80">
						<strong class="font-medium text-foreground">Forward-only sync:</strong> Editing durations
						or adding blocks applies starting from your next cycle. Active blocks preserve uninterrupted
						focus.
					</p>
				</div>
			</div>
		</section>

		<!-- Right Column: Task Backlog (Micro) -->
		<section class="space-y-4 lg:col-span-5" aria-label="Task Backlog">
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
				<input
					type="text"
					placeholder="Add a new focus task... (Enter to add)"
					aria-label="Add a new focus task... (Enter to add)"
					bind:value={newTaskTitle}
					onkeydown={handleInputKeyDown}
					class="h-10 w-full rounded-xl border border-input/60 bg-muted/30 px-3.5 pr-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none"
				/>
				{#if newTaskTitle.trim().length > 0}
					<button
						type="button"
						aria-label="Add task"
						onclick={handleCreateTask}
						class="absolute right-1.5 flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
					>
						<Plus class="size-4" />
					</button>
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
							<li
								class={cn(
									'group flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-all duration-150',
									task.id === activeTaskId
										? 'border-primary/50 bg-primary/5 shadow-xs'
										: 'border-border/40 bg-card/40 hover:border-border/80 hover:bg-muted/30'
								)}
							>
								<!-- Left: Checkbox + Title -->
								<div class="flex min-w-0 flex-1 items-center gap-3">
									<button
										type="button"
										role="checkbox"
										aria-checked={false}
										aria-label={`Mark "${task.title}" as completed`}
										onclick={() => handleToggle(task.id)}
										class="flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-muted-foreground/40 transition-colors hover:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
									>
									</button>

									{#if editingTaskId === task.id}
										<input
											type="text"
											aria-label="Edit task title"
											bind:value={editingTitle}
											onkeydown={(e) => handleEditKeyDown(e, task.id)}
											onblur={() => saveEditing(task.id)}
											class="h-7 w-full rounded border border-ring bg-background px-2 text-sm text-foreground focus:outline-none"
										/>
									{:else}
										<button
											type="button"
											aria-label={`Edit task "${task.title}"`}
											class="min-w-0 flex-1 cursor-text truncate text-left text-sm font-medium text-foreground transition-colors hover:text-foreground/80 focus-visible:outline-none"
											title="Click to edit"
											onclick={() => startEditing(task)}
										>
											{task.title}
										</button>
									{/if}
								</div>

								<!-- Right: Pin Active + Delete -->
								<div class="flex shrink-0 items-center gap-1">
									<button
										type="button"
										aria-label={task.id === activeTaskId
											? `Unset active task "${task.title}"`
											: `Set as active in timer "${task.title}"`}
										aria-pressed={task.id === activeTaskId}
										title={task.id === activeTaskId ? 'Active in timer' : 'Set as active in timer'}
										onclick={() => handleTogglePin(task.id)}
										class={cn(
											'flex size-7 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none',
											task.id === activeTaskId
												? 'bg-primary/15 text-primary hover:bg-primary/25'
												: 'text-muted-foreground/50 hover:bg-muted hover:text-foreground'
										)}
									>
										<Pin class={cn('size-3.5', task.id === activeTaskId && 'fill-primary')} />
									</button>

									<button
										type="button"
										aria-label={`Delete task "${task.title}"`}
										title="Delete task"
										onclick={() => handleDelete(task.id)}
										class="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
									>
										<Trash class="size-3.5" />
									</button>
								</div>
							</li>
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
								<li
									class="group flex items-center justify-between gap-3 rounded-xl border border-border/20 bg-muted/20 px-3 py-2 text-muted-foreground/70 transition-colors"
								>
									<div class="flex min-w-0 flex-1 items-center gap-3">
										<button
											type="button"
											role="checkbox"
											aria-checked={true}
											aria-label={`Mark "${task.title}" as pending`}
											onclick={() => handleToggle(task.id)}
											class="flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
										>
											<Check class="size-2.5 stroke-[3]" />
										</button>
										<span
											class="truncate text-sm text-muted-foreground/60 line-through select-none"
										>
											{task.title}
										</span>
									</div>

									<div class="flex shrink-0 items-center gap-1">
										<button
											type="button"
											aria-label={`Delete task "${task.title}"`}
											title="Delete task"
											onclick={() => handleDelete(task.id)}
											class="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
										>
											<Trash class="size-3.5" />
										</button>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		</section>
	</div>
</div>
