<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { TimerMode } from '$lib/domain/timer/timer-fsm';

	interface Props {
		progress: number;
		mode: TimerMode;
		children?: Snippet;
	}

	let { progress = 0, mode = 'focus', children }: Props = $props();

	const RADIUS = 148;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	const clampedProgress = $derived(Math.min(1, Math.max(0, progress)));
	const strokeDashoffset = $derived(CIRCUMFERENCE * (1 - clampedProgress));

	const strokeColor = $derived.by(() => {
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
</script>

<div
	class="relative flex aspect-square w-full max-w-[360px] items-center justify-center sm:max-w-[400px]"
>
	<svg viewBox="0 0 320 320" class="size-full -rotate-0 transform" aria-hidden="true">
		<!-- Dimmed background track -->
		<circle
			cx="160"
			cy="160"
			r={RADIUS}
			fill="none"
			class="stroke-border/70 transition-colors duration-300 dark:stroke-border/50"
			stroke-width="2.5"
		/>

		<!-- Single thin reactive progress stroke -->
		<circle
			cx="160"
			cy="160"
			r={RADIUS}
			fill="none"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-dasharray={CIRCUMFERENCE}
			stroke-dashoffset={strokeDashoffset}
			transform="rotate(-90 160 160)"
			style:stroke={strokeColor}
			class="transition-[stroke-dashoffset,stroke] duration-300 ease-linear"
		/>
	</svg>

	<!-- Content centered inside the arc -->
	<div
		class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none"
	>
		{@render children?.()}
	</div>
</div>
