<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import { cn } from '$lib/utils';

	interface Props {
		isRunning: boolean;
		onPlayPause: () => void;
		onReset: () => void;
		onSkip: () => void;
	}

	let { isRunning = false, onPlayPause, onReset, onSkip }: Props = $props();
</script>

<div class="mt-8 flex items-center justify-center gap-6 sm:gap-8">
	<!-- Reset button (Ghost, secondary — fades in Zen mode) -->
	<Button
		variant="ghost"
		size="icon"
		aria-label="Reset timer"
		tabindex={isRunning ? -1 : 0}
		aria-hidden={isRunning}
		onclick={onReset}
		class={cn(
			'size-12 rounded-full text-muted-foreground transition-opacity duration-300 ease-in-out hover:text-foreground',
			isRunning ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
		)}
	>
		<RotateCcw class="size-5" />
	</Button>

	<!-- Play / Pause button (Primary, always visible) -->
	<Button
		variant="default"
		size="icon-lg"
		aria-label={isRunning ? 'Pause timer' : 'Start timer'}
		onclick={onPlayPause}
		class="size-16 cursor-pointer rounded-full shadow-md transition-transform duration-200 hover:scale-105 active:scale-95"
	>
		{#if isRunning}
			<Pause class="size-7" />
		{:else}
			<Play class="size-7 translate-x-0.5" />
		{/if}
	</Button>

	<!-- Skip button (Ghost, secondary — fades in Zen mode) -->
	<Button
		variant="ghost"
		size="icon"
		aria-label="Skip to next session"
		tabindex={isRunning ? -1 : 0}
		aria-hidden={isRunning}
		onclick={onSkip}
		class={cn(
			'size-12 rounded-full text-muted-foreground transition-opacity duration-300 ease-in-out hover:text-foreground',
			isRunning ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
		)}
	>
		<SkipForward class="size-5" />
	</Button>
</div>
