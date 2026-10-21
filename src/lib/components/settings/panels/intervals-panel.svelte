<script lang="ts">
	import * as Field from '$lib/components/ui/field';
	import { Slider } from '$lib/components/ui/slider';
	import { Button } from '$lib/components/ui/button';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import { t } from '$lib/state/locale.svelte';
	import { DEFAULT_TIMER_CONFIG } from '$lib/domain/timer/timer-fsm';

	interface Props {
		timerState?: TimerState;
		/** Reopening the panel discards any in-flight slider override. */
		open?: boolean;
	}

	let { timerState = defaultTimerState, open = false }: Props = $props();

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

	// Clear temporary slider overrides whenever the panel opens
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
	}
</script>

<div class="flex flex-col gap-4">
	<p class="text-xs text-muted-foreground">{t.settings_section_intervals_description()}</p>

	<Field.Group class="flex flex-col gap-5">
		<!-- Focus Duration -->
		<Field.Field class="gap-2.5">
			<div class="flex items-center justify-between">
				<Field.Label class="flex items-center gap-2 text-xs font-medium text-foreground">
					<span class="size-2 rounded-full bg-accent-foam"></span>
					{t.settings_interval_focus()}
				</Field.Label>
				<span class="font-mono text-xs font-semibold text-accent-foam"> {focusMinutes} min </span>
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
