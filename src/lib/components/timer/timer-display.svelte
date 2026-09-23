<script lang="ts">
	import type { TimerMode } from '$lib/domain/timer/timer-fsm';

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
				return 'FOCUS';
			case 'shortBreak':
				return 'SHORT BREAK';
			case 'longBreak':
				return 'LONG BREAK';
			default:
				return 'FOCUS';
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

	const completedInCycle = $derived.by(() => {
		if (mode === 'focus') {
			return Math.max(0, currentRound - 1);
		}
		if (mode === 'shortBreak') {
			return currentRound;
		}
		return roundsBeforeLongBreak;
	});
</script>

<div class="flex flex-col items-center justify-center text-center">
	<!-- Mode label above time -->
	<span
		class="mb-2 text-xs font-semibold tracking-[0.25em] uppercase transition-colors duration-300 sm:text-sm"
		style:color={modeColor}
	>
		{modeLabel}
	</span>

	<!-- Large monospace time display (JetBrains Mono Variable) -->
	<div
		role="timer"
		aria-label={`Time remaining: ${formattedTime}`}
		class="font-mono text-[clamp(4.25rem,14vw,6.5rem)] leading-none font-light tracking-tight text-foreground tabular-nums select-none sm:text-[clamp(5.5rem,15vw,7.5rem)]"
	>
		{formattedTime}
	</div>

	<!-- Round dots (●●○○) below time -->
	<div
		role="status"
		aria-label={`Pomodoro cycle: ${completedInCycle} of ${roundsBeforeLongBreak} rounds completed`}
		class="mt-3 flex items-center justify-center gap-2 sm:mt-4 sm:gap-2.5"
	>
		{#each Array.from({ length: roundsBeforeLongBreak }, (_, i) => i) as index (index)}
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
				<span
					class="size-2 rounded-full bg-border/80 transition-all duration-300 sm:size-2.5 dark:bg-border/60"
				></span>
			{/if}
		{/each}
	</div>
</div>
