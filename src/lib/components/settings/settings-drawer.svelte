<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import { Separator } from '$lib/components/ui/separator';

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
		portalProps?: { disabled?: boolean };
	}

	let {
		open = $bindable(false),
		timerState = defaultTimerState,
		themeState = defaultThemeState,
		localeState = defaultLocaleState,
		distractionState = defaultDistractionState,
		illustrationState = defaultIllustrationState,
		portalProps
	}: Props = $props();
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" {portalProps} class="w-full overflow-y-auto sm:max-w-md">
		<Sheet.Header class="border-b border-border pb-4">
			<Sheet.Title class="text-lg font-semibold tracking-tight text-foreground"
				>{t.settings_title()}</Sheet.Title
			>
		</Sheet.Header>

		<div class="flex flex-col gap-6 px-4 py-6">
			<IntervalsPanel {timerState} {open} />

			<Separator />

			<AppearancePanel {themeState} />

			<Separator />

			<CompanionPanel {illustrationState} />

			<Separator />

			<LanguageSelector {localeState} />

			<Separator />

			<BehaviorPanel {timerState} {distractionState} />
		</div>
	</Sheet.Content>
</Sheet.Root>
