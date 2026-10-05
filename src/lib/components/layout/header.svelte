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
	<!-- Left Slot: Brand -->
	<div class="flex items-center gap-2">
		<span class="text-sm font-semibold tracking-tight text-foreground/90 select-none">
			Pomody
		</span>
	</div>

	<!-- Center Slot: Navigation Tabs -->
	<nav aria-label={t.header_nav_main_aria()} class="absolute left-1/2 -translate-x-1/2">
		<div
			role="tablist"
			aria-label={t.header_nav_views_aria()}
			class="inline-flex items-center gap-1 rounded-full border border-border/40 bg-muted/60 p-1 backdrop-blur-xs"
		>
			<button
				type="button"
				role="tab"
				id="tab-timer"
				aria-controls="tabpanel-timer"
				aria-selected={activeTab === 'timer'}
				onclick={() => handleTabClick('timer')}
				class={cn(
					'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm',
					activeTab === 'timer'
						? 'bg-background text-foreground shadow-xs'
						: 'text-muted-foreground/80 hover:text-foreground'
				)}
			>
				<span>{t.header_nav_timer()}</span>
			</button>

			<button
				type="button"
				role="tab"
				id="tab-planning"
				aria-controls="tabpanel-planning"
				aria-selected={activeTab === 'planning'}
				onclick={() => handleTabClick('planning')}
				class={cn(
					'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-sm',
					activeTab === 'planning'
						? 'bg-background text-foreground shadow-xs'
						: 'text-muted-foreground/80 hover:text-foreground'
				)}
			>
				<span>{t.header_nav_planning()}</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected="false"
				aria-disabled="true"
				disabled
				class="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground/60 transition-colors focus-visible:outline-none sm:text-sm"
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
