<script lang="ts">
	import { fade } from 'svelte/transition';
	import TimerArc from './timer-arc.svelte';
	import TimerDisplay from './timer-display.svelte';
	import TimerControls from './timer-controls.svelte';
	import TaskPill from './task-pill.svelte';
	import BreakRevitalization from './break-revitalization.svelte';
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

	<TimerControls
		isRunning={state.isRunning}
		isPaused={state.state === 'paused'}
		onPlayPause={handlePlayPause}
		onReset={handleReset}
		onSkip={handleSkip}
	/>

	<div class="mt-6 grid h-8 place-items-center">
		{#if state.mode === 'focus'}
			<div class="col-start-1 row-start-1" transition:fade={{ duration: 150 }}>
				<TaskPill isRunning={state.isRunning} {tasksState} />
			</div>
		{:else if (state.mode === 'shortBreak' || state.mode === 'longBreak') && state.revitalizationEnabled}
			<div class="col-start-1 row-start-1" transition:fade={{ duration: 150 }}>
				<BreakRevitalization {breaksState} mode={state.mode} currentRound={state.currentRound} />
			</div>
		{/if}
	</div>
</div>
