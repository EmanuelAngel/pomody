<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils';
	import type { PlanBlock } from '$lib/domain/planning/session-plan.entity';
	import type { FocusTask } from '$lib/domain/tasks/task.entity';

	interface Props {
		block: PlanBlock;
		focusIndex: number;
		assignedTask: FocusTask | null;
		activeTaskTitle?: string | null;
		pendingTasks: readonly FocusTask[];
		isPopoverOpen: boolean;
		onOpenPopoverChange: (open: boolean) => void;
		onAssignTask: (taskId: string) => void;
		onUnassignTask: () => void;
		class?: string;
	}

	let {
		block,
		focusIndex,
		assignedTask,
		activeTaskTitle = null,
		pendingTasks,
		isPopoverOpen,
		onOpenPopoverChange,
		onAssignTask,
		onUnassignTask,
		class: className = ''
	}: Props = $props();
</script>

<div class={cn('group relative', className)}>
	<!-- Left Circular Badge -->
	<div
		class={cn(
			'absolute top-2.5 -left-6 flex size-5.5 items-center justify-center rounded-full border shadow-xs',
			block.status === 'in_progress'
				? 'border-primary/50 bg-primary/20 text-primary'
				: block.status === 'completed'
					? 'border-accent-pine/50 bg-accent-pine/15 text-accent-pine'
					: block.status === 'skipped'
						? 'border-border/40 bg-muted/50 text-muted-foreground/50'
						: 'border-border/60 bg-muted text-muted-foreground'
		)}
	>
		{#if block.status === 'completed'}
			<Check class="size-2.5 stroke-[3]" />
		{:else}
			<span
				class={cn(
					'text-[10px] font-bold',
					block.status === 'skipped' && 'text-muted-foreground/60 line-through'
				)}
			>
				{focusIndex}
			</span>
		{/if}
	</div>

	<!-- Card Body -->
	<div
		class={cn(
			'rounded-xl border p-3 transition-colors',
			block.status === 'in_progress'
				? 'border-primary/40 bg-primary/5'
				: block.status === 'skipped'
					? 'border-border/30 bg-muted/20 opacity-70'
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
				<span class="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
					Active block
				</span>
			{:else if block.status === 'completed'}
				<span
					class="inline-flex items-center gap-1 rounded-full bg-accent-pine/10 px-2 py-0.5 text-[10px] font-medium text-accent-pine"
				>
					<Check class="size-2.5 stroke-[2.5]" />
					<span>Completed</span>
				</span>
			{:else if block.status === 'skipped'}
				<span
					class="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground line-through"
				>
					Skipped
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
						onclick={onUnassignTask}
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
				<Popover.Root open={isPopoverOpen} onOpenChange={onOpenPopoverChange}>
					<Popover.Trigger
						class="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border/50 bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
						aria-label={`Assign task to focus block ${focusIndex}`}
					>
						<Plus class="size-3" />
						<span>Assign task</span>
					</Popover.Trigger>
					<Popover.Content
						side="bottom"
						sideOffset={6}
						align="end"
						class="z-50 w-72 rounded-xl border border-border/60 bg-popover/95 p-3 text-popover-foreground shadow-lg backdrop-blur-md fade-in-0 outline-none zoom-in-95 data-[side=bottom]:slide-in-from-top-2 sm:w-80"
					>
						<div class="mb-2 text-xs font-semibold text-foreground">
							Select task for Focus Block {focusIndex}
						</div>
						{#if pendingTasks.length === 0}
							<p class="py-3 text-center text-xs text-muted-foreground">
								No pending tasks in backlog. Create one or run Free Focus.
							</p>
						{:else}
							<div class="max-h-56 space-y-1 overflow-y-auto">
								{#each pendingTasks as task (task.id)}
									<button
										type="button"
										aria-label={`Assign task: ${task.title}`}
										class="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none"
										onclick={() => onAssignTask(task.id)}
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
				</Popover.Root>
			{/if}
		</div>
	</div>
</div>
