<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Pin from '@lucide/svelte/icons/pin';
	import Trash from '@lucide/svelte/icons/trash';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import { Button } from '$lib/components/ui/button';
	import SimpleTooltip from '$lib/components/common/simple-tooltip.svelte';
	import { cn } from '$lib/utils';
	import type { FocusTask } from '$lib/domain/tasks/task.entity';
	import { t } from '$lib/state/locale.svelte';

	interface Props {
		task: FocusTask;
		isActive?: boolean;
		ontoggle?: (taskId: string) => void | Promise<void>;
		ontogglepin?: (taskId: string) => void;
		ontitlechange?: (taskId: string, newTitle: string) => void | Promise<void>;
		ondelete?: (taskId: string) => void | Promise<void>;
		onslot?: (taskId: string) => void;
	}

	let {
		task,
		isActive = false,
		ontoggle,
		ontogglepin,
		ontitlechange,
		ondelete,
		onslot
	}: Props = $props();

	let isEditing = $state(false);
	let editingTitle = $state('');
	let isDragging = $state(false);

	function handleDragStart(e: DragEvent) {
		if (isEditing) {
			e.preventDefault();
			return;
		}
		isDragging = true;
		if (e.dataTransfer) {
			e.dataTransfer.setData('application/x-pomody-task-id', task.id);
			e.dataTransfer.setData('text/plain', task.id);
			e.dataTransfer.effectAllowed = 'copyMove';
		}
	}

	function handleDragEnd() {
		isDragging = false;
	}

	function startEditing() {
		editingTitle = task.title;
		isEditing = true;
	}

	function handleSave() {
		if (!isEditing) return;
		const trimmed = editingTitle.trim();
		isEditing = false;
		if (trimmed) {
			ontitlechange?.(task.id, trimmed);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSave();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			isEditing = false;
			editingTitle = task.title;
		}
	}
</script>

{#if task.completed}
	<li
		class="group flex items-start justify-between gap-3 rounded-xl border border-border/20 bg-muted/20 px-3 py-2 text-muted-foreground/70 interactive"
	>
		<div class="flex min-w-0 flex-1 items-start gap-3">
			<button
				type="button"
				role="checkbox"
				aria-checked={true}
				aria-label={t.task_item_mark_as_pending({ title: task.title })}
				onclick={() => ontoggle?.(task.id)}
				class="mt-0.5 flex size-4.5 shrink-0 pressable cursor-pointer items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
			>
				<Check class="size-2.5 stroke-[3]" />
			</button>
			<span
				class="min-w-0 flex-1 text-sm leading-snug break-words text-muted-foreground/60 line-through select-none"
			>
				{task.title}
			</span>
		</div>

		<div class="flex shrink-0 items-center gap-1">
			<SimpleTooltip text={t.task_item_delete_button_title()}>
				{#snippet children({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-xs"
						aria-label={t.task_item_delete_button_aria({ title: task.title })}
						onclick={() => ondelete?.(task.id)}
						class="text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive"
					>
						<Trash class="size-3.5" />
					</Button>
				{/snippet}
			</SimpleTooltip>
		</div>
	</li>
{:else}
	<li
		draggable={!isEditing}
		ondragstart={handleDragStart}
		ondragend={handleDragEnd}
		class={cn(
			'group flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 interactive',
			isDragging && 'border-dashed border-primary/50 opacity-40',
			!isEditing && 'cursor-grab active:cursor-grabbing',
			isActive
				? 'border-primary/50 bg-primary/5 shadow-xs'
				: 'border-border/40 bg-card/40 hover:border-border/80 hover:bg-muted/30'
		)}
	>
		<!-- Left: Grip + Checkbox + Title -->
		<div class="flex min-w-0 flex-1 items-start gap-2.5">
			<div
				class="mt-1 flex size-3.5 shrink-0 items-center justify-center text-muted-foreground/30 transition-colors select-none group-hover:text-muted-foreground/60"
				aria-hidden="true"
			>
				<GripVertical class="size-3.5" />
			</div>

			<button
				type="button"
				role="checkbox"
				aria-checked={false}
				aria-label={t.task_item_mark_as_completed({ title: task.title })}
				onclick={() => ontoggle?.(task.id)}
				class="mt-0.5 flex size-4.5 shrink-0 pressable cursor-pointer items-center justify-center rounded-full border border-muted-foreground/40 hover:border-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
			>
			</button>

			{#if isEditing}
				<input
					type="text"
					aria-label={t.task_item_edit_input_aria()}
					bind:value={editingTitle}
					onkeydown={handleKeyDown}
					onblur={handleSave}
					class="h-7 w-full rounded border border-ring bg-background px-2 text-sm text-foreground focus:outline-none"
				/>
			{:else}
				<SimpleTooltip text={t.task_item_edit_button_title()}>
					{#snippet children({ props })}
						<button
							{...props}
							type="button"
							aria-label={t.task_item_edit_button_aria({ title: task.title })}
							class="min-w-0 flex-1 pressable cursor-text text-left text-sm leading-snug font-medium break-words text-foreground hover:text-foreground/80 focus-visible:outline-none"
							onclick={startEditing}
						>
							{task.title}
						</button>
					{/snippet}
				</SimpleTooltip>
			{/if}
		</div>

		<!-- Right: Quick Slot + Pin Active + Delete -->
		<div class="-mt-0.5 flex shrink-0 items-center gap-1">
			{#if onslot}
				<SimpleTooltip text={t.task_item_slot_button_title()}>
					{#snippet children({ props })}
						<Button
							{...props}
							variant="ghost"
							size="icon-xs"
							aria-label={t.task_item_slot_button_aria({ title: task.title })}
							onclick={() => onslot?.(task.id)}
							class="text-muted-foreground/50 hover:text-foreground"
						>
							<CalendarPlus class="size-3.5" />
						</Button>
					{/snippet}
				</SimpleTooltip>
			{/if}
			<SimpleTooltip text={isActive ? t.task_item_active_title() : t.task_item_set_active_title()}>
				{#snippet children({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-xs"
						aria-label={isActive
							? t.task_item_unset_active_aria({ title: task.title })
							: t.task_item_set_active_aria({ title: task.title })}
						aria-pressed={isActive}
						onclick={() => ontogglepin?.(task.id)}
						class={cn(
							'transition-colors',
							isActive
								? 'bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary'
								: 'text-muted-foreground/50 hover:text-foreground'
						)}
					>
						<Pin class={cn('size-3.5', isActive && 'fill-primary')} />
					</Button>
				{/snippet}
			</SimpleTooltip>

			<SimpleTooltip text={t.task_item_delete_button_title()}>
				{#snippet children({ props })}
					<Button
						{...props}
						variant="ghost"
						size="icon-xs"
						aria-label={t.task_item_delete_button_aria({ title: task.title })}
						onclick={() => ondelete?.(task.id)}
						class="text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
					>
						<Trash class="size-3.5" />
					</Button>
				{/snippet}
			</SimpleTooltip>
		</div>
	</li>
{/if}
