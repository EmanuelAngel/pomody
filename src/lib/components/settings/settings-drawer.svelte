<script lang="ts">
	import Sheet from '$lib/components/ui/sheet/sheet.svelte';
	import SheetContent from '$lib/components/ui/sheet/sheet-content.svelte';
	import SheetHeader from '$lib/components/ui/sheet/sheet-header.svelte';
	import SheetTitle from '$lib/components/ui/sheet/sheet-title.svelte';
	import SheetDescription from '$lib/components/ui/sheet/sheet-description.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import ToggleGroup from '$lib/components/ui/toggle-group/toggle-group.svelte';
	import ToggleGroupItem from '$lib/components/ui/toggle-group/toggle-group-item.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import FieldGroup from '$lib/components/ui/field/field-group.svelte';
	import Field from '$lib/components/ui/field/field.svelte';
	import FieldLabel from '$lib/components/ui/field/field-label.svelte';
	import FieldError from '$lib/components/ui/field/field-error.svelte';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte.js';
	import {
		themeState as defaultThemeState,
		type ThemeState,
		type Theme
	} from '$lib/state/theme.svelte.js';

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

	// Local reactive override state for temporarily invalid user input
	let localFocus = $state<number | null>(null);
	let localShortBreak = $state<number | null>(null);
	let localLongBreak = $state<number | null>(null);

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
	const isFocusValid = $derived(
		Number.isInteger(focusMinutes) && focusMinutes >= 1 && focusMinutes <= 60
	);
	const isShortBreakValid = $derived(
		Number.isInteger(shortBreakMinutes) && shortBreakMinutes >= 1 && shortBreakMinutes <= 30
	);
	const isLongBreakValid = $derived(
		Number.isInteger(longBreakMinutes) && longBreakMinutes >= 1 && longBreakMinutes <= 60
	);

	function handleFocusInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const val = Number(target.value);
		if (Number.isInteger(val) && val >= 1 && val <= 60) {
			localFocus = null;
			timerState.updateConfig({ focusDurationSeconds: val * 60 });
		} else {
			localFocus = val;
		}
	}

	function handleShortBreakInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const val = Number(target.value);
		if (Number.isInteger(val) && val >= 1 && val <= 30) {
			localShortBreak = null;
			timerState.updateConfig({ shortBreakDurationSeconds: val * 60 });
		} else {
			localShortBreak = val;
		}
	}

	function handleLongBreakInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const val = Number(target.value);
		if (Number.isInteger(val) && val >= 1 && val <= 60) {
			localLongBreak = null;
			timerState.updateConfig({ longBreakDurationSeconds: val * 60 });
		} else {
			localLongBreak = val;
		}
	}

	function handleResetDefaults() {
		localFocus = null;
		localShortBreak = null;
		localLongBreak = null;
		timerState.updateConfig({
			focusDurationSeconds: 1500,
			shortBreakDurationSeconds: 300,
			longBreakDurationSeconds: 900
		});
	}

	function handleThemeChange(value: string | string[] | undefined) {
		if (typeof value === 'string' && (value === 'dark' || value === 'dawn' || value === 'oled')) {
			themeState.setTheme(value as Theme);
		}
	}
</script>

<Sheet bind:open>
	<SheetContent side="right" {portalProps} class="w-full overflow-y-auto sm:max-w-md">
		<SheetHeader class="border-b border-border pb-4">
			<SheetTitle class="text-lg font-semibold tracking-tight text-foreground">Settings</SheetTitle>
			<SheetDescription class="text-sm text-muted-foreground">
				Customize timer intervals and color theme.
			</SheetDescription>
		</SheetHeader>

		<div class="flex flex-col gap-6 px-4 py-6">
			<!-- Section 1: Intervals -->
			<div class="flex flex-col gap-4">
				<div>
					<h3 class="text-sm font-semibold tracking-wide text-foreground">Intervals</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">
						Adjust the duration in minutes for each block.
					</p>
				</div>

				<FieldGroup class="flex flex-col gap-4">
					<!-- Focus Duration -->
					<Field data-invalid={!isFocusValid}>
						<FieldLabel for="focus-duration" class="text-xs font-medium text-foreground">
							Focus (1–60 min)
						</FieldLabel>
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
							<FieldError class="mt-1 text-xs text-destructive">
								Must be an integer between 1 and 60 minutes.
							</FieldError>
						{/if}
					</Field>

					<!-- Short Break Duration -->
					<Field data-invalid={!isShortBreakValid}>
						<FieldLabel for="short-break-duration" class="text-xs font-medium text-foreground">
							Short Break (1–30 min)
						</FieldLabel>
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
							<FieldError class="mt-1 text-xs text-destructive">
								Must be an integer between 1 and 30 minutes.
							</FieldError>
						{/if}
					</Field>

					<!-- Long Break Duration -->
					<Field data-invalid={!isLongBreakValid}>
						<FieldLabel for="long-break-duration" class="text-xs font-medium text-foreground">
							Long Break (1–60 min)
						</FieldLabel>
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
							<FieldError class="mt-1 text-xs text-destructive">
								Must be an integer between 1 and 60 minutes.
							</FieldError>
						{/if}
					</Field>
				</FieldGroup>

				<Button
					variant="outline"
					size="sm"
					onclick={handleResetDefaults}
					class="mt-1 w-full gap-2 text-xs text-muted-foreground hover:text-foreground"
				>
					<RotateCcw class="size-3.5" />
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

				<ToggleGroup
					type="single"
					value={themeState.current}
					onValueChange={handleThemeChange}
					variant="outline"
					class="grid grid-cols-3 gap-2"
				>
					<ToggleGroupItem
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
					</ToggleGroupItem>

					<ToggleGroupItem
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
					</ToggleGroupItem>

					<ToggleGroupItem
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
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
		</div>
	</SheetContent>
</Sheet>
