<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Settings from '@lucide/svelte/icons/settings';
	import Minimize2 from '@lucide/svelte/icons/minimize-2';
	import { cn } from '$lib/utils.js';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import {
		navigationState as defaultNavigationState,
		type NavigationState,
		type NavigationTab,
		type SettingsTab
	} from '$lib/state/navigation.svelte';
	import {
		windowState as defaultWindowState,
		type WindowState
	} from '$lib/state/windowState.svelte';
	import {
		distractionState as defaultDistractionState,
		type DistractionState
	} from '$lib/state/distractionState.svelte';
	import { updateState as defaultUpdateState, type UpdateState } from '$lib/state/update.svelte';
	import ArrowUpCircle from '@lucide/svelte/icons/arrow-up-circle';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		timerState?: TimerState;
		navigationState?: NavigationState;
		windowState?: WindowState;
		distractionState?: DistractionState;
		updateState?: UpdateState;
		onSettingsClick?: (tab?: SettingsTab) => void;
		settingsOpen?: boolean;
	}

	let {
		timerState = defaultTimerState,
		navigationState = defaultNavigationState,
		windowState = defaultWindowState,
		distractionState = defaultDistractionState,
		updateState = defaultUpdateState,
		onSettingsClick,
		settingsOpen = $bindable(false)
	}: Props = $props();

	const isRunning = $derived(timerState.isRunning);
	const activeTab = $derived(navigationState.activeTab);
	/**
	 * The detector has no surface at all on a platform that cannot read other windows
	 * (spec §1): a tab that opens an empty declaration picker would be a dead control.
	 */
	const distractionDetectorSupported = $derived(distractionState.isSupported);

	function handleSettingsClick() {
		settingsOpen = true;
		onSettingsClick?.();
	}

	/**
	 * The indicator is a shortcut, not a control of its own: it lands on the
	 * updater section, which lives in the Application tab of Settings.
	 */
	function handleUpdateClick() {
		settingsOpen = true;
		onSettingsClick?.('application');
	}

	/** Desktop only (spec S9): there is neither updater nor UI on the web build. */
	const updateNoticeVisible = $derived(updateState.isSupported && updateState.hasUpdate);

	function handleTabClick(tab: NavigationTab) {
		navigationState.setTab(tab);
	}

	function handleMiniPlayerToggle() {
		void windowState.toggleMiniPlayer();
	}

	/**
	 * Zen Mode recedes everything that is not needed while working. A CSS
	 * `opacity-0` on an ancestor cannot be undone by a descendant, so the rule is
	 * applied per slot instead of on the `<header>` root — which is what lets the
	 * compact-mode trigger stay reachable while the timer runs. Entering compact
	 * mode is precisely a thing you need during a focus block, not after it.
	 */
	const zenClass = $derived(
		isRunning ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100'
	);
</script>

<header class="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between px-4 sm:px-6">
	<!-- Left Slot: Brand Identity -->
	<div class={cn('flex items-center gap-2 transition-opacity duration-300 ease-in-out', zenClass)}>
		<span
			class="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase transition-colors select-none hover:text-foreground"
		>
			Pomody
		</span>
	</div>

	<!-- Center Slot: Architectural Navigation Tabs -->
	<nav
		aria-label={t.header_nav_main_aria()}
		class={cn(
			'absolute left-1/2 -translate-x-1/2 transition-opacity duration-300 ease-in-out',
			zenClass
		)}
	>
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

			{#if distractionDetectorSupported}
				<button
					type="button"
					role="tab"
					id="tab-distractions"
					aria-controls="tabpanel-distractions"
					aria-selected={activeTab === 'distractions'}
					onclick={() => handleTabClick('distractions')}
					class={cn(
						'group relative flex cursor-pointer flex-col items-center py-2 text-xs font-medium tracking-tight transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-xs',
						activeTab === 'distractions'
							? 'font-semibold text-foreground'
							: 'text-muted-foreground/70 hover:text-foreground'
					)}
				>
					<span>{t.header_nav_distractions()}</span>
					{#if activeTab === 'distractions'}
						<span
							class="absolute -bottom-1 h-0.5 w-4 rounded-full bg-accent-rose transition-all duration-200"
						></span>
					{/if}
				</button>
			{/if}

			<button
				type="button"
				role="tab"
				id="tab-metrics"
				aria-controls="tabpanel-metrics"
				aria-selected={activeTab === 'metrics'}
				onclick={() => handleTabClick('metrics')}
				class={cn(
					'group relative flex cursor-pointer flex-col items-center py-2 text-xs font-medium tracking-tight transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:text-xs',
					activeTab === 'metrics'
						? 'font-semibold text-foreground'
						: 'text-muted-foreground/70 hover:text-foreground'
				)}
			>
				<span>{t.header_nav_metrics()}</span>
				{#if activeTab === 'metrics'}
					<span
						class="absolute -bottom-1 h-0.5 w-4 rounded-full bg-accent-rose transition-all duration-200"
					></span>
				{/if}
			</button>
		</div>
	</nav>

	<!-- Right Slot: Settings Action -->
	<div class="flex items-center gap-1">
		<!--
			Discreet notification that a newer version is out (spec S5). The details —
			version, notes and the install button — live in Settings, so the indicator
			is only a shortcut to the Application tab. Follows the Zen-mode slot rule.
		-->
		{#if updateNoticeVisible}
			<Button
				variant="ghost"
				aria-label={t.header_update_available()}
				onclick={handleUpdateClick}
				class={cn(
					'gap-1.5 rounded-full text-xs text-muted-foreground transition-opacity duration-300 ease-in-out hover:text-foreground',
					zenClass
				)}
			>
				<ArrowUpCircle class="size-4" />
				{t.header_update_available()}
			</Button>
		{/if}
		<!--
			Rendered only when the platform can actually manipulate the window. On
			the web build `enterMiniPlayer` is a safe no-op, so an ungated trigger
			would be a control that visibly does nothing.
		-->
		{#if windowState.isSupported}
			<Button
				variant="ghost"
				size="icon"
				aria-label={t.header_mini_player_open()}
				onclick={handleMiniPlayerToggle}
				class="size-9 rounded-full text-muted-foreground transition-colors hover:text-foreground"
			>
				<Minimize2 class="size-4" />
			</Button>
		{/if}

		<Button
			variant="ghost"
			size="icon"
			aria-label={t.settings_trigger_open()}
			aria-expanded={settingsOpen}
			disabled={isRunning}
			tabindex={isRunning ? -1 : undefined}
			onclick={handleSettingsClick}
			class={cn(
				'size-9 rounded-full text-muted-foreground transition-opacity duration-300 ease-in-out hover:text-foreground',
				zenClass
			)}
		>
			<Settings class="size-4" />
		</Button>
	</div>
</header>
