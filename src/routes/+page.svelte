<script lang="ts">
	import Timer from '$lib/components/timer/timer.svelte';
	import PlanningView from '$lib/components/planning/planning-view.svelte';
	import { navigationState } from '$lib/state/navigation.svelte';
	import { timerState } from '$lib/state/timer.svelte';

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

<main class="flex min-h-screen w-full flex-col items-center justify-center p-4 pt-16 sm:p-8">
	<h1 class="sr-only">Pomody — Focus Timer</h1>
	{#if activeTab === 'timer'}
		<div role="tabpanel" id="tabpanel-timer" aria-labelledby="tab-timer" class="w-full">
			<Timer />
		</div>
	{:else if activeTab === 'planning'}
		<div role="tabpanel" id="tabpanel-planning" aria-labelledby="tab-planning" class="w-full">
			<PlanningView {navigationState} />
		</div>
	{/if}
</main>
