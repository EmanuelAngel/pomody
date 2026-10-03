<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import {
		dailyStatsState as defaultDailyStatsState,
		type DailyStatsState
	} from '$lib/state/daily-stats.svelte';

	interface Props {
		timerState?: TimerState;
		dailyStatsState?: DailyStatsState;
		class?: string;
	}

	let {
		timerState = defaultTimerState,
		dailyStatsState = defaultDailyStatsState,
		class: className
	}: Props = $props();

	const isRunning = $derived(timerState.isRunning);
	const summary = $derived(dailyStatsState.formattedSummary);
</script>

<div
	data-testid="daily-focus-counter"
	class={cn(
		'pointer-events-none fixed inset-x-0 bottom-5 z-20 flex items-center justify-center transition-opacity duration-300 ease-in-out select-none',
		isRunning ? 'opacity-0' : 'opacity-100',
		className
	)}
>
	<span class="font-mono text-xs text-muted-foreground/60">{summary}</span>
</div>
