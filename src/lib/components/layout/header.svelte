<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import Settings from '@lucide/svelte/icons/settings';
	import Minimize2 from '@lucide/svelte/icons/minimize-2';
	import Timer from '@lucide/svelte/icons/timer';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import ShieldLock from '@lucide/svelte/icons/shield-lock';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
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
	import PomodyMark from '$lib/components/brand/pomody-mark.svelte';

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

	/**
	 * The header floats over the page, so any view taller than the viewport slides
	 * its content under the tabs and the two layers mix. Every view except the Timer
	 * does that (Planning, Metrics and Distractions are all list-like and scroll), so
	 * those are the ones that get a surface: a translucent theme token plus
	 * `backdrop-blur` — the token, never a hard-coded colour, is what keeps dark, dawn
	 * and oled consistent. The Timer is one centred canvas that never reaches the
	 * bar, and a band there would only cut across the illustration, so it stays bare.
	 */
	const hasSurface = $derived(activeTab !== 'timer');
</script>

<header
	class={cn(
		'fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between px-4 sm:px-6',
		hasSurface && 'border-b border-border/40 bg-background/50 backdrop-blur-2xl'
	)}
>
	<!-- Left Slot: Brand Identity -->
	<div class={cn('flex items-center gap-2 transition-opacity duration-300 ease-in-out', zenClass)}>
		<PomodyMark size={20} />
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
		<Tooltip.Provider delayDuration={300}>
			<div
				role="tablist"
				aria-label={t.header_nav_views_aria()}
				class="flex items-center gap-1 sm:gap-2"
			>
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								role="tab"
								id="tab-timer"
								aria-controls="tabpanel-timer"
								aria-selected={activeTab === 'timer'}
								onclick={() => handleTabClick('timer')}
								class={cn(
									'group relative flex cursor-pointer flex-col items-center rounded-lg px-3 py-2 interactive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
									'hover:bg-muted focus-visible:bg-muted',
									activeTab === 'timer'
										? 'text-foreground'
										: 'text-muted-foreground/70 hover:text-foreground'
								)}
							>
								<Timer class="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
								<span class="sr-only">{t.header_nav_timer()}</span>
								{#if activeTab === 'timer'}
									<span
										class="absolute -bottom-1 h-0.5 w-4 rounded-full bg-accent-rose motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in"
									></span>
								{/if}
							</button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="bottom" sideOffset={6}>{t.header_nav_timer()}</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								role="tab"
								id="tab-planning"
								aria-controls="tabpanel-planning"
								aria-selected={activeTab === 'planning'}
								onclick={() => handleTabClick('planning')}
								class={cn(
									'group relative flex cursor-pointer flex-col items-center rounded-lg px-3 py-2 interactive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
									'hover:bg-muted focus-visible:bg-muted',
									activeTab === 'planning'
										? 'text-foreground'
										: 'text-muted-foreground/70 hover:text-foreground'
								)}
							>
								<ListChecks class="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
								<span class="sr-only">{t.header_nav_planning()}</span>
								{#if activeTab === 'planning'}
									<span
										class="absolute -bottom-1 h-0.5 w-4 rounded-full bg-accent-rose motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in"
									></span>
								{/if}
							</button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="bottom" sideOffset={6}>{t.header_nav_planning()}</Tooltip.Content>
				</Tooltip.Root>

				{#if distractionDetectorSupported}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									role="tab"
									id="tab-distractions"
									aria-controls="tabpanel-distractions"
									aria-selected={activeTab === 'distractions'}
									onclick={() => handleTabClick('distractions')}
									class={cn(
										'group relative flex cursor-pointer flex-col items-center rounded-lg px-3 py-2 interactive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
										'hover:bg-muted focus-visible:bg-muted',
										activeTab === 'distractions'
											? 'text-foreground'
											: 'text-muted-foreground/70 hover:text-foreground'
									)}
								>
									<ShieldLock class="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
									<span class="sr-only">{t.header_nav_distractions()}</span>
									{#if activeTab === 'distractions'}
										<span
											class="absolute -bottom-1 h-0.5 w-4 rounded-full bg-accent-rose motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in"
										></span>
									{/if}
								</button>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content side="bottom" sideOffset={6}
							>{t.header_nav_distractions()}</Tooltip.Content
						>
					</Tooltip.Root>
				{/if}

				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								role="tab"
								id="tab-metrics"
								aria-controls="tabpanel-metrics"
								aria-selected={activeTab === 'metrics'}
								onclick={() => handleTabClick('metrics')}
								class={cn(
									'group relative flex cursor-pointer flex-col items-center rounded-lg px-3 py-2 interactive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
									'hover:bg-muted focus-visible:bg-muted',
									activeTab === 'metrics'
										? 'text-foreground'
										: 'text-muted-foreground/70 hover:text-foreground'
								)}
							>
								<ChartColumn class="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
								<span class="sr-only">{t.header_nav_metrics()}</span>
								{#if activeTab === 'metrics'}
									<span
										class="absolute -bottom-1 h-0.5 w-4 rounded-full bg-accent-rose motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in"
									></span>
								{/if}
							</button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content side="bottom" sideOffset={6}>{t.header_nav_metrics()}</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</Tooltip.Provider>
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
