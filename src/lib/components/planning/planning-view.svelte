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
	import { breaksState as defaultBreaksState, type BreaksState } from '$lib/state/breaks.svelte';
	import { t } from '$lib/state/locale.svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ListTodo from '@lucide/svelte/icons/list-todo';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import PlanningTimeline from './planning-timeline.svelte';
	import TaskBacklog from './task-backlog.svelte';
	import BreakCatalog from '$lib/components/breaks/break-catalog.svelte';

	interface Props {
		planningState?: PlanningState;
		tasksState?: TasksState;
		timerState?: TimerState;
		navigationState?: NavigationState;
		breaksState?: BreaksState;
	}

	let {
		planningState = defaultPlanningState,
		tasksState = defaultTasksState,
		timerState = defaultTimerState,
		navigationState = defaultNavigationState,
		breaksState = defaultBreaksState
	}: Props = $props();

	let activeRightSegment = $state<'tasks' | 'breaks'>('tasks');

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
		if (!breaksState.isLoaded && !breaksState.isLoading) {
			breaksState.load();
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
			if (activeRightSegment !== 'tasks') {
				activeRightSegment = 'tasks';
			}
			requestAnimationFrame(() => {
				document.getElementById('new-task-input')?.focus();
			});
		} else if (e.key === 'b') {
			e.preventDefault();
			activeRightSegment = 'breaks';
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
			<h2 class="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
				{t.planning_title()}
			</h2>
			<p class="text-xs text-muted-foreground sm:text-sm">
				{pendingCount === 1
					? t.planning_pending_tasks_singular({ count: pendingCount })
					: t.planning_pending_tasks_plural({ count: pendingCount })}
			</p>
		</div>

		<button
			type="button"
			aria-label={t.planning_back_to_timer()}
			onclick={() => navigationState.setTab('timer')}
			class="inline-flex cursor-pointer items-center justify-center gap-1.5 self-start rounded-full border border-border/50 bg-muted/40 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:self-auto"
		>
			<ArrowRight class="size-3.5 rotate-180" />
			<span>{t.planning_back_to_timer()}</span>
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

		<!-- Right Column: Micro Planning (Tasks & Break Habits) -->
		<div class="space-y-4 lg:col-span-5">
			<!-- Segment Switcher Bar -->
			<div class="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
				<ToggleGroup.Root
					type="single"
					bind:value={activeRightSegment}
					onValueChange={(val) => {
						if (val === 'tasks' || val === 'breaks') {
							activeRightSegment = val;
						}
					}}
					variant="outline"
					size="sm"
					aria-label={t.planning_segment_switcher_aria()}
					class="grid w-full grid-cols-2 rounded-lg border border-border/50 bg-muted/40 p-0.5"
				>
					<ToggleGroup.Item
						value="tasks"
						aria-label={t.planning_segment_tasks()}
						class="flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs"
					>
						<ListTodo class="size-3.5" />
						<span>{t.planning_segment_tasks()}</span>
						{#if pendingCount > 0}
							<span
								class="py-0.2 ml-0.5 rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground"
							>
								{pendingCount}
							</span>
						{/if}
					</ToggleGroup.Item>

					<ToggleGroup.Item
						value="breaks"
						aria-label={t.planning_segment_breaks()}
						class="flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs"
					>
						<Sparkles class="size-3.5 text-accent-iris" />
						<span>{t.planning_segment_breaks()}</span>
					</ToggleGroup.Item>
				</ToggleGroup.Root>
			</div>

			<!-- Active Segment Content -->
			{#if activeRightSegment === 'tasks'}
				<TaskBacklog {tasksState} {planningState} />
			{:else if activeRightSegment === 'breaks'}
				<BreakCatalog {breaksState} />
			{/if}
		</div>
	</div>
</div>
