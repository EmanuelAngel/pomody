<script lang="ts">
	import Header from '$lib/components/layout/header.svelte';
	import DailyCounter from '$lib/components/layout/daily-counter.svelte';
	import Timer from '$lib/components/timer/timer.svelte';
	import PlanningView from '$lib/components/planning/planning-view.svelte';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import { tasksState as defaultTasksState, type TasksState } from '$lib/state/tasks.svelte';
	import {
		dailyStatsState as defaultDailyStatsState,
		type DailyStatsState
	} from '$lib/state/daily-stats.svelte';
	import {
		navigationState as defaultNavigationState,
		type NavigationState
	} from '$lib/state/navigation.svelte';
	import { breaksState as defaultBreaksState, type BreaksState } from '$lib/state/breaks.svelte';
	import {
		planningState as defaultPlanningState,
		type PlanningState
	} from '$lib/state/planning.svelte';

	interface Props {
		timerState?: TimerState;
		tasksState?: TasksState;
		dailyStatsState?: DailyStatsState;
		navigationState?: NavigationState;
		breaksState?: BreaksState;
		planningState?: PlanningState;
	}

	let {
		timerState = defaultTimerState,
		tasksState = defaultTasksState,
		dailyStatsState = defaultDailyStatsState,
		navigationState = defaultNavigationState,
		breaksState = defaultBreaksState,
		planningState = defaultPlanningState
	}: Props = $props();

	const activeTab = $derived(navigationState.activeTab);

	const modeTitles = {
		focus: 'Focus',
		shortBreak: 'Short Break',
		longBreak: 'Long Break'
	} as const;

	const documentTitle = $derived(
		timerState.state === 'idle'
			? 'Pomody — Minimalist Focus Timer'
			: `${timerState.formattedRemainingTime} ${modeTitles[timerState.mode]} — Pomody`
	);
</script>

<svelte:head>
	<title>{documentTitle}</title>
</svelte:head>

<Header {timerState} {navigationState} />

<main class="flex min-h-screen w-full flex-col items-center justify-center p-4 pt-16 sm:p-8">
	<h1 class="sr-only">Pomody — Focus Timer</h1>
	{#if activeTab === 'timer'}
		<div role="tabpanel" id="tabpanel-timer" aria-labelledby="tab-timer" class="w-full">
			<Timer state={timerState} {tasksState} {breaksState} />
		</div>
	{:else if activeTab === 'planning'}
		<div role="tabpanel" id="tabpanel-planning" aria-labelledby="tab-planning" class="w-full">
			<PlanningView {navigationState} {tasksState} {planningState} {timerState} {breaksState} />
		</div>
	{/if}
</main>

<DailyCounter {timerState} {dailyStatsState} />
