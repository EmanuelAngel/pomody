<script lang="ts">
	import Layers from '@lucide/svelte/icons/layers';
	import Coffee from '@lucide/svelte/icons/coffee';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Clock from '@lucide/svelte/icons/clock';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { Popover } from 'bits-ui';
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

<section class={cn('space-y-6 lg:col-span-7', className)} aria-label="Session Planning">
	<div class="rounded-2xl border border-border/50 bg-card/40 p-5 shadow-xs transition-all">
		<!-- Section Title & Mode Switcher -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-2.5">
				<div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Layers class="size-4" />
				</div>
				<div>
					<h3 class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
						Session Timeline
					</h3>
					<p class="text-xs text-muted-foreground">Project focus cycles and scheduled breaks</p>
				</div>
			</div>

			<!-- Target Mode Toggle (Blocks vs End Time) -->
			<div
				class="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5 text-xs"
				role="group"
				aria-label="Target Planning Mode"
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
					By Blocks
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
					By End Time
				</button>
			</div>
		</div>

		<!-- Inline Configuration Strip -->
		<div class="mt-4 rounded-xl border border-border/40 bg-muted/20 p-3">
			{#if planningState.isSessionActive}
				<div class="mb-2 text-[11px] font-medium text-muted-foreground/80 italic">
					Session active: duration edits apply forward-only.
				</div>
			{/if}

			{#if planningState.targetMode === 'blocks'}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					<!-- Focus Stepper -->
					<div class="flex flex-col gap-1">
						<span class="text-[11px] font-medium text-muted-foreground">Focus</span>
						<div class="flex items-center gap-1">
							<button
								type="button"
								aria-label="Decrease focus duration"
								disabled={planningState.isSessionActive || planningState.focusMinutes <= 5}
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
								disabled={planningState.isSessionActive || planningState.focusMinutes >= 120}
								onclick={() => planningState.setFocusMinutes(planningState.focusMinutes + 5)}
								class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
							>
								<Plus class="size-3" />
							</button>
						</div>
					</div>

					<!-- Block Count Stepper -->
					<div class="flex flex-col gap-1">
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
							<span class="flex-1 text-center text-xs font-semibold text-foreground">
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

					<!-- Short Break Stepper -->
					<div class="flex flex-col gap-1">
						<span class="text-[11px] font-medium text-muted-foreground">Short Break</span>
						<div class="flex items-center gap-1">
							<button
								type="button"
								aria-label="Decrease short break duration"
								disabled={planningState.isSessionActive || planningState.shortBreakMinutes <= 1}
								onclick={() =>
									planningState.setShortBreakMinutes(planningState.shortBreakMinutes - 1)}
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
								disabled={planningState.isSessionActive || planningState.shortBreakMinutes >= 60}
								onclick={() =>
									planningState.setShortBreakMinutes(planningState.shortBreakMinutes + 1)}
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
								disabled={planningState.isSessionActive || planningState.longBreakMinutes <= 5}
								onclick={() =>
									planningState.setLongBreakMinutes(planningState.longBreakMinutes - 5)}
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
								disabled={planningState.isSessionActive || planningState.longBreakMinutes >= 90}
								onclick={() =>
									planningState.setLongBreakMinutes(planningState.longBreakMinutes + 5)}
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
								disabled={planningState.isSessionActive || planningState.longBreakInterval <= 1}
								onclick={() =>
									planningState.setLongBreakInterval(planningState.longBreakInterval - 1)}
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
								disabled={planningState.isSessionActive || planningState.longBreakInterval >= 12}
								onclick={() =>
									planningState.setLongBreakInterval(planningState.longBreakInterval + 1)}
								class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
							>
								<Plus class="size-3" />
							</button>
						</div>
					</div>
				</div>
			{:else}
				<div class="space-y-3">
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<!-- Target Finish Time Input -->
						<div class="flex flex-col gap-1">
							<label for="target-end-time" class="text-[11px] font-medium text-muted-foreground">
								Target Finish Time
							</label>
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
							<label
								for="scheduled-start-time"
								class="text-[11px] font-medium text-muted-foreground"
							>
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
									oninput={(e) =>
										planningState.setScheduledStartTime(e.currentTarget.value || 'now')}
									class="h-8.5 flex-1 rounded-lg border border-border/60 bg-background px-2.5 text-xs text-foreground transition-colors focus:border-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
								/>
							</div>
						</div>
					</div>

					<!-- Secondary Steppers in End Time Mode -->
					<div class="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
						<!-- Focus Duration Stepper -->
						<div class="flex flex-col gap-1">
							<span class="text-[11px] font-medium text-muted-foreground">Focus</span>
							<div class="flex items-center gap-1">
								<button
									type="button"
									aria-label="Decrease focus duration"
									disabled={planningState.isSessionActive || planningState.focusMinutes <= 5}
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
									disabled={planningState.isSessionActive || planningState.focusMinutes >= 120}
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
									disabled={planningState.isSessionActive || planningState.shortBreakMinutes <= 1}
									onclick={() =>
										planningState.setShortBreakMinutes(planningState.shortBreakMinutes - 1)}
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
									disabled={planningState.isSessionActive || planningState.shortBreakMinutes >= 60}
									onclick={() =>
										planningState.setShortBreakMinutes(planningState.shortBreakMinutes + 1)}
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
									disabled={planningState.isSessionActive || planningState.longBreakMinutes <= 5}
									onclick={() =>
										planningState.setLongBreakMinutes(planningState.longBreakMinutes - 5)}
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
									disabled={planningState.isSessionActive || planningState.longBreakMinutes >= 90}
									onclick={() =>
										planningState.setLongBreakMinutes(planningState.longBreakMinutes + 5)}
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
									disabled={planningState.isSessionActive || planningState.longBreakInterval <= 1}
									onclick={() =>
										planningState.setLongBreakInterval(planningState.longBreakInterval - 1)}
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
									disabled={planningState.isSessionActive || planningState.longBreakInterval >= 12}
									onclick={() =>
										planningState.setLongBreakInterval(planningState.longBreakInterval + 1)}
									class="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
								>
									<Plus class="size-3" />
								</button>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- 3-Metric Summary Strip -->
		<div
			class="mt-4 grid grid-cols-3 gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-3 text-center sm:gap-4"
		>
			<div>
				<span class="block text-[11px] font-medium text-muted-foreground">Total Focus</span>
				<span class="text-sm font-semibold tracking-tight text-primary sm:text-base">
					{formatDuration(planningState.totalFocusMinutes)}
				</span>
			</div>
			<div>
				<span class="block text-[11px] font-medium text-muted-foreground">Total Breaks</span>
				<span class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
					{formatDuration(planningState.totalBreakMinutes)}
				</span>
			</div>
			<div>
				<span class="block text-[11px] font-medium text-muted-foreground">Estimated Finish</span>
				<div class="flex flex-col items-center">
					<span class="text-sm font-semibold tracking-tight text-foreground sm:text-base">
						{planningState.estimatedFinishTime}
					</span>
					{#if planningState.targetMode === 'end_time' && planningState.freeMarginMinutes > 0}
						<span
							class="mt-0.5 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
						>
							+{planningState.freeMarginMinutes}m Free Margin
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Underflow Warning Banner -->
		{#if planningState.targetMode === 'end_time' && planningState.projectedPlan.blocks.length === 0}
			<div
				role="alert"
				class="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400"
			>
				<AlertCircle class="size-4 shrink-0" />
				<span>Time window is too short for a full focus block.</span>
			</div>
		{/if}

		<!-- Chronological Timeline Track -->
		<div
			class="relative mt-6 space-y-3.5 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-border/60"
		>
			{#each planningState.projectedPlan.blocks as block (block.index)}
				{#if block.mode === 'focus'}
					{@const focusIndex = getFocusBlockSequenceNumber(block.index)}
					{@const assignedTask = getAssignedTask(block.assignedTaskId)}
					<div class="group relative">
						<!-- Left Circular Badge -->
						<div
							class={cn(
								'absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border shadow-xs',
								block.status === 'in_progress'
									? 'border-primary/50 bg-primary/20 text-primary'
									: block.status === 'completed'
										? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-500'
										: 'border-border/60 bg-muted text-muted-foreground'
							)}
						>
							{#if block.status === 'completed'}
								<Check class="size-2.5 stroke-[3]" />
							{:else}
								<span class="text-[10px] font-bold">{focusIndex}</span>
							{/if}
						</div>

						<!-- Card Body -->
						<div
							class={cn(
								'rounded-xl border p-3 transition-colors',
								block.status === 'in_progress'
									? 'border-primary/40 bg-primary/5'
									: 'border-border/40 bg-card/60'
							)}
						>
							<!-- Header & Status Badge -->
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class="text-xs font-semibold text-foreground">Focus Block</span>
									<span
										class="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
									>
										{Math.round(block.durationSeconds / 60)}m
									</span>
								</div>

								{#if block.status === 'in_progress'}
									<span
										class="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary"
									>
										Active block
									</span>
								{:else if block.status === 'completed'}
									<span
										class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500"
									>
										<Check class="size-2.5 stroke-[2.5]" />
										<span>Completed</span>
									</span>
								{:else}
									<span class="text-[11px] text-muted-foreground/60">Upcoming</span>
								{/if}
							</div>

							<!-- Task Slot -->
							<div class="mt-2 flex items-center justify-between gap-2 text-xs">
								<div class="flex min-w-0 flex-1 items-center gap-1.5">
									{#if block.assignedTaskId}
										{#if assignedTask}
											{#if assignedTask.completed}
												<span class="truncate text-muted-foreground/60 line-through">
													{assignedTask.title}
												</span>
												<span class="shrink-0 text-[10px] text-muted-foreground">(Completed)</span>
											{:else}
												<span class="truncate font-medium text-foreground">
													{assignedTask.title}
												</span>
											{/if}
										{:else}
											<span class="truncate font-medium text-foreground">
												{activeTaskTitle ?? 'Assigned Task'}
											</span>
										{/if}

										<button
											type="button"
											aria-label={`Unassign task from focus block ${focusIndex}`}
											title="Unassign task"
											onclick={() => planningState.unassignTaskFromBlock(block.index)}
											class="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
										>
											<X class="size-3" />
										</button>
									{:else}
										<span class="text-muted-foreground/70">Unassigned · Free Focus</span>
									{/if}
								</div>

								{#if !block.assignedTaskId}
									<!-- Assign task Popover -->
									<Popover.Root
										open={openPopoverBlockIndex === block.index}
										onOpenChange={(open) => {
											openPopoverBlockIndex = open ? block.index : null;
										}}
									>
										<Popover.Trigger
											class="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border/50 bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
											aria-label={`Assign task to focus block ${focusIndex}`}
										>
											<Plus class="size-3" />
											<span>Assign task</span>
										</Popover.Trigger>
										<Popover.Portal>
											<Popover.Content
												side="bottom"
												sideOffset={6}
												align="end"
												class="z-50 w-72 rounded-xl border border-border/60 bg-popover/95 p-3 text-popover-foreground shadow-lg backdrop-blur-md fade-in-0 outline-none zoom-in-95 data-[side=bottom]:slide-in-from-top-2 sm:w-80"
											>
												<div class="mb-2 text-xs font-semibold text-foreground">
													Select task for Focus Block {focusIndex}
												</div>
												{#if tasksState.pendingTasks.length === 0}
													<p class="py-3 text-center text-xs text-muted-foreground">
														No pending tasks in backlog. Create one or run Free Focus.
													</p>
												{:else}
													<div class="max-h-56 space-y-1 overflow-y-auto">
														{#each tasksState.pendingTasks as task (task.id)}
															<button
																type="button"
																class="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none"
																onclick={() => {
																	planningState.assignTaskToBlock(block.index, task.id);
																	openPopoverBlockIndex = null;
																}}
															>
																<span class="truncate font-medium text-foreground">
																	{task.title}
																</span>
																<ChevronRight class="size-3 text-muted-foreground/60" />
															</button>
														{/each}
													</div>
												{/if}
											</Popover.Content>
										</Popover.Portal>
									</Popover.Root>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<!-- Break Block -->
					<div class="group relative">
						<div
							class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-border/60 bg-muted text-muted-foreground"
						>
							{#if block.mode === 'shortBreak'}
								<Coffee class="size-3" />
							{:else}
								<Clock class="size-3" />
							{/if}
						</div>
						<div class="rounded-xl border border-border/30 bg-muted/20 p-2.5 transition-colors">
							<div class="flex items-center justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class="text-xs font-medium text-muted-foreground">
										{block.mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
									</span>
									<span
										class="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
									>
										{Math.round(block.durationSeconds / 60)}m
									</span>
								</div>
								<span class="flex items-center gap-1 text-[11px] text-muted-foreground/70">
									<Sparkles class="size-3 text-amber-500/80" />
									<span>Smart Revitalization</span>
								</span>
							</div>
							<p class="mt-0.5 text-[11px] text-muted-foreground/80">
								Guided pause: physical reset, mindful breath, or hydration
							</p>
						</div>
					</div>
				{/if}
			{/each}

			<!-- Free Margin Block in End Time Mode -->
			{#if planningState.targetMode === 'end_time' && planningState.projectedPlan.freeMarginSeconds > 0}
				<div class="group relative">
					<div
						class="absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border border-dashed border-border/80 bg-muted/50 text-muted-foreground"
					>
						<Clock class="size-3 text-muted-foreground/70" />
					</div>
					<div
						class="rounded-xl border border-dashed border-border/60 bg-muted/10 p-2.5 transition-colors"
					>
						<div class="flex items-center justify-between gap-2">
							<div class="flex items-center gap-2">
								<span class="text-xs font-medium text-muted-foreground">Free Margin</span>
								<span
									class="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
								>
									+{planningState.freeMarginMinutes}m Free Margin
								</span>
							</div>
						</div>
						<p class="mt-0.5 text-[11px] text-muted-foreground/70">
							Buffer margin before scheduled finish
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Bottom CTA Section -->
		<div class="mt-6 border-t border-border/40 pt-5">
			{#if planningState.isPlanCompleted}
				<div
					class="space-y-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center"
				>
					<div
						class="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
					>
						<Check class="size-4 stroke-[2.5]" />
						<span>Session Completed! All planned focus blocks finished.</span>
					</div>
					<button
						type="button"
						class="w-full cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
						onclick={() => planningState.endSession(timerState)}
					>
						Start New Session
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
							Back to timer
						</button>
						<button
							type="button"
							class="cursor-pointer rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/20 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
							onclick={() => planningState.endSession(timerState)}
						>
							End Session Plan
						</button>
					</div>

					<!-- Forward-Only Architecture Badge / Notice -->
					<div class="rounded-xl border border-border/30 bg-muted/10 p-3">
						<p class="text-[11px] leading-relaxed text-muted-foreground/80">
							<strong class="font-medium text-foreground">Forward-only sync:</strong> Editing durations
							or adding blocks applies starting from your next cycle. Active blocks preserve uninterrupted
							focus.
						</p>
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
						Start Session
					</button>
				</div>
			{/if}
		</div>
	</div>
</section>
