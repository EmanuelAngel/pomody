<script lang="ts">
	import type { TimerMode } from '$lib/domain/timer/timer-fsm';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		formattedTime: string;
		mode: TimerMode;
		currentRound: number;
		roundsBeforeLongBreak?: number;
	}

	let {
		formattedTime,
		mode = 'focus',
		currentRound = 1,
		roundsBeforeLongBreak = 4
	}: Props = $props();

	const modeLabel = $derived.by(() => {
		switch (mode) {
			case 'focus':
				return t.timer_mode_focus();
			case 'shortBreak':
				return t.timer_mode_short_break();
			case 'longBreak':
				return t.timer_mode_long_break();
			default:
				return t.timer_mode_focus();
		}
	});

	const modeColor = $derived.by(() => {
		switch (mode) {
			case 'focus':
				return 'var(--accent-foam)';
			case 'shortBreak':
				return 'var(--accent-pine)';
			case 'longBreak':
				return 'var(--accent-iris)';
			default:
				return 'var(--accent-foam)';
		}
	});

	const modeTextColor = $derived.by(() => {
		switch (mode) {
			case 'shortBreak':
				return 'var(--mode-short-break-text)';
			case 'longBreak':
				return 'var(--mode-long-break-text)';
			default:
				return 'var(--mode-focus-text)';
		}
	});

	const safeRoundsBeforeLongBreak = $derived(Math.max(1, Math.floor(roundsBeforeLongBreak || 4)));

	const completedInCycle = $derived.by(() => {
		if (mode === 'focus') {
			return Math.max(0, currentRound - 1);
		}
		if (mode === 'shortBreak') {
			return currentRound;
		}
		return safeRoundsBeforeLongBreak;
	});
</script>

<div class="flex flex-col items-center justify-center text-center">
	<!-- Mode label above time -->
	<span
		class="mb-2 text-xs font-semibold tracking-[0.25em] uppercase transition-colors duration-300 sm:text-sm"
		style:color={modeTextColor}
	>
		{modeLabel}
	</span>

	<!-- Large monospace time display (JetBrains Mono Variable) -->
	<div
		role="timer"
		aria-label={t.timer_time_remaining({ time: formattedTime })}
		class="font-mono text-[clamp(4.25rem,14vw,6.5rem)] leading-none font-normal tracking-tight text-foreground tabular-nums select-none sm:text-[clamp(5.5rem,15vw,7.5rem)]"
	>
		{formattedTime}
	</div>

	<!-- Round dots (●●○○) below time -->
	<div
		role="status"
		aria-label={t.timer_cycle_status({
			completed: completedInCycle,
			total: safeRoundsBeforeLongBreak
		})}
		class="mt-3 flex items-center justify-center gap-2 sm:mt-4 sm:gap-2.5"
	>
		{#each Array.from({ length: safeRoundsBeforeLongBreak }, (_, i) => i) as index (index)}
			{#if index < completedInCycle}
				<!-- Completed round dot (filled with mode accent) -->
				<span
					class="size-2 rounded-full transition-all duration-300 sm:size-2.5"
					style:background-color={modeColor}
				></span>
			{:else if index === completedInCycle && mode === 'focus'}
				<!-- Active focus round in progress -->
				<span
					class="size-2 rounded-full border-2 transition-all duration-300 sm:size-2.5"
					style:border-color={modeColor}
					style:background-color="color-mix(in srgb, {modeColor} 35%, transparent)"
				></span>
			{:else}
				<!-- Upcoming round dot (dimmed track) -->
				<span class="size-2 rounded-full bg-border/80 transition-all duration-300 sm:size-2.5"
				></span>
			{/if}
		{/each}
	</div>
</div>
