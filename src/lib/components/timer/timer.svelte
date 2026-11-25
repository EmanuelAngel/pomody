<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import TimerArc from './timer-arc.svelte';
	import TimerDisplay from './timer-display.svelte';
	import TimerControls from './timer-controls.svelte';
	import TaskPill from './task-pill.svelte';
	import BreakRevitalization from './break-revitalization.svelte';
	import WaitingSince from './waiting-since.svelte';
	import { formatClockTime } from '$lib/domain/timer/block-end';
	import { t } from '$lib/state/locale.svelte';
	import { motionIn, motionOut } from '$lib/utils/motion';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import { tasksState as defaultTasksState, type TasksState } from '$lib/state/tasks.svelte';
	import { breaksState as defaultBreaksState, type BreaksState } from '$lib/state/breaks.svelte';

	interface Props {
		state?: TimerState;
		tasksState?: TasksState;
		breaksState?: BreaksState;
	}

	let {
		state = defaultTimerState,
		tasksState = defaultTasksState,
		breaksState = defaultBreaksState
	}: Props = $props();

	$effect(() => {
		if (state.mode === 'focus') {
			breaksState.resetCycle();
		}
	});

	/**
	 * What the timer is waiting for, or `null` while it runs or idles. The counter under the clock
	 * only exists in the two states where the user can lose time by not pressing continue.
	 */
	const waitingKind = $derived(
		state.state === 'paused' || state.state === 'completed' ? state.state : null
	);

	/**
	 * The states where the ticker is stopped: their end time only moves with the wall clock, so the
	 * label needs its own minute nudge. While the block runs, the snapshot ticks and does it for us.
	 */
	const needsWallClock = $derived(
		state.blockEndTimeEnabled && (state.state === 'idle' || state.state === 'paused')
	);

	$effect(() => {
		if (!needsWallClock) {
			return;
		}

		const id = setInterval(() => state.tickWallClock(), 60_000);

		return () => clearInterval(id);
	});

	/**
	 * When the block in course ends: a reading of the clock, not a countdown. Idle projects the block
	 * that would start right now, which is why its copy is conditional rather than the same sentence.
	 * Off by preference leaves the reserved line to the waiting counter alone.
	 */
	const endTimeLabel = $derived.by(() => {
		if (!state.blockEndTimeEnabled) {
			return null;
		}

		const endsAt = state.blockEndsAt;

		if (endsAt === null) {
			return null;
		}

		const time = formatClockTime(endsAt);

		return state.state === 'idle'
			? t.timer_block_end_time_idle({ time })
			: t.timer_block_end_time({ time });
	});

	function handlePlayPause() {
		if (state.isRunning) {
			state.pause();
		} else if (state.state === 'paused') {
			state.resume();
		} else {
			state.start();
		}
	}

	function handleReset() {
		state.reset();
	}

	function handleSkip() {
		state.skip();
	}
</script>

<div class="mx-auto flex w-full max-w-sm flex-col items-center justify-center sm:max-w-md">
	<TimerArc progress={state.progress} mode={state.mode}>
		<TimerDisplay
			formattedTime={state.formattedRemainingTime}
			mode={state.mode}
			currentRound={state.currentRound}
			roundsBeforeLongBreak={state.roundsBeforeLongBreak}
		/>
	</TimerArc>

	<!-- Always reserved, so the controls never jump when the counter appears. -->
	<div class="mt-1 grid h-5 place-items-center" data-timer-status-line>
		<div
			class="flex items-center justify-center gap-2 text-xs whitespace-nowrap text-muted-foreground tabular-nums sm:text-sm"
		>
			<WaitingSince waitingSince={state.waitingSince} kind={waitingKind} />
			{#if waitingKind !== null && endTimeLabel !== null}
				<span aria-hidden="true">·</span>
			{/if}
			{#if endTimeLabel !== null}
				<span data-block-end={state.state}>{endTimeLabel}</span>
			{/if}
		</div>
	</div>

	<TimerControls
		isRunning={state.isRunning}
		isPaused={state.state === 'paused'}
		onPlayPause={handlePlayPause}
		onReset={handleReset}
		onSkip={handleSkip}
	/>

	<div class="mt-6 grid h-8 place-items-center">
		<!--
			The two branches are the timer's whole footer and they swap on every mode
			change. `fade` was the first pass; it is now the shared in/out pair, so the
			swap matches the rest of the app and honours `prefers-reduced-motion`.
		-->
		{#if state.mode === 'focus'}
			<div class="col-start-1 row-start-1" in:fly={motionIn()} out:fade={motionOut()}>
				<TaskPill isRunning={state.isRunning} {tasksState} />
			</div>
		{:else if (state.mode === 'shortBreak' || state.mode === 'longBreak') && state.revitalizationEnabled}
			<div class="col-start-1 row-start-1" in:fly={motionIn()} out:fade={motionOut()}>
				<BreakRevitalization {breaksState} mode={state.mode} currentRound={state.currentRound} />
			</div>
		{/if}
	</div>
</div>
