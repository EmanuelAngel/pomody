<script lang="ts">
	import Layers from '@lucide/svelte/icons/layers';
	import Check from '@lucide/svelte/icons/check';
	import Info from '@lucide/svelte/icons/info';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import UnderflowAlert from './underflow-alert.svelte';
	import EndSessionDialog from './end-session-dialog.svelte';
	import PlanningCadenceConfig from './planning-cadence-config.svelte';
	import TimelineFocusCard from './timeline-focus-card.svelte';
	import TimelineBreakCard from './timeline-break-card.svelte';
	import TimelineBufferCard from './timeline-buffer-card.svelte';
	import { cn } from '$lib/utils';
	import {
		planningState as defaultPlanningState,
		type PlanningState
	} from '$lib/state/planning.svelte';
	import { tasksState as defaultTasksState, type TasksState } from '$lib/state/tasks.svelte';
	import { timerState as defaultTimerState, type TimerState } from '$lib/state/timer.svelte';
	import {
		navigationState as defaultNavigationState,
		type NavigationState
	} from '$lib/state/navigation.svelte';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		planningState?: PlanningState;
		tasksState?: TasksState;
		timerState?: TimerState;
		navigationState?: NavigationState;
		activeTaskTitle?: string | null;
		class?: string;
	}

	let {
		planningState = defaultPlanningState,
		tasksState = defaultTasksState,
		timerState = defaultTimerState,
		navigationState = defaultNavigationState,
		activeTaskTitle = null,
		class: className = ''
	}: Props = $props();

	let openPopoverBlockIndex = $state<number | null>(null);

	function formatDuration(minutes: number): string {
		if (minutes <= 0) return '0m';
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		if (hours > 0 && mins > 0) {
			return `${hours}h ${mins}m`;
		}
		if (hours > 0) {
			return `${hours}h`;
		}
		return `${mins}m`;
	}

	function getAssignedTask(taskId?: string) {
		if (!taskId) return null;
		return tasksState.tasks.find((t) => t.id === taskId) ?? null;
	}

	function getFocusBlockSequenceNumber(blockIndex: number): number {
		const blocks = planningState.projectedPlan.blocks;
		return blocks.slice(0, blockIndex + 1).filter((b) => b.mode === 'focus').length;
	}
</script>

<section
	class={cn('space-y-6 lg:col-span-7', className)}
	aria-label={t.planning_timeline_region_aria()}
>
	<div class="rounded-2xl border border-border/50 bg-card/40 p-5 shadow-xs transition-all">
		<!-- Section Title & Mode Switcher -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-2.5">
				<div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Layers class="size-4" />
				</div>
				<div>
					<h3 class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
						{t.planning_timeline_title()}
					</h3>
					<p class="text-xs text-muted-foreground">{t.planning_timeline_subtitle()}</p>
				</div>
			</div>

			<!-- Target Mode Toggle (Blocks vs End Time) -->
			<div
				class="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5 text-xs"
				role="group"
				aria-label={t.planning_timeline_mode_aria()}
			>
				<button
					type="button"
					disabled={planningState.isSessionActive}
					class={cn(
						'cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
						planningState.targetMode === 'blocks'
							? 'bg-background text-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'
					)}
					onclick={() => planningState.setTargetMode('blocks')}
				>
					{t.planning_timeline_mode_blocks()}
				</button>
				<button
					type="button"
					disabled={planningState.isSessionActive}
					class={cn(
						'cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
						planningState.targetMode === 'end_time'
							? 'bg-background text-foreground shadow-xs'
							: 'text-muted-foreground hover:text-foreground'
					)}
					onclick={() => planningState.setTargetMode('end_time')}
				>
					{t.planning_timeline_mode_end_time()}
				</button>
			</div>
		</div>

		<!-- Cadence Presets & Progressive Disclosure Configuration -->
		<PlanningCadenceConfig {planningState} />

		<!-- 3-Metric Summary Strip -->
		<div
			class="mt-4 grid grid-cols-3 gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-3 text-center sm:gap-4"
		>
			<div>
				<span class="block text-[11px] font-medium text-muted-foreground"
					>{t.planning_timeline_metric_focus()}</span
				>
				<span class="text-sm font-semibold tracking-tight text-primary sm:text-base">
					{formatDuration(planningState.totalFocusMinutes)}
				</span>
			</div>
			<div>
				<span class="block text-[11px] font-medium text-muted-foreground"
					>{t.planning_timeline_metric_breaks()}</span
				>
				<span class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
					{formatDuration(planningState.totalBreakMinutes)}
				</span>
			</div>
			<div>
				<span class="block text-[11px] font-medium text-muted-foreground"
					>{t.planning_timeline_metric_finish()}</span
				>
				<div class="flex flex-col items-center">
					<div class="flex items-center gap-1.5">
						<span class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
							{planningState.estimatedFinishTime}
						</span>
						{#if planningState.isCrossesMidnight}
							<span
								class="rounded bg-accent-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-gold"
								title={t.planning_cadence_next_day_title()}
							>
								{t.planning_cadence_next_day_badge()}
							</span>
						{/if}
					</div>
					{#if planningState.targetMode === 'end_time' && planningState.freeMarginMinutes > 0}
						<span
							class="mt-0.5 inline-block rounded bg-accent-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent-gold"
						>
							{t.planning_timeline_buffer_badge({ minutes: planningState.freeMarginMinutes })}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Underflow Warning Banner with Quick Recovery Action (UX-01) -->
		<UnderflowAlert {planningState} />

		<!-- Chronological Timeline Track (Semantic Ordered List UX-08) -->
		<ol
			class="relative mt-6 list-none space-y-3.5 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-border/60"
			aria-label={t.planning_timeline_sequence_aria()}
		>
			{#each planningState.projectedPlan.blocks as block (block.index)}
				{#if block.mode === 'focus'}
					<TimelineFocusCard
						{block}
						focusIndex={getFocusBlockSequenceNumber(block.index)}
						assignedTask={getAssignedTask(block.assignedTaskId)}
						{activeTaskTitle}
						pendingTasks={tasksState.pendingTasks}
						isPopoverOpen={openPopoverBlockIndex === block.index}
						onOpenPopoverChange={(open) => {
							openPopoverBlockIndex = open ? block.index : null;
						}}
						onAssignTask={(taskId) => {
							planningState.assignTaskToBlock(block.index, taskId);
							openPopoverBlockIndex = null;
						}}
						onCreateAndAssignTask={async (title) => {
							const newTask = await tasksState.createTask(title);
							planningState.assignTaskToBlock(block.index, newTask.id);
							openPopoverBlockIndex = null;
						}}
						onUnassignTask={() => planningState.unassignTaskFromBlock(block.index)}
						{timerState}
					/>
				{:else}
					<TimelineBreakCard {block} {timerState} />
				{/if}
			{/each}

			<!-- Buffer Time Block in End Time Mode -->
			{#if planningState.targetMode === 'end_time' && planningState.projectedPlan.freeMarginSeconds > 0}
				<TimelineBufferCard freeMarginMinutes={planningState.freeMarginMinutes} />
			{/if}
		</ol>

		<!-- Bottom CTA Section -->
		<div class="mt-6 border-t border-border/40 pt-5">
			{#if planningState.isPlanCompleted}
				<div
					class="space-y-3 rounded-2xl border border-accent-pine/40 bg-accent-pine/10 p-4 text-center"
				>
					<div
						class="flex items-center justify-center gap-2 text-sm font-semibold text-accent-pine"
					>
						<Check class="size-4 stroke-[2.5]" />
						<span>{t.planning_timeline_completed_heading()}</span>
					</div>
					<button
						type="button"
						class="w-full cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
						onclick={() => planningState.endSession(timerState)}
					>
						{t.planning_timeline_start_new_session()}
					</button>
				</div>
			{:else if planningState.isSessionActive}
				<div class="space-y-3">
					<div class="flex flex-col gap-2.5 sm:flex-row sm:items-center">
						<button
							type="button"
							class="flex-1 cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
							onclick={() => navigationState.setTab('timer')}
						>
							{t.planning_back_to_timer()}
						</button>
						<EndSessionDialog {planningState} {timerState} />
					</div>

					<!-- Forward-Only Discrete Contextual Notice & Tooltip (UX-09) -->
					<div
						class="flex items-center justify-center gap-1.5 py-1 text-center text-[11px] text-muted-foreground/80"
					>
						<Info class="size-3.5 shrink-0 text-muted-foreground/60" />
						<span>
							<strong class="font-medium text-foreground"
								>{t.planning_timeline_forward_sync_label()}</strong
							>
							{t.planning_timeline_forward_sync_text()}
						</span>
						<Tooltip.Provider>
							<Tooltip.Root>
								<Tooltip.Trigger
									class="cursor-pointer font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
									aria-label={t.planning_timeline_forward_sync_more_aria()}
								>
									{t.planning_timeline_learn_more()}
								</Tooltip.Trigger>
								<Tooltip.Content side="top" class="max-w-xs text-xs">
									{t.planning_timeline_forward_sync_tooltip()}
								</Tooltip.Content>
							</Tooltip.Root>
						</Tooltip.Provider>
					</div>
				</div>
			{:else}
				<div>
					<button
						type="button"
						disabled={planningState.projectedPlan.blocks.length === 0}
						onclick={async () => {
							await planningState.startSession(timerState, tasksState);
							navigationState.setTab('timer');
						}}
						class="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t.planning_timeline_start_session()}
					</button>
				</div>
			{/if}
		</div>
	</div>
</section>
