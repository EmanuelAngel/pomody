<script lang="ts">
	import Timer from '$lib/components/timer/timer.svelte';
	import PlanningView from '$lib/components/planning/planning-view.svelte';
	import { navigationState } from '$lib/state/navigation.svelte';

	const activeTab = $derived(navigationState.activeTab);
</script>

<svelte:head>
	<title>Pomody — Minimalist Focus Timer</title>
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
