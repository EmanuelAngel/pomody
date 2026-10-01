<script lang="ts">
	import { onMount } from 'svelte';
	import { tasksState as defaultTasksState, type TasksState } from '$lib/state/tasks.svelte';
	import {
		navigationState as defaultNavigationState,
		type NavigationState
	} from '$lib/state/navigation.svelte';
	import {
		planningState as defaultPlanningState,
		type PlanningState
	} from '$lib/state/planning.svelte';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import PlanningTimeline from './planning-timeline.svelte';
	import TaskBacklog from './task-backlog.svelte';

	interface Props {
		planningState?: PlanningState;
		tasksState?: TasksState;
		timerState?: TimerState;
		navigationState?: NavigationState;
	}

	let {
		planningState = defaultPlanningState,
		tasksState = defaultTasksState,
		timerState = defaultTimerState,
		navigationState = defaultNavigationState
	}: Props = $props();

	const pendingTasks = $derived(tasksState.pendingTasks);
	const pendingCount = $derived(pendingTasks.length);
	const activeTaskTitle = $derived(tasksState.activeTask?.title);

	onMount(() => {
		if (!tasksState.isLoaded && !tasksState.isLoading) {
			tasksState.load();
		}
		if (!planningState.isLoaded && !planningState.isLoading) {
			planningState.load();
		}
	});

	function handleWindowKeyDown(e: KeyboardEvent) {
		const target = e.target as HTMLElement | null;
		if (
			target &&
			(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
		) {
			return;
		}

		if (e.key === 'c' || e.key === 'n') {
			e.preventDefault();
			document.getElementById('new-task-input')?.focus();
		} else if (e.key === 'Escape') {
			if (!document.querySelector('[role="dialog"], [role="alertdialog"], [data-state="open"]')) {
				navigationState.setTab('timer');
			}
		}
	}
</script>

<svelte:window onkeydown={handleWindowKeyDown} />

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
		<PlanningTimeline
			{planningState}
			{tasksState}
			{timerState}
			{navigationState}
			{activeTaskTitle}
		/>

		<!-- Right Column: Task Backlog (Micro) -->
		<TaskBacklog {tasksState} {planningState} />
	</div>
</div>
