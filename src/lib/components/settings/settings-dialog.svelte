<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import Timer from '@lucide/svelte/icons/timer';
	import Palette from '@lucide/svelte/icons/palette';
	import Wallpaper from '@lucide/svelte/icons/wallpaper';
	import Bell from '@lucide/svelte/icons/bell';
	import Globe from '@lucide/svelte/icons/globe';

	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import { themeState as defaultThemeState, type ThemeState } from '$lib/state/theme.svelte';
	import { localeState as defaultLocaleState, type LocaleState, t } from '$lib/state/locale.svelte';
	import {
		distractionState as defaultDistractionState,
		type DistractionState
	} from '$lib/state/distractionState.svelte';
	import {
		illustrationState as defaultIllustrationState,
		type IllustrationState
	} from '$lib/state/illustration.svelte';
	import LanguageSelector from './language-selector.svelte';
	import IntervalsPanel from './panels/intervals-panel.svelte';
	import AppearancePanel from './panels/appearance-panel.svelte';
	import CompanionPanel from './panels/companion-panel.svelte';
	import BehaviorPanel from './panels/behavior-panel.svelte';

	interface Props {
		open?: boolean;
		timerState?: TimerState;
		themeState?: ThemeState;
		localeState?: LocaleState;
		distractionState?: DistractionState;
		illustrationState?: IllustrationState;
	}

	let {
		open = $bindable(false),
		timerState = defaultTimerState,
		themeState = defaultThemeState,
		localeState = defaultLocaleState,
		distractionState = defaultDistractionState,
		illustrationState = defaultIllustrationState
	}: Props = $props();

	/** The rail always opens on the group the request started with: intervals. */
	let activeTab = $state('intervals');

	$effect(() => {
		if (open) {
			activeTab = 'intervals';
		}
	});

	/**
	 * A running session is Zen mode, so settings must never float over it. The timer
	 * can start without this dialog — a background restore or an OS shortcut — which
	 * is why the reaction lives here instead of in the header trigger that owns the
	 * click. Only the transition to running closes it, so `null` means "not observed
	 * yet" and a panel opened on an already running timer stays open.
	 */
	let wasRunning: boolean | null = null;

	$effect(() => {
		const isRunning = timerState.isRunning;

		if (wasRunning !== null && isRunning && !wasRunning && open) {
			open = false;
		}

		wasRunning = isRunning;
	});

	/**
	 * `$derived` is load-bearing: `t` tracks the locale on property access, so a
	 * captured label function would freeze the rail in its first language.
	 */
	const tabs = $derived([
		{ value: 'intervals', label: t.settings_tab_intervals, icon: Timer },
		{ value: 'appearance', label: t.settings_tab_appearance, icon: Palette },
		{ value: 'companion', label: t.settings_tab_companion, icon: Wallpaper },
		{ value: 'behavior', label: t.settings_tab_behavior, icon: Bell },
		{ value: 'application', label: t.settings_tab_application, icon: Globe }
	]);
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="flex h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:h-[32rem] sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl"
	>
		<Dialog.Header class="border-b border-border/40 py-4 pr-12 pl-6">
			<Dialog.Title class="text-base font-semibold tracking-tight text-foreground"
				>{t.settings_title()}</Dialog.Title
			>
			<Dialog.Description class="text-xs text-muted-foreground">
				{t.settings_description()}
			</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root
			bind:value={activeTab}
			orientation="vertical"
			class="flex min-h-0 flex-1 flex-col gap-0 sm:flex-row"
		>
			<Tabs.List
				aria-label={t.settings_tabs_aria()}
				class="w-full shrink-0 flex-col items-stretch justify-start gap-1 border-b border-border/40 bg-muted/40 p-4 sm:h-full sm:w-48 sm:border-r sm:border-b-0"
			>
				{#each tabs as tab (tab.value)}
					<Tabs.Trigger
						value={tab.value}
						class="h-8 flex-none justify-start gap-2 px-3 text-xs font-medium sm:w-full"
					>
						<tab.icon data-icon="inline-start" />
						{tab.label()}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			<div class="min-h-0 flex-1 overflow-y-auto">
				<Tabs.Content value="intervals" class="flex-1 p-6">
					<IntervalsPanel {timerState} {open} />
				</Tabs.Content>

				<Tabs.Content value="appearance" class="flex-1 p-6">
					<AppearancePanel {themeState} />
				</Tabs.Content>

				<Tabs.Content value="companion" class="flex-1 p-6">
					<CompanionPanel {illustrationState} />
				</Tabs.Content>

				<Tabs.Content value="behavior" class="flex-1 p-6">
					<BehaviorPanel {timerState} {distractionState} />
				</Tabs.Content>

				<Tabs.Content value="application" class="flex-1 p-6">
					<LanguageSelector {localeState} />
				</Tabs.Content>
			</div>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
