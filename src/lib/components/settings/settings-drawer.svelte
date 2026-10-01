<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Field from '$lib/components/ui/field';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Slider } from '$lib/components/ui/slider';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import * as Select from '$lib/components/ui/select';
	import { PLANT_MODELS, getPlantModel } from '$lib/components/timer/plant-models';
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

	// Slider values follow the timer config; a drag overrides them until the config changes again.
	let focusMinutes = $derived(Math.round(timerState.config.focusDurationSeconds / 60));
	let shortBreakMinutes = $derived(Math.round(timerState.config.shortBreakDurationSeconds / 60));
	let longBreakMinutes = $derived(Math.round(timerState.config.longBreakDurationSeconds / 60));
	let roundsBeforeLongBreak = $derived(timerState.roundsBeforeLongBreak);

	const defaultFocus = Math.round(DEFAULT_TIMER_CONFIG.focusDurationSeconds / 60);
	const defaultShort = Math.round(DEFAULT_TIMER_CONFIG.shortBreakDurationSeconds / 60);
	const defaultLong = Math.round(DEFAULT_TIMER_CONFIG.longBreakDurationSeconds / 60);
	const defaultRounds = DEFAULT_TIMER_CONFIG.roundsBeforeLongBreak;
	const resetLabel = `Reset to defaults (${defaultFocus} / ${defaultShort} / ${defaultLong} min · ${defaultRounds} rounds)`;

	function handleFocusChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 120) {
			focusMinutes = val;
			if (timerState.config.focusDurationSeconds !== val * 60) {
				timerState.updateConfig({ focusDurationSeconds: val * 60 });
			}
		}
	}

	function handleShortBreakChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 60) {
			shortBreakMinutes = val;
			if (timerState.config.shortBreakDurationSeconds !== val * 60) {
				timerState.updateConfig({ shortBreakDurationSeconds: val * 60 });
			}
		}
	}

	function handleLongBreakChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 90) {
			longBreakMinutes = val;
			if (timerState.config.longBreakDurationSeconds !== val * 60) {
				timerState.updateConfig({ longBreakDurationSeconds: val * 60 });
			}
		}
	}

	function handleRoundsChange(val: number) {
		if (Number.isInteger(val) && val >= 1 && val <= 12) {
			roundsBeforeLongBreak = val;
			if (timerState.config.roundsBeforeLongBreak !== val) {
				timerState.updateConfig({ roundsBeforeLongBreak: val });
			}
		}
	}

	function handleResetDefaults() {
		timerState.updateConfig({
			focusDurationSeconds: DEFAULT_TIMER_CONFIG.focusDurationSeconds,
			shortBreakDurationSeconds: DEFAULT_TIMER_CONFIG.shortBreakDurationSeconds,
			longBreakDurationSeconds: DEFAULT_TIMER_CONFIG.longBreakDurationSeconds,
			roundsBeforeLongBreak: DEFAULT_TIMER_CONFIG.roundsBeforeLongBreak
		});
		timerState.setSoundEnabled(true);
		timerState.setRevitalizationEnabled(true);
		timerState.setBotanicalEnabled(true);
		timerState.setBotanicalHideInZen(true);
		timerState.setBotanicalStatic(false);
	}

	const selectedModel = $derived(getPlantModel(timerState.botanicalModel));
	const selectPortalProps = $derived(portalProps ? { disabled: portalProps.disabled } : undefined);

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
							max={120}
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
							max={60}
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
							max={90}
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
					{resetLabel}
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

			<Separator />

			<!-- Section: Sound Alerts -->
			<div class="flex flex-col gap-3">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-foreground">Sound</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">
						Enable or mute audio transition alerts.
					</p>
				</div>

				<div
					class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs"
				>
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium text-foreground">Sound alerts</span>
						<span class="text-xs text-muted-foreground"
							>Play soothing chimes on block transitions</span
						>
					</div>
					<Switch
						checked={timerState.soundEnabled}
						onCheckedChange={(checked) => timerState.setSoundEnabled(checked)}
						aria-label="Sound alerts"
					/>
				</div>
			</div>

			<Separator />

			<!-- Section: Break Revitalization -->
			<div class="flex flex-col gap-3">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-foreground">Break Revitalization</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">
						Show restorative micro-habits and guides during breaks.
					</p>
				</div>

				<div
					class="flex items-center justify-between rounded-lg border border-border p-3.5 shadow-xs"
				>
					<div class="flex flex-col gap-0.5">
						<span class="text-xs font-medium text-foreground">Mindful suggestions</span>
						<span class="text-xs text-muted-foreground"
							>Physical stretches, breathwork, and hydration reminders</span
						>
					</div>
					<Switch
						checked={timerState.revitalizationEnabled}
						onCheckedChange={(checked) => timerState.setRevitalizationEnabled(checked)}
						aria-label="Mindful break suggestions"
					/>
				</div>
			</div>

			<Separator />

			<!-- Section: Focus Plant -->
			<div class="flex flex-col gap-3">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-foreground">Focus Plant</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">
						A pixel plant that grows from seed to fruit across each Pomodoro cycle.
					</p>
				</div>

				<div class="flex flex-col rounded-lg border border-border shadow-xs">
					<div class="flex items-center justify-between p-3.5">
						<div class="flex flex-col gap-0.5">
							<span class="text-xs font-medium text-foreground">Show plant</span>
							<span class="text-xs text-muted-foreground">Visible on wide screens only</span>
						</div>
						<Switch
							checked={timerState.botanicalEnabled}
							onCheckedChange={(checked) => timerState.setBotanicalEnabled(checked)}
							aria-label="Focus plant illustration"
						/>
					</div>
					<div class="flex items-center justify-between border-t border-border p-3.5">
						<div class="flex flex-col gap-0.5">
							<span class="text-xs font-medium text-foreground">Hide while focusing</span>
							<span class="text-xs text-muted-foreground">Fade it out in Zen mode</span>
						</div>
						<Switch
							checked={timerState.botanicalHideInZen}
							disabled={!timerState.botanicalEnabled}
							onCheckedChange={(checked) => timerState.setBotanicalHideInZen(checked)}
							aria-label="Hide plant in Zen mode"
						/>
					</div>
					<div class="flex items-center justify-between gap-4 border-t border-border p-3.5">
						<div class="flex flex-col gap-0.5">
							<span id="plant-model-label" class="text-xs font-medium text-foreground">Model</span>
							<span class="text-xs text-muted-foreground">How your plant grows</span>
						</div>
						<Select.Root
							type="single"
							value={selectedModel.id}
							disabled={!timerState.botanicalEnabled}
							onValueChange={(id) => timerState.setBotanicalModel(id)}
						>
							<Select.Trigger size="sm" aria-labelledby="plant-model-label" class="min-w-40">
								{selectedModel.label}
							</Select.Trigger>
							<Select.Content portalProps={selectPortalProps} align="end">
								{#each PLANT_MODELS as model (model.id)}
									<Select.Item value={model.id} label={model.label} />
								{/each}
								<Select.Separator />
								<Select.Item value="__more" label="More models soon" disabled />
							</Select.Content>
						</Select.Root>
					</div>
					<div class="flex items-center justify-between border-t border-border p-3.5">
						<div class="flex flex-col gap-0.5">
							<span class="text-xs font-medium text-foreground">Static plant</span>
							<span class="text-xs text-muted-foreground">Freeze the idle motion</span>
						</div>
						<Switch
							checked={timerState.botanicalStatic}
							disabled={!timerState.botanicalEnabled}
							onCheckedChange={(checked) => timerState.setBotanicalStatic(checked)}
							aria-label="Static plant animation"
						/>
					</div>
				</div>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>
