<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Field from '$lib/components/ui/field';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Slider } from '$lib/components/ui/slider';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import {
		themeState as defaultThemeState,
		type ThemeState,
		type Theme
	} from '$lib/state/theme.svelte';
	import { DEFAULT_TIMER_CONFIG } from '$lib/domain/timer/timer-fsm';

	interface Props {
		open?: boolean;
		timerState?: TimerState;
		themeState?: ThemeState;
		portalProps?: { disabled?: boolean };
	}

	let {
		open = $bindable(false),
		timerState = defaultTimerState,
		themeState = defaultThemeState,
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
		if (Number.isInteger(val) && val >= 1 && val <= 60) {
			localFocus = val;
			timerState.updateConfig({ focusDurationSeconds: val * 60 });
		}
	}

	function handleShortBreakChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 30) {
			localShortBreak = val;
			timerState.updateConfig({ shortBreakDurationSeconds: val * 60 });
		}
	}

	function handleLongBreakChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 60) {
			localLongBreak = val;
			timerState.updateConfig({ longBreakDurationSeconds: val * 60 });
		}
	}

	function handleRoundsChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 12) {
			localRounds = val;
			timerState.updateConfig({ roundsBeforeLongBreak: val });
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
				>Settings</Sheet.Title
			>
			<Sheet.Description class="text-sm text-muted-foreground">
				Customize timer intervals and color theme.
			</Sheet.Description>
		</Sheet.Header>

		<div class="flex flex-col gap-6 px-4 py-6">
			<!-- Section 1: Intervals -->
			<div class="flex flex-col gap-4">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-foreground">Intervals</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">
						Adjust the duration in minutes for each block.
					</p>
				</div>

				<Field.Group class="flex flex-col gap-5">
					<!-- Focus Duration -->
					<Field.Field class="gap-2.5">
						<div class="flex items-center justify-between">
							<Field.Label class="flex items-center gap-2 text-xs font-medium text-foreground">
								<span class="size-2 rounded-full bg-accent-foam"></span>
								Focus
							</Field.Label>
							<span class="font-mono text-xs font-semibold text-accent-foam">
								{focusMinutes} min
							</span>
						</div>
						<Slider
							type="single"
							value={focusMinutes}
							min={1}
							max={60}
							step={1}
							aria-label="Focus duration"
							onValueChange={handleFocusChange}
							class="py-1 [&_[data-slot=slider-range]]:bg-accent-foam [&_[data-slot=slider-thumb]]:border-accent-foam [&_[data-slot=slider-thumb]]:bg-background"
						/>
					</Field.Field>

					<!-- Short Break Duration -->
					<Field.Field class="gap-2.5">
						<div class="flex items-center justify-between">
							<Field.Label class="flex items-center gap-2 text-xs font-medium text-foreground">
								<span class="size-2 rounded-full bg-accent-pine"></span>
								Short Break
							</Field.Label>
							<span class="font-mono text-xs font-semibold text-accent-pine">
								{shortBreakMinutes} min
							</span>
						</div>
						<Slider
							type="single"
							value={shortBreakMinutes}
							min={1}
							max={30}
							step={1}
							aria-label="Short break duration"
							onValueChange={handleShortBreakChange}
							class="py-1 [&_[data-slot=slider-range]]:bg-accent-pine [&_[data-slot=slider-thumb]]:border-accent-pine [&_[data-slot=slider-thumb]]:bg-background"
						/>
					</Field.Field>

					<!-- Long Break Duration -->
					<Field.Field class="gap-2.5">
						<div class="flex items-center justify-between">
							<Field.Label class="flex items-center gap-2 text-xs font-medium text-foreground">
								<span class="size-2 rounded-full bg-accent-iris"></span>
								Long Break
							</Field.Label>
							<span class="font-mono text-xs font-semibold text-accent-iris">
								{longBreakMinutes} min
							</span>
						</div>
						<Slider
							type="single"
							value={longBreakMinutes}
							min={1}
							max={60}
							step={1}
							aria-label="Long break duration"
							onValueChange={handleLongBreakChange}
							class="py-1 [&_[data-slot=slider-range]]:bg-accent-iris [&_[data-slot=slider-thumb]]:border-accent-iris [&_[data-slot=slider-thumb]]:bg-background"
						/>
					</Field.Field>

					<!-- Rounds before Long Break -->
					<Field.Field class="gap-2.5">
						<div class="flex items-center justify-between">
							<Field.Label class="flex items-center gap-2 text-xs font-medium text-foreground">
								<span class="size-2 rounded-full bg-accent-rose"></span>
								Rounds before Long Break
							</Field.Label>
							<span class="font-mono text-xs font-semibold text-accent-rose">
								{roundsBeforeLongBreak}
								{roundsBeforeLongBreak === 1 ? 'round' : 'rounds'}
							</span>
						</div>
						<Slider
							type="single"
							value={roundsBeforeLongBreak}
							min={1}
							max={12}
							step={1}
							aria-label="Rounds before long break"
							onValueChange={handleRoundsChange}
							class="py-1 [&_[data-slot=slider-range]]:bg-accent-rose [&_[data-slot=slider-thumb]]:border-accent-rose [&_[data-slot=slider-thumb]]:bg-background"
						/>
					</Field.Field>
				</Field.Group>

				<Button variant="outline" size="sm" onclick={handleResetDefaults} class="mt-1 w-full">
					<RotateCcw data-icon="inline-start" />
					Reset to defaults (25 / 5 / 15 min · 4 rounds)
				</Button>
			</div>

			<Separator />

			<!-- Section 2: Theme Selector -->
			<div class="flex flex-col gap-3">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-foreground">Theme</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">Select active Rosé Pine color scheme.</p>
				</div>

				<ToggleGroup.Root
					type="single"
					bind:value={selectedTheme}
					onValueChange={handleThemeChange}
					variant="outline"
					spacing={2}
					aria-label="Theme"
					class="grid grid-cols-3 gap-2"
				>
					<ToggleGroup.Item
						value="dark"
						aria-label="Dark theme"
						class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
					>
						<span
							class="flex size-4 items-center justify-center rounded-full border border-border bg-[#191724] shadow-xs"
						>
							<span class="size-2 rounded-full bg-[#ebbcba]"></span>
						</span>
						<span class="text-xs font-medium">Dark</span>
					</ToggleGroup.Item>

					<ToggleGroup.Item
						value="dawn"
						aria-label="Dawn theme"
						class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
					>
						<span
							class="flex size-4 items-center justify-center rounded-full border border-border bg-[#faf4ed] shadow-xs"
						>
							<span class="size-2 rounded-full bg-[#d7827e]"></span>
						</span>
						<span class="text-xs font-medium">Dawn</span>
					</ToggleGroup.Item>

					<ToggleGroup.Item
						value="oled"
						aria-label="OLED theme"
						class="flex h-auto flex-col items-center justify-center gap-1.5 py-3 data-[state=on]:border-primary data-[state=on]:bg-muted/60"
					>
						<span
							class="flex size-4 items-center justify-center rounded-full border border-border bg-[#000000] shadow-xs"
						>
							<span class="size-2 rounded-full bg-[#ffb4b4]"></span>
						</span>
						<span class="text-xs font-medium">OLED</span>
					</ToggleGroup.Item>
				</ToggleGroup.Root>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
