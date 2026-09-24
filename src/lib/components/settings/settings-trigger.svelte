<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Settings from '@lucide/svelte/icons/settings';
	import { cn } from '$lib/utils.js';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';

	interface Props {
		open?: boolean;
		timerState?: TimerState;
		onclick?: () => void;
	}

	let { open = $bindable(false), timerState = defaultTimerState, onclick }: Props = $props();

	const isRunning = $derived(timerState.isRunning);

	function handleClick() {
		open = true;
		onclick?.();
	}
</script>

<Button
	variant="ghost"
	size="icon"
	aria-label="Open settings"
	aria-expanded={open}
	disabled={isRunning}
	tabindex={isRunning ? -1 : undefined}
	aria-hidden={isRunning ? true : undefined}
	onclick={handleClick}
	class={cn(
		'fixed top-4 right-4 z-40 size-10 rounded-full text-muted-foreground transition-opacity duration-300 ease-in-out hover:text-foreground sm:top-6 sm:right-6',
		isRunning ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
	)}
>
	<Settings />
</Button>
