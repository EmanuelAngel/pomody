<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Field from '$lib/components/ui/field';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Input } from '$lib/components/ui/input';
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

	// Local reactive override state for temporarily uncommitted/invalid user input
	let localFocus = $state<string | null>(null);
	let localShortBreak = $state<string | null>(null);
	let localLongBreak = $state<string | null>(null);

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

	// Clear temporary input overrides whenever drawer opens
	$effect(() => {
		if (open) {
			localFocus = null;
			localShortBreak = null;
			localLongBreak = null;
		}
	});

	// Field validation checks
	function isValidMinutes(val: string | number, min: number, max: number): boolean {
		if (typeof val === 'number') {
			return Number.isInteger(val) && val >= min && val <= max;
		}
		if (val.trim() === '') return false;
		const num = Number(val);
		return Number.isInteger(num) && num >= min && num <= max;
	}

	const isFocusValid = $derived(isValidMinutes(focusMinutes, 1, 60));
	const isShortBreakValid = $derived(isValidMinutes(shortBreakMinutes, 1, 30));
	const isLongBreakValid = $derived(isValidMinutes(longBreakMinutes, 1, 60));

	function handleFocusInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const raw = target.value;
		if (raw.trim() === '') {
			localFocus = '';
			return;
		}
		const val = Number(raw);
		if (Number.isInteger(val) && val >= 1 && val <= 60) {
			localFocus = null;
			timerState.updateConfig({ focusDurationSeconds: val * 60 });
		} else {
			localFocus = raw;
		}
	}

	function handleShortBreakInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const raw = target.value;
		if (raw.trim() === '') {
			localShortBreak = '';
			return;
		}
		const val = Number(raw);
		if (Number.isInteger(val) && val >= 1 && val <= 30) {
			localShortBreak = null;
			timerState.updateConfig({ shortBreakDurationSeconds: val * 60 });
		} else {
			localShortBreak = raw;
		}
	}

	function handleLongBreakInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const raw = target.value;
		if (raw.trim() === '') {
			localLongBreak = '';
			return;
		}
		const val = Number(raw);
		if (Number.isInteger(val) && val >= 1 && val <= 60) {
			localLongBreak = null;
			timerState.updateConfig({ longBreakDurationSeconds: val * 60 });
		} else {
			localLongBreak = raw;
		}
	}

	function handleResetDefaults() {
		localFocus = null;
		localShortBreak = null;
		localLongBreak = null;
		timerState.updateConfig({
			focusDurationSeconds: DEFAULT_TIMER_CONFIG.focusDurationSeconds,
			shortBreakDurationSeconds: DEFAULT_TIMER_CONFIG.shortBreakDurationSeconds,
			longBreakDurationSeconds: DEFAULT_TIMER_CONFIG.longBreakDurationSeconds
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

				<Field.Group class="flex flex-col gap-4">
					<!-- Focus Duration -->
					<Field.Field data-invalid={!isFocusValid}>
						<Field.Label for="focus-duration" class="text-xs font-medium text-foreground">
							Focus (1–60 min)
						</Field.Label>
						<Input
							id="focus-duration"
							type="number"
							min="1"
							max="60"
							value={focusMinutes}
							oninput={handleFocusInput}
							aria-invalid={!isFocusValid}
							class="h-9 font-mono text-sm"
						/>
						{#if !isFocusValid}
							<Field.Error class="mt-1 text-xs text-destructive">
								Must be an integer between 1 and 60 minutes.
							</Field.Error>
						{/if}
					</Field.Field>

					<!-- Short Break Duration -->
					<Field.Field data-invalid={!isShortBreakValid}>
						<Field.Label for="short-break-duration" class="text-xs font-medium text-foreground">
							Short Break (1–30 min)
						</Field.Label>
						<Input
							id="short-break-duration"
							type="number"
							min="1"
							max="30"
							value={shortBreakMinutes}
							oninput={handleShortBreakInput}
							aria-invalid={!isShortBreakValid}
							class="h-9 font-mono text-sm"
						/>
						{#if !isShortBreakValid}
							<Field.Error class="mt-1 text-xs text-destructive">
								Must be an integer between 1 and 30 minutes.
							</Field.Error>
						{/if}
					</Field.Field>

					<!-- Long Break Duration -->
					<Field.Field data-invalid={!isLongBreakValid}>
						<Field.Label for="long-break-duration" class="text-xs font-medium text-foreground">
							Long Break (1–60 min)
						</Field.Label>
						<Input
							id="long-break-duration"
							type="number"
							min="1"
							max="60"
							value={longBreakMinutes}
							oninput={handleLongBreakInput}
							aria-invalid={!isLongBreakValid}
							class="h-9 font-mono text-sm"
						/>
						{#if !isLongBreakValid}
							<Field.Error class="mt-1 text-xs text-destructive">
								Must be an integer between 1 and 60 minutes.
							</Field.Error>
						{/if}
					</Field.Field>
				</Field.Group>

				<Button variant="outline" size="sm" onclick={handleResetDefaults} class="mt-1 w-full">
					<RotateCcw data-icon="inline-start" />
					Reset to defaults (25 / 5 / 15 min)
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
