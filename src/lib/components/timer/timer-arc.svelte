<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { TimerMode, TimerState } from '$lib/domain/timer/timer-fsm';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		progress: number;
		mode: TimerMode;
		/**
		 * Lifecycle state, so the arc can carry the "alive" cue. Optional and additive: a caller
		 * that only wants a static fraction (tests, previews) keeps the idle rendering.
		 */
		state?: TimerState;
		children?: Snippet;
	}

	let { progress = 0, mode = 'focus', state = 'idle', children }: Props = $props();

	const RADIUS = 148;
	const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

	const clampedProgress = $derived(
		Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0
	);
	const strokeDashoffset = $derived(CIRCUMFERENCE * (1 - clampedProgress));

	/**
	 * The two states where the timer is not advancing by itself and is waiting for the user. The
	 * arc dims to say "nothing is happening until you press something", which is a different
	 * message from the running pulse and its rising and falling opacity.
	 */
	const isHolding = $derived(state === 'paused' || state === 'completed');

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
	role="progressbar"
	aria-valuenow={Math.round(clampedProgress * 100)}
	aria-valuemin={0}
	aria-valuemax={100}
	aria-label={t.timer_arc_progress()}
	data-mode={mode}
	data-timer-state={state}
	class="relative flex aspect-square w-full max-w-[360px] items-center justify-center sm:max-w-[400px]"
>
	<svg viewBox="0 0 320 320" class="size-full" aria-hidden="true">
		<!-- Dimmed background track -->
		<circle
			cx="160"
			cy="160"
			r={RADIUS}
			fill="none"
			class="stroke-border/70 transition-colors duration-300"
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
			class="arc-stroke"
			class:arc-alive={state === 'running'}
			class:arc-holding={isHolding}
		/>
	</svg>

	<!-- Content centered inside the arc -->
	<div
		class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none"
	>
		{@render children?.()}
	</div>
</div>

<style>
	/*
		The ticker publishes a new `progress` every 250ms, so a raw stroke would advance in visible
		quarter-second jumps. This transition is what turns those steps into one continuous sweep.

		It is deliberately CSS and not a `Tween` from `svelte/motion`: a tween owns a rAF loop for
		as long as the value keeps changing, which would mean a per-frame JS callback ticking for
		the entire 25-minute block to move a single attribute the browser can interpolate itself.
		Zero JS per frame is the whole point of a <30 MB, bloat-free app.

		`--duration-base` (200ms) against a 250ms cadence is the vocabulary step closest to one
		tick: each transition finishes just before the next target arrives, so the arc moves at a
		constant apparent speed with no interruption stutter. Timing is `linear` on purpose — an
		eased progress indicator would accelerate and decelerate once per tick, which reads as
		stutter rather than as smoothness. Colour and opacity keep the eased recipe.
	*/
	.arc-stroke {
		transition:
			stroke-dashoffset var(--duration-base) linear,
			stroke var(--duration-base) var(--ease-out-quart),
			stroke-opacity var(--duration-base) var(--ease-out-quart);
	}

	/* Paused or finished: the block is not advancing and only the user can move it. */
	.arc-holding {
		stroke-opacity: 0.55;
	}

	/*
		Running: a slow breath of opacity, 3.6s per cycle and a 0.14 amplitude, so the arc reads as
		alive at a glance without becoming a second thing to look at. Pure CSS keyframes — no JS
		per-frame work — and gated on the user's motion preference.
	*/
	@media (prefers-reduced-motion: no-preference) {
		.arc-alive {
			animation: arc-breathe 3.6s ease-in-out infinite;
		}
	}

	@keyframes arc-breathe {
		0%,
		100% {
			stroke-opacity: 1;
		}
		50% {
			stroke-opacity: 0.86;
		}
	}

	/*
		Reduced motion snaps: the value still updates four times a second, but without the
		interpolation the arc steps discretely instead of gliding, and the breath is gone.
		Colour keeps its transition — it is feedback, not movement.
	*/
	@media (prefers-reduced-motion: reduce) {
		.arc-stroke {
			transition:
				stroke var(--duration-base) var(--ease-out-quart),
				stroke-opacity var(--duration-base) var(--ease-out-quart);
		}
	}
</style>
