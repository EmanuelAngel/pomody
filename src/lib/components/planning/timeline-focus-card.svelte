<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import Plus from '@lucide/svelte/icons/plus';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import * as Popover from '$lib/components/ui/popover';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import type { PlanBlock } from '$lib/domain/planning/session-plan.entity';
	import type { FocusTask } from '$lib/domain/tasks/task.entity';
	import type { TimerState } from '$lib/state/timer.svelte';

	interface Props {
		block: PlanBlock;
		focusIndex: number;
		assignedTask: FocusTask | null;
		activeTaskTitle?: string | null;
		pendingTasks: readonly FocusTask[];
		isPopoverOpen: boolean;
		onOpenPopoverChange: (open: boolean) => void;
		onAssignTask: (taskId: string) => void;
		onCreateAndAssignTask?: (title: string) => void | Promise<void>;
		onUnassignTask: () => void;
		timerState?: TimerState;
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
		onCreateAndAssignTask,
		onUnassignTask,
		timerState,
		class: className = ''
	}: Props = $props();

	let isDragOver = $state(false);
	let quickSearchQuery = $state('');

	const filteredTasks = $derived.by(() => {
		const q = quickSearchQuery.trim().toLowerCase();
		if (!q) return pendingTasks;
		return pendingTasks.filter((t) => t.title.toLowerCase().includes(q));
	});

	function handleDragOver(e: DragEvent) {
		const types = e.dataTransfer?.types;
		if (types?.includes('application/x-pomody-task-id') || types?.includes('text/plain')) {
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'copy';
			}
			isDragOver = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		const currentTarget = e.currentTarget as HTMLElement | null;
		const relatedTarget = e.relatedTarget as Node | null;
		if (!currentTarget || !relatedTarget || !currentTarget.contains(relatedTarget)) {
			isDragOver = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const taskId =
			e.dataTransfer?.getData('application/x-pomody-task-id') ||
			e.dataTransfer?.getData('text/plain');
		if (taskId) {
			onAssignTask(taskId);
		}
	}

	async function handleCreateAndAssign() {
		const trimmed = quickSearchQuery.trim();
		if (!trimmed) return;
		if (onCreateAndAssignTask) {
			await onCreateAndAssignTask(trimmed);
			quickSearchQuery = '';
		}
	}

	function handleQuickInputKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			const trimmed = quickSearchQuery.trim();
			if (!trimmed) return;
			const exactMatch = pendingTasks.find((t) => t.title.toLowerCase() === trimmed.toLowerCase());
			if (exactMatch) {
				onAssignTask(exactMatch.id);
				quickSearchQuery = '';
			} else {
				handleCreateAndAssign();
			}
		}
	}
</script>

<li
	class={cn('group relative list-none', className)}
	aria-current={block.status === 'in_progress' ? 'step' : undefined}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
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
			'rounded-xl border p-3 transition-all duration-150',
			isDragOver
				? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/40'
				: block.status === 'in_progress'
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
				<div class="flex items-center gap-1.5">
					{#if timerState}
						<span
							class="font-mono text-xs font-semibold text-primary tabular-nums"
							aria-label="Remaining block time"
						>
							{timerState.formattedRemainingTime}
						</span>
					{/if}
					<span class="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
						Active block
					</span>
				</div>
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

		{#if isDragOver}
			<div
				class="mt-2.5 flex animate-pulse items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/10 py-1.5 text-xs font-medium text-primary"
			>
				<span>Drop task to assign to Focus Block {focusIndex}</span>
			</div>
		{/if}

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

					<Button
						variant="ghost"
						size="icon-xs"
						aria-label={`Unassign task from focus block ${focusIndex}`}
						title="Unassign task"
						onclick={onUnassignTask}
						class="size-5 shrink-0 text-muted-foreground/60 hover:text-foreground"
					>
						<X class="size-3" />
					</Button>
				{:else}
					<span class="text-muted-foreground/70">Unassigned · Free Focus</span>
				{/if}
			</div>

			{#if !block.assignedTaskId}
				<!-- Assign task Popover -->
				<Popover.Root
					open={isPopoverOpen}
					onOpenChange={(open) => {
						if (!open) quickSearchQuery = '';
						onOpenPopoverChange(open);
					}}
				>
					<Popover.Trigger
						class={cn(
							buttonVariants({ variant: 'outline', size: 'sm' }),
							'h-7 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground'
						)}
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

						<!-- Quick Task Search / Add Input (UX-03) -->
						<div class="relative mb-2.5 flex items-center">
							<Input
								placeholder="Search or create task... (Enter)"
								bind:value={quickSearchQuery}
								onkeydown={handleQuickInputKeyDown}
								class="h-8 pr-8 text-xs"
								aria-label={`Search or create task for Focus Block ${focusIndex}`}
							/>
							{#if quickSearchQuery.trim().length > 0}
								<Button
									variant="ghost"
									size="icon-xs"
									aria-label="Create and assign task"
									onclick={handleCreateAndAssign}
									class="absolute right-1 text-muted-foreground hover:text-foreground"
								>
									<Plus class="size-3.5" />
								</Button>
							{/if}
						</div>

						{#if filteredTasks.length === 0}
							{#if quickSearchQuery.trim().length > 0}
								<div class="py-1">
									<Button
										variant="outline"
										size="sm"
										aria-label={`Create and assign task "${quickSearchQuery.trim()}"`}
										onclick={handleCreateAndAssign}
										class="w-full justify-start gap-2 border-dashed border-primary/40 bg-primary/5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
									>
										<Plus class="size-3.5 shrink-0" />
										<span class="truncate font-medium"
											>Create & assign "{quickSearchQuery.trim()}"</span
										>
									</Button>
								</div>
							{:else}
								<p class="py-3 text-center text-xs text-muted-foreground">
									No pending tasks in backlog. Type above to create one.
								</p>
							{/if}
						{:else}
							<div class="max-h-56 space-y-1 overflow-y-auto">
								{#each filteredTasks as task (task.id)}
									<button
										type="button"
										aria-label={`Assign task: ${task.title}`}
										class="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none"
										onclick={() => {
											onAssignTask(task.id);
											quickSearchQuery = '';
										}}
									>
										<span class="truncate font-medium text-foreground">
											{task.title}
										</span>
										<ChevronRight class="size-3 text-muted-foreground/60" />
									</button>
								{/each}
								{#if quickSearchQuery.trim().length > 0 && !filteredTasks.some((t) => t.title.toLowerCase() === quickSearchQuery
												.trim()
												.toLowerCase())}
									<Button
										variant="ghost"
										size="sm"
										aria-label={`Create and assign task "${quickSearchQuery.trim()}"`}
										onclick={handleCreateAndAssign}
										class="mt-1.5 w-full justify-start gap-1.5 border border-dashed border-primary/30 bg-primary/5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
									>
										<Plus class="size-3" />
										<span class="truncate">New: "{quickSearchQuery.trim()}"</span>
									</Button>
								{/if}
							</div>
						{/if}
					</Popover.Content>
				</Popover.Root>
			{/if}
		</div>

		<!-- Active block dynamic progress bar (UX-10) -->
		{#if block.status === 'in_progress' && timerState}
			<div
				class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
				role="progressbar"
				aria-valuenow={Math.round(timerState.progress * 100)}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label="Focus block progress"
			>
				<div
					class="h-full rounded-full bg-primary transition-all duration-300 ease-out"
					style="width: {Math.min(100, Math.max(0, timerState.progress * 100))}%"
				></div>
			</div>
		{/if}
	</div>
</li>
