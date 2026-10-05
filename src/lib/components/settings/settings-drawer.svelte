<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Field from '$lib/components/ui/field';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Slider } from '$lib/components/ui/slider';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import {
		themeState as defaultThemeState,
		type ThemeState,
		type Theme
	} from '$lib/state/theme.svelte';
	import { localeState as defaultLocaleState, type LocaleState, t } from '$lib/state/locale.svelte';
	import LanguageSelector from './language-selector.svelte';
	import { DEFAULT_TIMER_CONFIG } from '$lib/domain/timer/timer-fsm';

	interface Props {
		open?: boolean;
		timerState?: TimerState;
		themeState?: ThemeState;
		localeState?: LocaleState;
		portalProps?: { disabled?: boolean };
	}

	let {
		open = $bindable(false),
		timerState = defaultTimerState,
		themeState = defaultThemeState,
		localeState = defaultLocaleState,
		portalProps
	}: Props = $props();

	// Local reactive override state for slider adjustments
	let localFocus = $state<number | null>(null);
	let localShortBreak = $state<number | null>(null);
	let localLongBreak = $state<number | null>(null);
	let localRounds = $state<number | null>(null);

	// Derived values defaulting to timerState config
	const focusMinutes = $derived(
		localFocus !== null ? localFocus : Math.round(timerState.config.focusDurationSeconds / 60)
	);
	const shortBreakMinutes = $derived(
		localShortBreak !== null
			? localShortBreak
			: Math.round(timerState.config.shortBreakDurationSeconds / 60)
	);
	const longBreakMinutes = $derived(
		localLongBreak !== null
			? localLongBreak
			: Math.round(timerState.config.longBreakDurationSeconds / 60)
	);
	const roundsBeforeLongBreak = $derived(
		localRounds !== null ? localRounds : timerState.roundsBeforeLongBreak
	);

	const defaultFocus = Math.round(DEFAULT_TIMER_CONFIG.focusDurationSeconds / 60);
	const defaultShort = Math.round(DEFAULT_TIMER_CONFIG.shortBreakDurationSeconds / 60);
	const defaultLong = Math.round(DEFAULT_TIMER_CONFIG.longBreakDurationSeconds / 60);
	const defaultRounds = DEFAULT_TIMER_CONFIG.roundsBeforeLongBreak;
	const resetLabel = $derived(
		t.settings_reset_defaults({
			focus: defaultFocus,
			shortBreak: defaultShort,
			longBreak: defaultLong,
			rounds: defaultRounds
		})
	);

	// Clear temporary slider overrides whenever drawer opens
	$effect(() => {
		if (open) {
			localFocus = null;
			localShortBreak = null;
			localLongBreak = null;
			localRounds = null;
		}
	});

	function handleFocusChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 120) {
			localFocus = val;
			if (timerState.config.focusDurationSeconds !== val * 60) {
				timerState.updateConfig({ focusDurationSeconds: val * 60 });
			}
		}
	}

	function handleShortBreakChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 60) {
			localShortBreak = val;
			if (timerState.config.shortBreakDurationSeconds !== val * 60) {
				timerState.updateConfig({ shortBreakDurationSeconds: val * 60 });
			}
		}
	}

	function handleLongBreakChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 90) {
			localLongBreak = val;
			if (timerState.config.longBreakDurationSeconds !== val * 60) {
				timerState.updateConfig({ longBreakDurationSeconds: val * 60 });
			}
		}
	}

	function handleRoundsChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 12) {
			localRounds = val;
			if (timerState.config.roundsBeforeLongBreak !== val) {
				timerState.updateConfig({ roundsBeforeLongBreak: val });
			}
		}
	}

	function handleResetDefaults() {
		localFocus = null;
		localShortBreak = null;
		localLongBreak = null;
		localRounds = null;
		timerState.updateConfig({
			focusDurationSeconds: DEFAULT_TIMER_CONFIG.focusDurationSeconds,
			shortBreakDurationSeconds: DEFAULT_TIMER_CONFIG.shortBreakDurationSeconds,
			longBreakDurationSeconds: DEFAULT_TIMER_CONFIG.longBreakDurationSeconds,
			roundsBeforeLongBreak: DEFAULT_TIMER_CONFIG.roundsBeforeLongBreak
		});
		timerState.setSoundEnabled(true);
		timerState.setRevitalizationEnabled(true);
	}

	let selectedTheme = $derived(themeState.current);

	function handleThemeChange(value: string | string[] | undefined) {
		if (typeof value === 'string' && (value === 'dark' || value === 'dawn' || value === 'oled')) {
			themeState.setTheme(value as Theme);
			selectedTheme = value;
		} else {
			selectedTheme = themeState.current;
		}
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" {portalProps} class="w-full overflow-y-auto sm:max-w-md">
		<Sheet.Header class="border-b border-border pb-4">
			<Sheet.Title class="text-lg font-semibold tracking-tight text-foreground"
				>{t.settings_title()}</Sheet.Title
			>
		</Sheet.Header>

		<div class="flex flex-col gap-6 px-4 py-6">
			<!-- Section 1: Intervals -->
			<div class="flex flex-col gap-4">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-foreground">
						{t.settings_section_intervals()}
					</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">
						{t.settings_section_intervals_description()}
					</p>
				</div>

				<Field.Group class="flex flex-col gap-5">
					<!-- Focus Duration -->
					<Field.Field class="gap-2.5">
						<div class="flex items-center justify-between">
							<Field.Label class="flex items-center gap-2 text-xs font-medium text-foreground">
								<span class="size-2 rounded-full bg-accent-foam"></span>
								{t.settings_interval_focus()}
							</Field.Label>
							<span class="font-mono text-xs font-semibold text-accent-foam">
								{focusMinutes} min
							</span>
						</div>
						<Slider
							type="single"
							value={focusMinutes}
							min={1}
							max={120}
							step={1}
							aria-label={t.settings_interval_focus_aria()}
							onValueChange={handleFocusChange}
							class="py-1 [&_[data-slot=slider-range]]:bg-accent-foam [&_[data-slot=slider-thumb]]:border-accent-foam [&_[data-slot=slider-thumb]]:bg-background"
						/>
					</Field.Field>

					<!-- Short Break Duration -->
					<Field.Field class="gap-2.5">
						<div class="flex items-center justify-between">
							<Field.Label class="flex items-center gap-2 text-xs font-medium text-foreground">
								<span class="size-2 rounded-full bg-accent-pine"></span>
								{t.settings_interval_short_break()}
							</Field.Label>
							<span class="font-mono text-xs font-semibold text-accent-pine">
								{shortBreakMinutes} min
							</span>
						</div>
						<Slider
							type="single"
							value={shortBreakMinutes}
							min={1}
							max={60}
							step={1}
							aria-label={t.settings_interval_short_break_aria()}
							onValueChange={handleShortBreakChange}
							class="py-1 [&_[data-slot=slider-range]]:bg-accent-pine [&_[data-slot=slider-thumb]]:border-accent-pine [&_[data-slot=slider-thumb]]:bg-background"
						/>
					</Field.Field>

					<!-- Long Break Duration -->
					<Field.Field class="gap-2.5">
						<div class="flex items-center justify-between">
							<Field.Label class="flex items-center gap-2 text-xs font-medium text-foreground">
								<span class="size-2 rounded-full bg-accent-iris"></span>
								{t.settings_interval_long_break()}
							</Field.Label>
							<span class="font-mono text-xs font-semibold text-accent-iris">
								{longBreakMinutes} min
							</span>
						</div>
						<Slider
							type="single"
							value={longBreakMinutes}
							min={1}
							max={90}
							step={1}
							aria-label={t.settings_interval_long_break_aria()}
							onValueChange={handleLongBreakChange}
							class="py-1 [&_[data-slot=slider-range]]:bg-accent-iris [&_[data-slot=slider-thumb]]:border-accent-iris [&_[data-slot=slider-thumb]]:bg-background"
						/>
					</Field.Field>

					<!-- Rounds before Long Break -->
					<Field.Field class="gap-2.5">
						<div class="flex items-center justify-between">
							<Field.Label class="flex items-center gap-2 text-xs font-medium text-foreground">
								<span class="size-2 rounded-full bg-accent-rose"></span>
								{t.settings_interval_rounds()}
							</Field.Label>
							<span class="font-mono text-xs font-semibold text-accent-rose">
								{roundsBeforeLongBreak === 1
									? t.settings_round_singular({ count: roundsBeforeLongBreak })
									: t.settings_round_plural({ count: roundsBeforeLongBreak })}
							</span>
						</div>
						<Slider
							type="single"
							value={roundsBeforeLongBreak}
							min={1}
							max={12}
							step={1}
							aria-label={t.settings_interval_rounds_aria()}
							onValueChange={handleRoundsChange}
							class="py-1 [&_[data-slot=slider-range]]:bg-accent-rose [&_[data-slot=slider-thumb]]:border-accent-rose [&_[data-slot=slider-thumb]]:bg-background"
						/>
					</Field.Field>
				</Field.Group>

				<Button variant="outline" size="sm" onclick={handleResetDefaults} class="mt-1 w-full">
					<RotateCcw data-icon="inline-start" />
					{resetLabel}
				</Button>
			</div>

			<Separator />

			<!-- Section 2: Theme Selector -->
			<div class="flex flex-col gap-3">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-foreground">
						{t.settings_section_theme()}
					</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">
						{t.settings_section_theme_description()}
					</p>
				</div>

				<ToggleGroup.Root
					type="single"
					bind:value={selectedTheme}
					onValueChange={handleThemeChange}
					variant="outline"
					spacing={2}
					aria-label={t.settings_theme_aria()}
					class="grid grid-cols-3 gap-2"
				>
					<ToggleGroup.Item
						value="dark"
						aria-label={t.settings_theme_dark_aria()}
						class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
					>
						<span
							class="flex size-4 items-center justify-center rounded-full border border-border bg-[#191724] shadow-xs"
						>
							<span class="size-2 rounded-full bg-[#ebbcba]"></span>
						</span>
						<span class="text-xs font-medium">{t.settings_theme_dark()}</span>
					</ToggleGroup.Item>

					<ToggleGroup.Item
						value="dawn"
						aria-label={t.settings_theme_dawn_aria()}
						class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
					>
						<span
							class="flex size-4 items-center justify-center rounded-full border border-border bg-[#faf4ed] shadow-xs"
						>
							<span class="size-2 rounded-full bg-[#d7827e]"></span>
						</span>
						<span class="text-xs font-medium">{t.settings_theme_dawn()}</span>
					</ToggleGroup.Item>

					<ToggleGroup.Item
						value="oled"
						aria-label={t.settings_theme_oled_aria()}
						class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
					>
						<span
							class="flex size-4 items-center justify-center rounded-full border border-border bg-[#000000] shadow-xs"
						>
							<span class="size-2 rounded-full bg-[#ffb4b4]"></span>
						</span>
						<span class="text-xs font-medium">{t.settings_theme_oled()}</span>
					</ToggleGroup.Item>
				</ToggleGroup.Root>
			</div>

			<Separator />

			<!-- Section 3: Language Selector -->
			<LanguageSelector {localeState} />

			<Separator />

			<!-- Section 4: Sound Alerts -->
			<div class="flex flex-col gap-3">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-foreground">
						{t.settings_section_sound()}
					</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">
						{t.settings_section_sound_description()}
					</p>
				</div>

				<div
					class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs"
				>
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium text-foreground">{t.settings_sound_alerts()}</span>
						<span class="text-xs text-muted-foreground"
							>{t.settings_sound_alerts_description()}</span
						>
					</div>
					<Switch
						checked={timerState.soundEnabled}
						onCheckedChange={(checked) => timerState.setSoundEnabled(checked)}
						aria-label={t.settings_sound_alerts_aria()}
					/>
				</div>
			</div>

			<Separator />

			<!-- Section 5: Break Revitalization -->
			<div class="flex flex-col gap-3">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-foreground">
						{t.settings_section_revitalization()}
					</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">
						{t.settings_section_revitalization_description()}
					</p>
				</div>

				<div
					class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs"
				>
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium text-foreground"
							>{t.settings_revitalization_suggestions()}</span
						>
						<span class="text-xs text-muted-foreground"
							>{t.settings_revitalization_suggestions_description()}</span
						>
					</div>
					<Switch
						checked={timerState.revitalizationEnabled}
						onCheckedChange={(checked) => timerState.setRevitalizationEnabled(checked)}
						aria-label={t.settings_revitalization_suggestions_aria()}
					/>
				</div>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
