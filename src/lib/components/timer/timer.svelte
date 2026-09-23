<script lang="ts">
	import TimerArc from './timer-arc.svelte';
	import TimerDisplay from './timer-display.svelte';
	import TimerControls from './timer-controls.svelte';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';

	interface Props {
		state?: TimerState;
	}

	let { state = defaultTimerState }: Props = $props();

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
		/>
	</TimerArc>

	<TimerControls
		isRunning={state.isRunning}
		onPlayPause={handlePlayPause}
		onReset={handleReset}
		onSkip={handleSkip}
	/>
</div>
