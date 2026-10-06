<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Settings from '@lucide/svelte/icons/settings';
	import { cn } from '$lib/utils.js';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import {
		navigationState as defaultNavigationState,
		type NavigationState,
		type NavigationTab
	} from '$lib/state/navigation.svelte';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		timerState?: TimerState;
		navigationState?: NavigationState;
		onSettingsClick?: () => void;
		settingsOpen?: boolean;
	}

	let {
		timerState = defaultTimerState,
		navigationState = defaultNavigationState,
		onSettingsClick,
		settingsOpen = $bindable(false)
	}: Props = $props();

	const isRunning = $derived(timerState.isRunning);
	const activeTab = $derived(navigationState.activeTab);

	function handleSettingsClick() {
		settingsOpen = true;
		onSettingsClick?.();
	}

	function handleTabClick(tab: NavigationTab) {
		navigationState.setTab(tab);
	}
</script>

<header
	class={cn(
		'fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between px-4 transition-opacity duration-300 ease-in-out sm:px-6',
		isRunning ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
	)}
>
	<!-- Left Slot: Brand Identity -->
	<div class="flex items-center gap-2">
		<span
			class="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase transition-colors select-none hover:text-foreground"
		>
			Pomody
		</span>
	</div>

	<!-- Center Slot: Architectural Navigation Tabs -->
	<nav aria-label={t.header_nav_main_aria()} class="absolute left-1/2 -translate-x-1/2">
		<div
			role="tablist"
			aria-label={t.header_nav_views_aria()}
			class="flex items-center gap-6 sm:gap-8"
		>
			<button
				type="button"
				role="tab"
				id="tab-timer"
				aria-controls="tabpanel-timer"
				aria-selected={activeTab === 'timer'}
				onclick={() => handleTabClick('timer')}
				class={cn(
					'group relative flex cursor-pointer flex-col items-center py-2 text-xs font-medium tracking-tight transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-xs',
					activeTab === 'timer'
						? 'font-semibold text-foreground'
						: 'text-muted-foreground/70 hover:text-foreground'
				)}
			>
				<span>{t.header_nav_timer()}</span>
				{#if activeTab === 'timer'}
					<span
						class="absolute -bottom-1 h-0.5 w-4 rounded-full bg-accent-rose transition-all duration-200"
					></span>
				{/if}
			</button>

			<button
				type="button"
				role="tab"
				id="tab-planning"
				aria-controls="tabpanel-planning"
				aria-selected={activeTab === 'planning'}
				onclick={() => handleTabClick('planning')}
				class={cn(
					'group relative flex cursor-pointer flex-col items-center py-2 text-xs font-medium tracking-tight transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-xs',
					activeTab === 'planning'
						? 'font-semibold text-foreground'
						: 'text-muted-foreground/70 hover:text-foreground'
				)}
			>
				<span>{t.header_nav_planning()}</span>
				{#if activeTab === 'planning'}
					<span
						class="absolute -bottom-1 h-0.5 w-4 rounded-full bg-accent-rose transition-all duration-200"
					></span>
				{/if}
			</button>

			<button
				type="button"
				role="tab"
				aria-selected="false"
				aria-disabled="true"
				disabled
				class="relative flex cursor-not-allowed flex-col items-center py-2 text-xs font-medium tracking-tight text-muted-foreground/35 transition-colors focus-visible:outline-none sm:text-xs"
			>
				<span>{t.header_nav_metrics()}</span>
			</button>
		</div>
	</nav>

	<!-- Right Slot: Settings Action -->
	<div class="flex items-center">
		<Button
			variant="ghost"
			size="icon"
			aria-label={t.settings_trigger_open()}
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
