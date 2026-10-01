<script module lang="ts">
	export interface CadencePreset {
		id: string;
		name: string;
		label: string;
		focusMinutes: number;
		shortBreakMinutes: number;
		longBreakMinutes: number;
		longBreakInterval: number;
	}

	export const CADENCE_PRESETS: readonly CadencePreset[] = [
		{
			id: 'classic',
			name: '25/5',
			label: 'Classic',
			focusMinutes: 25,
			shortBreakMinutes: 5,
			longBreakMinutes: 15,
			longBreakInterval: 4
		},
		{
			id: 'deep-focus',
			name: '50/10',
			label: 'Deep Focus',
			focusMinutes: 50,
			shortBreakMinutes: 10,
			longBreakMinutes: 20,
			longBreakInterval: 4
		},
		{
			id: 'ultradian',
			name: '90/20',
			label: 'Ultradian Rhythm',
			focusMinutes: 90,
			shortBreakMinutes: 20,
			longBreakMinutes: 30,
			longBreakInterval: 3
		}
	];
</script>

<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import { cn } from '$lib/utils';
	import {
		planningState as defaultPlanningState,
		type PlanningState
	} from '$lib/state/planning.svelte';

	interface Props {
		planningState?: PlanningState;
		class?: string;
	}

	let { planningState = defaultPlanningState, class: className = '' }: Props = $props();

	let isCustomOpen = $state(false);

	const activePresetId = $derived.by<string | null>(() => {
		const match = CADENCE_PRESETS.find(
			(p) =>
				p.focusMinutes === planningState.focusMinutes &&
				p.shortBreakMinutes === planningState.shortBreakMinutes
		);
		return match ? match.id : null;
	});

	function applyPreset(preset: CadencePreset) {
		planningState.setFocusMinutes(preset.focusMinutes);
		planningState.setShortBreakMinutes(preset.shortBreakMinutes);
		planningState.setLongBreakMinutes(preset.longBreakMinutes);
		planningState.setLongBreakInterval(preset.longBreakInterval);
	}
</script>

<div class={cn('mt-4 space-y-3.5 rounded-xl border border-border/40 bg-muted/20 p-3', className)}>
	{#if planningState.isSessionActive}
		<div class="text-[11px] font-medium text-muted-foreground/80 italic">
			Session active: duration edits apply forward-only.
		</div>
	{/if}

	<!-- Presets & Primary Controls -->
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<!-- Preset Chips -->
		<div class="space-y-1.5">
			<span class="text-[11px] font-medium text-muted-foreground">Cadence Preset</span>
			<div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Cadence Presets">
				{#each CADENCE_PRESETS as preset (preset.id)}
					{@const isSelected = activePresetId === preset.id}
					<button
						type="button"
						aria-pressed={isSelected}
						aria-label={`Select ${preset.name} ${preset.label} cadence preset`}
						onclick={() => applyPreset(preset)}
						class={cn(
							'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
							isSelected
								? 'border-primary/50 bg-primary/10 text-primary shadow-xs'
								: 'border-border/60 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
						)}
					>
						<span class="font-semibold">{preset.name}</span>
						<span class="text-[10px] opacity-80">{preset.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Primary Variable in Blocks mode: Block Count -->
		{#if planningState.targetMode === 'blocks'}
			<div class="flex flex-col gap-1 sm:items-end">
				<span class="text-[11px] font-medium text-muted-foreground">Blocks</span>
				<div class="flex items-center gap-1">
					<button
						type="button"
						aria-label="Decrease block count"
						disabled={planningState.isSessionActive || planningState.blockCount <= 1}
						onclick={() => planningState.setBlockCount(planningState.blockCount - 1)}
						class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Minus class="size-3" />
					</button>
					<span class="min-w-8 text-center text-xs font-semibold text-foreground">
						{planningState.blockCount}
					</span>
					<button
						type="button"
						aria-label="Increase block count"
						disabled={planningState.isSessionActive || planningState.blockCount >= 24}
						onclick={() => planningState.setBlockCount(planningState.blockCount + 1)}
						class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Plus class="size-3" />
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Primary Variables in End Time mode -->
	{#if planningState.targetMode === 'end_time'}
		<div class="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
			<!-- Target Finish Time Input -->
			<div class="flex flex-col gap-1">
				<div class="flex items-center justify-between">
					<label for="target-end-time" class="text-[11px] font-medium text-muted-foreground">
						Target Finish Time
					</label>
					{#if planningState.isCrossesMidnight}
						<span
							class="rounded bg-accent-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-gold"
							title="Finishes next day (past midnight)"
						>
							+1 day
						</span>
					{/if}
				</div>
				<input
					id="target-end-time"
					type="time"
					aria-label="Target finish time"
					disabled={planningState.isSessionActive}
					value={planningState.targetEndTime}
					oninput={(e) => planningState.setTargetEndTime(e.currentTarget.value)}
					class="h-8.5 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground transition-colors focus:border-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				/>
			</div>

			<!-- Scheduled Start Time Input / Toggle -->
			<div class="flex flex-col gap-1">
				<label for="scheduled-start-time" class="text-[11px] font-medium text-muted-foreground">
					Scheduled Start
				</label>
				<div class="flex items-center gap-1.5">
					<button
						type="button"
						disabled={planningState.isSessionActive}
						onclick={() => planningState.setScheduledStartTime('now')}
						class={cn(
							'h-8.5 cursor-pointer rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
							planningState.scheduledStartTime === 'now'
								? 'border-primary/40 bg-primary/10 text-primary'
								: 'border-border/60 bg-background text-muted-foreground hover:text-foreground'
						)}
					>
						Now
					</button>
					<input
						id="scheduled-start-time"
						type="time"
						aria-label="Scheduled start time"
						disabled={planningState.isSessionActive}
						value={planningState.scheduledStartTime === 'now'
							? ''
							: planningState.scheduledStartTime}
						oninput={(e) => planningState.setScheduledStartTime(e.currentTarget.value || 'now')}
						class="h-8.5 flex-1 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground transition-colors focus:border-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>
			</div>
		</div>
	{/if}

	<!-- Progressive Disclosure Toggle -->
	<div class="border-t border-border/30 pt-2">
		<button
			type="button"
			aria-expanded={isCustomOpen}
			aria-controls="custom-cadence-panel"
			onclick={() => (isCustomOpen = !isCustomOpen)}
			class="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
		>
			<SlidersHorizontal class="size-3 text-muted-foreground/70" />
			<span>Customize cadence</span>
			<ChevronDown
				class={cn('size-3.5 transition-transform duration-200', isCustomOpen && 'rotate-180')}
			/>
			{#if activePresetId === null}
				<span class="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
					Custom
				</span>
			{/if}
		</button>
	</div>

	<!-- Collapsible Manual Duration Steppers Panel -->
	{#if isCustomOpen}
		<div id="custom-cadence-panel" class="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
			<!-- Focus Stepper -->
			<div class="flex flex-col gap-1">
				<span class="text-[11px] font-medium text-muted-foreground">Focus</span>
				<div class="flex items-center gap-1">
					<button
						type="button"
						aria-label="Decrease focus duration"
						disabled={planningState.focusMinutes <= 5}
						onclick={() => planningState.setFocusMinutes(planningState.focusMinutes - 5)}
						class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Minus class="size-3" />
					</button>
					<span class="flex-1 text-center text-xs font-semibold text-foreground">
						{planningState.focusMinutes}m
					</span>
					<button
						type="button"
						aria-label="Increase focus duration"
						disabled={planningState.focusMinutes >= 120}
						onclick={() => planningState.setFocusMinutes(planningState.focusMinutes + 5)}
						class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Plus class="size-3" />
					</button>
				</div>
			</div>

			<!-- Short Break Stepper -->
			<div class="flex flex-col gap-1">
				<span class="text-[11px] font-medium text-muted-foreground">Short Break</span>
				<div class="flex items-center gap-1">
					<button
						type="button"
						aria-label="Decrease short break duration"
						disabled={planningState.shortBreakMinutes <= 1}
						onclick={() => planningState.setShortBreakMinutes(planningState.shortBreakMinutes - 1)}
						class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Minus class="size-3" />
					</button>
					<span class="flex-1 text-center text-xs font-semibold text-foreground">
						{planningState.shortBreakMinutes}m
					</span>
					<button
						type="button"
						aria-label="Increase short break duration"
						disabled={planningState.shortBreakMinutes >= 60}
						onclick={() => planningState.setShortBreakMinutes(planningState.shortBreakMinutes + 1)}
						class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Plus class="size-3" />
					</button>
				</div>
			</div>

			<!-- Long Break Stepper -->
			<div class="flex flex-col gap-1">
				<span class="text-[11px] font-medium text-muted-foreground">Long Break</span>
				<div class="flex items-center gap-1">
					<button
						type="button"
						aria-label="Decrease long break duration"
						disabled={planningState.longBreakMinutes <= 5}
						onclick={() => planningState.setLongBreakMinutes(planningState.longBreakMinutes - 5)}
						class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Minus class="size-3" />
					</button>
					<span class="flex-1 text-center text-xs font-semibold text-foreground">
						{planningState.longBreakMinutes}m
					</span>
					<button
						type="button"
						aria-label="Increase long break duration"
						disabled={planningState.longBreakMinutes >= 90}
						onclick={() => planningState.setLongBreakMinutes(planningState.longBreakMinutes + 5)}
						class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Plus class="size-3" />
					</button>
				</div>
			</div>

			<!-- Long Break Interval Stepper -->
			<div class="flex flex-col gap-1">
				<span class="text-[11px] font-medium text-muted-foreground">Interval</span>
				<div class="flex items-center gap-1">
					<button
						type="button"
						aria-label="Decrease long break interval"
						disabled={planningState.longBreakInterval <= 1}
						onclick={() => planningState.setLongBreakInterval(planningState.longBreakInterval - 1)}
						class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Minus class="size-3" />
					</button>
					<span class="flex-1 text-center text-xs font-semibold text-foreground">
						{planningState.longBreakInterval}
					</span>
					<button
						type="button"
						aria-label="Increase long break interval"
						disabled={planningState.longBreakInterval >= 12}
						onclick={() => planningState.setLongBreakInterval(planningState.longBreakInterval + 1)}
						class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Plus class="size-3" />
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
