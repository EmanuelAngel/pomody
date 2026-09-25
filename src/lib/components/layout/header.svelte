<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Settings from '@lucide/svelte/icons/settings';
	import { cn } from '$lib/utils.js';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';

	interface Props {
		timerState?: TimerState;
		onSettingsClick?: () => void;
		settingsOpen?: boolean;
	}

	let {
		timerState = defaultTimerState,
		onSettingsClick,
		settingsOpen = $bindable(false)
	}: Props = $props();

	const isRunning = $derived(timerState.isRunning);

	function handleSettingsClick() {
		settingsOpen = true;
		onSettingsClick?.();
	}
</script>

<header
	class={cn(
		'fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between px-4 transition-opacity duration-300 ease-in-out sm:px-6',
		isRunning ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
	)}
>
	<!-- Left Slot: Brand -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-semibold tracking-tight text-foreground/90 select-none">
			Pomody
		</span>
	</div>

	<!-- Center Slot: Navigation Tabs -->
	<nav aria-label="Main Navigation" class="absolute left-1/2 -translate-x-1/2">
		<div
			role="tablist"
			aria-label="Navigation views"
			class="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/60 p-1 backdrop-blur-xs"
		>
			<button
				type="button"
				role="tab"
				aria-selected="true"
				class="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-medium text-foreground shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
			>
				<span>Temporizador</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected="false"
				aria-disabled="true"
				disabled
				class="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground/60 transition-colors focus-visible:outline-none sm:text-sm"
			>
				<span>Planning</span>
				<span class="hidden font-mono text-[10px] text-muted-foreground/40 sm:inline">
					(en v0.2)
				</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected="false"
				aria-disabled="true"
				disabled
				class="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground/60 transition-colors focus-visible:outline-none sm:text-sm"
			>
				<span>Métricas</span>
				<span class="hidden font-mono text-[10px] text-muted-foreground/40 sm:inline">
					(en v0.2)
				</span>
			</button>
		</div>
	</nav>

	<!-- Right Slot: Settings Action -->
	<div class="flex items-center">
		<Button
			variant="ghost"
			size="icon"
			aria-label="Open settings"
			aria-expanded={settingsOpen}
			disabled={isRunning}
			tabindex={isRunning ? -1 : undefined}
			onclick={handleSettingsClick}
			class="size-9 rounded-full text-muted-foreground transition-colors hover:text-foreground"
		>
			<Settings class="size-4" />
		</Button>
	</div>
</header>
